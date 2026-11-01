import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assessPublication,assessReview,checkRubric,weightedScore,rawWeightedScore,reviewRecordUrl} from '../scripts/lib/quality.mjs';

const read=file=>JSON.parse(readFileSync(file,'utf8'));
const rubric=read('corpus/reviews/rubric-literary-v2.json');
const editions=read('corpus/catalog/editions.json');
const original=editions.find(e=>e.id==='wilde-artist-en-methuen-1913');
const target=editions.find(e=>e.id==='wilde-artist-vi-ai-draft-2026');
const path='corpus/reviews/'+target.work_id+'/'+target.id+'/ai-review-v2-2026-11-01.json';
const ids=read('corpus/structure/'+target.work_id+'.json').segment_ids;
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const context={source:original,sourceSha:hash(original.content_path),targetSha:hash(target.content_path),segmentIds:ids};
function fixture(){
  const edition=structuredClone(target),record={...read(path),_path:path};
  record.reviewer={identifier:'synthetic-ai-test',display_name:'Synthetic AI test fixture',github_handle:null,independent:false,evidence_url:null};
  record.ai_assessment={model:'Synthetic model',method:'Synthetic fixture for policy regression testing; no new literary review is claimed.',limitations:'Synthetic test data only, never written into the corpus or presented as a real review.'};
  record.summary='Synthetic test fixture for the v2 release rules. This is not an actual literary assessment, human review, reviewer endorsement or publication decision.';
  edition.review.ai_reviewers=[record.reviewer.identifier];
  edition.review.reviewers=[];edition.credits.editors=[];
  delete edition.editorial_attestation;
  return {edition,record};
}
const decision=(f,extra={})=>assessPublication({rubric,...context,edition:f.edition,reviews:[f.record],...extra});
const scoreMetadata=f=>{f.edition.review.score=weightedScore(f.record.scores,rubric);return f;};

