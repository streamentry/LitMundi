import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {alignedPassages,isPublicEdition,reviewCategory,editionTitle,preferredEdition} from './lib/reader-data.mjs';

const base='/LitMundi/',origin='https://streamentry.github.io';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const locales=Object.keys(read('src/lib/locales.json'));
const languageNames=read('corpus/catalog/languages.json');
const works=read('corpus/catalog/works.json'),editions=read('corpus/catalog/editions.json');
const published=editions.filter(edition=>isPublicEdition(edition,works.find(work=>work.id===edition.work_id)));
const comparisonPages=new Set(published.filter(edition=>edition.kind==='translation').flatMap(edition=>locales.flatMap(locale=>[edition.id,...edition.legacy_slugs].map(slug=>join('dist',locale,'read',edition.work_id,slug,'index.html')))));
const visible=works.filter(work=>published.some(edition=>edition.work_id===work.id));
const samples=editions.filter(edition=>edition.status==='sample'&&works.some(work=>work.id===edition.work_id&&work.visibility==='demo'));
const passagesFor=edition=>{const text=read(edition.content_path);return read('corpus/structure/'+edition.work_id+'.json').segment_ids.map(id=>[id,text[id]]);};
const files=[];
function visit(directory){for(const entry of readdirSync(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isDirectory())visit(path);else files.push(path);}}
visit('dist');
const required=['dist/index.html','dist/404.html','dist/favicon.svg','dist/sitemap-index.xml','dist/sitemap.xml','dist/robots.txt','dist/search-index.json',...locales.flatMap(locale=>['dist/'+locale+'/index.html',...['quality','authors','about'].map(page=>'dist/'+locale+'/'+page+'/index.html')])];
for(const path of required)assert.ok(existsSync(path),'Missing build output: '+path);
const decode=text=>text.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi,(match,entity)=>{
  if(entity.startsWith('#x'))return String.fromCodePoint(parseInt(entity.slice(2),16));
  if(entity.startsWith('#'))return String.fromCodePoint(Number(entity.slice(1)));
  return ({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'})[entity]??match;
});
const attrs=value=>Object.fromEntries([...value.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match=>[match[1],decode(match[2])]));
const hasAttribute=(value,name)=>new RegExp('(?:^|\\s)'+name+'(?:\\s|=|/|$)','i').test(value);
const textContent=value=>decode(value.replace(/<[^>]*>/g,''));
const elements=(html,tag)=>[...html.matchAll(new RegExp('<'+tag+'\\b([^>]*)>([\\s\\S]*?)<\\/'+tag+'>','g'))].map(match=>({rawAttributes:match[1],attributes:attrs(match[1]),body:match[2],text:textContent(match[2])}));
function verifyComparison(html,edition,source,rows){
  const controls=[...html.matchAll(/<input\b([^>]*)>/g)].map(match=>({rawAttributes:match[1],attributes:attrs(match[1])})).filter(input=>input.attributes.id==='show-original');
  const labels=elements(html,'label').filter(label=>label.attributes.for==='show-original');
  const articles=elements(html,'article').filter(article=>article.attributes.id==='parallel-text');
  const markedCells=elements(html,'section').filter(cell=>hasAttribute(cell.rawAttributes,'data-source-cell')||hasAttribute(cell.rawAttributes,'data-target-cell'));
  if(!source){
    assert.equal(controls.length+labels.length+articles.length+markedCells.length,0,'Source-only readers must not contain an original-comparison toggle or cells: '+edition.id);
    return;
  }
  assert.equal(controls.length,1,'Translation requires one native original-comparison checkbox: '+edition.id);
  const control=controls[0];
  assert.equal(control.attributes.type,'checkbox','Original comparison must use a native checkbox');
  assert.ok(!hasAttribute(control.rawAttributes,'checked'),'Original comparison must be unchecked in the initial HTML');
  assert.ok(!hasAttribute(control.rawAttributes,'hidden')&&!hasAttribute(control.rawAttributes,'disabled')&&control.attributes['aria-hidden']!=='true','Original-comparison control must not be explicitly hidden or disabled');
  assert.equal(control.attributes.autocomplete,'off','Comparison choice must not restore a saved checkbox state');
  assert.equal(control.attributes['aria-controls'],'parallel-text','Comparison checkbox must identify its reader article');
  assert.equal(labels.length,1,'Original-comparison checkbox needs one associated label');
  assert.ok(labels[0].text.trim().length>0&&!hasAttribute(labels[0].rawAttributes,'hidden')&&labels[0].attributes['aria-hidden']!=='true','Comparison label must contain text and must not be explicitly hidden');
  assert.equal(articles.length,1,'Translation requires one controlled parallel-text article');
  const cells=elements(articles[0].body,'section').filter(cell=>hasAttribute(cell.rawAttributes,'data-source-cell')||hasAttribute(cell.rawAttributes,'data-target-cell'));
  assert.equal(markedCells.length,cells.length,'Comparison cells must belong to the controlled article');
  assert.equal(cells.length,rows.length*2,'Each alignment row needs exactly one source and one target cell');
  const idsIn=cell=>[...cell.body.matchAll(/<div\b([^>]*\bclass="segment"[^>]*)>/g)].map(match=>attrs(match[1]).id);
  for(const [index,row] of rows.entries()){
    const original=cells[index*2],target=cells[index*2+1];
    assert.equal(original.attributes['data-source-cell'],source.id,'Original cell must retain its source edition identity');
    assert.ok(!hasAttribute(original.rawAttributes,'data-target-cell'),'An original cell cannot also be marked as a target');
    assert.equal(target.attributes['data-target-cell'],edition.id,'Target cell must retain its selected edition identity');
    assert.ok(!hasAttribute(target.rawAttributes,'data-source-cell'),'A target cell cannot also be marked as an original');
    assert.deepEqual(idsIn(original),row.source.map(([id])=>'source-'+id),'Original comparison cell differs from the recorded alignment');
    assert.deepEqual(idsIn(target),row.target.map(([id])=>id),'Target comparison cell differs from the recorded alignment');
  }
}
function verifyTitle(html,work,edition,tag='h1',pageTitle){
  const title=editionTitle(work,edition),language=edition.title?edition.language:work.original_language;
  const heading=elements(html,tag).find(element=>element.attributes['data-edition-title']===edition.id);
  assert.ok(heading,'Missing edition title heading: '+edition.id);
  assert.equal(heading.text,title,'Heading must use the selected edition title: '+edition.id);
  assert.equal(heading.attributes.lang,language,'Wrong title language: '+edition.id);
  const originals=elements(html,'span').filter(element=>element.rawAttributes.includes('data-original-title'));
  const showOriginal=edition.kind==='translation'&&title!==work.title;
  assert.equal(originals.length,showOriginal?1:0,'Original title subtitle must accompany a translated title');
  if(showOriginal){assert.equal(originals[0].text,work.title);assert.equal(originals[0].attributes.lang,work.original_language);}
  if(pageTitle!==undefined){
    assert.equal(elements(html,'title')[0]?.text,pageTitle+' · LitMundi','Browser title must use the selected edition title');
    const og=[...html.matchAll(/<meta\b([^>]*)>/g)].map(match=>attrs(match[1])).find(meta=>meta.property==='og:title');
    assert.equal(og?.content,pageTitle+' · LitMundi','Open Graph title must use the selected edition title');
  }
}
const pathFor=url=>{
  assert.ok(url.pathname.startsWith(base),'Internal link escapes Pages base: '+url.href);
  const path=join('dist',decodeURIComponent(url.pathname.slice(base.length)));
  return url.pathname.endsWith('/')?join(path,'index.html'):existsSync(path)&&statSync(path).isDirectory()?join(path,'index.html'):path;
};
const htmlFiles=files.filter(file=>file.endsWith('.html'));
let checkedLinks=0;
for(const file of htmlFiles){
  const html=readFileSync(file,'utf8');
  if(!comparisonPages.has(file))verifyComparison(html,{id:relative('dist',file)},null,[]);
  const pageURL=new URL(base+relative('dist',file).replace(/index\.html$/,''),origin);
  const ids=[...html.matchAll(/\bid="([^"]*)"/g)].map(match=>decode(match[1]));
  assert.equal(ids.length,new Set(ids).size,'Duplicate HTML IDs: '+file);
  assert.match(html,/<html\b[^>]*lang=/,'Missing document language: '+file);
  assert.match(html,/<meta\b[^>]*name="viewport"/,'Missing mobile viewport: '+file);
  for(const match of html.matchAll(/\b(?:href|src)="([^"]*)"/g)){
    const value=decode(match[1]);
    assert.ok(!/^javascript:/i.test(value),'Executable URL: '+file);
    if(!value||/^(?:mailto:|tel:|data:)/.test(value))continue;
    const url=new URL(value,pageURL);if(url.origin!==origin)continue;
    const target=pathFor(url);
    assert.ok(existsSync(target),'Broken local link in '+file+': '+value);
    assert.ok(resolve(target).startsWith(resolve('dist')+'/'),'Local route escapes dist');
    if(url.hash&&target.endsWith('.html')){
      const targetHTML=readFileSync(target,'utf8'),fragment=decodeURIComponent(url.hash.slice(1));
      const targetIds=[...targetHTML.matchAll(/\bid="([^"]*)"/g)].map(entry=>decode(entry[1]));
      assert.ok(targetIds.includes(fragment),'Broken passage/anchor in '+file+': '+value);
    }
    checkedLinks++;
  }
  if(!file.endsWith('/404.html')){
    assert.match(html,/<link\b[^>]*rel="canonical"/,'Canonical missing: '+file);
    assert.ok(html.includes('href="#main"'),'Skip navigation missing: '+file);
  }
}
// Parse namespaces and XML entities with a real parser. Its inventory is derived
// independently from the corpus, then checked against every built HTML canonical.
const seoReport=JSON.parse(execFileSync('python3',['scripts/verify-seo.py','--json'],{encoding:'utf8',maxBuffer:64*1024*1024}));
const indexed=seoReport.urls;
const sitemap=seoReport.child_sitemaps.map(name=>readFileSync('dist/'+name,'utf8')).join('\n');
const search=read('dist/search-index.json');
assert.deepEqual(search.map(item=>item.editionId).sort(),published.map(edition=>edition.id).sort(),'Search must contain all and only public editions');
const downloadNames=published.flatMap(edition=>['json','txt','epub','tsv'].map(format=>edition.id+'.'+format));
assert.deepEqual(read('dist/downloads/manifest.json').files.map(file=>file.path).sort(),[...downloadNames].sort(),'Download manifest must contain exactly public editions');
assert.deepEqual(readdirSync('dist/downloads').sort(),[...downloadNames,'manifest.json'].sort(),'Unexpected public download output');
for(const edition of published){
  const work=works.find(item=>item.id===edition.work_id),title=editionTitle(work,edition);
  const passages=passagesFor(edition),ids=passages.map(([id])=>id),category=reviewCategory(edition);
  const source=edition.kind==='translation'?published.find(e=>e.id===edition.source_edition_id):null;
  assert.ok(edition.kind!=='translation'||source,'Published translation must have a public source: '+edition.id);
  const sourcePassages=source?passagesFor(source):[];
  const rows=source?alignedPassages(sourcePassages,passages,read('corpus/alignments/'+edition.work_id+'/'+edition.id+'.json')):[];
  const entry=search.find(item=>item.editionId===edition.id);
  assert.equal(entry.workId,edition.work_id);assert.equal(entry.language,edition.language);assert.equal(entry.reviewCategory,category);
  assert.equal(entry.title,title,'Search must display the edition title');assert.equal(entry.originalTitle,work.title,'Original title must remain searchable');
  assert.equal(entry.titleLanguage,edition.title?edition.language:work.original_language);
  assert.deepEqual(entry.passages,passages,'Search must preserve canonical passage order and text');
  for(const locale of locales){
    const file='dist/'+locale+'/read/'+edition.work_id+'/'+edition.id+'/index.html';
    assert.ok(existsSync(file),'Published edition missing: '+file);
    const raw=readFileSync(file,'utf8'),html=decode(raw);
    verifyTitle(raw,work,edition,'h1',title+' — '+work.author+' · '+(languageNames[edition.language]??edition.language));
    verifyComparison(raw,edition,source,rows);
    const segments=[...raw.matchAll(/<div\b([^>]*\bclass="segment"[^>]*)>\s*<p\b([^>]*)>([\s\S]*?)<\/p>/g)].map(match=>({attributes:attrs(match[1]),language:attrs(match[2]).lang,text:decode(match[3])}));
    assert.equal(segments.length,passages.length+sourcePassages.length,'Unexpected passage count: '+file);
    for(const [id,text] of passages){
      const segment=segments.find(item=>item.attributes.id===id);
      assert.ok(segment,'Canonical passage missing: '+id);assert.equal(segment.text,text,'Published text incomplete: '+id);
      assert.equal(segment.language,edition.language);assert.equal(segment.attributes['data-reading-segment'],id);
    }
    for(const [id,text] of sourcePassages){
      const segment=segments.find(item=>item.attributes.id==='source-'+id);
      assert.ok(segment,'Parallel original passage missing: '+id);assert.equal(segment.text,text,'Parallel source differs from canonical text: '+id);
      assert.equal(segment.language,source.language);assert.equal(segment.attributes['data-reading-segment'],undefined,'Original must not double-count reading progress');
    }
    assert.equal([...raw.matchAll(/class="parallel-row"/g)].length,rows.length,'Parallel rows must follow explicit alignment: '+file);
    const expectedOrder=source?rows.flatMap(row=>[...row.source.map(([id])=>'source-'+id),...row.target.map(([id])=>id)]):ids;
    assert.deepEqual(segments.map(item=>item.attributes.id),expectedOrder,'Rendered passage groups differ from recorded alignment: '+file);
    assert.ok(raw.includes('data-review-category="'+category+'"'),'Incorrect review disclosure: '+file);
    if(edition.publication_policy)assert.ok(raw.includes('data-publication-policy="'+edition.publication_policy+'"'),'Missing publication policy: '+file);
    if(category==='ai'&&typeof edition.review.score==='number')assert.ok(raw.includes('data-ai-score="'+edition.review.score+'"'),'AI score must match selected current review metadata: '+file);
    else assert.ok(!raw.includes('data-ai-score='),'A source or human review must not be described as an AI score');
    assert.ok(html.includes('application/ld+json'),'Edition structured metadata missing');
    const jsonLD=raw.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(jsonLD,'Missing structured data script');
    const metadata=JSON.parse(jsonLD[1]);assert.equal(metadata.identifier,edition.id);assert.equal(metadata.inLanguage,edition.language);
    assert.equal(metadata.name,title,'Structured metadata must use the edition title');
    assert.equal(metadata.alternateName,edition.kind==='translation'&&title!==work.title?work.title:undefined,'Structured metadata must retain the original title when translated');
    const citedSource=source??edition;
    const sourceCitations=elements(raw,'span').filter(element=>element.attributes['data-provenance-source-citation']);
    assert.equal(sourceCitations.length,1,'Provenance must identify one source bibliography');
    assert.equal(sourceCitations[0].attributes['data-provenance-source-citation'],citedSource.id);
    assert.equal(sourceCitations[0].text,citedSource.provenance.citation,'Source witness must not be replaced by a translation-process note');
    for(const [marker,expected] of [['data-provenance-source-catalog',citedSource.provenance.catalog_url],['data-provenance-source-witness',citedSource.provenance.text_url]]){
      const links=elements(raw,'a').filter(element=>element.attributes[marker]);
      assert.deepEqual(links.map(link=>[link.attributes[marker],link.attributes.href]),expected?[[citedSource.id,expected]]:[]);
    }
    const creationRecords=elements(raw,'dd').filter(element=>element.attributes['data-edition-creation-record']);
    assert.equal(creationRecords.length,edition.kind==='translation'?1:0);
    if(creationRecords.length)assert.ok(creationRecords[0].text.includes(edition.provenance.citation),'Retain the edition creation record separately');
    const position=visible.findIndex(item=>item.id===work.id);
    const neighbors=[['previous',visible[position-1]],['next',visible[position+1]]].filter(([,item])=>item);
    const navigationLinks=elements(raw,'a').filter(element=>element.attributes['data-navigation-direction']);
    assert.equal(navigationLinks.length,neighbors.length);
    for(const [direction,targetWork] of neighbors){
      const target=preferredEdition(published.filter(item=>item.work_id===targetWork.id),edition.language,targetWork.original_language);
      const link=navigationLinks.find(item=>item.attributes['data-navigation-direction']===direction);
      assert.ok(link,'Missing neighboring work link');
      assert.equal(link.attributes['data-navigation-edition'],target.id,'Reading-language selection must be independent of the interface language');
      assert.equal(link.attributes['data-navigation-language'],target.language);
      assert.equal(link.attributes.href,base+locale+'/read/'+targetWork.id+'/'+target.id+'/');
      const label=elements(link.body,'span').find(item=>hasAttribute(item.rawAttributes,'data-navigation-language-label'));
      assert.equal(label?.text,languageNames[target.language]??target.language,'Fallback text language must be visible');
      assert.equal(label?.attributes.lang,target.language);
    }
    for(const cell of [...raw.matchAll(/<section\b([^>]*)>/g)].map(match=>attrs(match[1])).filter(item=>item['data-source-cell']||item['data-target-cell'])){
      assert.equal(cell['aria-label'],undefined,'Paragraph cells must not create repeated language-named landmarks');
    }
    for(const navigation of elements(raw,'span').filter(element=>element.attributes['data-navigation-title'])){
      const target=published.find(item=>item.id===navigation.attributes['data-navigation-title']);assert.ok(target,'Navigation must select a published edition');
      const targetWork=works.find(item=>item.id===target.work_id);
      assert.equal(navigation.text,editionTitle(targetWork,target),'Work navigation must use its selected edition title');
      assert.equal(navigation.attributes.lang,target.title?target.language:targetWork.original_language);
    }
    if(category==='ai'){
      assert.equal(metadata.creativeWorkStatus,'AI-reviewed publication');
      assert.equal(metadata.translator,undefined,'AI must not be represented as a human translator in structured metadata');
      assert.equal(metadata.aggregateRating,undefined,'AI assessment is not a reader rating');
    }
    const correctionLinks=[...html.matchAll(/href="(https:\/\/github\.com\/streamentry\/LitMundi\/issues\/new\?[^"]+)"/g)];
    for(const [record,items] of [[edition,passages],...(source?[[source,sourcePassages]]:[])])for(const [id] of items)assert.ok(correctionLinks.some(match=>{
      const body=new URL(match[1]).searchParams.get('body')??'';return body.includes('Edition ID: '+record.id+'\n')&&body.includes('Segment ID: '+id+'\n');
    }),'Missing source/target passage correction context: '+record.id+' / '+id);
  }
  for(const format of ['json','txt','epub','tsv'])assert.ok(existsSync('dist/downloads/'+edition.id+'.'+format),'Published download missing: '+edition.id+'.'+format);
}
const publicText=[...published,...samples].flatMap(edition=>Object.values(read(edition.content_path)));
for(const edition of editions.filter(e=>!published.includes(e)&&!samples.includes(e))){
  for(const locale of locales)for(const slug of [edition.id,...edition.legacy_slugs])assert.ok(!existsSync('dist/'+locale+'/read/'+edition.work_id+'/'+slug+'/index.html'),'Unpublished edition has a reading route: '+edition.id);
  for(const format of ['json','txt','epub','tsv'])assert.ok(!existsSync('dist/downloads/'+edition.id+'.'+format),'Unpublished edition leaked into downloads: '+edition.id);
  if(!edition.content_path)continue;
  const paragraphs=Object.values(read(edition.content_path)).filter(text=>text.length>40&&!publicText.some(publishedText=>publishedText.includes(text)));
  for(const file of files.filter(path=>/\.(?:html|js|json|txt|tsv|xml)$/.test(path))){
    const content=decode(readFileSync(file,'utf8'));
    for(const paragraph of paragraphs)assert.ok(!content.includes(paragraph)&&!content.includes(JSON.stringify(paragraph).slice(1,-1)),'Draft text leaked into '+file);
  }
}
for(const sample of samples)for(const locale of locales)for(const slug of [sample.id,...sample.legacy_slugs]){
  const path='dist/'+locale+'/read/'+sample.work_id+'/'+slug+'/index.html';
  assert.ok(existsSync(path),'Legacy/sample route must remain: '+path);
  const html=readFileSync(path,'utf8');assert.match(html,/name="robots"[^>]*noindex/,'Sample must remain noindex');
  assert.ok(!sitemap.includes(sample.id)&&!sitemap.includes('/read/'+sample.work_id+'/'),'Sample in sitemap');
}
for(const locale of locales){
  const home=readFileSync('dist/'+locale+'/index.html','utf8');
  assert.equal([...home.matchAll(/data-work-id="/g)].length,visible.length,'One catalog card per work, even with multiple editions');
  const cards=[...home.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/g)].map(match=>({attributes:attrs(match[1]),html:match[2]}));
  for(const work of visible){
    const available=published.filter(edition=>edition.work_id===work.id),preferred=preferredEdition(available,locale,work.original_language);
    const card=cards.find(item=>item.attributes['data-work-id']===work.id);assert.ok(card,'Catalog card missing: '+work.id);
    verifyTitle(card.html,work,preferred,'h3');
    const details=readFileSync('dist/'+locale+'/works/'+work.id+'/index.html','utf8');
    verifyTitle(details,work,preferred,'h1',editionTitle(work,preferred)+' — '+work.author);
    const listed=elements(details,'h3').filter(element=>element.attributes['data-edition-title']);
    assert.deepEqual(listed.map(element=>element.attributes['data-edition-title']).sort(),available.map(edition=>edition.id).sort(),'Edition title list must contain only published editions');
    for(const edition of available){const heading=listed.find(element=>element.attributes['data-edition-title']===edition.id);assert.equal(heading.text,editionTitle(work,edition));assert.equal(heading.attributes.lang,edition.title?edition.language:work.original_language);}
  }
}
console.log('Verified '+htmlFiles.length+' HTML pages, '+checkedLinks+' local links/anchors, '+indexed.length+' sitemap routes, '+published.length+' complete public editions and '+published.filter(e=>e.kind==='translation').length+' aligned translations with unchecked original-comparison controls. Unpublished routes, unique draft text, search entries and downloads remain excluded. Static HTML checks do not establish computed CSS visibility or toggle interaction.');
