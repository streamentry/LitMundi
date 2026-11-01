/** Versioned literary assessments. Scores are judgments; these functions check evidence. */
export const ACTIVE_RUBRIC_ID = 'litmundi-literary-v2';
export const SUPPORTED_RUBRIC_IDS = ['litmundi-literary-v1', ACTIVE_RUBRIC_ID];
export const reviewRecordUrl = file => 'https://github.com/streamentry/LitMundi/blob/main/'+file;
export const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const digest = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const handle = v => typeof v === 'string' && /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(v);
const reviewEvidence = v => typeof v === 'string' && /^https:\/\/github\.com\/streamentry\/LitMundi\/pull\/\d+#pullrequestreview-\d+$/.test(v);
const prEvidence = v => typeof v === 'string' && /^https:\/\/github\.com\/streamentry\/LitMundi\/pull\/\d+(?:#[A-Za-z0-9-]+)?$/.test(v);

export function rawWeightedScore(scores, rubric) {
  if (!scores || !rubric?.criteria) return null;
  let total = 0;
  for (const c of rubric.criteria) {
    const v = scores[c.id];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10 || Math.round(v * 2) !== v * 2) return null;
    total += v * c.weight;
  }
  return total / 100;
}
export function weightedScore(scores,rubric){const value=rawWeightedScore(scores,rubric);return value===null?null:round2(value);}

export function checkRubric(rubric) {
  const problems = [];
  const expected = {semantic_fidelity:35,literary_voice:25,target_naturalness:15,imagery_consistency:15,editorial_mechanics:10};
  const aiPolicy=rubric?.id===ACTIVE_RUBRIC_ID;
  if (!(rubric?.id==='litmundi-literary-v1'&&rubric?.version==='1.0.0') && !(aiPolicy&&rubric?.version==='2.0.0')) problems.push('Unrecognized immutable rubric version.');
  if (!Array.isArray(rubric?.criteria) || rubric.criteria.length !== 5 ||
      new Set(rubric.criteria.map(c=>c.id)).size !== 5 ||
      rubric.criteria.some(c=>!Object.hasOwn(expected,c.id)||expected[c.id] !== c.weight)) problems.push('The literary rubric requires the original five criteria and 35/25/15/15/10 weights.');
  const required = aiPolicy?{
    min_score_each_reviewer:8.6,min_ai_reviews:1,min_independent_human_reviewers:0,
    require_human_review:false,coverage_percent:100,require_source_target_digest_match:true,
    require_legal_clearance:true,require_written_open_license:true,require_review_evidence:true,require_editorial_approval:false
  }:{
    min_score_each_reviewer:9,min_semantic_fidelity_each:9,min_other_dimension_each:8,
    min_independent_human_reviewers:2,coverage_percent:100,require_source_target_digest_match:true,
    require_legal_clearance:true,require_written_open_license:true,require_review_evidence:true,require_editorial_approval:true
  };
  for (const [key,value] of Object.entries(required)) if (rubric?.release_gate?.[key] !== value) problems.push('The immutable '+(aiPolicy?'v2':'v1')+' gate requires '+key+' = '+value+'.');
  if(aiPolicy&&Object.keys(rubric?.release_gate??{}).some(key=>!Object.hasOwn(required,key)&&key!=='block_on_open_severities'))problems.push('Unrecognized v2 publication gate; use a new policy version to add conditions.');
  if (JSON.stringify(rubric?.release_gate?.block_on_open_severities) !== JSON.stringify(['major','critical'])) problems.push('Major and critical findings must block publication.');
  return problems;
}

/**
 * errors are malformed evidence; blockers are honest negative/stale assessments.
 * Negative findings must remain recordable without breaking draft CI.
 */
