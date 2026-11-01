import Ajv2020 from 'ajv/dist/2020.js';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assessReview,assessPublication,checkRubric,ACTIVE_RUBRIC_ID,SUPPORTED_RUBRIC_IDS} from './lib/quality.mjs';

const errors = [];
function rejectSymlinks(directory){
  if(fs.lstatSync(directory).isSymbolicLink())throw new Error('Canonical data may not use symlinks: '+directory);
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const child=path.join(directory,entry.name);
    if(entry.isSymbolicLink())throw new Error('Canonical data may not use symlinks: '+child);
    if(entry.isDirectory())rejectSymlinks(child);
  }
}
rejectSymlinks('corpus');
rejectSymlinks('research');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const exists = p => fs.existsSync(p);
const works = read('corpus/catalog/works.json');
const editions = read('corpus/catalog/editions.json');
const languages = read('corpus/catalog/languages.json');
const schemas = Object.fromEntries(['work','edition','structure','alignment','review','source-check'].map(x => [x, read('corpus/schemas/'+x+'.schema.json')]));
const fail = message => errors.push(message);
const check = (condition, message) => { if(!condition) fail(message); };
const webUrl = value => {try {return ['https:','http:'].includes(new URL(value).protocol);} catch {return false;}};

const ajv = new Ajv2020({allErrors:true,strict:true,strictRequired:false});
const validators = new Map();
function schemaCheck(value, schema, at) {
  if (!validators.has(schema)) validators.set(schema, ajv.compile(schema));
  const validate=validators.get(schema);
  if (!validate(value)) for (const error of validate.errors) fail(at+error.instancePath+' '+error.message);
}

works.forEach((w,i)=>schemaCheck(w,schemas.work,'works['+i+']'));
editions.forEach((e,i)=>schemaCheck(e,schemas.edition,'editions['+i+']'));

const workIds = new Set();
const structureMap = new Map();
for(const w of works) {
  check(!workIds.has(w.id), 'Duplicate work ID '+w.id);
  workIds.add(w.id);
  check(Object.hasOwn(languages,w.original_language),'Unknown original language '+w.id);
  const file='corpus/structure/'+w.id+'.json';
  if(!exists(file)){fail('Missing structure for '+w.id);continue;}
  const s=read(file);
  schemaCheck(s,schemas.structure,'structure('+w.id+')');
  check(s.work_id===w.id,'Structure work ID mismatch '+w.id);
  for(const id of s.segment_ids)check(id.startsWith(w.id+':'),'Non-canonical passage ID '+id);
  for(const [oldId,newId] of Object.entries(s.deprecated_ids)){
    check(oldId.startsWith(w.id+':'), 'Invalid deprecated ID '+oldId);
    check(s.segment_ids.includes(newId),'Deprecated ID points to absent passage '+newId);
    check(!s.segment_ids.includes(oldId),'Deprecated ID may not also be active '+oldId);
  }
  structureMap.set(w.id,s);
}

