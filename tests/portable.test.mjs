import test from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';
import {loadCorpus,publicEditions,editionBundle,plainText,epub,portableFiles} from '../scripts/lib/portable.mjs';

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
