import test from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';
import {loadCorpus,publicEditions,editionBundle,plainText,tabSeparated,epub,portableFiles} from '../scripts/lib/portable.mjs';

const corpus=loadCorpus();
test('portable publications exclude drafts, planned editions, withdrawn texts and demonstrations',()=>{
  const available=publicEditions(corpus);
  assert.ok(available.length>=1);
  assert.ok(available.every(e=>e.status==='published'));
  const files=portableFiles(corpus);
  for(const e of corpus.editions.filter(e=>e.status!=='published')) assert.ok(!Object.keys(files).some(name=>name.startsWith(e.id+'.')));
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