export function assessReview(record, {rubric,edition,sourceSha,targetSha,segmentIds,sourceLanguage}) {
  const errors=[],blockers=[];
  const score=weightedScore(record?.scores,rubric);
  const rawScore=rawWeightedScore(record?.scores,rubric);
  if (!record || !edition) return {score,errors:['Review or edition missing.'],blockers,qualifies:false,current:false,advisory_only:true};
  if (!['ai_preflight','ai_review','independent_human'].includes(record.kind)) errors.push('Unrecognized reviewer kind.');
  if (record.rubric_id!==rubric.id) errors.push('Review references wrong rubric.');
  if (record.edition_id!==edition.id || record.source_edition_id!==edition.source_edition_id) errors.push('Review references wrong edition or source.');
  if (score===null) errors.push('Scores must be present, 0..10, in increments of 0.5.');
  if (!Array.isArray(record.segments_reviewed) || record.segments_reviewed.length!==segmentIds.length ||
      new Set(record.segments_reviewed).size!==segmentIds.length || !segmentIds.every(id=>record.segments_reviewed.includes(id))) errors.push('Review must cover every canonical segment exactly once.');
  if (!Array.isArray(record.findings)) errors.push('Findings must be a list.');
  else for (const f of record.findings) {
    if (!segmentIds.includes(f.segment)) errors.push('Issue refers to absent segment.');
    if (!rubric.criteria.some(c=>c.id===f.category)) errors.push('Issue category is not in rubric.');
    if (!['minor','major','critical'].includes(f.severity)) errors.push('Unknown issue severity.');
    if (!['open','resolved'].includes(f.status)) errors.push('Unknown issue disposition.');
    if (typeof f.explanation!=='string'||f.explanation.trim().length<15) errors.push('Issue needs an explanation.');
    if (f.status==='open'&&['major','critical'].includes(f.severity)) blockers.push('Unresolved '+f.severity+' finding at '+f.segment+'.');
  }
  if (typeof record.summary!=='string'||record.summary.trim().length<80) errors.push('Review needs detailed rationale.');
  for (const key of ['source_sha256','target_sha256']) if (record[key]!==null && !digest(record[key])) errors.push('Invalid '+key+'.');
  const current=digest(record.source_sha256)&&digest(record.target_sha256)&&record.source_sha256===sourceSha&&record.target_sha256===targetSha;
  if (!current) blockers.push('Source or translation differs from review, or historical record has no content hashes.');
  const aiPolicy=rubric.id===ACTIVE_RUBRIC_ID;
  const advisory_only=aiPolicy?record.kind!=='ai_review':record.kind!=='independent_human';
  if (record.kind==='ai_review') {
    if(!aiPolicy)errors.push('AI publication assessments require rubric v2.');
    if(record.reviewer?.independent!==false||record.reviewer?.github_handle!==null)errors.push('AI assessment must not claim independent human identity.');
    if(typeof record.reviewer?.identifier!=='string'||!record.reviewer.identifier.trim())errors.push('AI assessment identifier is missing.');
    for(const key of ['model','method','limitations'])if(typeof record.ai_assessment?.[key]!=='string'||record.ai_assessment[key].trim().length<(key==='model'?1:20))errors.push('AI assessment must disclose '+key+'.');
    if(!digest(record.source_sha256)||!digest(record.target_sha256))errors.push('AI publication assessments require exact source and target SHA-256 hashes.');
    if(rawScore!==null&&rawScore<rubric.release_gate.min_score_each_reviewer)blockers.push('AI weighted score is below '+rubric.release_gate.min_score_each_reviewer+'/10.');
  }
  if (record.kind==='independent_human') {
    const r=record.reviewer??{};
    if (r.independent!==true) blockers.push('Reviewer must attest independence.');
    if (!handle(r.github_handle)) errors.push('Human reviewer requires a valid GitHub handle.');
    if (r.identifier!==r.github_handle) errors.push('Reviewer identifier must match GitHub handle.');
    if (!reviewEvidence(r.evidence_url)) errors.push('Human review requires a direct GitHub PR review permalink.');
    if (typeof r.qualifications!=='string'||r.qualifications.trim().length<40) blockers.push('Reviewer bilingual literary qualifications are undocumented.');
    if (!Array.isArray(r.languages)||!r.languages.includes(edition.language)||(sourceLanguage&&!r.languages.includes(sourceLanguage))) blockers.push('Reviewer must document both source and target languages.');
    if (typeof r.conflicts_of_interest!=='string'||r.conflicts_of_interest.trim().length<10) blockers.push('Reviewer conflicts-of-interest disclosure is missing.');
    if (!digest(record.source_sha256)||!digest(record.target_sha256)) errors.push('Human reviews require exact source and target SHA-256 hashes.');
    if (rawScore!==null && rawScore<rubric.release_gate.min_score_each_reviewer) blockers.push('Reviewer score is below '+rubric.release_gate.min_score_each_reviewer+'/10.');
    for (const c of rubric.criteria) {
      const min=c.id==='semantic_fidelity'?rubric.release_gate.min_semantic_fidelity_each:rubric.release_gate.min_other_dimension_each;
      if (typeof record.scores?.[c.id]==='number' && record.scores[c.id]<min) blockers.push('Category '+c.id+' below minimum '+min+'.');
    }
  }
  return {score,raw_score:rawScore,errors,blockers,current,qualifies:!advisory_only&&errors.length===0&&blockers.length===0,advisory_only};
}

