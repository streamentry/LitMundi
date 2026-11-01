import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createSeoManifest,canonicalReaderPath} from '../scripts/lib/seo.mjs';
import {createGitLastmod} from '../scripts/lib/sitemap-lastmod.mjs';

const read=path=>JSON.parse(readFileSync(path,'utf8'));
const options={works:read('corpus/catalog/works.json'),editions:read('corpus/catalog/editions.json'),locales:Object.keys(read('src/lib/locales.json')),site:'https://streamentry.github.io',base:'/LitMundi/'};
// Publication transitions must remain testable after every real draft ships.
const fixture=()=>({
  works:[
    {id:'english-story',visibility:'public'},
    {id:'portuguese-story',visibility:'public'},
    {id:'spanish-story',visibility:'public'},
    {id:'demo-story',visibility:'demo'},
    {id:'draft-story',visibility:'public'},
  ],
  editions:[
    {id:'english-source',work_id:'english-story',language:'en',kind:'source',status:'published',content_path:'en.json'},
    {id:'english-translation',work_id:'english-story',language:'vi',kind:'translation',status:'published',content_path:'en-vi.json',source_edition_id:'english-source'},
    {id:'portuguese-source',work_id:'portuguese-story',language:'pt',kind:'source',status:'published',content_path:'pt.json'},
    {id:'portuguese-translation',work_id:'portuguese-story',language:'vi',kind:'translation',status:'published',content_path:'pt-vi.json',source_edition_id:'portuguese-source'},
    {id:'spanish-source',work_id:'spanish-story',language:'es',kind:'source',status:'published',content_path:'es.json'},
    {id:'spanish-translation',work_id:'spanish-story',language:'vi',kind:'translation',status:'draft',content_path:'es-vi.json',source_edition_id:'spanish-source'},
    {id:'planned-translation',work_id:'english-story',language:'fr',kind:'translation',status:'planned',content_path:'planned.json',source_edition_id:'english-source'},
    {id:'withdrawn-translation',work_id:'english-story',language:'es',kind:'translation',status:'withdrawn',content_path:'withdrawn.json',source_edition_id:'english-source'},
    {id:'demo-source',work_id:'demo-story',language:'fr',kind:'source',status:'sample',content_path:'demo.json'},
    {id:'draft-source',work_id:'draft-story',language:'en',kind:'source',status:'draft',content_path:'draft.json'},
    {id:'missing-content',work_id:'draft-story',language:'vi',kind:'source',status:'published',content_path:null},
  ],
  locales:['en','vi','fr','es'],site:'https://example.test',base:'/LitMundi/',
});

function assertReciprocalAlternates(entries){
  const byUrl=new Map(entries.map(entry=>[entry.url,entry]));
  for(const entry of entries)for(const alternate of entry.alternates){
    const target=byUrl.get(alternate.href);
    assert.ok(target,'Every alternate must be canonical and published');
    assert.deepEqual(target.alternates,entry.alternates,'Clusters must be identical in both directions');
  }
}

test('explicit publication states yield 33 canonical pages without duplicate reader interfaces',()=>{
  const config=fixture(),entries=createSeoManifest(config).entries;
  assert.equal(entries.length,33);
  assert.deepEqual(Object.fromEntries(config.locales.map(locale=>[locale,entries.filter(entry=>entry.locale===locale).length])),{en:9,vi:9,fr:7,es:8});
  const readers=entries.filter(entry=>entry.kind==='reader');
  assert.deepEqual(readers.map(entry=>entry.editionId).sort(),['english-source','english-translation','portuguese-source','portuguese-translation','spanish-source']);
  for(const entry of readers){
    const edition=config.editions.find(edition=>edition.id===entry.editionId);
    assert.equal(entry.path,canonicalReaderPath(edition,config.locales,config.base));
  }
  assert.ok(entries.every(entry=>!entry.url.includes('demo-story')&&!entry.url.includes('draft-story')&&!entry.url.includes('?')&&!entry.url.includes('#')));
});

