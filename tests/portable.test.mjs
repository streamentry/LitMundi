import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {unzipSync,strFromU8} from 'fflate';
import {loadCorpus,publicEditions,editionBundle,plainText,tabSeparated,epub,portableFiles,sha256,xml} from '../scripts/lib/portable.mjs';
import {reviewPackets} from '../scripts/lib/review-packets.mjs';
import siteConfig from '../src/lib/site.json' with {type:'json'};

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
  assert.ok(opf.includes('<dc:title xml:lang="'+edition.language+'">'+xml(title)+'</dc:title>'));
  assert.ok(opf.includes('Original title: '+xml(work.title)));
  for(const content of [page,nav])assert.ok(content.includes('<title lang="'+edition.language+'" xml:lang="'+edition.language+'">'+xml(title)+'</title>'));
  assert.ok(page.includes('<h1 lang="'+edition.language+'" xml:lang="'+edition.language+'">'+xml(title)+'</h1>'));
  assert.ok(page.includes('>'+xml(work.title)+'</span>'),'The EPUB must preserve the original title as attribution.');
  assert.ok(nav.includes('href="text.xhtml" lang="'+edition.language+'" xml:lang="'+edition.language+'">'+xml(title)+'</a>'));
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
  assert.ok(strFromU8(unzipSync(epub(bundle))['EPUB/package.opf']).includes('<dc:title xml:lang="'+work.original_language+'">'+xml(work.title)+'</dc:title>'));
});

test('portable references identify the exact source and canonical reader without changing corpus fields or hashes',()=>{
  const decode=value=>value.replace(/\\([\\trn])/g,(_,letter)=>({'\\':'\\',t:'\t',r:'\r',n:'\n'}[letter]));
  for(const edition of publicEditions(corpus)){
    const source=edition.kind==='source'?edition:corpus.editions.find(e=>e.id===edition.source_edition_id);
    const work=corpus.works.find(w=>w.id===edition.work_id),bundle=editionBundle(corpus,edition);
    const saved=JSON.parse(JSON.stringify(bundle)),url=new URL(saved.canonical_url);
    assert.deepEqual(saved.work,work);assert.deepEqual(saved.edition,edition);
    assert.deepEqual(saved.structure,corpus.read('corpus/structure/'+work.id+'.json'));
    assert.deepEqual(saved.segments,corpus.read(edition.content_path));
    assert.equal(saved.content_sha256,sha256(fs.readFileSync(edition.content_path)));
    assert.equal(saved.source_content_sha256,saved.content_sha256);
    assert.equal(saved.original_source_sha256,sha256(fs.readFileSync(source.content_path)));
    assert.equal(url.origin,siteConfig.site);assert.equal(url.search,'');assert.equal(url.hash,'');
    assert.equal(saved.source.edition_id,source.id);assert.equal(saved.source.citation,source.provenance.citation);
    assert.equal(saved.source.title,source.title??work.title);assert.equal(saved.source.language,source.language);
    assert.equal(saved.source.text_url,source.provenance.text_url);assert.equal(saved.source.catalog_url,source.provenance.catalog_url);
    assert.equal(saved.source.source_witness,source.provenance.source_witness);assert.equal(saved.source.retrieved_at,source.provenance.retrieved_at);
    if(edition.language==='vi')assert.equal(url.pathname,siteConfig.base+'/vi/read/'+work.id+'/'+edition.id+'/');
    if(source.language==='pt')assert.equal(new URL(saved.source.canonical_url).pathname,siteConfig.base+'/en/read/'+work.id+'/'+source.id+'/');
    const text=plainText(bundle);
    assert.ok(text.includes('Canonical URL: '+saved.canonical_url));
    assert.ok(text.includes('Source: '+source.provenance.citation));
    assert.ok(text.includes('Source edition URL: '+saved.source.canonical_url));
    assert.ok(text.includes('Source witness URL: '+source.provenance.text_url));
    if(edition.kind==='translation')assert.ok(text.includes('Edition provenance: '+edition.provenance.citation));
    const [header,line]=tabSeparated(bundle).split('\n');
    const columns=header.split('\t'),row=Object.fromEntries(line.split('\t').map((value,index)=>[columns[index],decode(value)]));
    assert.equal(columns[19],'passage_id');assert.equal(columns[20],'text','Existing TSV columns must retain their positions.');
    assert.equal(row.source_citation,source.provenance.citation);assert.equal(row.source_url,source.provenance.text_url);
    assert.equal(row.canonical_url,saved.canonical_url);assert.equal(row.source_edition_id,source.id);
    assert.equal(row.source_canonical_url,saved.source.canonical_url);assert.equal(row.source_catalog_url,source.provenance.catalog_url);
    assert.equal(row.edition_provenance,edition.provenance.citation);
  }
});

test('portable translations refuse missing, withdrawn, mismatched or non-source references',()=>{
  const target=publicEditions(corpus).find(e=>e.kind==='translation');
  const source=corpus.editions.find(e=>e.id===target.source_edition_id);
  assert.throws(()=>editionBundle(corpus,{...target,source_edition_id:'missing-source'}),/exact public source/);
  for(const replacement of [{...source,status:'withdrawn'},{...source,kind:'translation'},{...source,work_id:'different-work'},{...source,rights:{...source.rights,status:'unreviewed'}}]){
    const broken={...corpus,editions:corpus.editions.map(e=>e.id===source.id?replacement:e)};
    assert.throws(()=>editionBundle(broken,target),/exact public source/);
  }
});

