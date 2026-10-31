/**
 * LitMundi rubric v1: weighted literary quality plus non-compensatory
 * publication checks. This module intentionally has no Astro dependency.
 */
export const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

export function weightedScore(scores, rubric) {
  if (!scores || !rubric?.criteria) return null;
  let total = 0;
  for (const c of rubric.criteria) {
    const value = scores[c.id];
    if (typeof value !== 'number' || !Number.isFinite(value) ||
        value < 0 || value > 10 || Math.round(value * 2) !== value * 2) return null;
    total += value * c.weight;
  }
  return round2(total / 100);
}

export function checkRubric(rubric) {
  const problems = [];
  if (rubric?.id !== 'litmundi-literary-v1') problems.push('Unrecognized quality rubric ID.');
  if (!Array.isArray(rubric?.criteria) || rubric.criteria.length < 3) return [...problems,'Missing criteria.'];
  const weights = rubric.criteria.map(x => x.weight);
  if (weights.some(v=>!Number.isInteger(v)||v<=0) || weights.reduce((a,b)=>a+b,0)!==100)
    problems.push('Rubric weights must sum to exactly 100.');
  if (new Set(rubric.criteria.map(x=>x.id)).size!==rubric.criteria.length) problems.push('Duplicate rubric criterion.');
  if (rubric.release_gate?.min_score_each_reviewer !== 9 || rubric.release_gate?.min_independent_human_reviewers !== 2)
    problems.push('The immutable v1 gate must require score 9 and two independent human reviewers.');
  return problems;
}

export function assessReview(record, {rubric,edition,sourceSha,targetSha,segmentIds}) {
  const errors=[];
  const fail = s => errors.push(s);
  const score=weightedScore(record?.scores,rubric);
  if (!record || !edition) return {score,errors:['Review or edition missing.'],qualifies:false};
  if(record.rubric_id!==rubric.id)fail('Review references wrong rubric.');
  if(record.edition_id!==edition.id || record.source_edition_id!==edition.source_edition_id)fail('Review references wrong edition or source.');
  if(score===null)fail('Scores must be present, 0..10, in increments of 0.5.');
  if(!Array.isArray(record.segments_reviewed)||new Set(record.segments_reviewed).size!==segmentIds.length||
    !segmentIds.every(id=>record.segments_reviewed.includes(id)))fail('Review must cover every canonical segment exactly once.');
  const findings=record.findings??[];
  if(!Array.isArray(findings))fail('Findings must be a list.');
  else for(const finding of findings){
    if(!segmentIds.includes(finding.segment))fail('Issue refers to absent segment.');
    if(!rubric.criteria.some(c=>c.id===finding.category))fail('Issue category is not in rubric.');
    if(!['minor','major','critical'].includes(finding.severity))fail('Unknown issue severity.');
    if(!['open','resolved'].includes(finding.status))fail('Unknown issue disposition.');
    if(typeof finding.explanation!=='string'||finding.explanation.trim().length<15)fail('Issue needs an explanation.');
    if(finding.status==='open'&&['major','critical'].includes(finding.severity))fail('Unresolved major or critical finding.');
  }
  if(typeof record.summary!=='string'||record.summary.trim().length<80)fail('Review needs detailed rationale.');
  if(record.kind!=='independent_human')return {score,errors,qualifies:false,advisory_only:true};
  const reviewer=record.reviewer??{};
  if(reviewer.independent!==true)fail('Reviewer must attest independence.');
  if(!/^[A-Za-z0-9-]{1,39}$/.test(reviewer.github_handle??''))fail('Human reviewer requires GitHub handle.');
  if(reviewer.identifier!==reviewer.github_handle)fail('Reviewer identifier must match GitHub handle.');
  if(!/^https:\/\/github\.com\/streamentry\/LitMundi\/pull\/\d+(\/.*|#.*)?$/.test(reviewer.evidence_url??''))
    fail('Human review needs a GitHub PR review evidence URL.');
  if(record.source_sha256!==sourceSha || record.target_sha256!==targetSha)
    fail('Source or translation changed since review; re-evaluation required.');
  if(score!==null && score<rubric.release_gate.min_score_each_reviewer)fail('Reviewer score is below 9.0/10.');
  for(const c of rubric.criteria) {
    const min=c.id==='semantic_fidelity'?rubric.release_gate.min_semantic_fidelity_each:rubric.release_gate.min_other_dimension_each;
    if(typeof record.scores?.[c.id]==='number' && record.scores[c.id]<min)fail('Category '+c.id+' below minimum '+min+'.');
  }
  return {score,errors,qualifies:errors.length===0,advisory_only:false};
}

/**
 * A structural publication gate, NOT a verification of a GitHub identity.
 * Repository maintainers must independently verify reviewer PR approvals.
 */
export function assessPublication({rubric,edition,source,sourceSha,targetSha,segmentIds,reviews}) {
  const problems=[];
  if(edition?.kind!=='translation')return {eligible:false,problems:['Only translations require this rubric.'],reviewers:[],minimum_score:null};
  if(!source||source.status!=='published'||source.kind!=='source')problems.push('Original source must be published.');
  if(!edition.content_path)problems.push('Translation has no complete text.');
  if(edition.rights?.status!=='cleared')problems.push('Rights clearance is missing.');
  if(!['CC-BY-4.0','CC0-1.0'].includes(edition.rights?.license))problems.push('Written open publication license is missing.');
  if(!edition.rights?.evidence_urls?.length)problems.push('Contributor license/rights evidence is missing.');
  if(!edition.credits?.translator||!edition.credits?.editors?.length)problems.push('Named human translator/editor is missing.');
  if(!['bilingual_reviewed','literary_edited','expert_reviewed'].includes(edition.review?.status))problems.push('Editorial status is not approved.');
  const results=(reviews??[]).filter(r=>r?.kind==='independent_human').map(r=>({record:r,result:assessReview(r,{rubric,edition,sourceSha,targetSha,segmentIds})}));
  for(const {record,result} of results) if(result.errors.length)problems.push('Review '+(record.reviewer?.identifier??'unknown')+': '+result.errors.join(' '));
  const passed=results.filter(x=>x.result.qualifies);
  const identities=passed.map(x=>x.record.reviewer.github_handle.toLowerCase());
  const unique=new Set(identities);
  if(passed.length<rubric.release_gate.min_independent_human_reviewers)problems.push('Requires two independent human reviews with score >=9.');
  if(unique.size!==passed.length)problems.push('Duplicate reviewer identity.');
  const metaHandles=(edition.review?.reviewers??[]).map(x=>x.toLowerCase());
  if(![...unique].every(handle=>metaHandles.includes(handle)))problems.push('Human reviewer identities missing from edition metadata.');
  if((edition.review?.evidence_urls??[]).length<2)problems.push('Editorial evidence URLs missing.');
  if((edition.credits?.editors??[]).some(name=>unique.has(name.toLowerCase())) ||
     (edition.credits?.translator && unique.has(edition.credits.translator.toLowerCase())))
    problems.push('Reviewers cannot also be translator/editor.');
  const minimum_score=passed.length?Math.min(...passed.map(x=>x.result.score)):null;
  return {eligible:problems.length===0,problems,reviewers:[...unique],minimum_score};
}
