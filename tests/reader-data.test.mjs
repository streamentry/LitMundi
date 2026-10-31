import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicEdition, preferredEdition, alignedPassages, normalizeQuery } from '../scripts/lib/reader-data.mjs';

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
