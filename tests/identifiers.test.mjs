import test from 'node:test';
import assert from 'node:assert/strict';
import {compareIdentifiers} from '../scripts/lib/identifiers.mjs';
const before={works:[{id:'work-a',original_language:'en'}],editions:[{id:'edition-a',work_id:'work-a',language:'en',kind:'source',source_edition_id:null,content_path:'corpus/segments/work-a/edition-a.json',legacy_slugs:['en']}],structures:{'work-a':{segment_ids:['work-a:1.1','work-a:1.2'],deprecated_ids:{'work-a:old':'work-a:1.1'}}}};
test('adding works or updating prose does not disturb existing identities',()=>assert.deepEqual(compareIdentifiers(before,structuredClone(before)),[]));
test('removal and reassignment of durable edition identities fail',()=>{
 for(const key of ['work_id','language','kind','source_edition_id','content_path']){
  const after=structuredClone(before);after.editions[0][key]='reassigned';assert.ok(compareIdentifiers(before,after).length,key);
 }
 const after=structuredClone(before);after.editions=[];assert.ok(compareIdentifiers(before,after).length);
});
test('passage retirement needs a mapping and deprecated IDs cannot be recycled',()=>{
 const after=structuredClone(before);after.structures['work-a'].segment_ids.pop();assert.ok(compareIdentifiers(before,after).length);
 after.structures['work-a'].deprecated_ids['work-a:1.2']='work-a:1.1';assert.deepEqual(compareIdentifiers(before,after),[]);
 after.structures['work-a'].segment_ids.push('work-a:old');assert.ok(compareIdentifiers(before,after).length);
});
test('legacy permalink removal fails even when the canonical edition remains',()=>{
 const after=structuredClone(before);after.editions[0].legacy_slugs=[];assert.ok(compareIdentifiers(before,after).length);
});