const editionIds = new Set();
const editionById = new Map();
const publicRoutes = new Set();
for(const e of editions) {
  check(!editionIds.has(e.id),'Duplicate edition ID '+e.id);
  editionIds.add(e.id); editionById.set(e.id,e);
  check(workIds.has(e.work_id),'Orphan edition '+e.id);
  check(Object.hasOwn(languages,e.language),'Unknown edition language '+e.id);
  if(e.title!==undefined)check(typeof e.title==='string'&&e.title.trim().length>0&&e.title===e.title.trim()&&e.title===e.title.normalize('NFC'),'Edition title must be nonempty, trimmed NFC text '+e.id);
  for(const url of [...e.rights.evidence_urls,...e.review.evidence_urls,e.provenance.catalog_url,e.provenance.text_url].filter(v=>v!==null))
    check(webUrl(url),'Invalid or unsafe evidence URL in '+e.id);
  for(const slug of [e.id,...e.legacy_slugs]){
    const route=e.work_id+'/'+slug;
    check(!publicRoutes.has(route),'Conflicting edition URL '+route);
    publicRoutes.add(route);
  }
  if(e.kind==='source') {
    check(e.source_edition_id===null,'Source edition must not reference another source '+e.id);
    const w=works.find(w=>w.id===e.work_id);
    check(w && w.original_language===e.language,'Source language differs from original '+e.id);
  } else {
    check(typeof e.source_edition_id==='string','Translation lacks source edition '+e.id);
  }
  if(e.status==='published') {
    check(e.content_path!==null,'Published edition missing content '+e.id);
    check(['cleared','public_domain_assessed'].includes(e.rights.status),'Published edition lacks reviewed rights '+e.id);
    check(e.rights.evidence_urls.length>0,'Published edition missing rights evidence '+e.id);
    check(Boolean(e.provenance.citation&&e.provenance.retrieved_at && (e.kind==='source' ? e.provenance.text_url : true)),'Published edition lacks source witness '+e.id);
    if(e.kind==='source') check(e.review.status==='source_checked'&&e.review.evidence_urls.length>0,'Published source lacks source checking '+e.id);
    if(e.kind==='translation') {
      check(e.rights.status==='cleared'&&Boolean(e.rights.license),'Translation publication lacks explicit license '+e.id);
      check(Boolean(e.credits.translator)&&e.credits.ai_assisted===true,'Translation publication lacks disclosed AI translation provenance '+e.id);
      check(e.publication_policy===ACTIVE_RUBRIC_ID&&e.review.status==='ai_reviewed','Translation publication must identify current AI-first policy '+e.id);
      check(e.review.evidence_urls.length>=1,'Translation publication lacks review evidence '+e.id);
    }
  }
  const file=e.content_path;
  if(file!==null){
    const safe=file==='corpus/segments/demo-proust/fr.json' ||
      file==='corpus/segments/'+e.work_id+'/'+e.id+'.json';
    if(!safe){fail('Unexpected edition data path '+file);continue;}
    if(!exists(file)){fail('Missing edition data '+file);continue;}
    const data=read(file);
    const s=structureMap.get(e.work_id);
    check(data&&typeof data==='object'&&!Array.isArray(data),'Invalid JSON segment map '+file);
    check(Object.keys(data).length>0,'Empty edition data '+file);
    if(s){
      for(const [id,value] of Object.entries(data)){
        check(s.segment_ids.includes(id),'Undeclared passage '+id+' in '+file);
        check(typeof value==='string'&&value.trim().length>0,'Empty/nontext passage '+id);
        if(typeof value==='string'){
          check(value===value.normalize('NFC'),'Non-NFC passage '+id);
          check(!/<\s*(script|iframe|img|a)(\s|>)/i.test(value),'HTML found in prose '+id);
        }
      }
      if(['published','draft'].includes(e.status)){
        check(Object.keys(data).length===s.segment_ids.length,'Complete edition incomplete '+e.id);
        check(s.segment_ids.every(id=>Object.hasOwn(data,id)),'Complete edition missing canonical passages '+e.id);
      }
    }
  }
}

for(const e of editions) {
  if(e.kind!=='translation')continue;
  const source=editionById.get(e.source_edition_id);
  check(Boolean(source),'Unknown translation source edition '+e.id);
  if(source){
    check(source.work_id===e.work_id,'Cross-work source relation '+e.id);
    check(source.kind==='source','Translation source is not an original witness '+e.id);
    if(e.status==='published')check(source.status==='published','Published translation cites unpublished source '+e.id);
  }
  if(!e.content_path) continue;
  const file='corpus/alignments/'+e.work_id+'/'+e.id+'.json';
  if(!exists(file)){fail('Missing alignment '+file);continue;}
  const data=read(file);
  schemaCheck(data,schemas.alignment,'alignment('+e.id+')');
  check(data.work_id===e.work_id&&data.edition_id===e.id&&data.source_edition_id===e.source_edition_id,'Alignment edition mismatch '+e.id);
  const original=source?.content_path&&exists(source.content_path)?read(source.content_path):{};
  const target=read(e.content_path);
  const targetIds=[],sourceIds=[];
  for(const link of data.links){
    for(const id of link.source){check(Object.hasOwn(original,id),'Alignment points to absent source passage '+id);sourceIds.push(id);}
    for(const id of link.target){check(Object.hasOwn(target,id),'Alignment points to absent target passage '+id);targetIds.push(id);}
  }
  check(new Set(targetIds).size===targetIds.length,'Duplicate target alignment '+e.id);
  check(new Set(sourceIds).size===sourceIds.length,'Duplicate source alignment '+e.id);
  if(['published','draft'].includes(e.status)){
    check(targetIds.length===Object.keys(target).length,'Complete translation has unaligned target passages '+e.id);
    check(sourceIds.length===Object.keys(original).length,'Complete translation omits source passages '+e.id);
  }
}


/**
 * Keep historical assessments under their original rubric. Current release
 * eligibility uses v2 AI evidence; no human review or attestation is required.
 */
