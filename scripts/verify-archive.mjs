import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {sha256,xml} from './lib/portable.mjs';
import {editionTitle} from './lib/reader-data.mjs';

const initial=await fs.readFile('dist-archive.zip');
const repeat=spawnSync(process.execPath,['scripts/export.mjs'],{encoding:'utf8'});
assert.equal(repeat.status,0,repeat.stderr);
assert.equal(sha256(await fs.readFile('dist-archive.zip')),sha256(initial),'Repeated exports must be byte-identical.');
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'litmundi-restore-'));
try {
  const archive=path.join(temp,'archive'),output=path.join(temp,'readable');
  // Exercise the actual deliverable, including its ZIP inventory and extraction.
  const extractCode='import pathlib,sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z:\n assert z.testzip() is None, "Corrupt ZIP member"\n for name in z.namelist():\n  p=pathlib.PurePosixPath(name)\n  assert not p.is_absolute() and ".." not in p.parts and "\\\\" not in name, "Unsafe ZIP path"\n z.extractall(sys.argv[2])';
  const extract=spawnSync('python3',['-I','-c',extractCode,path.resolve('dist-archive.zip'),archive],{cwd:temp,encoding:'utf8'});
  assert.equal(extract.status,0,extract.stderr);
  for(const file of ['TODO.md','research/vietnamese-translation-backlog.json']){
    assert.equal(sha256(await fs.readFile(path.join(archive,file))),sha256(await fs.readFile(file)),'Archive must retain the complete translation queue: '+file);
  }
  // Only the exported Python script is available; network use is explicitly disabled.
  const wrapper='import socket,runpy,sys\ndef blocked(*a,**k): raise RuntimeError("Network forbidden in restoration drill")\nsocket.socket=blocked\nsocket.create_connection=blocked\nroot,output=sys.argv[1:]\nsys.argv=["restore.py","--archive",root,"--output",output]\nrunpy.run_path(root+"/restore.py",run_name="__main__")';
  const restore=spawnSync('python3',['-I','-c',wrapper,archive,output],{cwd:temp,encoding:'utf8'});
  assert.equal(restore.status,0,restore.stderr);
  const editions=JSON.parse(await fs.readFile(path.join(archive,'corpus/catalog/editions.json'),'utf8'));
  const works=JSON.parse(await fs.readFile(path.join(archive,'corpus/catalog/works.json'),'utf8'));
  const expected=editions.filter(e=>e.status==='published'&&works.find(w=>w.id===e.work_id)?.visibility==='public');
  const index=await fs.readFile(path.join(output,'index.html'),'utf8');
  const htmlEsc=value=>xml(value).replaceAll('&apos;','&#x27;');
  for(const e of expected){
    const work=works.find(w=>w.id===e.work_id),title=editionTitle(work,e);
    const txt=await fs.readFile(path.join(output,'editions',e.id+'.txt'),'utf8');
    const html=await fs.readFile(path.join(output,'editions',e.id+'.html'),'utf8');
    assert.equal(txt.split('\n')[0],title,'Offline TXT must use the edition title.');
    assert.ok(txt.includes('Original title: '+work.title),'Offline TXT must retain the original title.');
    assert.ok(html.includes('<title>'+htmlEsc(title)+'</title>')&&html.includes('<h1>'+htmlEsc(title)+'</h1>'),'Offline HTML must use the edition title.');
    assert.ok(html.includes('Original title: '+htmlEsc(work.title)),'Offline HTML must retain the original title.');
    assert.ok(index.includes('href="editions/'+e.id+'.html">'+htmlEsc(title+' — '+e.language)+'</a>'),'Offline index must use the edition title.');
    const source=e.kind==='source'?e:editions.find(item=>item.id===e.source_edition_id);
    const portable=JSON.parse(await fs.readFile(path.join(archive,'exports',e.id+'.json'),'utf8'));
    assert.ok(source,'Restored translation must have its exact source.');
    for(const [content,escape] of [[txt,value=>value],[html,htmlEsc]]){
      assert.ok(content.includes('Source: '+escape(source.provenance.citation)),'Restored source citation must identify the original witness.');
      assert.ok(content.includes('Canonical URL: '+escape(portable.canonical_url)),'Restoration must retain its recorded canonical reader URL.');
      assert.ok(content.includes('Source edition URL: '+escape(portable.source.canonical_url)),'Restoration must retain the source reader URL.');
      if(source.provenance.text_url)assert.ok(content.includes('Source witness URL: '+escape(source.provenance.text_url)));
      if(e.kind==='translation')assert.ok(content.includes('Edition provenance: '+escape(e.provenance.citation)),'Creation notes remain separately attributed.');
    }
    const prose=JSON.parse(await fs.readFile(path.join(archive,e.content_path),'utf8'));
    for(const [id,text] of Object.entries(prose)){assert.ok(txt.includes('['+id+']'));assert.ok(txt.includes(text));}
    if(e.review.status==='ai_reviewed'){
      for(const content of [txt,html]){assert.ok(content.includes('AI-reviewed translation'));assert.ok(content.includes(String(e.review.score)+'/10'));assert.ok(content.includes('No independent human literary review is claimed'));}
    }
  }
  const names=await fs.readdir(path.join(output,'editions'));
  for(const e of editions.filter(e=>e.status!=='published')) assert.ok(!names.some(n=>n.startsWith(e.id+'.')),'Draft/sample must not be restored as publication.');
  // Check real corruption and unexpected-file failures, not only the happy path.
  const victim=path.join(archive,expected[0].content_path),original=await fs.readFile(victim);
  await fs.appendFile(victim,' ');
  let verify=spawnSync('python3',['-I',path.join(archive,'restore.py'),'--archive',archive,'--verify-only'],{cwd:temp,encoding:'utf8'});
  assert.notEqual(verify.status,0,'Corrupted content must fail fixity.');
  assert.match(verify.stderr,/Fixity failure/);
  await fs.writeFile(victim,original);
  await fs.writeFile(path.join(archive,'unexpected.txt'),'Unlisted file');
  verify=spawnSync('python3',['-I',path.join(archive,'restore.py'),'--archive',archive,'--verify-only'],{cwd:temp,encoding:'utf8'});
  assert.notEqual(verify.status,0,'Unlisted files must fail archive validation.');
  console.log('Archive verified: byte-identical ZIP export, checked extraction, isolated offline reconstruction of '+expected.length+' editions with edition/original titles, draft exclusion, corruption and inventory rejection.');
} finally {await fs.rm(temp,{recursive:true,force:true});}