test('v2 permits one 8.60 AI assessment without human reviewer, editor or attestation',()=>{
  const f=fixture(),d=decision(f);
  assert.equal(rawWeightedScore(f.record.scores,rubric),8.6);
  assert.equal(d.eligible,true,d.problems.join('\n'));
  assert.deepEqual(d.reviewers,[]);assert.equal(d.ai_reviewers.length,1);
});
test('v2 uses the exact weighted boundary: 8.55 remains a valid negative assessment',()=>{
  const f=fixture();f.record.scores={semantic_fidelity:9,literary_voice:8.5,target_naturalness:8,imagery_consistency:8.5,editorial_mechanics:8};scoreMetadata(f);
  const a=assessReview(f.record,{rubric,edition:f.edition,...context});
  assert.equal(a.raw_score,8.55);assert.deepEqual(a.errors,[]);assert.equal(a.qualifies,false);
  const d=decision(f);assert.equal(d.eligible,false);assert.equal(d.minimum_score,8.55);
  assert.ok(!d.problems.some(p=>p.includes('Displayed AI score')),'Correct below-threshold display should not be called stale');
});
test('v2 does not inherit v1 fidelity or per-dimension numerical floors',()=>{
  const f=fixture();f.record.scores={semantic_fidelity:8,literary_voice:9,target_naturalness:9,imagery_consistency:9,editorial_mechanics:9};scoreMetadata(f);
  assert.equal(rawWeightedScore(f.record.scores,rubric),8.65);assert.equal(decision(f).eligible,true);
});
test('v2 current policy and every immutable gate are checked',()=>{
  assert.deepEqual(checkRubric(rubric),[]);
  for(const [key,value] of Object.entries(rubric.release_gate)){
    const changed=structuredClone(rubric);changed.release_gate[key]=typeof value==='boolean'?!value:Array.isArray(value)?[]:value+1;
    assert.ok(checkRubric(changed).length,key);
  }
  const changed=structuredClone(rubric);changed.release_gate.min_semantic_fidelity_each=9;
  assert.ok(checkRubric(changed).length,'An old hidden category floor is not the agreed v2 policy');
});
test('v2 source or target edits invalidate AI eligibility until reassessed',()=>{
  const f=fixture();
  assert.equal(decision(f,{targetSha:'a'.repeat(64)}).eligible,false);
  assert.equal(decision(f,{sourceSha:'b'.repeat(64)}).eligible,false);
});
test('v2 cannot approve missing or repeated canonical passage coverage',()=>{
  for(const mutate of [a=>a.slice(0,-1),a=>[...a,a[0]]]){
    const f=fixture();f.record.segments_reviewed=mutate(f.record.segments_reviewed);assert.equal(decision(f).eligible,false);
  }
});
test('v2 blocks an unresolved serious finding despite a high weighted score',()=>{
  for(const severity of ['major','critical']){
    const f=fixture();f.record.scores=Object.fromEntries(rubric.criteria.map(c=>[c.id,10]));scoreMetadata(f);
    f.record.findings=[{segment:ids[0],category:'semantic_fidelity',severity,status:'open',explanation:'Synthetic material omission must block publication regardless of its numerical grade.'}];
    assert.equal(decision(f).eligible,false);
  }
});
test('v2 sees serious current findings in unselected historical-policy records',()=>{
  const f=fixture(),old=read('corpus/reviews/'+target.work_id+'/'+target.id+'/ai-preflight-2026-11-01.json');
  old.findings=[{segment:ids[0],category:'semantic_fidelity',severity:'major',status:'open',explanation:'Synthetic current unresolved omission cannot be hidden by selecting a different score.'}];
  assert.equal(decision(f,{reviews:[old,f.record]}).eligible,false);
  old.target_sha256='c'.repeat(64);
  assert.equal(decision(f,{reviews:[old,f.record]}).eligible,true,'A superseded text is historical evidence, not an approval or current defect');
});
test('v2 requires explicit current evidence selection and matching public record links',()=>{
  for(const mutation of [f=>f.edition.review.record_paths=[],f=>f.record._path=path.replace('2026-11-01','2026-11-02'),f=>f.edition.review.evidence_urls=[]]){
    const f=fixture();mutation(f);assert.equal(decision(f).eligible,false);
  }
});
test('v2 cannot relabel an old advisory preflight as a current AI publication assessment',()=>{
  const f=fixture(),oldPath=path.replace('ai-review-v2-2026-11-01','ai-preflight-2026-11-01');
  const old={...read(oldPath),_path:oldPath};f.edition.review.record_paths=[oldPath];f.edition.review.evidence_urls=[reviewRecordUrl(oldPath)];
  assert.equal(decision(f,{reviews:[old]}).eligible,false);
});
test('v2 rejects unsupported scores, inflated display scores and AI model omissions',()=>{
  for(const mutation of [f=>f.record.scores.semantic_fidelity=9.01,f=>f.edition.review.score=9.9,f=>delete f.record.ai_assessment,f=>f.record.ai_assessment.model='']){
    const f=fixture();mutation(f);assert.equal(decision(f).eligible,false);
  }
});
test('v2 AI systems cannot claim independent human identity',()=>{
  for(const mutation of [f=>f.record.reviewer.independent=true,f=>f.record.reviewer.github_handle='synthetic-human',f=>f.edition.review.status='expert_reviewed']){
    const f=fixture();mutation(f);assert.equal(decision(f).eligible,false);
  }
});
test('v2 rejects invented human credits and unsupported extra AI assessors',()=>{
  for(const mutation of [f=>f.edition.review.reviewers=[f.record.reviewer.identifier],f=>f.edition.review.reviewers=['invented-human'],f=>f.edition.review.ai_reviewers.push('invented-ai-with-no-record')]){
    const f=fixture();mutation(f);assert.equal(decision(f).eligible,false);
  }
});
test('v2 can retain evidenced optional human feedback without requiring its score to pass',()=>{
  const f=fixture(),url='https://github.com/streamentry/LitMundi/pull/999#pullrequestreview-999';
  const human={...structuredClone(f.record),rubric_id:'litmundi-literary-v1',kind:'independent_human',reviewer:{identifier:'synthetic-human',github_handle:'synthetic-human',display_name:'Synthetic human fixture only',independent:true,evidence_url:url,qualifications:'Synthetic bilingual literary qualifications used exclusively for a software test.',languages:['en','vi'],conflicts_of_interest:'Synthetic disclosure for a regression test only.'},scores:Object.fromEntries(rubric.criteria.map(c=>[c.id,8]))};
  delete human.ai_assessment;delete human._path;
  f.edition.review.reviewers=['synthetic-human'];f.edition.review.evidence_urls.push(url);
  assert.equal(decision(f,{reviews:[f.record,human]}).eligible,true);
  human.target_sha256='e'.repeat(64);assert.equal(decision(f,{reviews:[f.record,human]}).eligible,false,'A current human credit cannot rely on superseded text');
});
test('v2 preserves rights, licensed-reuse and actual contributor-permission checks',()=>{
  for(const mutation of [f=>f.edition.rights.status='disputed',f=>f.edition.rights.license=null,f=>f.edition.rights.evidence_urls=[],f=>f.edition.generation.human_contributors=[{name:'Synthetic actual contributor',consent_url:'https://example.invalid/no-permission'}]]){
    const f=fixture();mutation(f);assert.equal(decision(f).eligible,false);
  }
});
test('v2 source identity and disclosed generation provenance remain necessary',()=>{
  const f=fixture();assert.equal(decision(f,{source:{...original,status:'withdrawn'}}).eligible,false);
  for(const mutation of [f=>f.edition.credits.ai_assisted=false,f=>delete f.edition.generation,f=>delete f.edition.publication_policy]){
    const changed=fixture();mutation(changed);assert.equal(decision(changed).eligible,false);
  }
});
