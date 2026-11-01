import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicEdition, preferredEdition, alignedPassages, normalizeQuery, reviewCategory, serializeStructuredData, editionTitle, searchableText } from '../scripts/lib/reader-data.mjs';

test('public discovery excludes drafts, withdrawn editions, demos and incomplete records', () => {
  const work = {visibility:'public'}, edition = {status:'published',content_path:'text.json'};
  assert.equal(isPublicEdition(edition, work), true);
  for (const status of ['draft','planned','sample','withdrawn']) assert.equal(isPublicEdition({...edition,status},work),false);
  for (const visibility of ['demo','archived']) assert.equal(isPublicEdition(edition,{visibility}),false);
  assert.equal(isPublicEdition({...edition,content_path:null},work),false);
});

test('edition fallback prefers the interface language then the original, never a draft', () => {
  const original = {id:'original',status:'published',language:'pt',kind:'source',content_path:'pt.json'};
  const draft = {id:'draft',status:'draft',language:'vi',kind:'translation',content_path:'vi.json'};
  const english = {id:'en',status:'published',language:'en',kind:'translation',content_path:'en.json'};
  assert.equal(preferredEdition([english,draft,original],'vi','pt'),original);
  assert.equal(preferredEdition([english,draft,original],'en','pt'),english);
  assert.equal(preferredEdition([draft],'vi','pt'),null);
  const vietnamese = {...draft,status:'published',review:{status:'ai_reviewed'}};
  assert.equal(preferredEdition([english,original,vietnamese],'vi','pt'),vietnamese);
  assert.equal(preferredEdition([english,original,vietnamese],'fr','pt'),original);
});

test('edition titles preserve translated wording and fall back for original or legacy records', () => {
  const work=Object.freeze({title:'The Artist',original_language:'en'});
  const translation=Object.freeze({title:'Nghệ sĩ',language:'vi',content_path:'vi.json'});
  assert.equal(editionTitle(work,translation),'Nghệ sĩ');
  assert.equal(editionTitle(work,{title:'The Artist',kind:'source'}),'The Artist');
  assert.equal(editionTitle(work,{kind:'translation'}),'The Artist');
  assert.equal(editionTitle(work,null),'The Artist');
  assert.equal(translation.content_path,'vi.json');
});

test('draft titles cannot displace a published original in discovery', () => {
  const work={title:'An original',visibility:'public',original_language:'en'};
  const original={id:'source',title:'An original',language:'en',kind:'source',status:'published',content_path:'source.json'};
  const draft={id:'draft',title:'Nhan đề chưa xuất bản',language:'vi',kind:'translation',status:'draft',content_path:'draft.json'};
  const visible=[draft,original].filter(edition=>isPublicEdition(edition,work));
  assert.deepEqual(visible.map(edition=>editionTitle(work,edition)),['An original']);
  assert.equal(editionTitle(work,preferredEdition(visible,'vi',work.original_language)),'An original');
});

test('search finds both edition and original titles without diacritics', () => {
  const record={title:'Một ngụ ngôn',originalTitle:'Um apólogo',author:'Machado de Assis'};
  const searchable=searchableText(record,'Đường kim, mũi chỉ.');
  for(const query of ['mot ngu ngon','um apologo','machado','duong kim'])assert.ok(searchable.includes(normalizeQuery(query)));
  assert.ok(searchableText({title:'Legacy title',author:'A writer'},'A passage').includes('legacy title'));
});

test('AI publication labels never imply human approval', () => {
  const edition = {kind:'translation',status:'published',review:{status:'ai_reviewed',reviewers:[],ai_reviewers:['AI system'],score:8.6}};
  assert.equal(reviewCategory(edition),'ai');
  assert.equal(reviewCategory({...edition,publication_policy:'litmundi-literary-v2',review:{status:'bilingual_reviewed',reviewers:['A name']}}),'ai');
  assert.equal(reviewCategory({...edition,status:'draft'}),'unreviewed');
  assert.equal(reviewCategory({...edition,status:'withdrawn'}),'unreviewed');
  assert.equal(reviewCategory({...edition,kind:'source'}),'source');
});

test('human status is explicit and cannot be inferred from a score or names', () => {
  const edition = {kind:'translation',status:'published',credits:{ai_assisted:true},review:{status:'draft',score:9.8,reviewers:['Named contributor']}};
  assert.equal(reviewCategory(edition),'translation');
  assert.equal(reviewCategory({...edition,review:{status:'bilingual_reviewed'}}),'human');
  assert.equal(reviewCategory({...edition,publication_policy:'litmundi-literary-v1',review:{status:'expert_reviewed'}}),'human');
  assert.equal(reviewCategory(undefined),'unreviewed');
});

test('many-to-many alignment obeys explicit links and target reading order', () => {
  const source = [['a','source A'],['b','source B'],['c','source C']];
  const target = [['a','target A'],['b','target B'],['c','target C']];
  const rows = alignedPassages(source,target,{links:[{source:['b','c'],target:['c']},{source:['a'],target:['a','b']}]});
  assert.deepEqual(rows[0],{source:[source[0]],target:[target[0],target[1]]});
  assert.deepEqual(rows[1],{source:[source[1],source[2]],target:[target[2]]});
});

test('broken, duplicated or incomplete alignment fails closed', () => {
  const p = [['a','A'],['b','B']];
  for (const links of [[],[{source:['a'],target:['a']}],[{source:['z'],target:['a','b']}],
    [{source:['a','b'],target:['a']},{source:['a'],target:['b']}],
    [{source:['a','b'],target:['a','a','b']}], [{source:[],target:['a','b']}]
  ]) assert.throws(()=>alignedPassages(p,p,{links}));
});

test('Vietnamese and accented catalog search works without diacritics', () => {
  assert.equal(normalizeQuery('  Đường ĐỜI  '),'duong doi');
  assert.equal(normalizeQuery('Sōseki'),'soseki');
});

test('structured metadata cannot break out of its script element', () => {
  const metadata = {name:'</script><img src=x onerror="alert(1)">',description:'Văn chương < patrimoine & literatura'};
  const serialized = serializeStructuredData(metadata);
  assert.equal(serialized.includes('<'),false);
  assert.deepEqual(JSON.parse(serialized),metadata);
});
