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
const manifest=()=>createSeoManifest(options).entries;

test('the public corpus yields 25 canonical pages without duplicate reader interfaces',()=>{
  const entries=manifest();
  assert.equal(entries.length,25);
  assert.deepEqual(Object.fromEntries(options.locales.map(locale=>[locale,entries.filter(entry=>entry.locale===locale).length])),{en:7,vi:7,fr:5,es:6});
  const readers=entries.filter(entry=>entry.kind==='reader');
  assert.equal(readers.length,5);
  for(const entry of readers){
    const edition=options.editions.find(edition=>edition.id===entry.editionId);
    assert.equal(entry.path,canonicalReaderPath(edition,options.locales,options.base));
  }
  assert.ok(entries.every(entry=>!entry.url.includes('demo-proust')&&!entry.url.includes('community-proposed')&&!entry.url.includes('pardo-encaje-vi')&&!entry.url.includes('?')&&!entry.url.includes('#')));
});

test('reader hreflang describes actual translation languages and is reciprocal',()=>{
  const entries=manifest(),byUrl=new Map(entries.map(entry=>[entry.url,entry]));
  const portuguese=entries.find(entry=>entry.editionId==='machado-apologo-pt-laemmert-1896');
  assert.equal(portuguese.locale,'en');
  assert.deepEqual(portuguese.alternates.map(alternate=>alternate.hreflang),['pt','vi','x-default']);
  assert.equal(portuguese.alternates.find(alternate=>alternate.hreflang==='vi').href,'https://streamentry.github.io/LitMundi/vi/read/machado-um-apologo/machado-apologo-vi-ai-draft-2026/');
  for(const entry of entries)for(const alternate of entry.alternates){
    const target=byUrl.get(alternate.href);
    assert.ok(target,'Every alternate must be canonical and published');
    assert.deepEqual(target.alternates,entry.alternates,'Clusters must be identical in both directions');
  }
  assert.deepEqual(entries.find(entry=>entry.editionId==='pardo-encaje-es-administracion-c1898').alternates.map(item=>item.hreflang),['es','x-default']);
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
  const draft=options.editions.find(edition=>edition.id==='pardo-encaje-vi-ai-draft-2026');
  const promoted=options.editions.map(edition=>edition===draft?{...edition,status:'published'}:edition);
  const entries=createSeoManifest({...options,editions:promoted}).entries;
  assert.equal(entries.length,26);
  assert.deepEqual(entries.find(entry=>entry.editionId===draft.source_edition_id).alternates.map(item=>item.hreflang),['es','vi','x-default']);
  assert.throws(()=>createSeoManifest({...options,editions:promoted.filter(edition=>edition.id!==draft.source_edition_id)}),/exact public source/);
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
