import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {weightedScore,checkRubric,assessReview,assessPublication} from '../scripts/lib/quality.mjs';

const read=p=>JSON.parse(readFileSync(p,'utf8'));
const rubric=read('corpus/reviews/rubric-literary-v1.json');
const editions=read('corpus/catalog/editions.json');
const source=editions.find(e=>e.id==='wilde-artist-en-methuen-1913');
const candidate=editions.find(e=>e.id==='wilde-artist-vi-ai-draft-2026');
const ids=read('corpus/structure/wilde-the-artist.json').segment_ids;
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const sourceSha=sha(source.content_path),targetSha=sha(candidate.content_path);
const ev=id=>'https://github.com/streamentry/LitMundi/pull/'+id+'#pullrequestreview-'+id;
function human(handle,id=1) {
 return {
  rubric_id:rubric.id, edition_id:candidate.id, source_edition_id:source.id,reviewed_at:'2026-10-31',
  kind:'independent_human',
  reviewer:{identifier:handle,display_name:handle,github_handle:handle,independent:true,evidence_url:ev(id),
   qualifications:'Synthetic bilingual literary qualifications for a test fixture only; no real person is claimed.',
   languages:['en','vi'],conflicts_of_interest:'Synthetic fixture only: no actual reviewer or conflict attestation.'},
  source_sha256:sourceSha,target_sha256:targetSha,segments_reviewed:[...ids],
  scores:Object.fromEntries(rubric.criteria.map(c=>[c.id,9.5])),
  findings:[],
  summary:'I independently compared the entire five-paragraph source against the Vietnamese text, checked meaning, imagery, and register, and documented this synthetic review for TESTING ONLY; no real reviewers are claimed.'
 };
}
const reviewerA=human('synthetic-qa-a',123),reviewerB=human('synthetic-qa-b',124);
function prepared(){
 const e=structuredClone(candidate);
 e.rights.status='cleared';e.rights.license='CC-BY-4.0';
 e.rights.evidence_urls=['https://github.com/streamentry/LitMundi/pull/122'];
 e.credits.translator='synthetic-editor';e.credits.editors=['synthetic-translator'];
 e.review.status='literary_edited';
 e.review.reviewers=['synthetic-qa-a','synthetic-qa-b'];
 e.review.evidence_urls=[ev(123),ev(124)];
 e.editorial_attestation={
   verified_by:'synthetic-maintainer',verified_at:'2026-11-01',evidence_url:'https://github.com/streamentry/LitMundi/pull/122',
   source_sha256:sourceSha,target_sha256:targetSha,reviewer_handles:e.review.reviewers,
   license_consent_urls:[...e.rights.evidence_urls],
   checks:{reviewer_identity:true,reviewer_qualifications:true,reviewer_independence:true,source_rights:true,contributor_consent:true}
 };
 return e;
}
function decision(edition=prepared(),reviews=[reviewerA,reviewerB],target=targetSha) {
 return assessPublication({rubric,edition,source,sourceSha,targetSha:target,segmentIds:ids,reviews});
}
test('rubric is valid and must total 100%',()=>{
 assert.deepEqual(checkRubric(rubric),[]);
 assert.equal(rubric.criteria.reduce((s,x)=>s+x.weight,0),100);
});
test('AI preflight 8.6 does not pass',()=>{
 const ai=read('corpus/reviews/wilde-the-artist/wilde-artist-vi-ai-draft-2026/ai-preflight-2026-10-31.json');
 assert.equal(weightedScore(ai.scores,rubric),8.6);
 assert.equal(assessReview(ai,{rubric,edition:candidate,sourceSha,targetSha,segmentIds:ids}).qualifies,false);
 assert.equal(decision(prepared(),[ai]).eligible,false);
});
test('synthetic two-reviewer case passes when all formal gates meet',()=>assert.equal(decision().eligible,true));
test('two independent human reviewers are mandatory',()=>assert.equal(decision(prepared(),[reviewerA]).eligible,false));
test('a reviewer scoring below nine blocks publishing',()=>{
 const low=structuredClone(reviewerB);
 low.scores.literary_voice=7;
 assert.equal(decision(prepared(),[reviewerA,low]).eligible,false);
});
test('semantic fidelity must reach nine regardless of average',()=>{
 const low=structuredClone(reviewerA);
 low.scores.semantic_fidelity=8.5;
 assert.equal(assessReview(low,{rubric,edition:candidate,sourceSha,targetSha,segmentIds:ids}).qualifies,false);
});
test('unresolved serious translation errors always block publication',()=>{
 const bad=structuredClone(reviewerA);
 bad.findings=[{segment:ids[0],category:'semantic_fidelity',severity:'major',status:'open',explanation:'Test serious mistranslation in the opening sentence'}];
 assert.equal(assessReview(bad,{rubric,edition:candidate,sourceSha,targetSha,segmentIds:ids}).qualifies,false);
});
test('reviews become invalid when the translation changes',()=>assert.equal(decision(prepared(),[reviewerA,reviewerB],'a'.repeat(64)).eligible,false));
test('missing license blocks publication despite high scores',()=>{
 const e=prepared();e.rights.license=null;
 assert.equal(decision(e).eligible,false);
});
test('duplicate reviewer identity blocks publication',()=>{
 const e=prepared(),b=structuredClone(reviewerB);b.reviewer.identifier='synthetic-qa-a';b.reviewer.github_handle='synthetic-qa-a';
 assert.equal(decision(e,[reviewerA,b]).eligible,false);
});
test('missing reviewed segment blocks approval',()=>{
 const r=structuredClone(reviewerA);r.segments_reviewed.pop();
 assert.equal(assessReview(r,{rubric,edition:candidate,sourceSha,targetSha,segmentIds:ids}).qualifies,false);
});
test('scores reject false precision and out-of-range values',()=>{
 assert.equal(weightedScore({...reviewerA.scores,semantic_fidelity:9.01},rubric),null);
 assert.equal(weightedScore({...reviewerA.scores,semantic_fidelity:11},rubric),null);
});

