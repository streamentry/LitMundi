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
const report={status:'running',checked_at_utc:new Date().toISOString(),base_url:base,scope:'Browser acceptance against the supplied base URL; no human literary review or reader-demand claim.',versions:{node:process.version,playwright:read(join(modules,'playwright/package.json')).version,axePlaywright:read(join(modules,'@axe-core/playwright/package.json')).version,chromium:browser.version()},interface_locales:locales,public_works:publicWorks.map(work=>work.id),accessibility:[],mobile:[],interactions:[],search_cases:[],excluded_title_cases:[],parallel_editions:[],parallel_fixture:null,content_hashes:published.map(edition=>({edition_id:edition.id,title:editionTitle(works.find(work=>work.id===edition.work_id),edition),review_category:reviewCategory(edition),sha256:createHash('sha256').update(readFileSync(edition.content_path)).digest('hex')})),browser_exceptions:exceptions,browser_https_errors_ignored:ignoreHTTPSErrors};
const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
async function checkTitle(root,work,edition,tag='h1'){
  const title=editionTitle(work,edition),heading=root.locator(tag+'[data-edition-title="'+edition.id+'"]');
  assert.equal(await heading.textContent(),title);assert.equal(await heading.getAttribute('lang'),edition.title?edition.language:work.original_language);
  const original=root.locator('[data-original-title]'),showOriginal=edition.kind==='translation'&&title!==work.title;
  assert.equal(await original.count(),showOriginal?1:0);
  if(showOriginal){assert.equal(await original.textContent(),work.title);assert.equal(await original.getAttribute('lang'),work.original_language);}
}
try{
  const routes=['','quality/',...publicWorks.map(work=>'works/'+work.id+'/'),...published.map(readerRoute)];
  for(const locale of locales)for(const route of routes){
    const response=await page.goto(base+locale+'/'+route);assert.equal(response.status(),200);
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    report.accessibility.push({route:locale+'/'+route,violations:result.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(node=>node.target)}))});
    assert.equal(result.violations.length,0,'Automated accessibility violation: '+locale+'/'+route);
    const edition=published.find(item=>readerRoute(item)===route);
    if(edition){
      const work=works.find(item=>item.id===edition.work_id),title=editionTitle(work,edition);
      await checkTitle(page.locator('.reader-head'),work,edition);
      assert.equal(await page.title(),title+' — '+(languageNames[edition.language]??edition.language)+' · LitMundi');
      const metadata=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());assert.equal(metadata.name,title);
      assert.equal(await page.locator('.notice[data-review-category]').getAttribute('data-review-category'),reviewCategory(edition));
      if(reviewCategory(edition)==='ai'&&typeof edition.review.score==='number')assert.equal(Number(await page.locator('[data-ai-score]').getAttribute('data-ai-score')),edition.review.score);
      for(const navigation of await page.locator('[data-navigation-title]').evaluateAll(nodes=>nodes.map(node=>({editionId:node.dataset.navigationTitle,title:node.textContent,language:node.lang})))){
        const target=published.find(item=>item.id===navigation.editionId);assert.ok(target);const targetWork=works.find(item=>item.id===target.work_id);
        assert.equal(navigation.title,editionTitle(targetWork,target));assert.equal(navigation.language,target.title?target.language:targetWork.original_language);
      }
    }
    const work=publicWorks.find(item=>'works/'+item.id+'/'===route);
    if(work){
      const preferred=preferredFor(work,locale);await checkTitle(page.locator('.reader-head'),work,preferred);assert.equal(await page.title(),editionTitle(work,preferred)+' · LitMundi');
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
      await page.waitForFunction(()=>!document.querySelector('#passage-results').hidden);
      const links=await page.locator('#passage-results a').evaluateAll(links=>links.map(link=>({href:link.getAttribute('href'),title:link.querySelector('span')?.textContent,language:link.querySelector('span')?.lang})));
      const matching=links.filter(link=>link.href.includes('/'+readerRoute(edition)+'#'));assert.ok(matching.length>0,'Search result missing: '+edition.id+' / '+query);
      for(const link of matching){assert.equal(link.title,title,'Search must display the edition title');assert.equal(link.language,edition.title?edition.language:work.original_language);}
      assert.ok(links.every(link=>published.some(item=>item.language===edition.language&&works.find(work=>work.id===item.work_id).author===work.author&&link.href.includes('/'+readerRoute(item)+'#'))),'Search leaked an edition outside the language/author/public filters');
      report.search_cases.push({edition_id:edition.id,language:edition.language,kind,query,displayed_title:title,result_links:links.length,review_category:reviewCategory(edition)});
    }
  }
  report.interactions.push('Full-text and accentless edition/original-title searches reach every published edition and display its own title, with language and author filters.');
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
  for(const language of new Set(published.map(edition=>edition.language))){
    await page.selectOption('#text-language',language);
    const visible=await page.locator('#collection-cards article:visible').evaluateAll(cards=>cards.map(card=>card.dataset.workId));
    assert.deepEqual(visible.sort(),publicWorks.filter(work=>published.some(edition=>edition.work_id===work.id&&edition.language===language)).map(work=>work.id).sort());
  }
  const incompatible=published.flatMap(edition=>publicWorks.filter(work=>!published.some(item=>item.work_id===work.id&&item.language===edition.language)).map(work=>({language:edition.language,author:work.author}))).find(pair=>!published.some(edition=>edition.language===pair.language&&works.find(work=>work.id===edition.work_id).author===pair.author));
  if(incompatible){await page.selectOption('#text-language',incompatible.language);await page.selectOption('#author',incompatible.author);assert.equal(await page.locator('#collection-cards article:visible').count(),0);assert.equal(await page.locator('#search-status').textContent(),await page.locator('#collection-search').getAttribute('data-none'));}
  report.interactions.push('Language filters count works rather than editions; incompatible author/language combinations show the empty state when present.');
  await page.goto(base+primaryLocale+'/'+readerRoute(primary)+'#'+fragment);await page.locator('.locale-menu summary').click();await page.getByRole('link',{name:localeNames[otherLocale],exact:true}).click();await page.waitForURL(base+otherLocale+'/'+readerRoute(primary)+'#'+fragment);report.interactions.push('Changing UI language preserves edition and passage fragment.');
  await page.goto(base+primaryLocale+'/'+readerRoute(primary));assert.equal(await page.locator('#remember-place').isChecked(),false);await page.locator('[id="'+fragment+'"]').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>localStorage.length),0);
  await page.locator('#remember-place').check();await page.locator('[id="'+primaryPassages[Math.min(3,primaryPassages.length-1)][0]+'"]').scrollIntoViewIfNeeded();await page.waitForFunction(key=>Boolean(localStorage.getItem(key)),'litmundi:reading:v1:'+primary.id);await page.reload();assert.equal(await page.locator('#remember-place').isChecked(),true);assert.equal(await page.locator('#resume-reading').isVisible(),true);await page.locator('#clear-progress').click();assert.equal(await page.evaluate(()=>localStorage.length),0);report.interactions.push('Reading position storage is opt-in; save, resume and clear work.');
  for(const edition of translations){
    const source=published.find(item=>item.id===edition.source_edition_id);assert.ok(source);
    const rows=alignedPassages(passagesFor(source),passagesFor(edition),read('corpus/alignments/'+edition.work_id+'/'+edition.id+'.json'));
    await page.setViewportSize({width:1440,height:1000});await page.goto(base+primaryLocale+'/'+readerRoute(edition));
    const actual=await page.locator('.parallel-row').evaluateAll(elements=>elements.map(row=>[...row.querySelectorAll('.parallel-cell')].map(cell=>[...cell.querySelectorAll('.segment')].map(segment=>({id:segment.id,text:segment.querySelector('.prose').textContent,language:segment.querySelector('.prose').lang})))));
    assert.deepEqual(actual,rows.map(row=>[row.source.map(([id,text])=>({id:'source-'+id,text,language:source.language})),row.target.map(([id,text])=>({id,text,language:edition.language}))]));
    const cells=page.locator('.parallel-row').first().locator('.parallel-cell'),left=await cells.nth(0).boundingBox(),right=await cells.nth(1).boundingBox();assert.ok(left.x<right.x);
    for(const [record,cell] of [[source,cells.nth(0)],[edition,cells.nth(1)]]){
      const link=await cell.locator('a[href*="/issues/new?"]').first().getAttribute('href'),body=new URL(link).searchParams.get('body');
      assert.ok(body.includes('Edition ID: '+record.id+'\n'));
    }
    const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(node=>node.id));assert.equal(ids.length,new Set(ids).size);
    report.parallel_editions.push({edition_id:edition.id,source_edition_id:source.id,review_category:reviewCategory(edition),alignment_rows:rows.length,source_passages:passagesFor(source).length,target_passages:passagesFor(edition).length,desktop:'Recorded source/target pairs in two columns at 1440px',anchors:'Unique IDs; source and target correction links identify their own editions'});
  }
  const mobileRoutes=[...locales.flatMap(locale=>[locale+'/',locale+'/quality/']),...published.map(edition=>otherLocale+'/'+readerRoute(edition))];
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    for(const route of mobileRoutes){
      await page.goto(base+route);const horizontal_overflow=await overflow();report.mobile.push({route,width_px:width,height_px:844,horizontal_overflow});assert.equal(horizontal_overflow,false,'Mobile overflow: '+route);
      if(route.includes('/read/')){await page.locator('.metadata').first().locator('summary').click();assert.equal(await overflow(),false,'Expanded metadata overflows: '+route);}
      if(await page.locator('.parallel-row').count()){
        const cells=page.locator('.parallel-row').first().locator('.parallel-cell'),top=await cells.nth(0).boundingBox(),bottom=await cells.nth(1).boundingBox();
        assert.ok(top.y<bottom.y&&Math.abs(top.x-bottom.x)<1,'Parallel original must precede its translation on mobile');
      }
    }
  }
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844},ignoreHTTPSErrors}),fallback=await nojs.newPage();
  await fallback.goto(base+primaryLocale+'/');assert.equal(await fallback.locator('#collection-cards article').count(),publicWorks.length);await fallback.locator('.locale-menu summary').click();await fallback.getByRole('link',{name:localeNames[otherLocale],exact:true}).click();await fallback.waitForURL(base+otherLocale+'/');
  for(const edition of published){
    await fallback.goto(base+primaryLocale+'/'+readerRoute(edition));assert.equal(await fallback.locator('[data-reading-segment]').count(),passagesFor(edition).length);assert.equal(await fallback.locator('a[href*="/downloads/"]').count(),3);
    if(edition.kind==='translation')assert.ok(await fallback.locator('.parallel-row').count()>0);
  }
  if(translations.length){
    const edition=translations[0],source=published.find(item=>item.id===edition.source_edition_id);
    await fallback.goto(base+primaryLocale+'/'+readerRoute(source));await fallback.locator('.edition-picker summary').click();await fallback.locator('.edition-picker a[href$="/'+readerRoute(edition)+'"]').click();await fallback.waitForURL(base+primaryLocale+'/'+readerRoute(edition));
  }
  await nojs.close();report.interactions.push('Every published edition, real parallel reading, locale/edition navigation and JSON/TXT/EPUB links remain usable without JavaScript.');
  if(fixture){
    await page.setViewportSize({width:1440,height:1000});await page.goto(fixture);
    const rows=page.locator('.parallel-row');assert.equal(await rows.count(),2);
    assert.equal(await rows.nth(0).locator('.parallel-cell').nth(0).locator('.segment').count(),2);assert.equal(await rows.nth(0).locator('.parallel-cell').nth(1).locator('.segment').count(),1);
    assert.equal(await rows.nth(1).locator('.parallel-cell').nth(0).locator('.segment').count(),1);assert.equal(await rows.nth(1).locator('.parallel-cell').nth(1).locator('.segment').count(),2);
    assert.equal(await page.locator('[data-reading-segment]').count(),3);
    const left=await rows.first().locator('.parallel-cell').nth(0).boundingBox(),right=await rows.first().locator('.parallel-cell').nth(1).boundingBox();assert.ok(left.x<right.x);
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();assert.equal(axe.violations.length,0);
    await page.setViewportSize({width:320,height:844});assert.equal(await overflow(),false);
    const top=await rows.first().locator('.parallel-cell').nth(0).boundingBox(),bottom=await rows.first().locator('.parallel-cell').nth(1).boundingBox();assert.ok(top.y<bottom.y&&Math.abs(top.x-bottom.x)<1);
    const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(node=>node.id));assert.equal(ids.length,new Set(ids).size);
    report.parallel_fixture={status:'passed',scope:'Synthetic many-to-many fixture in a separate temporary copy; never added to the canonical corpus or deployed.',groups:'2 source → 1 target; 1 source → 2 target',desktop:'Two columns at 1440px',mobile:'Original precedes translation at 320px; no overflow',anchors:'Unique IDs; all three target passage permalinks retained',axe_violations:0};
  }
  assert.deepEqual(exceptions,[]);
  const scripts=readdirSync('dist/_astro').filter(file=>file.endsWith('.js')).map(file=>readFileSync('dist/_astro/'+file));
  const inlineFor=path=>[...readFileSync(path,'utf8').matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map(match=>Buffer.from(match[1]));
  const inlineSummary=path=>{const blocks=inlineFor(path);return {blocks:blocks.length,bytes:blocks.reduce((sum,block)=>sum+block.length,0),sum_gzip_bytes:blocks.reduce((sum,block)=>sum+gzipSync(block).length,0)};};
  report.client_javascript={external_files:scripts.length,external_total_bytes:scripts.reduce((sum,block)=>sum+block.length,0),home_inline:inlineSummary('dist/'+primaryLocale+'/index.html'),reader_inline:inlineSummary('dist/'+primaryLocale+'/'+readerRoute(primary)+'index.html'),note:'Script bytes come from local dist, not measured network transfer. Inline scripts are separate from external assets; JSON-LD is excluded. Search-index JSON loads only for a search. Gzip sums are estimates.'};
  report.status='passed';
  report.limitations=['Automated axe checks and keyboard spot checks do not certify complete accessibility conformance.','These are software checks, not real reader feedback or a literary quality review.','Published parallel routes are checked against recorded alignment and exact corpus text; semantic translation fidelity requires a separate literary assessment.'];
  if(!translations.length)report.limitations.push('No translation is currently published; real parallel routes were not available for this run.');
  if(ignoreHTTPSErrors)report.limitations.push('Browser certificate errors were explicitly ignored for this run; this record is not evidence of TLS certificate validity.');
}catch(error){report.status='failed';report.failure=String(error);throw error;}
finally{writeFileSync(output,JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({status:report.status,accessibility_routes:report.accessibility.length,mobile_cases:report.mobile.length,interactions:report.interactions.length,parallel_editions:report.parallel_editions.length,parallel_fixture:report.parallel_fixture?.status??'not run',report:output}));
