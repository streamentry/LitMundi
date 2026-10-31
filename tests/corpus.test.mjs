import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const w=JSON.parse(readFileSync('corpus/catalog/works.json','utf8'));const seg=JSON.parse(readFileSync('corpus/segments/demo-proust/fr.json','utf8'));
test('unique canonical work identifiers',()=>assert.equal(new Set(w.map(x=>x.id)).size,w.length));
test('stable segment naming',()=>assert.ok(Object.keys(seg).every(id=>/^demo-proust:\d+\.\d+$/.test(id))));
test('no false publication claims',()=>assert.ok(w.every(x=>x.editions.every(e=>e.status!=='published'))));