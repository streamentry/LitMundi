import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {loadCorpus,publicEditions,editionBundle,tabSeparated} from '../scripts/lib/portable.mjs';
import {reviewPackets} from '../scripts/lib/review-packets.mjs';

const repo=process.cwd();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const writeJSON=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'litmundi-archive-security-'));
const cleanup=root=>fs.rmSync(root,{recursive:true,force:true});
function inventory(root){
  const paths=[];
  const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.isFile())paths.push(path.relative(root,file).replaceAll(path.sep,'/'));}};
  walk(root);
  return paths.filter(file=>!['manifest.json','manifest.sha256'].includes(file)).sort().map(file=>{const bytes=fs.readFileSync(path.join(root,file));return {path:file,bytes:bytes.length,sha256:hash(bytes)};});
}
function writeManifest(root,files=inventory(root)){
  writeJSON(path.join(root,'manifest.json'),{format:'LitMundi corpus archive v2',scope:'editorial-snapshot',files});
  fs.writeFileSync(path.join(root,'manifest.sha256'),hash(fs.readFileSync(path.join(root,'manifest.json')))+'  manifest.json\n');
}
function syntheticArchive(root,editionId='fixture-source'){
  const work={id:'fixture-work',title:'SYNTHETIC TEST ONLY',author:'Synthetic test author',visibility:'public'};
  const edition={id:editionId,work_id:work.id,status:'published',kind:'source',language:'en',label:'SYNTHETIC FIXTURE, NOT A REAL EDITION',content_path:'corpus/segments/fixture-work/'+editionId+'.json',source_edition_id:null,
    rights:{status:'public_domain_assessed',license:'TEST FIXTURE ONLY',basis:'Synthetic record for code testing; no real literary rights are asserted.'},
    provenance:{citation:'Synthetic test text, generated for a regression test.'},credits:{author:work.author,translator:null,editors:[]},review:{status:'source_checked',reviewers:[]}};
  writeJSON(path.join(root,'corpus/catalog/works.json'),[work]);writeJSON(path.join(root,'corpus/catalog/editions.json'),[edition]);
  writeJSON(path.join(root,'corpus/structure/fixture-work.json'),{segment_ids:['fixture-work:1.1']});
  writeJSON(path.join(root,edition.content_path),{'fixture-work:1.1':'SYNTHETIC_SENTINEL_PASSAGE. No real literary work or reviewer is represented.'});
  writeJSON(path.join(root,'rights-manifest.json'),{editions:[edition]});
  fs.copyFileSync(path.join(repo,'scripts/restore.py'),path.join(root,'restore.py'));writeManifest(root);
  return edition;
}
function restore(root,...args){return spawnSync('python3',['-I',path.join(repo,'scripts/restore.py'),'--archive',root,...args],{encoding:'utf8',timeout:15000});}
function exporterFixture(root){
  fs.cpSync(path.join(repo,'corpus'),path.join(root,'corpus'),{recursive:true});
  fs.mkdirSync(path.join(root,'docs'));fs.writeFileSync(path.join(root,'docs/README.md'),'Synthetic archive exporter fixture.\n');
  for(const file of ['LICENSE','GOVERNANCE.md','CONTRIBUTING.md'])fs.copyFileSync(path.join(repo,file),path.join(root,file));
  fs.mkdirSync(path.join(root,'scripts'));fs.copyFileSync(path.join(repo,'scripts/restore.py'),path.join(root,'scripts/restore.py'));
}

test('valid edition ID index cannot collide with the offline catalog',()=>{
  const temp=temporary();try{
    const archive=path.join(temp,'archive'),output=path.join(temp,'restored');fs.mkdirSync(archive);
    syntheticArchive(archive,'index');const result=restore(archive,'--output',output);assert.equal(result.status,0,result.stderr);
    const catalog=fs.readFileSync(path.join(output,'index.html'),'utf8');assert.ok(catalog.includes('editions/index.html'));
    const edition=fs.readFileSync(path.join(output,'editions/index.html'),'utf8');assert.ok(edition.includes('SYNTHETIC_SENTINEL_PASSAGE'));assert.ok(edition.includes('href="../index.html"'));
    assert.ok(fs.readFileSync(path.join(output,'editions/index.txt'),'utf8').includes('SYNTHETIC_SENTINEL_PASSAGE'));
  }finally{cleanup(temp);}
});

test('archive verification rejects traversal even when manifest hashes are internally consistent',()=>{
  const temp=temporary();try{
    const archive=path.join(temp,'archive');fs.mkdirSync(archive);syntheticArchive(archive);
    const outside=Buffer.from('Synthetic outside file.');fs.writeFileSync(path.join(temp,'outside.txt'),outside);
    writeManifest(archive,[...inventory(archive),{path:'../outside.txt',bytes:outside.length,sha256:hash(outside)}]);
    const result=restore(archive,'--verify-only');assert.notEqual(result.status,0);assert.match(result.stderr,/Unsafe archive path|escapes archive/);
  }finally{cleanup(temp);}
});

