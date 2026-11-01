import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {unzipSync,strFromU8} from 'fflate';
import {loadCorpus,publicEditions,editionBundle,plainText,tabSeparated,epub,portableFiles,xml} from '../scripts/lib/portable.mjs';
import {reviewPackets} from '../scripts/lib/review-packets.mjs';

const corpus=loadCorpus();
test('portable publications exclude drafts, planned editions, withdrawn texts and demonstrations',()=>{
  const available=publicEditions(corpus);
  assert.ok(available.length>=1);
  assert.ok(available.every(e=>e.status==='published'));
  const files=portableFiles(corpus);
  for(const e of corpus.editions.filter(e=>e.status!=='published')) assert.ok(!Object.keys(files).some(name=>name.startsWith(e.id+'.')));
  const pardo=corpus.editions.find(e=>e.work_id==='pardo-bazan-el-encaje-roto'&&e.kind==='translation');
  assert.ok(pardo);
  const titledDraft={...corpus,editions:corpus.editions.map(e=>e.id===pardo.id?{...e,status:'draft',title:'Dải ren rách'}:e)};
  assert.ok(!Object.keys(portableFiles(titledDraft)).some(name=>name.startsWith(pardo.id+'.')),'Pardo must not gain a public download merely because its draft has a translated title.');
  const copy=structuredClone({...corpus,read:undefined});
  copy.editions[0].status='withdrawn';
  assert.ok(!publicEditions(copy).some(e=>e.id===copy.editions[0].id));
});
test('plain text preserves every canonical passage plus provenance and rights',()=>{
  for(const edition of publicEditions(corpus)){
    const bundle=editionBundle(corpus,edition),text=plainText(bundle);
    assert.ok(text.includes(edition.id)&&text.includes(edition.provenance.citation));
    assert.ok(text.includes(edition.rights.license));
    for(const [id,value] of Object.entries(bundle.segments)) assert.ok(text.includes('['+id+']\n'+value));
  }
});
test('EPUB has a stored first mimetype entry, deterministic bytes, navigation and escaped prose',()=>{
  const bundle=editionBundle(corpus,publicEditions(corpus)[0]);
  const first=Object.keys(bundle.segments)[0];bundle.segments[first]='Unicode tiếng Việt & <untrusted> "text"';
  const data=Buffer.from(epub(bundle)),again=Buffer.from(epub(bundle));
  assert.deepEqual(data,again);
  assert.equal(data.readUInt32LE(0),0x04034b50);
  assert.equal(data.readUInt16LE(8),0,'mimetype compression method');
  assert.equal(data.readUInt16LE(28),0,'mimetype extra fields');
  assert.equal(data.subarray(30,38).toString(),'mimetype');
  const files=unzipSync(data);
  assert.equal(strFromU8(files.mimetype),'application/epub+zip');
  assert.match(strFromU8(files['META-INF/container.xml']),/EPUB\/package\.opf/);
  assert.match(strFromU8(files['EPUB/package.opf']),/properties="nav"/);
  const content=strFromU8(files['EPUB/text.xhtml']);
  assert.ok(content.includes('Unicode tiếng Việt &amp; &lt;untrusted&gt; &quot;text&quot;'));
  assert.ok(!content.includes('<untrusted>'));
  assert.match(strFromU8(files['EPUB/nav.xhtml']),/epub:type="toc"/);
});
test('published AI translations retain their status, score and evidence outside the website',()=>{
  for(const edition of publicEditions(corpus).filter(e=>e.review.status==='ai_reviewed')){
    const bundle=editionBundle(corpus,edition),text=plainText(bundle),tsv=tabSeparated(bundle);
    const xhtml=strFromU8(unzipSync(epub(bundle))['EPUB/text.xhtml']);
    for(const output of [text,xhtml]){
      assert.match(output,/AI-reviewed translation/);
      assert.ok(output.includes(Number(edition.review.score).toFixed(2)+'/10'));
      assert.ok(output.includes(edition.review.evidence_urls[0]));
      assert.match(output,/No independent human literary review is claimed/);
    }
    assert.ok(tsv.includes('ai_reviewed')&&tsv.includes('litmundi-literary-v2'));
    assert.equal(bundle.edition.review.reviewers.length,0);
    assert.equal(bundle.content_sha256,bundle.source_content_sha256);
    assert.match(bundle.original_source_sha256,/^[a-f0-9]{64}$/);
    assert.notEqual(bundle.content_sha256,bundle.original_source_sha256);
  }
});

test('portable formats use the edition title and retain the original work title',()=>{
  const original=publicEditions(corpus).find(e=>e.kind==='translation');
  assert.ok(original,'A published translation is needed for the export regression.');
  const title='Ngụ ngôn & <kim chỉ>',edition={...original,title};
  const work=corpus.works.find(w=>w.id===edition.work_id);
  const bundle=editionBundle(corpus,edition),saved=JSON.parse(JSON.stringify(bundle));
  assert.equal(saved.title,title);
  assert.equal(saved.original_title,work.title);
  assert.equal(saved.edition.title,title);
  assert.deepEqual(saved.work,work,'Translated display titles must not overwrite canonical work metadata.');
  const text=plainText(bundle);
  assert.equal(text.split('\n')[0],title);
  assert.ok(text.includes('Original title: '+work.title));
  const [header,row]=tabSeparated(bundle).trimEnd().split('\n').map(line=>line.split('\t'));
  assert.equal(row[header.indexOf('title')],title);
  assert.equal(row[header.indexOf('original_title')],work.title);
  const files=unzipSync(epub(bundle)),opf=strFromU8(files['EPUB/package.opf']),page=strFromU8(files['EPUB/text.xhtml']),nav=strFromU8(files['EPUB/nav.xhtml']);
  assert.ok(opf.includes('<dc:title>'+xml(title)+'</dc:title>'));
  assert.ok(opf.includes('Original title: '+xml(work.title)));
  for(const content of [page,nav])assert.ok(content.includes('<title>'+xml(title)+'</title>'));
  assert.ok(page.includes('<h1>'+xml(title)+'</h1>'));
  assert.ok(page.includes('>'+xml(work.title)+'</span>'),'The EPUB must preserve the original title as attribution.');
  assert.ok(nav.includes('href="text.xhtml">'+xml(title)+'</a>'));
  assert.ok(!page.includes('<kim chỉ>'),'Title characters must be escaped in XHTML.');
});