test('the current corpus has exactly the published pages and one canonical reader per edition',()=>{
  const publicWorkIds=new Set(options.works.filter(work=>work.visibility==='public').map(work=>work.id));
  const published=options.editions.filter(edition=>publicWorkIds.has(edition.work_id)&&edition.status==='published'&&edition.content_path);
  const visibleWorkIds=[...new Set(published.map(edition=>edition.work_id))];
  // Build expected routes directly from catalog state, independently of the SEO helpers.
  const expectedPaths=options.locales.flatMap(locale=>[
    options.base+locale+'/',options.base+locale+'/quality/',
    options.base+locale+'/authors/',options.base+locale+'/about/',
    ...visibleWorkIds.map(id=>options.base+locale+'/works/'+id+'/'),
  ]);
  for(const edition of published){
    const locale=options.locales.includes(edition.language)?edition.language:options.locales.includes('en')?'en':[...options.locales].sort()[0];
    expectedPaths.push(options.base+locale+'/read/'+edition.work_id+'/'+edition.id+'/');
  }
  const entries=createSeoManifest(options).entries;
  assert.deepEqual(entries.map(entry=>entry.path).sort(),expectedPaths.sort());
  assert.equal(new Set(entries.map(entry=>entry.url)).size,entries.length);
  assert.deepEqual(entries.filter(entry=>entry.kind==='reader').map(entry=>entry.editionId).sort(),published.map(edition=>edition.id).sort());
  assert.ok(entries.every(entry=>entry.url===options.site+entry.path&&!entry.url.includes('?')&&!entry.url.includes('#')));
  assertReciprocalAlternates(entries);
});

test('reader hreflang describes actual translation languages and is reciprocal',()=>{
  const entries=createSeoManifest(fixture()).entries;
  const portuguese=entries.find(entry=>entry.editionId==='portuguese-source');
  assert.equal(portuguese.locale,'en');
  assert.deepEqual(portuguese.alternates.map(alternate=>alternate.hreflang),['pt','vi','x-default']);
  assert.equal(portuguese.alternates.find(alternate=>alternate.hreflang==='vi').href,'https://example.test/LitMundi/vi/read/portuguese-story/portuguese-translation/');
  assertReciprocalAlternates(entries);
  assert.deepEqual(entries.find(entry=>entry.editionId==='spanish-source').alternates.map(item=>item.hreflang),['es','x-default']);
});

test('separate source witnesses and same-language editions never create false alternatives',()=>{
  const source={id:'original',work_id:'story',language:'pt',kind:'source',status:'published',content_path:'pt.json'};
  const translation={id:'translation',work_id:'story',language:'vi',kind:'translation',status:'published',content_path:'vi.json',source_edition_id:'original'};
  const config={works:[{id:'story',visibility:'public'}],editions:[source,translation],locales:['en','vi'],site:'https://example.test'};
  const distinctSource={...source,id:'other-source',content_path:'other.json'};
  const readers=createSeoManifest({...config,editions:[...config.editions,distinctSource]}).entries.filter(entry=>entry.kind==='reader');
  assert.deepEqual(readers.find(entry=>entry.editionId==='other-source').alternates.map(item=>item.hreflang),['pt','x-default']);
  const ambiguous=createSeoManifest({...config,editions:[...config.editions,{...translation,id:'independent-translation'}]}).entries.filter(entry=>entry.kind==='reader');
  for(const entry of ambiguous){assert.equal(entry.alternates.length,2);assert.ok(entry.alternates.every(item=>item.href===entry.url));}
});

