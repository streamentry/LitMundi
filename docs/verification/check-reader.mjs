/** Optional browser acceptance check. See README.md in this directory. */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {alignedPassages,isPublicEdition,normalizeQuery,reviewCategory,editionTitle,preferredEdition,searchableText} from '../../scripts/lib/reader-data.mjs';
const modules=process.env.LITMUNDI_BROWSER_TOOLS??'/tmp/litmundi-browsercheck/node_modules';
const {chromium}=await import(pathToFileURL(join(modules,'playwright/index.mjs')));
const {default:AxeBuilder}=await import(pathToFileURL(join(modules,'@axe-core/playwright/dist/index.mjs')));
const base=(process.argv[2]??'http://127.0.0.1:4321/LitMundi/').replace(/\/?$/,'/');
const output=process.argv[3]??'/tmp/litmundi-reader-check.json';
const fixture=process.env.LITMUNDI_PARALLEL_FIXTURE_URL;
const ignoreHTTPSErrors=process.env.LITMUNDI_BROWSER_IGNORE_HTTPS_ERRORS==='1';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const localeNames=read('src/lib/locales.json'),locales=Object.keys(localeNames);
const languageNames=read('corpus/catalog/languages.json');
const works=read('corpus/catalog/works.json'),editions=read('corpus/catalog/editions.json');
const published=editions.filter(edition=>isPublicEdition(edition,works.find(work=>work.id===edition.work_id)));
const publicWorks=works.filter(work=>published.some(edition=>edition.work_id===work.id));
const translations=published.filter(edition=>edition.kind==='translation');
const passagesFor=edition=>{const text=read(edition.content_path);return read('corpus/structure/'+edition.work_id+'.json').segment_ids.map(id=>[id,text[id]]);};
const readerRoute=edition=>'read/'+edition.work_id+'/'+edition.id+'/';
const preferredFor=(work,locale)=>preferredEdition(published.filter(edition=>edition.work_id===work.id),locale,work.original_language);
const primaryLocale=locales[0],otherLocale=locales.find(locale=>locale!==primaryLocale)??primaryLocale;
const primary=published.find(edition=>edition.kind==='source'&&passagesFor(edition).length>1)??published[0];
assert.ok(primary,'Browser acceptance needs at least one published edition');
const primaryPassages=passagesFor(primary),fragment=primaryPassages[Math.min(2,primaryPassages.length-1)][0];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000},ignoreHTTPSErrors}),page=await context.newPage();
const exceptions=[];page.on('pageerror',error=>exceptions.push(error.message));
const report={status:'running',checked_at_utc:new Date().toISOString(),base_url:base,scope:'Browser acceptance against the supplied base URL; no human literary review or reader-demand claim.',versions:{node:process.version,playwright:read(join(modules,'playwright/package.json')).version,axePlaywright:read(join(modules,'@axe-core/playwright/package.json')).version,chromium:browser.version()},interface_locales:locales,public_works:publicWorks.map(work=>work.id),accessibility:[],comparison_accessibility:[],mobile:[],interactions:[],search_cases:[],excluded_title_cases:[],parallel_editions:[],parallel_fixture:null,content_hashes:published.map(edition=>({edition_id:edition.id,title:editionTitle(works.find(work=>work.id===edition.work_id),edition),review_category:reviewCategory(edition),sha256:createHash('sha256').update(readFileSync(edition.content_path)).digest('hex')})),browser_exceptions:exceptions,browser_https_errors_ignored:ignoreHTTPSErrors};
const overflow=(targetPage=page)=>targetPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
async function checkTitle(root,work,edition,tag='h1'){
  const title=editionTitle(work,edition),heading=root.locator(tag+'[data-edition-title="'+edition.id+'"]');
  assert.equal(await heading.textContent(),title);assert.equal(await heading.getAttribute('lang'),edition.title?edition.language:work.original_language);
  const original=root.locator('[data-original-title]'),showOriginal=edition.kind==='translation'&&title!==work.title;
  assert.equal(await original.count(),showOriginal?1:0);
  if(showOriginal){assert.equal(await original.textContent(),work.title);assert.equal(await original.getAttribute('lang'),work.original_language);}
}

