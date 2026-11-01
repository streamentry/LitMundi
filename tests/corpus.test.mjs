import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync(p,'utf8'));
const works=load('corpus/catalog/works.json');
const editions=load('corpus/catalog/editions.json');
const source=load('corpus/segments/wilde-the-artist/wilde-artist-en-methuen-1913.json');
const draft=load('corpus/segments/wilde-the-artist/wilde-artist-vi-ai-draft-2026.json');
const alignment=load('corpus/alignments/wilde-the-artist/wilde-artist-vi-ai-draft-2026.json');
const structure=load('corpus/structure/wilde-the-artist.json');

test('work and edition identifiers are globally unique',()=>{
  assert.equal(new Set(works.map(w=>w.id)).size,works.length);
  assert.equal(new Set(editions.map(e=>e.id)).size,editions.length);
});
test('two Vietnamese edition identities coexist for the same work',()=>{
  const vi=editions.filter(e=>e.work_id==='wilde-the-artist'&&e.language==='vi');
  assert.equal(vi.length,2);
  assert.notEqual(vi[0].id,vi[1].id);
});
test('entire source is present as five canonical passages',()=>{
  assert.deepEqual(Object.keys(source),structure.segment_ids);
  assert.equal(structure.segment_ids.length,5);
  assert.match(source['wilde-the-artist:1.1'],/^One evening/);
  assert.match(source['wilde-the-artist:1.5'],/Pleasure that abideth for a Moment\.$/);
});
test('translation preserves aligned identities across publication-policy changes',()=>{
  assert.deepEqual(Object.keys(draft),structure.segment_ids);
  assert.equal(alignment.links.length,5);
  const edition=editions.find(e=>e.id===alignment.edition_id);
  assert.ok(['draft','published'].includes(edition.status));
  for(const published of editions.filter(e=>e.kind==='translation'&&e.status==='published')){
    assert.equal(published.publication_policy,'litmundi-literary-v2');
    assert.equal(published.review.status,'ai_reviewed');
    assert.ok(published.review.score>=8.6);
  }
});
test('legacy demonstration URL is preserved',()=>{
  const p=editions.find(e=>e.id==='proust-swann-fr-sample');
  assert.ok(p?.legacy_slugs.includes('fr'));
  assert.equal(p.status,'sample');
});
test('published edition has rights and a specific source edition',()=>{
  const w=editions.find(e=>e.id==='wilde-artist-en-methuen-1913');
  assert.equal(w?.provenance.source_witness,'1913 Methuen fourth edition; electronic transcription, not a facsimile of the 1894 printing.');
  assert.equal(w?.rights.status,'public_domain_assessed');
  assert.equal(w?.review.status,'source_checked');
  assert.match(w?.provenance.catalog_url,/gutenberg\.org\/ebooks\/774/);
});