test('honest negative draft reviews are structurally valid but cannot approve',()=>{
 const r=structuredClone(reviewerA);
 r.scores.semantic_fidelity=7;
 r.findings=[{segment:ids[0],category:'semantic_fidelity',severity:'major',status:'open',explanation:'Synthetic evidence of omitted meaning, retained for editorial revision.'}];
 const result=assessReview(r,{rubric,edition:candidate,sourceSha,targetSha,segmentIds:ids});
 assert.deepEqual(result.errors,[]);
 assert.ok(result.blockers.length>0);
 assert.equal(result.qualifies,false);
});
test('old hash-bound review history does not poison new explicitly selected approvals',()=>{
 const historical=structuredClone(reviewerA);
 historical.target_sha256='a'.repeat(64);historical.reviewer.evidence_url=ev(99);
 historical.scores.semantic_fidelity=6;
 assert.equal(decision(prepared(),[historical,reviewerA,reviewerB]).eligible,true);
});
test('direct review permalinks, qualifications and maintainer verification are mandatory',()=>{
 const e=prepared();delete e.editorial_attestation;
 assert.equal(decision(e).eligible,false);
 const r=structuredClone(reviewerA);r.reviewer.evidence_url='https://github.com/streamentry/LitMundi/pull/123';
 assert.equal(decision(prepared(),[r,reviewerB]).eligible,false);
 r.reviewer.evidence_url=ev(123);delete r.reviewer.qualifications;
 assert.equal(decision(prepared(),[r,reviewerB]).eligible,false);
});
test('duplicate coverage cannot masquerade as complete coverage',()=>{
 const r=structuredClone(reviewerA);r.segments_reviewed.push(ids[0]);
 assert.equal(assessReview(r,{rubric,edition:candidate,sourceSha,targetSha,segmentIds:ids}).qualifies,false);
});
test('every immutable rubric gate and weight is protected against weakening',()=>{
 for (const [key,v] of Object.entries(rubric.release_gate)){
   const changed=structuredClone(rubric);
   changed.release_gate[key]=typeof v==='boolean'?false:Array.isArray(v)?[]:v-1;
   assert.ok(checkRubric(changed).length,key);
 }
 const changed=structuredClone(rubric);changed.criteria[0].weight-=5;changed.criteria[1].weight+=5;
 assert.ok(checkRubric(changed).length);
});
test('current severe AI findings block publication despite two human passing scores',()=>{
 const ai=structuredClone(reviewerA);ai.kind='ai_preflight';ai.reviewer.independent=false;
 ai.findings=[{segment:ids[0],category:'semantic_fidelity',severity:'critical',status:'open',explanation:'Synthetic current omission must be resolved before any publication.'}];
 assert.equal(decision(prepared(),[reviewerA,reviewerB,ai]).eligible,false);
});
