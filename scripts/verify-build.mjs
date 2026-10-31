import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import assert from 'node:assert/strict';

const base='/LitMundi/',origin='https://streamentry.github.io';
const locales=['en','vi','fr','es'];
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const works=read('corpus/catalog/works.json'),editions=read('corpus/catalog/editions.json');
const visible=works.filter(work=>work.visibility==='public'&&editions.some(edition=>edition.work_id===work.id&&edition.status==='published'));
const published=editions.filter(edition=>edition.status==='published'&&visible.some(work=>work.id===edition.work_id));
const files=[];
function visit(directory){for(const entry of readdirSync(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isDirectory())visit(path);else files.push(path);}}
visit('dist');
const required=['dist/index.html','dist/404.html','dist/favicon.svg','dist/sitemap.xml','dist/robots.txt','dist/search-index.json',...locales.flatMap(locale=>['dist/'+locale+'/index.html','dist/'+locale+'/quality/index.html'])];
for(const path of required)assert.ok(existsSync(path),'Missing build output: '+path);
const decode=text=>text.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi,(match,entity)=>{
  if(entity.startsWith('#x'))return String.fromCodePoint(parseInt(entity.slice(2),16));
  if(entity.startsWith('#'))return String.fromCodePoint(Number(entity.slice(1)));
  return ({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'})[entity]??match;
});
const pathFor=url=>{
  assert.ok(url.pathname.startsWith(base),'Internal link escapes Pages base: '+url.href);
  const path=join('dist',decodeURIComponent(url.pathname.slice(base.length)));
  return url.pathname.endsWith('/')?join(path,'index.html'):existsSync(path)&&statSync(path).isDirectory()?join(path,'index.html'):path;
};
const htmlFiles=files.filter(file=>file.endsWith('.html'));
let checkedLinks=0;
for(const file of htmlFiles){
  const html=readFileSync(file,'utf8');
  const pageURL=new URL(base+relative('dist',file).replace(/index\.html$/,''),origin);
  const ids=[...html.matchAll(/\bid="([^"]*)"/g)].map(match=>decode(match[1]));
  assert.equal(ids.length,new Set(ids).size,'Duplicate HTML IDs: '+file);
  assert.match(html,/<html\b[^>]*lang=/,'Missing document language: '+file);
  assert.match(html,/<meta\b[^>]*name="viewport"/,'Missing mobile viewport: '+file);
  assert.ok(!/(?:href|src)=["']\/(?:en|vi|fr|es|favicon\.svg)(?:\/|["'])/.test(html),'Incorrect root-relative URL: '+file);
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
const sitemap=readFileSync('dist/sitemap.xml','utf8');
const indexed=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>decode(match[1]));
assert.equal(indexed.length,new Set(indexed).size,'Duplicate sitemap entries');
const expected=new Set(locales.flatMap(locale=>[
  origin+base+locale+'/',origin+base+locale+'/quality/',
  ...visible.map(work=>origin+base+locale+'/works/'+work.id+'/'),
  ...published.map(edition=>origin+base+locale+'/read/'+edition.work_id+'/'+edition.id+'/')
]));
assert.deepEqual(new Set(indexed),expected,'Sitemap must contain exactly canonical public routes');
for(const url of indexed){
  const path=pathFor(new URL(url)),html=readFileSync(path,'utf8');
  assert.ok(!/name="robots"[^>]*content="[^"]*noindex/.test(html),'Sitemap contains noindex page: '+url);
  for(const locale of [...locales,'x-default'])assert.ok(html.includes('hreflang="'+locale+'"'),'Missing language alternative: '+url);
}
assert.ok(readFileSync('dist/robots.txt','utf8').includes(origin+base+'sitemap.xml'),'Robots must advertise the sitemap');
const search=read('dist/search-index.json');
assert.deepEqual(search.map(item=>item.editionId).sort(),published.map(edition=>edition.id).sort(),'Search must contain all and only public editions');
for(const edition of published){
  const text=read(edition.content_path),ids=read('corpus/structure/'+edition.work_id+'.json').segment_ids;
  const entry=search.find(item=>item.editionId===edition.id);
  assert.deepEqual(entry.passages,ids.map(id=>[id,text[id]]),'Search must preserve canonical passage order and text');
  for(const locale of locales){
    const file='dist/'+locale+'/read/'+edition.work_id+'/'+edition.id+'/index.html';
    assert.ok(existsSync(file),'Published edition missing: '+file);
    const html=decode(readFileSync(file,'utf8'));
    for(const id of ids){assert.ok(html.includes('id="'+id+'"'),'Canonical passage missing: '+id);assert.ok(html.includes(text[id]),'Published text incomplete: '+id);}
    assert.ok(html.includes('application/ld+json'),'Edition structured metadata missing');
    const jsonLD=readFileSync(file,'utf8').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(jsonLD,'Missing structured data script');
    const metadata=JSON.parse(jsonLD[1]);assert.equal(metadata.identifier,edition.id);assert.equal(metadata.inLanguage,edition.language);
    const correctionLinks=[...html.matchAll(/href="(https:\/\/github\.com\/streamentry\/LitMundi\/issues\/new\?[^"]+)"/g)];
    for(const id of ids)assert.ok(correctionLinks.some(match=>new URL(match[1]).searchParams.get('body')?.includes('Segment ID: '+id)),'Missing passage correction context: '+id);
  }
  for(const format of ['json','txt','epub','tsv'])assert.ok(existsSync('dist/downloads/'+edition.id+'.'+format),'Published download missing: '+edition.id+'.'+format);
}
for(const edition of editions.filter(e=>e.status!=='published'&&e.status!=='sample')){
  for(const locale of locales)for(const slug of [edition.id,...edition.legacy_slugs])assert.ok(!existsSync('dist/'+locale+'/read/'+edition.work_id+'/'+slug+'/index.html'),'Unpublished edition has a reading route: '+edition.id);
  for(const format of ['json','txt','epub','tsv'])assert.ok(!existsSync('dist/downloads/'+edition.id+'.'+format),'Unpublished edition leaked into downloads: '+edition.id);
  if(!edition.content_path)continue;
  const paragraphs=Object.values(read(edition.content_path)).filter(text=>text.length>40);
  for(const file of files.filter(path=>/\.(?:html|js|json|txt|tsv|xml)$/.test(path))){
    const content=decode(readFileSync(file,'utf8'));
    for(const paragraph of paragraphs)assert.ok(!content.includes(paragraph),'Draft text leaked into '+file);
  }
}
for(const sample of editions.filter(e=>e.status==='sample'))for(const locale of locales)for(const slug of [sample.id,...sample.legacy_slugs]){
  const path='dist/'+locale+'/read/'+sample.work_id+'/'+slug+'/index.html';
  assert.ok(existsSync(path),'Legacy/sample route must remain: '+path);
  const html=readFileSync(path,'utf8');assert.match(html,/name="robots"[^>]*noindex/,'Sample must remain noindex');
  assert.ok(!sitemap.includes(sample.id)&&!sitemap.includes('/read/'+sample.work_id+'/'),'Sample in sitemap');
}
console.log('Verified '+htmlFiles.length+' HTML pages, '+checkedLinks+' local links/anchors, '+indexed.length+' sitemap routes and '+published.length+' complete public editions. Draft routes, text, search entries and downloads remain excluded.');