/** Only explicitly selected, current review evidence can approve publication. */
export function assessPublication({rubric,edition,source,sourceSha,targetSha,segmentIds,reviews}) {
  if(rubric?.id===ACTIVE_RUBRIC_ID)return assessAiPublication({rubric,edition,source,sourceSha,targetSha,segmentIds,reviews});
  const problems=[...checkRubric(rubric)];
  if (edition?.kind!=='translation') return {eligible:false,problems:['Only translations require this rubric.'],reviewers:[],ai_reviewers:[],minimum_score:null};
  if (!source||source.status!=='published'||source.kind!=='source'||source.id!==edition.source_edition_id||source.work_id!==edition.work_id) problems.push('The exact original source must be published.');
  if (!edition.content_path) problems.push('Translation has no complete text.');
  if (edition.rights?.status!=='cleared') problems.push('Rights clearance is missing.');
  if (!['CC-BY-4.0','CC0-1.0'].includes(edition.rights?.license)) problems.push('Written open publication license is missing.');
  if (!edition.rights?.evidence_urls?.length) problems.push('Contributor license/rights evidence is missing.');
  if (!edition.credits?.translator?.trim()||!edition.credits?.editors?.some(n=>n.trim())) problems.push('Named human translator/editor is missing.');
  if (!['bilingual_reviewed','literary_edited','expert_reviewed'].includes(edition.review?.status)) problems.push('Editorial status is not approved.');
  const evidence=edition.review?.evidence_urls??[];
  const results=(reviews??[]).map(record=>({record,result:assessReview(record,{rubric,edition,sourceSha,targetSha,segmentIds,sourceLanguage:source?.language})}));
  for (const {record,result} of results) if (result.current && record.findings?.some(f=>f.status==='open'&&['major','critical'].includes(f.severity))) problems.push('Current review '+record.reviewer?.identifier+' has unresolved major/critical findings.');
  const selected=results.filter(x=>x.record.kind==='independent_human'&&evidence.includes(x.record.reviewer?.evidence_url));
  for (const {record,result} of selected) if (result.errors.length||result.blockers.length) problems.push('Selected review '+record.reviewer?.identifier+': '+[...result.errors,...result.blockers].join(' '));
  const passed=selected.filter(x=>x.result.qualifies);
  const identities=passed.map(x=>x.record.reviewer.github_handle.toLowerCase()),unique=new Set(identities);
  if (unique.size<rubric.release_gate.min_independent_human_reviewers) problems.push('Requires two independent human reviews with score >=9.');
  if (unique.size!==passed.length) problems.push('Duplicate reviewer identity.');
  const metaHandles=(edition.review?.reviewers??[]).map(x=>x.toLowerCase());
  if (![...unique].every(h=>metaHandles.includes(h))) problems.push('Human reviewer identities missing from edition metadata.');
  if (new Set(evidence.filter(reviewEvidence)).size<2) problems.push('Two distinct editorial review evidence URLs are missing.');
  const contributors=[edition.credits?.translator,...edition.credits?.editors??[]].filter(Boolean).map(x=>x.trim().toLowerCase());
  if (contributors.some(x=>unique.has(x))) problems.push('Reviewers cannot also be translator/editor.');
  const a=edition.editorial_attestation;
  if (!a) problems.push('Maintainer verification of qualifications, independence and license consent is missing.');
  else {
    if (!handle(a.verified_by)||unique.has(a.verified_by.toLowerCase())) problems.push('A separate maintainer must verify the evidence.');
    if (!prEvidence(a.evidence_url)) problems.push('Maintainer attestation needs a reviewable GitHub PR evidence link.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.verified_at??'')) problems.push('Maintainer verification date is missing.');
    if (a.source_sha256!==sourceSha||a.target_sha256!==targetSha) problems.push('Maintainer verification is stale.');
    if (![...unique].every(h=>(a.reviewer_handles??[]).map(x=>x.toLowerCase()).includes(h))) problems.push('Maintainer has not verified every approving reviewer.');
    if (!a.license_consent_urls?.length||!a.license_consent_urls.every(url=>edition.rights.evidence_urls.includes(url))) problems.push('Maintainer must identify contributor consent evidence in the rights record.');
    for (const key of ['reviewer_identity','reviewer_qualifications','reviewer_independence','source_rights','contributor_consent']) if (a.checks?.[key]!==true) problems.push('Maintainer check missing: '+key+'.');
  }
  return {eligible:problems.length===0,problems,reviewers:[...unique],ai_reviewers:[],minimum_score:passed.length?Math.min(...passed.map(x=>x.result.score)):null};
}

/** V2: one current, explicit AI assessment can authorize an AI-labelled release. */
function assessAiPublication({rubric,edition,source,sourceSha,targetSha,segmentIds,reviews}){
  const problems=[...checkRubric(rubric)];
  if(edition?.kind!=='translation')return {eligible:false,problems:['Only translations require this rubric.'],reviewers:[],ai_reviewers:[],minimum_score:null};
  if(edition.publication_policy!==rubric.id)problems.push('Translation must explicitly select the current AI publication policy.');
  if(!source||source.status!=='published'||source.kind!=='source'||source.id!==edition.source_edition_id||source.work_id!==edition.work_id)problems.push('The exact original source must be published.');
  if(!['cleared','public_domain_assessed'].includes(source?.rights?.status)||!source?.rights?.evidence_urls?.length)problems.push('Original source rights evidence is missing.');
  if(!edition.content_path)problems.push('Translation has no complete text.');
  if(edition.rights?.status!=='cleared')problems.push('Rights clearance is missing.');
  if(!['CC-BY-4.0','CC0-1.0'].includes(edition.rights?.license))problems.push('An explicit open reuse license or dedication is missing.');
  if(!edition.rights?.evidence_urls?.length)problems.push('Content rights and reuse evidence is missing.');
  if(edition.credits?.ai_assisted!==true||!edition.credits?.translator?.trim())problems.push('AI translation provenance must be disclosed.');
  if(edition.generation?.kind!=='ai_generated'||edition.generation?.direct_from_original!==true||!edition.generation?.tools?.length)problems.push('Direct AI generation provenance is missing.');
  const contributors=edition.generation?.human_contributors;
  if(!Array.isArray(contributors))problems.push('Human contribution status must be recorded honestly.');
  else for(const contributor of contributors)if(!contributor.name?.trim()||!edition.rights?.evidence_urls?.includes(contributor.consent_url))problems.push('Actual human contributions require their own documented reuse permission.');
  const policyEvidence=reviewRecordUrl('docs/AI-CONTENT-POLICY.md');
  if(!edition.rights?.evidence_urls?.includes(policyEvidence))problems.push('AI content reuse policy evidence is missing.');
  if(edition.review?.status!=='ai_reviewed'||edition.review?.rubric_id!==rubric.id)problems.push('Release must be labelled AI-reviewed under the current rubric.');
  const paths=edition.review?.record_paths??[],evidence=edition.review?.evidence_urls??[];
  const prefix='corpus/reviews/'+edition.work_id+'/'+edition.id+'/';
  if(!paths.length||new Set(paths).size!==paths.length||paths.some(file=>!file.startsWith(prefix)||!/^[-a-zA-Z0-9]+\.json$/.test(file.slice(prefix.length))))problems.push('Select distinct canonical AI assessment record paths.');
  if(!paths.every(file=>evidence.includes(reviewRecordUrl(file))))problems.push('AI review links must identify every selected canonical record.');
  const results=(reviews??[]).map(record=>({record,result:assessReview(record,{rubric,edition,sourceSha,targetSha,segmentIds,sourceLanguage:source?.language})}));
  for(const {record,result} of results)if(result.current&&record.findings?.some(f=>f.status==='open'&&['major','critical'].includes(f.severity)))problems.push('Current assessment '+record.reviewer?.identifier+' has unresolved major/critical findings.');
  const selected=results.filter(x=>paths.includes(x.record._path));
  if(selected.length!==paths.length)problems.push('A selected AI assessment record is absent or duplicated.');
  for(const {record,result} of selected){
    if(record.kind!=='ai_review'||record.rubric_id!==rubric.id)problems.push('Legacy preflights or human reviews cannot be relabelled as v2 AI assessments.');
    if(result.errors.length||result.blockers.length)problems.push('Selected AI assessment '+record._path+': '+[...result.errors,...result.blockers].join(' '));
  }
  const passed=selected.filter(x=>x.record.kind==='ai_review'&&x.result.qualifies);
  if(passed.length<rubric.release_gate.min_ai_reviews)problems.push('Requires a current full-coverage AI assessment scoring at least '+rubric.release_gate.min_score_each_reviewer+'/10.');
  const aiReviewers=[...new Set(passed.map(x=>x.record.reviewer.identifier))];
  const selectedAiIds=[...new Set(selected.filter(x=>x.record.kind==='ai_review').map(x=>x.record.reviewer?.identifier))];
  const declaredAi=edition.review?.ai_reviewers??[];
  if(declaredAi.length!==selectedAiIds.length||new Set(declaredAi).size!==declaredAi.length||!selectedAiIds.every(id=>declaredAi.includes(id)))problems.push('AI reviewer metadata must exactly match the selected AI evidence.');
  // Optional human credit requires its own current record; it is never a v2 prerequisite.
  const declaredHuman=(edition.review?.reviewers??[]).map(id=>id.toLowerCase());
  const documentedHumans=results.filter(({record,result})=>{
    const r=record.reviewer??{};
    return record.kind==='independent_human'&&SUPPORTED_RUBRIC_IDS.includes(record.rubric_id)&&result.current&&
      record.edition_id===edition.id&&record.source_edition_id===source?.id&&handle(r.github_handle)&&r.identifier===r.github_handle&&
      r.independent===true&&reviewEvidence(r.evidence_url)&&evidence.includes(r.evidence_url)&&
      typeof r.qualifications==='string'&&r.qualifications.trim().length>=40&&Array.isArray(r.languages)&&r.languages.includes(source?.language)&&r.languages.includes(edition.language)&&
      typeof r.conflicts_of_interest==='string'&&r.conflicts_of_interest.trim().length>=10&&
      record.segments_reviewed?.length===segmentIds.length&&new Set(record.segments_reviewed).size===segmentIds.length&&segmentIds.every(id=>record.segments_reviewed.includes(id));
  }).map(x=>x.record.reviewer.github_handle.toLowerCase());
  if(new Set(declaredHuman).size!==declaredHuman.length||declaredHuman.some(id=>declaredAi.some(ai=>ai.toLowerCase()===id)||!documentedHumans.includes(id)))problems.push('Declared human reviewers require separate current human evidence and cannot be AI identities.');
  const scored=selected.filter(x=>x.record.kind==='ai_review'&&x.record.rubric_id===rubric.id&&x.result.current&&x.result.errors.length===0&&x.result.score!==null);
  const minimumScore=scored.length&&scored.length===selected.length?Math.min(...scored.map(x=>x.result.score)):null;
  if(minimumScore===null||edition.review?.score!==minimumScore)problems.push('Displayed AI score must match the selected current assessment.');
  return {eligible:problems.length===0,problems,reviewers:[],ai_reviewers:aiReviewers,minimum_score:minimumScore,policy:rubric.id};
}
