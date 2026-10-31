import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {weightedScore,assessPublication,assessReview,checkRubric} from './lib/quality.mjs';

const load = p => JSON.parse(fs.readFileSync(p,'utf8'));
const editions=load('corpus/catalog/editions.json');
const rubric=load('corpus/reviews/rubric-literary-v1.json');
const issues=checkRubric(rubric);
if(issues.length)throw new Error(issues.join('; '));
function reviewFiles(directory){
  if(!fs.existsSync(directory))return [];
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const child=path.join(directory,entry.name);
    return entry.isDirectory()?reviewFiles(child):entry.name.endsWith('.json')&&entry.name!=='rubric-literary-v1.json'?[child]:[];
  });
}
const records=reviewFiles('corpus/reviews').map(load);
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for(const edition of editions.filter(e=>e.kind==='translation' && e.content_path)){
  const human=records.filter(r=>r.edition_id===edition.id&&r.kind==='independent_human');
  const ai=records.filter(r=>r.edition_id===edition.id&&r.kind==='ai_preflight');
  const source=editions.find(e=>e.id===edition.source_edition_id);
  const structure=load('corpus/structure/'+edition.work_id+'.json');
  const decision=assessPublication({
    rubric,edition,source,sourceSha:hash(source.content_path),
    targetSha:hash(edition.content_path),segmentIds:structure.segment_ids,
    reviews:records.filter(r=>r.edition_id===edition.id)
  });
  console.log('\n'+edition.id);
  console.log('  Publication: '+(edition.status==='published'&&decision.eligible?'PUBLISHED': 'BLOCKED'));
  for(const review of ai){
    const result=assessReview(review,{rubric,edition,sourceSha:hash(source.content_path),targetSha:hash(edition.content_path),segmentIds:structure.segment_ids,sourceLanguage:source.language});
    console.log('  AI preflight ('+(result.current?'current, advisory only':'historical/stale/unbound; not current evidence')+'): '+weightedScore(review.scores,rubric)+'/10');
  }
  console.log('  Human review files: '+human.length+'; qualified: '+decision.reviewers.length+'/2');
  for(const problem of decision.problems) console.log('  - '+problem);
}
