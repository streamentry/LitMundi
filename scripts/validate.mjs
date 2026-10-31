import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assessReview,assessPublication,checkRubric,weightedScore} from './lib/quality.mjs';

const errors = [];
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const exists = p => fs.existsSync(p);
const works = read('corpus/catalog/works.json');
const editions = read('corpus/catalog/editions.json');
const languages = read('corpus/catalog/languages.json');
const schemas = Object.fromEntries(['work','edition','structure','alignment','review'].map(x => [x, read('corpus/schemas/'+x+'.schema.json')]));
const fail = message => errors.push(message);
const check = (condition, message) => { if(!condition) fail(message); };

function schemaCheck(value, schema, at) {
  const types = schema.type ? (Array.isArray(schema.type) ? schema.type : [schema.type]) : [];
  const accepts = type => ({
    null: value === null,
    string: typeof value === 'string',
    object: value !== null && typeof value === 'object' && !Array.isArray(value),
    array: Array.isArray(value),
    integer: typeof value === 'number' && Number.isInteger(value),
    number: typeof value === 'number' && Number.isFinite(value),
    boolean: typeof value === 'boolean'
  })[type] === true;
  if(types.length && !types.some(accepts)){ fail(at+' has wrong type (expected '+types.join('|')+')'); return; }
  if(Object.hasOwn(schema, 'const')) check(value === schema.const, at+' differs from fixed schema value');
  if(schema.enum) check(schema.enum.includes(value), at+' outside schema enumeration');
  if(typeof value==='string'){
    if(schema.minLength!==undefined) check(value.length>=schema.minLength,at+' too short');
    if(schema.pattern) check(new RegExp(schema.pattern).test(value),at+' fails pattern');
  }
  if(Array.isArray(value)){
    if(schema.minItems!==undefined) check(value.length>=schema.minItems,at+' has too few items');
    if(schema.uniqueItems) check(new Set(value.map(v=>JSON.stringify(v))).size===value.length,at+' has duplicates');
    if(schema.items) value.forEach((v,i)=>schemaCheck(v,schema.items,at+'['+i+']'));
  }
  if(value!==null&&typeof value==='object'&&!Array.isArray(value)){
    for(const k of schema.required??[])check(Object.hasOwn(value,k),at+' missing '+k);
    for(const [key,v] of Object.entries(value)){
      const child=schema.properties?.[key];
      if(child) schemaCheck(v,child,at+'.'+key);
      else if(schema.additionalProperties===false)fail(at+' has unsupported property '+key);
      else if(typeof schema.additionalProperties==='object')schemaCheck(v,schema.additionalProperties,at+'.'+key);
    }
  }
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
      check(Boolean(e.credits.translator)&&e.credits.editors.length>0,'Translation publication lacks human translator/editor '+e.id);
      check(e.review.reviewers.length>=2&&['bilingual_reviewed','literary_edited','expert_reviewed'].includes(e.review.status),'Translation publication lacks two named independent reviewers '+e.id);
      check(e.review.evidence_urls.length>=1,'Translation publication lacks review evidence '+e.id);
    }
  }
  const file=e.content_path;
  if(file!==null){
    const safe=file==='corpus/segments/demo-proust/fr.json' ||
      file==='corpus/segments/'+e.work_id+'/'+e.id+'.json';
    check(safe,'Unexpected edition data path '+file);
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
      if(e.status==='published'){
        check(Object.keys(data).length===s.segment_ids.length,'Published work incomplete '+e.id);
        check(s.segment_ids.every(id=>Object.hasOwn(data,id)),'Published edition missing canonical passages '+e.id);
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
  const targetIds=[];
  for(const link of data.links){
    for(const id of link.source)check(Object.hasOwn(original,id),'Alignment points to absent source passage '+id);
    for(const id of link.target){check(Object.hasOwn(target,id),'Alignment points to absent target passage '+id);targetIds.push(id);}
  }
  check(new Set(targetIds).size===targetIds.length,'Duplicate target alignment '+e.id);
  if(e.status==='published')check(targetIds.length===Object.keys(target).length,'Published translation has unaligned passages '+e.id);
}


/**
 * Scores are read from immutable, content-hash-bound, external human reviews.
 * CI can check the evidence shape; repository governance must still confirm
 * reviewer identities and approval history.
 */
const rubric = read('corpus/reviews/rubric-literary-v1.json');
checkRubric(rubric).forEach(fail);
const sha = filename => createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const reviewsByEdition = new Map();
function reviewFiles(directory) {
  if(!exists(directory))return [];
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const candidate=path.join(directory,entry.name);
    return entry.isDirectory()?reviewFiles(candidate):entry.isFile()&&entry.name.endsWith('.json')?[candidate]:[];
  });
}
for(const file of reviewFiles('corpus/reviews')) {
  if(file==='corpus/reviews/rubric-literary-v1.json')continue;
  const review=read(file);
  schemaCheck(review,schemas.review,'review('+file+')');
  const edition=editionById.get(review.edition_id);
  if(!edition){fail('Review targets unknown edition '+file);continue;}
  check(file.startsWith('corpus/reviews/'+edition.work_id+'/'+edition.id+'/'),'Review in wrong directory '+file);
  check(review.kind==='ai_preflight'||review.kind==='independent_human','Unknown review kind '+file);
  const known=structureMap.get(edition.work_id)?.segment_ids??[];
  const source=editionById.get(edition.source_edition_id);
  if(!edition.content_path||!exists(edition.content_path)||!source?.content_path||!exists(source.content_path)) {
    fail('Review has missing edition content or source '+file); continue;
  }
  const assessment=assessReview(review,{
    rubric,edition,sourceSha:sha(source.content_path),targetSha:sha(edition.content_path),
    segmentIds:known
  });
  if(assessment.errors.length) assessment.errors.forEach(error=>fail(file+': '+error));
  const records=reviewsByEdition.get(edition.id)??[];
  records.push(review);reviewsByEdition.set(edition.id,records);
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
console.log('Corpus v2 validated: '+works.length+' works, '+editions.length+' editions, '+editions.filter(e=>e.status==='published').length+' published original/source edition(s).');
