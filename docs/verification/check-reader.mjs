/** Optional browser acceptance check. See README.md in this directory. */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
const modules=process.env.LITMUNDI_BROWSER_TOOLS??'/tmp/litmundi-browsercheck/node_modules';
const {chromium}=await import(pathToFileURL(join(modules,'playwright/index.mjs')));
const {default:AxeBuilder}=await import(pathToFileURL(join(modules,'@axe-core/playwright/dist/index.mjs')));
const base=(process.argv[2]??'http://127.0.0.1:4321/LitMundi/').replace(/\/?$/,'/');
const output=process.argv[3]??'/tmp/litmundi-reader-check.json';
const fixture=process.env.LITMUNDI_PARALLEL_FIXTURE_URL;
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const works=read('corpus/catalog/works.json');
const editions=read('corpus/catalog/editions.json');
const published=editions.filter(e=>e.status==='published'&&works.some(w=>w.id===e.work_id&&w.visibility==='public'));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
const exceptions=[];page.on('pageerror',error=>exceptions.push(error.message));
const report={status:'running',base_url:base,scope:'Local production build; no human literary review or reader-demand claim.',versions:{node:process.version,playwright:read(join(modules,'playwright/package.json')).version,axePlaywright:read(join(modules,'@axe-core/playwright/package.json')).version,chromium:browser.version()},accessibility:[],mobile:[],interactions:[],parallel_fixture:null,source_hashes:published.map(e=>({edition_id:e.id,sha256:createHash('sha256').update(readFileSync(e.content_path)).digest('hex')})),browser_exceptions:exceptions};
const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
try{
  for(const locale of ['en','vi','fr','es'])for(const route of ['', 'quality/',...published.flatMap(e=>['works/'+e.work_id+'/','read/'+e.work_id+'/'+e.id+'/'])]){
    await page.goto(base+locale+'/'+route);
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    report.accessibility.push({route:locale+'/'+route,violations:result.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}))});
    assert.equal(result.violations.length,0,'Automated accessibility violation: '+locale+'/'+route);
  }
  await page.goto(base+'en/');await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('href'),'#main');report.interactions.push('Keyboard first-tab skip link targets main content.');
  assert.equal(await page.locator('#collection-cards article').count(),published.length);
  for(const [query,work] of [['bronze','wilde-the-artist'],['agulha','machado-um-apologo'],['encaje','pardo-bazan-el-encaje-roto']]){
    await page.locator('#query').fill(query);await page.getByRole('button',{name:'Search',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('#passage-results').hidden);
    const hrefs=await page.locator('#passage-results a').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
    assert.ok(hrefs.length>0&&hrefs.every(href=>href.includes('/read/'+work+'/')));
  }
  report.interactions.push('Full-text searches find the intended English, Portuguese and Spanish source works.');
  await page.locator('#query').fill('unfindable-random-785632');await page.getByRole('button',{name:'Search',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#search-status').textContent.includes('No published text'));assert.equal(await page.locator('#collection-cards article:visible').count(),0);report.interactions.push('An absent query shows an explicit empty result, not draft text.');
  await page.selectOption('#text-language','pt');assert.equal(await page.locator('#collection-cards article:visible').count(),1);
  const spanish=works.find(w=>w.id==='pardo-bazan-el-encaje-roto');await page.selectOption('#author',spanish.author);assert.equal(await page.locator('#collection-cards article:visible').count(),0);assert.match(await page.locator('#search-status').textContent(),/No published text/);report.interactions.push('Author/language filters combine and incompatible filters show the empty state.');
  const wilde='read/wilde-the-artist/wilde-artist-en-methuen-1913/';
  await page.goto(base+'en/'+wilde+'#wilde-the-artist:1.3');await page.locator('.locale-menu summary').click();await page.getByRole('link',{name:'Tiếng Việt',exact:true}).click();await page.waitForURL('**/vi/'+wilde+'#wilde-the-artist:1.3');report.interactions.push('Changing UI language preserves edition and passage fragment.');
  await page.goto(base+'en/'+wilde);assert.equal(await page.locator('#remember-place').isChecked(),false);await page.locator('[id="wilde-the-artist:1.3"]').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>localStorage.length),0);
  await page.locator('#remember-place').check();await page.locator('[id="wilde-the-artist:1.4"]').scrollIntoViewIfNeeded();await page.waitForFunction(()=>localStorage.getItem('litmundi:reading:v1:wilde-artist-en-methuen-1913'));await page.reload();assert.equal(await page.locator('#remember-place').isChecked(),true);assert.equal(await page.locator('#resume-reading').isVisible(),true);await page.locator('#clear-progress').click();assert.equal(await page.evaluate(()=>localStorage.length),0);report.interactions.push('Reading position storage is opt-in; save, resume and clear work.');
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    for(const route of ['en/','vi/','vi/quality/',...published.map(e=>'vi/read/'+e.work_id+'/'+e.id+'/')]){
      await page.goto(base+route);const horizontal_overflow=await overflow();report.mobile.push({route,width_px:width,height_px:844,horizontal_overflow});assert.equal(horizontal_overflow,false,'Mobile overflow: '+route);
      if(route.includes('/read/')){await page.locator('.metadata').first().locator('summary').click();assert.equal(await overflow(),false,'Expanded metadata overflows: '+route);}
    }
  }
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),fallback=await nojs.newPage();
  await fallback.goto(base+'vi/');assert.ok(await fallback.locator('#collection-cards a').count()>0);await fallback.locator('.locale-menu summary').click();await fallback.getByRole('link',{name:'Français',exact:true}).click();await fallback.waitForURL('**/fr/');
  for(const edition of published){await fallback.goto(base+'en/read/'+edition.work_id+'/'+edition.id+'/');assert.equal(await fallback.locator('[data-reading-segment]').count(),Object.keys(read(edition.content_path)).length);assert.equal(await fallback.locator('a[href*="/downloads/"]').count(),3);}
  await nojs.close();report.interactions.push('All three complete sources, language navigation and JSON/TXT/EPUB links remain usable without JavaScript.');
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
  const inlineSummary=path=>{const blocks=inlineFor(path);return {blocks:blocks.length,bytes:blocks.reduce((sum,b)=>sum+b.length,0),sum_gzip_bytes:blocks.reduce((sum,b)=>sum+gzipSync(b).length,0)};};
  report.client_javascript={external_files:scripts.length,external_total_bytes:scripts.reduce((sum,b)=>sum+b.length,0),home_inline:inlineSummary('dist/en/index.html'),reader_inline:inlineSummary('dist/en/read/wilde-the-artist/wilde-artist-en-methuen-1913/index.html'),note:'Executable inline script bytes counted separately from external assets; JSON-LD excluded. Search-index JSON is loaded only when search runs. Gzip sums are estimates, not measured network transfer.'};
  report.status='passed';
  report.limitations=['Automated axe checks and keyboard spot checks do not certify complete accessibility conformance.','These are software checks, not real reader feedback or a literary quality review.','No real translation has been published. Parallel rendering uses only the isolated synthetic fixture when supplied.'];
}finally{
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');await browser.close();
}
console.log(JSON.stringify({status:report.status,accessibility_routes:report.accessibility.length,mobile_cases:report.mobile.length,interactions:report.interactions.length,parallel_fixture:report.parallel_fixture?.status??'not run',report:output}));