test('archive verification rejects a content symlink even if its target has the expected digest',{skip:process.platform==='win32'},()=>{
  const temp=temporary();try{
    const archive=path.join(temp,'archive');fs.mkdirSync(archive);const edition=syntheticArchive(archive);
    const file=path.join(archive,edition.content_path),outside=path.join(temp,'same-bytes.json');fs.copyFileSync(file,outside);fs.unlinkSync(file);fs.symlinkSync(outside,file);
    const result=restore(archive,'--verify-only');assert.notEqual(result.status,0);assert.match(result.stderr,/symlink|escapes archive/i);
  }finally{cleanup(temp);}
});

test('export rejects symlinked top-level collection directories',{skip:process.platform==='win32'},()=>{
  for(const name of ['corpus','docs']){
    const temp=temporary();try{
      const fixture=path.join(temp,'repo');fs.mkdirSync(fixture);exporterFixture(fixture);
      const outside=path.join(temp,'outside');fs.renameSync(path.join(fixture,name),outside);fs.symlinkSync(outside,path.join(fixture,name),'dir');
      const result=spawnSync(process.execPath,[path.join(repo,'scripts/export.mjs')],{cwd:fixture,encoding:'utf8',timeout:15000});
      assert.notEqual(result.status,0,'Exporter followed a top-level '+name+' symlink');assert.match(result.stderr,/symlink|symbolic/i);
    }finally{cleanup(temp);}
  }
});

test('export rejects explicitly included files that are symlinks',{skip:process.platform==='win32'},()=>{
  const temp=temporary();try{
    const fixture=path.join(temp,'repo');fs.mkdirSync(fixture);exporterFixture(fixture);
    const outside=path.join(temp,'outside-license.txt');fs.renameSync(path.join(fixture,'LICENSE'),outside);fs.symlinkSync(outside,path.join(fixture,'LICENSE'));
    const result=spawnSync(process.execPath,[path.join(repo,'scripts/export.mjs')],{cwd:fixture,encoding:'utf8',timeout:15000});
    assert.notEqual(result.status,0,'Exporter followed an explicit LICENSE symlink');assert.match(result.stderr,/symlink|symbolic/i);
  }finally{cleanup(temp);}
});


test('review packets reject incomplete or invalid alignments instead of silently omitting review text',()=>{
  const live=loadCorpus();
  const target=live.editions.find(e=>e.kind==='translation'&&e.content_path);
  assert.ok(target,'Fixture corpus needs a translation text');
  // A local metadata clone keeps this test valid when the real edition later publishes.
  const draft={...target,status:'draft'};
  const corpus={...live,editions:[draft,...live.editions.filter(e=>e.id!==target.id)]};
  const alignment='corpus/alignments/'+draft.work_id+'/'+draft.id+'.json';
  const mutations=[
    value=>({...value,links:value.links.slice(0,-1)}),
    value=>({...value,links:value.links.map((link,index)=>index===0?{...link,source:['absent:1.1']}:link)})
  ];
  for(const mutate of mutations){
    const broken={...corpus,read:file=>file===alignment?mutate(corpus.read(file)):corpus.read(file)};
    assert.throws(()=>reviewPackets(broken),/align|complete|passage/i);
  }
  const reversed={...corpus,read:file=>{const value=corpus.read(file);return file===alignment?{...value,links:[...value.links].reverse()}:value;}};
  const packet=reviewPackets(reversed)[draft.id+'.html'].toString('utf8');
  const ids=corpus.read('corpus/structure/'+draft.work_id+'.json').segment_ids;
  const positions=ids.map(id=>packet.indexOf('<h3>'+id+'</h3>'));
  assert.ok(positions.every((position,index)=>position>=0&&(index===0||position>positions[index-1])),'Review packet must preserve canonical passage order');
});


test('standalone TSV preserves attribution, rights and every canonical passage',()=>{
  const corpus=loadCorpus();
  const decode=value=>value.replace(/\\([\\trn])/g,(_,letter)=>({'\\':'\\',t:'\t',r:'\r',n:'\n'}[letter]));
  for(const edition of publicEditions(corpus)){
    const bundle=editionBundle(corpus,edition),lines=tabSeparated(bundle).split('\n');
    const columns=lines[0].split('\t');
    for(const required of ['edition_id','author','translator','license','source_citation','source_url','content_sha256','passage_id','text','canonical_url','source_edition_id','source_canonical_url','source_catalog_url','edition_provenance'])assert.ok(columns.includes(required),'TSV loses '+required);
    const rows=lines.slice(1,-1).map(line=>Object.fromEntries(line.split('\t').map((cell,index)=>[columns[index],decode(cell)])));
    assert.deepEqual(rows.map(row=>row.passage_id),bundle.structure.segment_ids);
    for(const row of rows){
      assert.equal(row.edition_id,edition.id);assert.equal(row.author,bundle.work.author);assert.equal(row.translator,edition.credits.translator??'');
      assert.equal(row.license,edition.rights.license);assert.equal(row.source_citation,bundle.source.citation);
      assert.equal(row.source_url,bundle.source.text_url??'');assert.equal(row.canonical_url,bundle.canonical_url);
      assert.equal(row.source_edition_id,bundle.source.edition_id);assert.equal(row.source_canonical_url,bundle.source.canonical_url);
      assert.equal(row.source_catalog_url,bundle.source.catalog_url??'');assert.equal(row.edition_provenance,edition.provenance.citation);
      assert.equal(row.content_sha256,hash(fs.readFileSync(edition.content_path)));
      assert.equal(row.text,bundle.segments[row.passage_id]);
    }
  }
});