const rubrics=Object.fromEntries(SUPPORTED_RUBRIC_IDS.map(id=>[id,read('corpus/reviews/'+id.replace('litmundi-','rubric-')+'.json')]));
for(const rubric of Object.values(rubrics))checkRubric(rubric).forEach(fail);
const rubric=rubrics[ACTIVE_RUBRIC_ID];
const sha = filename => createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
for(const edition of editions.filter(e=>e.kind==='source'&&e.status==='published')){
  const file='corpus/editorial/source-checks/'+edition.id+'.json';
  if(!exists(file)){fail('Published original needs a recorded source comparison: '+edition.id);continue;}
  const record=read(file);
  schemaCheck(record,schemas['source-check'],'source-check('+edition.id+')');
  check(record.edition_id===edition.id&&record.work_id===edition.work_id,'Source comparison identity mismatch '+edition.id);
  if(edition.content_path&&exists(edition.content_path))check(record.source_sha256===sha(edition.content_path),'Stale original source comparison '+edition.id);
  const ids=structureMap.get(edition.work_id)?.segment_ids??[];
  check(Array.isArray(record.segments_checked)&&record.segments_checked.length===ids.length&&ids.every(id=>record.segments_checked.includes(id)),'Source comparison must cover every passage '+edition.id);
  check(record.witness_url===edition.provenance.text_url,'Source comparison must identify the selected witness '+edition.id);
  if(record.checker_kind==='ai_assisted')check(edition.credits.ai_assisted===true,'AI source comparison must be disclosed '+edition.id);
}
const reviewsByEdition = new Map();
function reviewFiles(directory) {
  if(!exists(directory))return [];
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const candidate=path.join(directory,entry.name);
    return entry.isDirectory()?reviewFiles(candidate):entry.isFile()&&entry.name.endsWith('.json')?[candidate]:[];
  });
}
for(const file of reviewFiles('corpus/reviews')) {
  if(SUPPORTED_RUBRIC_IDS.some(id=>file==='corpus/reviews/'+id.replace('litmundi-','rubric-')+'.json'))continue;
  const review=read(file);
  schemaCheck(review,schemas.review,'review('+file+')');
  const edition=editionById.get(review.edition_id);
  if(!edition){fail('Review targets unknown edition '+file);continue;}
  check(file.startsWith('corpus/reviews/'+edition.work_id+'/'+edition.id+'/'),'Review in wrong directory '+file);
  check(['ai_preflight','ai_review','independent_human'].includes(review.kind),'Unknown review kind '+file);
  const reviewRubric=rubrics[review.rubric_id];
  if(!reviewRubric){fail('Unknown review rubric '+file);continue;}
  const known=structureMap.get(edition.work_id)?.segment_ids??[];
  const source=editionById.get(edition.source_edition_id);
  if(!edition.content_path||!exists(edition.content_path)||!source?.content_path||!exists(source.content_path)) {
    fail('Review has missing edition content or source '+file); continue;
  }
  const assessment=assessReview(review,{
    rubric:reviewRubric,edition,sourceSha:sha(source.content_path),targetSha:sha(edition.content_path),sourceLanguage:source.language,sourceTitle:source.title,
    segmentIds:known
  });
  if(assessment.errors.length) assessment.errors.forEach(error=>fail(file+': '+error));
  const records=reviewsByEdition.get(edition.id)??[];
  records.push({...review,_path:file});reviewsByEdition.set(edition.id,records);
}

for(const edition of editions.filter(e=>e.status==='published'&&e.kind==='translation')) {
  const source=editionById.get(edition.source_edition_id);
  if(!source?.content_path||!edition.content_path||!exists(source.content_path)||!exists(edition.content_path)) {
    fail('Published translation has missing source or target '+edition.id);continue;
  }
  const decision=assessPublication({
    rubric,edition,source,
    sourceSha:sha(source.content_path),targetSha:sha(edition.content_path),
    segmentIds:structureMap.get(edition.work_id)?.segment_ids??[],
    reviews:reviewsByEdition.get(edition.id)??[]
  });
  if(!decision.eligible) decision.problems.forEach(problem=>fail('Quality gate '+edition.id+': '+problem));
}

if(errors.length){
  console.error('Corpus validation failed ('+errors.length+')');
  errors.forEach(s=>console.error(' - '+s));
  process.exit(1);
}
console.log('Corpus v2 validated: '+works.length+' works, '+editions.length+' editions, '+editions.filter(e=>e.status==='published').length+' published edition(s).');