async function comparisonState(targetPage,enabled,{sourceId,targetId}={}){
  const toggle=targetPage.locator('#show-original');
  assert.equal(await toggle.count(),1,'Translations need one visible original-text checkbox');
  assert.equal(await toggle.isVisible(),true);
  assert.equal(await toggle.getAttribute('type'),'checkbox');
  assert.equal(await toggle.getAttribute('autocomplete'),'off');
  assert.equal(await toggle.getAttribute('aria-controls'),'parallel-text');
  assert.equal(await toggle.getAttribute('checked'),null,'The HTML default must be unchecked');
  assert.equal(await toggle.isChecked(),enabled);
  const labels=await toggle.evaluate(input=>[...input.labels].map(label=>label.textContent.trim()));
  assert.ok(labels.length>0&&labels.every(Boolean),'Comparison checkbox needs a visible label');
  const checkboxBox=await toggle.boundingBox();assert.ok(checkboxBox.width>=12&&checkboxBox.height>=12,'The native checkbox must remain visibly usable');
  const article=targetPage.locator('article#parallel-text');assert.equal(await article.count(),1);
  const sources=article.locator('[data-source-cell]'),targets=article.locator('[data-target-cell]');
  assert.ok(await targets.count()>0);assert.equal(await sources.count(),await targets.count());
  for(let i=0;i<await targets.count();i++){
    assert.equal(await targets.nth(i).isVisible(),true,'Target prose must stay visible');
    assert.equal(await sources.nth(i).isVisible(),enabled,'Source visibility must follow the native checkbox');
    if(sourceId)assert.equal(await sources.nth(i).getAttribute('data-source-cell'),sourceId);
    if(targetId)assert.equal(await targets.nth(i).getAttribute('data-target-cell'),targetId);
  }
  const target=await targets.first().boundingBox();
  if(!enabled){
    const box=await article.boundingBox(),viewport=targetPage.viewportSize();
    assert.ok(box.width<=761,'Translation-only prose must use the normal reading-column width');
    assert.ok(Math.abs(box.x+box.width/2-viewport.width/2)<=1,'Translation-only column must be centered');
    const row=await article.locator('.parallel-row').first().boundingBox();
    assert.ok(Math.abs(target.x-row.x)<=1&&Math.abs(target.width-row.width)<=1,'Hidden source must not leave an empty grid column');
    assert.equal(await article.locator('.parallel-heading').isVisible(),false);
  }else{
    const source=await sources.first().boundingBox();
    if(targetPage.viewportSize().width<=650)assert.ok(source.y<target.y&&Math.abs(source.x-target.x)<=1,'Comparison must place original before target on mobile');
    else assert.ok(source.x+source.width<=target.x+1,'Comparison must use source/target desktop columns');
  }
}
const passageSnapshot=targetPage=>targetPage.locator('#parallel-text').evaluate(article=>[...article.querySelectorAll('.segment')].map(segment=>({
  id:segment.id,tracked:segment.getAttribute('data-reading-segment'),text:segment.querySelector('.prose').textContent,language:segment.querySelector('.prose').lang,
  links:[...segment.querySelectorAll('a')].map(link=>link.getAttribute('href'))
})));
async function keyboardComparison(targetPage){
  await targetPage.locator('#show-original').evaluate(input=>input.focus({preventScroll:true}));
  await targetPage.keyboard.press('Space');
}

