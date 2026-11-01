import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadTodoContext,validateTodo,renderTodo,nextTodos} from '../scripts/translation-todo.mjs';

const load=()=>JSON.parse(readFileSync('research/vietnamese-translation-backlog.json','utf8'));
const context=()=>loadTodoContext();
const emptyContext={works:[],editions:[],atlas:{works:[]}};
function fixture(){
  return {schema_version:1,created_on:'2026-11-01',updated_on:'2026-11-01',target_language:'vi',
    scope:'Synthetic queue for regression tests only. These are not real literary works, sources, rights assessments or publication claims.',
    methodology:Array.from({length:4},()=> 'Synthetic test data used only to exercise validation boundaries.'),
    sources:[{id:'fixture-catalog',url:'https://example.invalid/catalog',title:'Synthetic catalog fixture',access:'search_result',scope:'Synthetic metadata only; this is not an actual retrieved source.',checked_on:'2026-11-01'}],
    works:Array.from({length:500},(_,i)=>({id:'fixture-work-'+(i+1),queue_order:i+1,title:'Synthetic work '+(i+1),author:'Synthetic author '+(i+1),original_language:'en',publication_year:null,form:'short_story',tradition:'Synthetic',priority_band:3,rationale:'Synthetic selection used exclusively in software regression tests.',source_ids:['fixture-catalog'],rights_screen:'likely_public_domain',rights_note:'Synthetic candidate screen; this does not clear real content.',status:'todo',vietnamese_supply:{status:'not_audited',atlas_work_id:null,note:'Synthetic test state, with no claimed bibliography audit.'},publication_edition_id:null}))};
}

test('the requested queue has exactly 500 unique works and a current generated checklist',()=>{
  const data=load(),corpus=context();
  assert.deepEqual(validateTodo(data,corpus),[]);
  assert.equal(renderTodo(data,corpus),readFileSync('TODO.md','utf8'));
  assert.equal((renderTodo(data,corpus).match(/^- \[[ x]\]/gm)||[]).length,500);
});

test('a renamed ID cannot hide a duplicate title by the same author',()=>{
  const data=fixture();data.works[1].author=data.works[0].author;data.works[1].title=data.works[0].title;
  assert.ok(validateTodo(data,emptyContext).some(error=>error.includes('Duplicate author/title')));
  const order=fixture();order.works[1].queue_order=order.works[0].queue_order;
  assert.ok(validateTodo(order,emptyContext).some(error=>error.includes('Duplicate queue order')));
});

test('rights-blocked works cannot enter the active translation queue',()=>{
  const data=fixture(),item=data.works[0];
  item.rights_screen='permission_required';
  assert.ok(validateTodo(data,emptyContext).some(error=>error.includes('must stay on rights hold')));
  item.status='blocked_rights';
  assert.ok(!nextTodos(data,500).some(work=>work.id===item.id));
});

test('a checked TODO needs a published Vietnamese edition for that exact work',()=>{
  const data=fixture(),item=data.works[0];
  item.status='published';item.publication_edition_id='wilde-artist-vi-ai-draft-2026';
  assert.ok(validateTodo(data,emptyContext).some(error=>error.includes('actual public Vietnamese edition')));
});

test('bibliographic references cannot be dangling, unsafe or mistaken for Vietnamese evidence',()=>{
  const data=fixture();data.works[0].source_ids.push('missing-record');
  data.sources[0].url='javascript:alert(1)';
  data.works[1].vietnamese_supply={status:'atlas_evidence_available',atlas_work_id:'missing-work',note:'This deliberately invalid test has no catalog support.'};
  const errors=validateTodo(data,emptyContext);
  assert.ok(errors.some(error=>error.includes('Unknown source')));
  assert.ok(errors.some(error=>error.includes('Unsafe source URL')));
  assert.ok(errors.some(error=>error.includes('Missing Vietnamese Atlas evidence')));
});

test('resume selects unfinished active work first and never repeats completed editions',()=>{
  const data=fixture();data.works[10].status='in_review';data.works[400].status='translating';
  data.works[0].status='published';data.works[1].status='blocked_rights';data.works[2].status='blocked_source';
  const next=nextTodos(data,10);
  assert.deepEqual(next.slice(0,3).map(work=>work.queue_order),[11,401,4]);
  assert.ok(next.every(work=>!['published','blocked_rights','blocked_source'].includes(work.status)));
  data.works.forEach(work=>{work.status='published';});assert.deepEqual(nextTodos(data),[]);
});

test('later evidence updates the queue without rewriting its original creation date',()=>{
  const data=fixture();data.updated_on='2026-11-02';data.sources[0].checked_on='2026-11-02';
  assert.deepEqual(validateTodo(data,emptyContext),[]);assert.equal(data.created_on,'2026-11-01');
  data.sources[0].checked_on='2026-11-03';
  assert.ok(validateTodo(data,emptyContext).some(error=>error.includes('Invalid evidence date')));
});