test('source URLs are actual escaped links or empty, never witness identifiers or executable schemes',()=>{
  const target=publicEditions(corpus).find(e=>e.kind==='translation'),source=corpus.editions.find(e=>e.id===target.source_edition_id);
  const fixture=provenance=>({...corpus,editions:corpus.editions.map(e=>e.id===source.id?{...e,provenance:{...e.provenance,...provenance}}:e)});
  const empty=editionBundle(fixture({text_url:null,catalog_url:null,source_witness:'A non-URL witness identifier'}),target);
  assert.equal(empty.source.text_url,null);assert.equal(empty.source.catalog_url,null);
  assert.match(plainText(empty),/Source witness URL: \nSource catalog URL: \n/);
  const [header,row]=tabSeparated(empty).split('\n').map(line=>line.split('\t'));
  assert.equal(row[header.indexOf('source_url')],'');assert.equal(row[header.indexOf('source_catalog_url')],'');
  assert.ok(!strFromU8(unzipSync(epub(empty))['EPUB/text.xhtml']).includes('href="A non-URL'));
  for(const unsafe of ['javascript:alert(1)','file:///etc/passwd','source-edition-id','https://user:password@example.test/']){
    assert.throws(()=>editionBundle(fixture({text_url:unsafe}),target),/Invalid source text URL/);
  }
  const url='https://example.test/witness?edition=one&mode=%22quoted%22';
  const escaped=editionBundle(fixture({text_url:url,catalog_url:url,citation:'Original source & <catalog note>'}),target);
  const content=strFromU8(unzipSync(epub(escaped))['EPUB/text.xhtml']);
  assert.ok(content.includes('href="'+xml(url)+'"'));assert.ok(content.includes('Original source &amp; &lt;catalog note&gt;'));
  assert.ok(!content.includes('<catalog note>'));
});

test('EPUB XML keeps literary text intact and labels English furniture, citations and rights accurately',()=>{
  const records=publicEditions(corpus).map(edition=>{
    const bundle=editionBundle(corpus,edition),files=unzipSync(epub(bundle));
    return {edition,work:bundle.work,source:bundle.source,canonical_url:bundle.canonical_url,hash:bundle.source_content_sha256,segments:bundle.segments,
      text:strFromU8(files['EPUB/text.xhtml']),nav:strFromU8(files['EPUB/nav.xhtml']),opf:strFromU8(files['EPUB/package.opf'])};
  });
  const script=String.raw`
import json,sys,xml.etree.ElementTree as ET
ns={'x':'http://www.w3.org/1999/xhtml','dc':'http://purl.org/dc/elements/1.1/'}
xml_lang='{http://www.w3.org/XML/1998/namespace}lang'
with open(sys.argv[1],encoding='utf-8') as stream: records=json.load(stream)
for record in records:
    edition,work=record['edition'],record['work']
    text,nav,opf=[ET.fromstring(record[key]) for key in ['text','nav','opf']]
    title=edition.get('title',work['title']); title_language=edition['language'] if edition.get('title') else work['original_language']
    assert text.get('lang')==text.get(xml_lang)==edition['language']
    assert nav.get('lang')==nav.get(xml_lang)=='en'
    for document in [text,nav]:
        element=document.find('x:head/x:title',ns)
        assert element.text==title and element.get('lang')==element.get(xml_lang)==title_language
    heading=text.find('.//x:h1',ns)
    assert heading.text==title and heading.get('lang')==heading.get(xml_lang)==title_language
    passages={p.get('id'):p.text for p in text.findall('.//x:p[@id]',ns)}
    assert passages==record['segments']
    provenance=text.find('.//x:section[@id="provenance"]',ns)
    assert provenance.get('lang')==provenance.get(xml_lang)=='en'
    label=provenance.find('x:p[@class="edition-label"]',ns)
    assert label.text==edition['label'] and label.get('lang')==label.get(xml_lang)==('en' if edition['kind']=='source' else edition['language'])
    original=provenance.find('.//x:span',ns)
    assert original.text==work['title'] and original.get('lang')==original.get(xml_lang)==work['original_language']
    links={a.get('href'):a.text for a in provenance.findall('.//x:a',ns)}
    for url in [record['canonical_url'],record['source']['canonical_url'],record['source']['text_url'],record['source']['catalog_url']]:
        if url: assert links[url]==url
    assert record['source']['citation'] in ''.join(provenance.itertext())
    if edition['kind']=='translation': assert edition['provenance']['citation'] in ''.join(provenance.itertext())
    nav_link=nav.find('.//x:a[@href="text.xhtml"]',ns)
    assert nav_link.text==title and nav_link.get('lang')==nav_link.get(xml_lang)==title_language
    assert nav.find('.//x:h1',ns).text=='Contents'
    identifiers={e.get('id'):e.text for e in opf.findall('.//dc:identifier',ns)}
    assert identifiers['edition-id']=='urn:litmundi:'+edition['id']+':sha256:'+record['hash']
    assert identifiers['canonical-url']==record['canonical_url']
    assert opf.find('.//dc:title',ns).get(xml_lang)==title_language
    for field in ['rights','source']: assert opf.find('.//dc:'+field,ns).get(xml_lang)=='en'
    assert record['source']['citation'] in opf.find('.//dc:source',ns).text
`;
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'litmundi-epub-metadata-'));
  try{
    const input=path.join(temp,'metadata.json');fs.writeFileSync(input,JSON.stringify(records));
    const result=spawnSync('python3',['-I','-c',script,input],{encoding:'utf8',timeout:15000});
    assert.equal(result.status,0,result.stderr||result.error?.message);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
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