test('legacy non-English source editions fall back to the original title in exports',()=>{
  const original=publicEditions(corpus).find(e=>e.kind==='source'&&e.language!=='en');
  assert.ok(original,'A non-English source is needed for the fallback regression.');
  const edition={...original};delete edition.title;
  const work=corpus.works.find(w=>w.id===edition.work_id),bundle=editionBundle(corpus,edition);
  assert.equal(bundle.title,work.title);
  assert.equal(bundle.original_title,work.title);
  assert.equal(plainText(bundle).split('\n')[0],work.title);
  const [header,row]=tabSeparated(bundle).trimEnd().split('\n').map(line=>line.split('\t'));
  assert.equal(row[header.indexOf('title')],work.title);
  assert.ok(strFromU8(unzipSync(epub(bundle))['EPUB/package.opf']).includes('<dc:title>'+xml(work.title)+'</dc:title>'));
});

test('draft review packets show both titles without inventing a title assessment',()=>{
  const draft=corpus.editions.find(e=>e.work_id==='pardo-bazan-el-encaje-roto'&&e.kind==='translation');
  assert.ok(draft);
  const source=corpus.editions.find(e=>e.id===draft.source_edition_id),work=corpus.works.find(w=>w.id===draft.work_id);
  const title='Dải ren rách';
  const fixture={...corpus,editions:corpus.editions.map(e=>e.id===draft.id?{...e,title,status:'draft'}:e.id===source.id?{...e,title:work.title}:e)};
  const files=reviewPackets(fixture),page=files[draft.id+'.html'].toString(),template=JSON.parse(files[draft.id+'.review-template.json']);
  assert.ok(page.includes('<title>Editorial review — '+title+'</title>'));
  assert.ok(page.includes('<h1 lang="vi">'+title+'</h1>'));
  assert.ok(page.includes('Original title: <span lang="'+work.original_language+'">'+xml(work.title)+'</span>'));
  assert.ok(page.includes('UNPUBLISHED TRANSLATION DRAFT'));
  assert.deepEqual(template.title_review,{source_title:work.title,target_title:title,rationale:null});
  assert.equal(template.scores.semantic_fidelity,null);
});

test('standalone restoration preserves translated titles, original attribution and legacy source fallback',()=>{
  const source=publicEditions(corpus).find(e=>e.kind==='source'&&e.language!=='en'&&corpus.editions.some(t=>t.source_edition_id===e.id&&t.status==='published'));
  assert.ok(source);
  const target=corpus.editions.find(e=>e.source_edition_id===source.id&&e.status==='published');
  const work=corpus.works.find(w=>w.id===source.work_id),title='Ngụ ngôn & <kim chỉ>';
  const legacySource={...source};delete legacySource.title;
  const draft={...target,id:'offline-unpublished-draft',title:'Bản thảo không xuất bản',status:'draft'};
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'litmundi-title-restore-'));
  try{
    const archive=path.join(temp,'archive'),output=path.join(temp,'reader');
    const write=(name,data)=>{const file=path.join(archive,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);};
    write('corpus/catalog/works.json',JSON.stringify([work]));
    write('corpus/catalog/editions.json',JSON.stringify([legacySource,{...target,title},draft]));
    for(const name of [source.content_path,target.content_path,'corpus/structure/'+work.id+'.json'])write(name,fs.readFileSync(path.join(corpus.root,name)));
    const script='import runpy,sys\nfrom pathlib import Path\nrunpy.run_path(sys.argv[1])["restore"](Path(sys.argv[2]).resolve(),Path(sys.argv[3]).resolve())';
    const result=spawnSync('python3',['-I','-c',script,path.resolve('scripts/restore.py'),archive,output],{encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    const sourceText=fs.readFileSync(path.join(output,'editions',source.id+'.txt'),'utf8');
    const targetText=fs.readFileSync(path.join(output,'editions',target.id+'.txt'),'utf8');
    const html=fs.readFileSync(path.join(output,'editions',target.id+'.html'),'utf8');
    const index=fs.readFileSync(path.join(output,'index.html'),'utf8');
    assert.equal(sourceText.split('\n')[0],work.title);
    assert.equal(targetText.split('\n')[0],title);
    assert.ok(targetText.includes('Original title: '+work.title));
    assert.ok(html.includes('<title>'+xml(title)+'</title>')&&html.includes('<h1>'+xml(title)+'</h1>'));
    assert.ok(html.includes('Original title: '+work.title));
    assert.ok(index.includes('href="editions/'+target.id+'.html">'+xml(title)+' — '+target.language+'</a>'));
    assert.ok(index.includes('href="editions/'+source.id+'.html">'+xml(work.title)+' — '+source.language+'</a>'));
    assert.ok(!html.includes('<kim chỉ>'));
    assert.ok(!fs.existsSync(path.join(output,'editions',draft.id+'.html')));
    assert.ok(!index.includes(draft.id));
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