try{
  const routes=['','quality/','authors/','about/',...publicWorks.map(work=>'works/'+work.id+'/'),...published.map(readerRoute)];
  for(const locale of locales)for(const route of routes){
    const response=await page.goto(base+locale+'/'+route);assert.equal(response.status(),200);
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    report.accessibility.push({route:locale+'/'+route,violations:result.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(node=>node.target)}))});
    assert.equal(result.violations.length,0,'Automated accessibility violation: '+locale+'/'+route);
    const edition=published.find(item=>readerRoute(item)===route);
    if(edition){
      const work=works.find(item=>item.id===edition.work_id),title=editionTitle(work,edition);
      await checkTitle(page.locator('.reader-head'),work,edition);
      assert.equal(await page.title(),title+' — '+work.author+' · '+(languageNames[edition.language]??edition.language)+' · LitMundi');
      const metadata=JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());assert.equal(metadata.name,title);
      assert.equal(await page.locator('.notice[data-review-category]').getAttribute('data-review-category'),reviewCategory(edition));
      if(reviewCategory(edition)==='ai'&&typeof edition.review.score==='number')assert.equal(Number(await page.locator('[data-ai-score]').getAttribute('data-ai-score')),edition.review.score);
      if(edition.kind==='translation'){
        await comparisonState(page,false,{sourceId:edition.source_edition_id,targetId:edition.id});
        await page.locator('#show-original').check();await comparisonState(page,true);
        const enabledAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
        report.comparison_accessibility.push({route:locale+'/'+route,state:'original-enabled',violations:enabledAxe.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(node=>node.target)}))});
        assert.equal(enabledAxe.violations.length,0,'Enabled comparison accessibility violation: '+locale+'/'+route);
        await page.locator('#show-original').uncheck();await comparisonState(page,false);
      }else assert.equal(await page.locator('#show-original').count(),0,'Original source pages must not offer a comparison checkbox');

      for(const navigation of await page.locator('[data-navigation-title]').evaluateAll(nodes=>nodes.map(node=>({editionId:node.dataset.navigationTitle,title:node.textContent,language:node.lang})))){
        const target=published.find(item=>item.id===navigation.editionId);assert.ok(target);const targetWork=works.find(item=>item.id===target.work_id);
        assert.equal(navigation.title,editionTitle(targetWork,target));assert.equal(navigation.language,target.title?target.language:targetWork.original_language);
      }
    }
    const work=publicWorks.find(item=>'works/'+item.id+'/'===route);
    if(work){
      const preferred=preferredFor(work,locale);await checkTitle(page.locator('.reader-head'),work,preferred);assert.equal(await page.title(),editionTitle(work,preferred)+' — '+work.author+' · LitMundi');
      for(const item of published.filter(item=>item.work_id===work.id))assert.equal(await page.locator('h3[data-edition-title="'+item.id+'"]').textContent(),editionTitle(work,item));
    }
    if(route===''){
      for(const work of publicWorks)await checkTitle(page.locator('[data-work-id="'+work.id+'"]'),work,preferredFor(work,locale),'h3');
    }
  }
  await page.goto(base+primaryLocale+'/');await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('href'),'#main');report.interactions.push('Keyboard first-tab skip link targets main content.');
  assert.equal(await page.locator('#collection-cards article').count(),publicWorks.length);
  for(const edition of published){
    const work=works.find(item=>item.id===edition.work_id);
    const title=editionTitle(work,edition),queries=[{kind:'passage',query:(passagesFor(edition)[0][1].match(/[\p{L}\p{N}]+/gu)??[]).slice(0,6).join(' ')},{kind:'edition-title-without-diacritics',query:normalizeQuery(title)},...(title!==work.title?[{kind:'original-title-without-diacritics',query:normalizeQuery(work.title)}]:[])];
    for(const {kind,query} of queries){
      assert.ok(normalizeQuery(query).length>0,'Missing searchable text: '+edition.id);
      await page.selectOption('#text-language',edition.language);await page.selectOption('#author',work.author);
      await page.locator('#query').fill(query);await page.locator('#collection-search button[type="submit"]').click();
      const resultSelector=kind==='passage'?'#passage-results':'#edition-results';
      await page.waitForFunction(selector=>!document.querySelector(selector).hidden,resultSelector);
      const links=await page.locator(resultSelector+' a').evaluateAll(links=>links.map(link=>({href:link.getAttribute('href'),title:link.querySelector('span')?.textContent,language:link.querySelector('span')?.lang})));
      const matchesEdition=(href,item)=>href.includes('/'+readerRoute(item))&&(kind==='passage'?href.includes('#'):!href.includes('#'));
      const matching=links.filter(link=>matchesEdition(link.href,edition));assert.ok(matching.length>0,'Search result missing: '+edition.id+' / '+query);
      for(const link of matching){assert.equal(link.title,title,'Search must display the edition title');assert.equal(link.language,edition.title?edition.language:work.original_language);}
      assert.ok(links.every(link=>published.some(item=>item.language===edition.language&&works.find(work=>work.id===item.work_id).author===work.author&&matchesEdition(link.href,item))),'Search leaked an edition outside the language/author/public filters');
      report.search_cases.push({edition_id:edition.id,language:edition.language,kind,query,displayed_title:title,result_links:links.length,review_category:reviewCategory(edition)});
    }
  }
  report.interactions.push('Full-text searches link to passages; accentless edition/original-title searches offer matching editions without repeated paragraph hits, with language and author filters.');
  await page.selectOption('#text-language','');await page.selectOption('#author','');
  for(const edition of editions.filter(item=>item.title&&!published.includes(item))){
    const query=normalizeQuery(edition.title),terms=query.split(/\s+/).filter(Boolean);
    const overlapsPublished=published.some(item=>{const work=works.find(work=>work.id===item.work_id);return passagesFor(item).some(([,passage])=>terms.every(term=>searchableText({title:editionTitle(work,item),originalTitle:work.title,author:work.author},passage).includes(term)));});
    if(overlapsPublished)continue;
    await page.locator('#query').fill(query);await page.locator('#collection-search button[type="submit"]').click();await page.waitForFunction(()=>document.querySelector('#search-status').textContent===document.querySelector('#collection-search').dataset.none);
    assert.equal(await page.locator('#collection-cards article:visible').count(),0);report.excluded_title_cases.push({edition_id:edition.id,query,results:0});
  }
  await page.selectOption('#text-language','');await page.selectOption('#author','');await page.locator('#query').fill('unfindable-random-785632');await page.locator('#collection-search button[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelector('#search-status').textContent===document.querySelector('#collection-search').dataset.none);
  assert.equal(await page.locator('#collection-cards article:visible').count(),0);report.interactions.push('An absent query shows the explicit empty state.');
  await page.locator('#query').fill('');await page.locator('#collection-search button[type="submit"]').click();
  for(const language of new Set(published.map(edition=>edition.language))){
    await page.selectOption('#text-language',language);
    const visible=await page.locator('#collection-cards article:visible').evaluateAll(cards=>cards.map(card=>card.dataset.workId));
    assert.deepEqual(visible.sort(),publicWorks.filter(work=>published.some(edition=>edition.work_id===work.id&&edition.language===language)).map(work=>work.id).sort());
  }
  const incompatible=published.flatMap(edition=>publicWorks.filter(work=>!published.some(item=>item.work_id===work.id&&item.language===edition.language)).map(work=>({language:edition.language,author:work.author}))).find(pair=>!published.some(edition=>edition.language===pair.language&&works.find(work=>work.id===edition.work_id).author===pair.author));
  if(incompatible){await page.selectOption('#text-language',incompatible.language);await page.selectOption('#author',incompatible.author);assert.equal(await page.locator('#collection-cards article:visible').count(),0);assert.equal(await page.locator('#search-status').textContent(),await page.locator('#collection-search').getAttribute('data-none'));}
  report.interactions.push('Language filters count works rather than editions; incompatible author/language combinations show the empty state when present.');
  await page.goto(base+primaryLocale+'/'+readerRoute(primary));
  await page.locator('[id="'+fragment+'"] a[href="#'+fragment+'"]').click();
  await page.locator('.locale-menu summary').click();await page.getByRole('link',{name:localeNames[otherLocale],exact:true}).click();await page.waitForURL(base+otherLocale+'/'+readerRoute(primary)+'#'+fragment);
  report.interactions.push('Changing UI language preserves edition and a passage fragment selected after page load.');
  await page.goto(base+primaryLocale+'/'+readerRoute(primary));assert.equal(await page.locator('#remember-place').isChecked(),false);await page.locator('[id="'+fragment+'"]').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>localStorage.length),0);
  await page.locator('#remember-place').check();await page.locator('[id="'+primaryPassages[Math.min(3,primaryPassages.length-1)][0]+'"]').scrollIntoViewIfNeeded();await page.waitForFunction(key=>Boolean(localStorage.getItem(key)),'litmundi:reading:v1:'+primary.id);await page.reload();assert.equal(await page.locator('#remember-place').isChecked(),true);assert.equal(await page.locator('#resume-reading').isVisible(),true);await page.locator('#clear-progress').click();assert.equal(await page.evaluate(()=>localStorage.length),0);report.interactions.push('Reading position storage is opt-in; save, resume and clear work.');
  for(const [translationIndex,edition] of translations.entries()){
    const source=published.find(item=>item.id===edition.source_edition_id);assert.ok(source);
    const targetPassages=passagesFor(edition),rows=alignedPassages(passagesFor(source),targetPassages,read('corpus/alignments/'+edition.work_id+'/'+edition.id+'.json'));
    const ownFragment=targetPassages[Math.min(1,targetPassages.length-1)][0],route=base+primaryLocale+'/'+readerRoute(edition)+'#'+ownFragment;
    await page.setViewportSize({width:1440,height:1000});await page.goto(route);
    await comparisonState(page,false,{sourceId:source.id,targetId:edition.id});
    const actual=await page.locator('.parallel-row').evaluateAll(elements=>elements.map(row=>[...row.querySelectorAll('.parallel-cell')].map(cell=>[...cell.querySelectorAll('.segment')].map(segment=>({id:segment.id,text:segment.querySelector('.prose').textContent,language:segment.querySelector('.prose').lang})))));
    assert.deepEqual(actual,rows.map(row=>[row.source.map(([id,text])=>({id:'source-'+id,text,language:source.language})),row.target.map(([id,text])=>({id,text,language:edition.language}))]));
    const before=await passageSnapshot(page),hash=new URL(page.url()).hash;
    const firstTarget=await page.locator('[data-target-cell] .prose').first().elementHandle();
    const selectedText=await firstTarget.evaluate(element=>{const range=document.createRange();range.selectNodeContents(element);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);return selection.toString();});
    await keyboardComparison(page);await comparisonState(page,true);
    assert.equal(await page.evaluate(()=>getSelection().toString()),selectedText,'Enabling original must preserve target text selection');
    assert.equal(await firstTarget.evaluate(element=>element.isConnected),true,'Comparison must not replace passage nodes');
    assert.deepEqual(await passageSnapshot(page),before);assert.equal(new URL(page.url()).hash,hash);
    await keyboardComparison(page);await comparisonState(page,false);
    assert.equal(await page.evaluate(()=>getSelection().toString()),selectedText,'Disabling original must preserve target text selection');
    assert.deepEqual(await passageSnapshot(page),before);assert.equal(new URL(page.url()).hash,hash);
    await page.evaluate(()=>getSelection().removeAllRanges());await firstTarget.dispose();
    assert.equal(await page.evaluate(()=>localStorage.length),0,'Comparison mode must not create storage without opt-in');
    const cells=page.locator('.parallel-row').first().locator('.parallel-cell');
    for(const [record,cell] of [[source,cells.nth(0)],[edition,cells.nth(1)]]){
      const link=await cell.locator('a[href*="/issues/new?"]').first().getAttribute('href'),body=new URL(link).searchParams.get('body');
      assert.ok(body.includes('Edition ID: '+record.id+'\n'));
    }
    const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(node=>node.id));assert.equal(ids.length,new Set(ids).size);
    assert.deepEqual(await page.locator('[data-reading-segment]').evaluateAll(nodes=>nodes.map(node=>node.dataset.readingSegment)),targetPassages.map(([id])=>id));
    const progressKey='litmundi:reading:v1:'+edition.id,lastId=targetPassages.at(-1)[0];
    await page.locator('#remember-place').check();
    for(const enabled of [false,true,false]){
      if(await page.locator('#show-original').isChecked()!==enabled)await keyboardComparison(page);
      await comparisonState(page,enabled);await page.locator('[id="'+lastId+'"]').scrollIntoViewIfNeeded();
      await page.waitForFunction(({key,id,count})=>JSON.parse(localStorage.getItem(key)??'null')?.segment===id&&document.querySelector('#reading-progress').value===count,{key:progressKey,id:lastId,count:targetPassages.length});
      assert.equal(await page.locator('#remember-place').isChecked(),true);
      assert.equal(await page.locator('#reading-progress').getAttribute('max'),String(targetPassages.length));
      assert.equal(await page.locator('#reading-progress').evaluate(progress=>progress.value),targetPassages.length);
      assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[progressKey],'Only the opted-in target reading position may be stored');
    }
    await page.locator('#clear-progress').click();assert.equal(await page.evaluate(()=>localStorage.length),0);
    await page.locator('#show-original').check();await page.reload();await comparisonState(page,false);assert.equal(new URL(page.url()).hash,hash);
    await page.locator('#show-original').check();
    const nextTranslation=translations[(translationIndex+1)%translations.length];
    await page.goto(base+primaryLocale+'/'+readerRoute(nextTranslation));await comparisonState(page,false,{sourceId:nextTranslation.source_edition_id,targetId:nextTranslation.id});
    await page.goBack();await comparisonState(page,false,{sourceId:source.id,targetId:edition.id});assert.equal(new URL(page.url()).hash,hash);
    assert.equal(await page.evaluate(()=>localStorage.length),0);
    report.parallel_editions.push({edition_id:edition.id,source_edition_id:source.id,review_category:reviewCategory(edition),alignment_rows:rows.length,source_passages:passagesFor(source).length,target_passages:targetPassages.length,default:'Source hidden; one centered target column at 1440px',enabled:'Recorded source/target pairs in two columns',toggle:'Native keyboard Space preserves passage nodes, selected target text, exact text, IDs, links and fragment',progress:'Only canonical target segments counted; opt-in target bookmark works in both modes; no mode storage',reset:'Reload, another translation and history return start with original off',anchors:'Unique IDs; source and target correction links identify their own editions'});
  }
  if(translations.length)report.interactions.push('Translation-only default and native Space comparison toggle preserve passage identity, selection, corrections, fragments and target-only opt-in progress; reload/navigation reset comparison without mode storage.');
  const mobileRoutes=[...locales.flatMap(locale=>[locale+'/',...['quality','authors','about'].map(route=>locale+'/'+route+'/')]),...published.map(edition=>otherLocale+'/'+readerRoute(edition))];
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    for(const route of mobileRoutes){
      await page.goto(base+route);const horizontal_overflow=await overflow();report.mobile.push({route,width_px:width,height_px:844,horizontal_overflow});assert.equal(horizontal_overflow,false,'Mobile overflow: '+route);
      if(route.includes('/read/')){await page.locator('.metadata').first().locator('summary').click();assert.equal(await overflow(),false,'Expanded metadata overflows: '+route);}
      if(await page.locator('.parallel-row').count()){
        await comparisonState(page,false);const before=await passageSnapshot(page);
        await page.locator('#show-original').check();await comparisonState(page,true);
        const comparisonOverflow=await overflow();report.mobile.push({route,width_px:width,height_px:844,state:'original-enabled',horizontal_overflow:comparisonOverflow});
        assert.equal(comparisonOverflow,false,'Enabled mobile comparison overflows: '+route);
        assert.deepEqual(await passageSnapshot(page),before);
        await page.locator('#show-original').uncheck();await comparisonState(page,false);assert.equal(await overflow(),false);
      }
    }
  }
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844},ignoreHTTPSErrors}),fallback=await nojs.newPage();
  await fallback.goto(base+primaryLocale+'/');assert.equal(await fallback.locator('#collection-cards article').count(),publicWorks.length);await fallback.locator('.locale-menu summary').click();await fallback.getByRole('link',{name:localeNames[otherLocale],exact:true}).click();await fallback.waitForURL(base+otherLocale+'/');
  for(const edition of published){
    await fallback.goto(base+primaryLocale+'/'+readerRoute(edition));assert.equal(await fallback.locator('[data-reading-segment]').count(),passagesFor(edition).length);assert.equal(await fallback.locator('a[href*="/downloads/"]').count(),3);
    if(edition.kind==='translation'){
      await comparisonState(fallback,false,{sourceId:edition.source_edition_id,targetId:edition.id});
      const before=await passageSnapshot(fallback),id=passagesFor(edition)[0][0];
      await fallback.locator('[data-target-cell] .passage-tools a[href="#'+id+'"]').click();const hash=new URL(fallback.url()).hash;
      await keyboardComparison(fallback);await comparisonState(fallback,true);assert.equal(await overflow(fallback),false);
      assert.deepEqual(await passageSnapshot(fallback),before);assert.equal(new URL(fallback.url()).hash,hash);
      await keyboardComparison(fallback);await comparisonState(fallback,false);assert.equal(await overflow(fallback),false);
      await fallback.locator('#show-original').check();await fallback.reload();await comparisonState(fallback,false);
    }else assert.equal(await fallback.locator('#show-original').count(),0);
  }
  if(translations.length){
    const edition=translations[0],source=published.find(item=>item.id===edition.source_edition_id);
    await fallback.goto(base+primaryLocale+'/'+readerRoute(source));await fallback.locator('.edition-picker summary').click();await fallback.locator('.edition-picker a[href$="/'+readerRoute(edition)+'"]').click();await fallback.waitForURL(base+primaryLocale+'/'+readerRoute(edition));
  }
  await nojs.close();report.interactions.push('Every published edition, translation-only default, native CSS comparison toggle, locale/edition navigation and JSON/TXT/EPUB links remain usable without JavaScript; comparison resets on reload.');
  if(fixture){
    await page.setViewportSize({width:1440,height:1000});await page.goto(fixture);
    await comparisonState(page,false,{sourceId:'fixture-source',targetId:'fixture-target'});
    const rows=page.locator('.parallel-row');assert.equal(await rows.count(),2);
    assert.equal(await rows.nth(0).locator('[data-source-cell] .segment').count(),2);assert.equal(await rows.nth(0).locator('[data-target-cell] .segment').count(),1);
    assert.equal(await rows.nth(1).locator('[data-source-cell] .segment').count(),1);assert.equal(await rows.nth(1).locator('[data-target-cell] .segment').count(),2);
    assert.equal(await page.locator('[data-reading-segment]').count(),3);
    const before=await passageSnapshot(page),defaultAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();assert.equal(defaultAxe.violations.length,0);
    await keyboardComparison(page);await comparisonState(page,true);assert.deepEqual(await passageSnapshot(page),before);
    const enabledAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();assert.equal(enabledAxe.violations.length,0);
    await page.setViewportSize({width:320,height:844});await comparisonState(page,true);assert.equal(await overflow(),false);
    await page.locator('#show-original').uncheck();await comparisonState(page,false);assert.equal(await overflow(),false);
    const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(node=>node.id));assert.equal(ids.length,new Set(ids).size);
    const fixtureNojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844},ignoreHTTPSErrors}),fixtureFallback=await fixtureNojs.newPage();
    await fixtureFallback.goto(fixture);await comparisonState(fixtureFallback,false);
    await keyboardComparison(fixtureFallback);await comparisonState(fixtureFallback,true);assert.equal(await overflow(fixtureFallback),false);
    await keyboardComparison(fixtureFallback);await comparisonState(fixtureFallback,false);await fixtureNojs.close();
    report.parallel_fixture={status:'passed',scope:'Synthetic many-to-many fixture in a separate temporary copy; never added to the canonical corpus or deployed.',groups:'2 source → 1 target; 1 source → 2 target',default:'Target-only single column',desktop:'Native toggle enables two columns at 1440px',mobile:'Original precedes translation when enabled at 320px; both modes avoid overflow',no_javascript:'Native keyboard toggle works in both directions at 390px',anchors:'Unique IDs; all three target passage permalinks retained',axe_violations:0,axe_states:['translation-only','original-enabled']};
  }
  assert.deepEqual(exceptions,[]);
  const scripts=readdirSync('dist/_astro').filter(file=>file.endsWith('.js')).map(file=>readFileSync('dist/_astro/'+file));
  const inlineFor=path=>[...readFileSync(path,'utf8').matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map(match=>Buffer.from(match[1]));
  const inlineSummary=path=>{const blocks=inlineFor(path);return {blocks:blocks.length,bytes:blocks.reduce((sum,block)=>sum+block.length,0),sum_gzip_bytes:blocks.reduce((sum,block)=>sum+gzipSync(block).length,0)};};
  report.client_javascript={external_files:scripts.length,external_total_bytes:scripts.reduce((sum,block)=>sum+block.length,0),home_inline:inlineSummary('dist/'+primaryLocale+'/index.html'),reader_inline:inlineSummary('dist/'+primaryLocale+'/'+readerRoute(primary)+'index.html'),note:'Script bytes come from local dist, not measured network transfer. External files here means packaged local assets; remote Google Analytics script bytes and subsequent requests are excluded. Inline scripts are counted separately; JSON-LD is excluded. Search-index JSON loads only for a search. Gzip sums are estimates.'};
  report.status='passed';
  report.limitations=['Automated axe checks and keyboard spot checks do not certify complete accessibility conformance.','These are software checks, not real reader feedback or a literary quality review.','Published parallel routes are checked against recorded alignment and exact corpus text; semantic translation fidelity requires a separate literary assessment.'];
  if(!translations.length)report.limitations.push('No translation is currently published; real parallel routes were not available for this run.');
  if(ignoreHTTPSErrors)report.limitations.push('Browser certificate errors were explicitly ignored for this run; this record is not evidence of TLS certificate validity.');
}catch(error){report.status='failed';report.failure=String(error);throw error;}
finally{writeFileSync(output,JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,accessibility_routes:report.accessibility.length,comparison_accessibility_cases:report.comparison_accessibility.length,mobile_cases:report.mobile.length,interactions:report.interactions.length,parallel_editions:report.parallel_editions.length,parallel_fixture:report.parallel_fixture?.status??'not run',report:output}));
