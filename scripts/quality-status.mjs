import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {weightedScore,assessPublication,assessReview,checkRubric,ACTIVE_RUBRIC_ID,SUPPORTED_RUBRIC_IDS} from './lib/quality.mjs';

const load=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const editions=load('corpus/catalog/editions.json');
const rubricPaths=SUPPORTED_RUBRIC_IDS.map(id=>'corpus/reviews/'+id.replace('litmundi-','rubric-')+'.json');
const rubrics=Object.fromEntries(rubricPaths.map(file=>{const r=load(file);const issues=checkRubric(r);if(issues.length)throw new Error(issues.join('; '));return [r.id,r];}));
const rubric=rubrics[ACTIVE_RUBRIC_ID];
function reviewFiles(directory){
  if(!fs.existsSync(directory))return [];
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const child=path.join(directory,entry.name);
    return entry.isDirectory()?reviewFiles(child):entry.name.endsWith('.json')&&!rubricPaths.includes(child)?[child]:[];
  });
}
const records=reviewFiles('corpus/reviews').map(file=>({...load(file),_path:file}));
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
console.log('Current publication policy: '+rubric.id+'; weighted AI score >= '+rubric.release_gate.min_score_each_reviewer+'/10. Human review is optional.');
for(const edition of editions.filter(e=>e.kind==='translation'&&e.content_path)){
  const reviews=records.filter(r=>r.edition_id===edition.id),source=editions.find(e=>e.id===edition.source_edition_id);
  const structure=load('corpus/structure/'+edition.work_id+'.json');
  const context={edition,source,sourceSha:hash(source.content_path),targetSha:hash(edition.content_path),segmentIds:structure.segment_ids,sourceLanguage:source.language};
  const decision=assessPublication({...context,rubric,reviews});
  console.log('\n'+edition.id);
  console.log('  Publication: '+(decision.eligible?(edition.status==='published'?'PUBLISHED — AI-reviewed':'ELIGIBLE — not yet published'):'BLOCKED'));
  for(const review of reviews){
    const ownRubric=rubrics[review.rubric_id];
    if(!ownRubric)throw new Error('Unknown rubric '+review.rubric_id);
    const result=assessReview(review,{...context,rubric:ownRubric});
    const selected=edition.review.record_paths?.includes(review._path);
    const state=!result.current?'historical/stale/unbound':selected?'current, selected':review.kind==='ai_preflight'?'current historical-policy preflight, advisory':'current, not selected';
    console.log('  '+review.kind+' ['+review.rubric_id+'] ('+state+'): '+weightedScore(review.scores,ownRubric)+'/10');
  }
  console.log('  Selected qualifying AI assessments: '+(decision.ai_reviewers??[]).length+'; human review files: '+reviews.filter(r=>r.kind==='independent_human').length+' (optional)');
  for(const problem of decision.problems)console.log('  - '+problem);
}