test('draft publication changes update discovery automatically and invalid sources fail closed',()=>{
  const config=fixture(),draft=config.editions.find(edition=>edition.id==='spanish-translation');
  const before=createSeoManifest(config).entries;
  assert.equal(draft.status,'draft');
  assert.ok(before.every(entry=>entry.editionId!==draft.id));
  const promoted=config.editions.map(edition=>edition===draft?{...edition,status:'published'}:edition);
  const entries=createSeoManifest({...config,editions:promoted}).entries;
  assert.equal(entries.length,34);
  assert.deepEqual(entries.filter(entry=>!before.some(previous=>previous.url===entry.url)).map(entry=>entry.path),['/LitMundi/vi/read/spanish-story/spanish-translation/']);
  assert.deepEqual(entries.find(entry=>entry.editionId===draft.source_edition_id).alternates.map(item=>item.hreflang),['es','vi','x-default']);
  assertReciprocalAlternates(entries);
  assert.throws(()=>createSeoManifest({...config,editions:promoted.filter(edition=>edition.id!==draft.source_edition_id)}),/exact public source/);
  assert.throws(()=>createSeoManifest({...config,editions:promoted.map(edition=>edition.id===draft.source_edition_id?{...edition,status:'draft'}:edition)}),/exact public source/);
});

test('origin and base can migrate without accepting unsafe route components',()=>{
  const entries=createSeoManifest({...options,site:'https://books.example',base:'/'}).entries;
  assert.ok(entries.every(entry=>entry.url.startsWith('https://books.example/')&&!entry.url.includes('/LitMundi/')));
  for(const base of ['/bad?query','/../','//other/'])assert.throws(()=>createSeoManifest({...options,base}));
  for(const site of ['http://example.test','https://example.test/?query=1','https://user@example.test'])assert.throws(()=>createSeoManifest({...options,site}));
  assert.throws(()=>createSeoManifest({...options,locales:['en','en']}));
  assert.throws(()=>createSeoManifest({...options,works:[...options.works,options.works[0]]}));
  assert.throws(()=>canonicalReaderPath({work_id:'../escape',id:'edition',language:'en'},['en']));
});

test('lastmod tracks literal page inputs, ignores unrelated commits, and omits unknown history',()=>{
  const directory=mkdtempSync(join(tmpdir(),'litmundi-lastmod-'));
  const git=(args,when)=>execFileSync('git',args,{cwd:directory,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,GIT_AUTHOR_DATE:when??'2020-01-01T12:00:00Z',GIT_COMMITTER_DATE:when??'2020-01-01T12:00:00Z'}});
  try{
    assert.equal(createGitLastmod(directory)(['page.txt']),undefined);
    git(['init','-q']);git(['config','user.name','Fixture']);git(['config','user.email','fixture@example.invalid']);
    mkdirSync(join(directory,'[lang]'));
    writeFileSync(join(directory,'[lang]/page.txt'),'Visible content');
    git(['add','.']);git(['commit','-qm','Initial page']);
    assert.equal(Date.parse(createGitLastmod(directory)(['[lang]/page.txt'])),Date.parse('2020-01-01T12:00:00Z'));
    writeFileSync(join(directory,'notes.txt'),'Unrelated notes');git(['add','.']);git(['commit','-qm','Notes'],'2021-02-03T12:00:00Z');
    assert.equal(Date.parse(createGitLastmod(directory)(['[lang]/page.txt'])),Date.parse('2020-01-01T12:00:00Z'));
    assert.equal(createGitLastmod(directory)(['[lang]/page.txt','missing.txt']),undefined);
    writeFileSync(join(directory,'[lang]/page.txt'),'Changed visible content');
    assert.equal(createGitLastmod(directory)(['[lang]/page.txt']),undefined);
    git(['add','.']);git(['commit','-qm','Revise page'],'2022-03-04T12:00:00Z');
    assert.equal(Date.parse(createGitLastmod(directory)(['[lang]/page.txt'])),Date.parse('2022-03-04T12:00:00Z'));
    writeFileSync(join(directory,'[lang]/page.txt'),'A commit with a clock error');
    git(['add','.']);git(['commit','-qm','Clock anomaly'],'2099-03-04T12:00:00Z');
    assert.equal(createGitLastmod(directory)(['[lang]/page.txt']),undefined);
    const head=git(['rev-parse','HEAD']).trim();writeFileSync(join(directory,'.git/shallow'),head+'\n');
    assert.equal(createGitLastmod(directory)(['[lang]/page.txt']),undefined);
  }finally{rmSync(directory,{recursive:true,force:true});}
});
