import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const validateSchema=new Ajv2020({allErrors:true,strict:true}).compile(read('research/vietnamese-translation-backlog.schema.json'));
const normalize=value=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const labels={todo:'Todo',translating:'Translating',in_review:'AI assessment',blocked_rights:'Rights hold',blocked_source:'Source hold',published:'Published'};
const safe=value=>String(value).replace(/[\r\n]+/g,' ').replace(/([\\`*_[\]<>])/g,'\\$1');

export function loadTodoContext(){return {works:read('corpus/catalog/works.json'),editions:read('corpus/catalog/editions.json'),atlas:read('research/translation-gap-atlas.json')};}

/** Bibliographic leads and candidate rights screens never authorize publication. */
export function validateTodo(backlog,{works,editions,atlas}){
  if(!validateSchema(backlog))return validateSchema.errors.map(error=>`${error.instancePath||'/'} ${error.message}`);
  const errors=[],check=(condition,message)=>{if(!condition)errors.push(message);};
  const sources=new Map(),ids=new Set(),orders=new Set(),identities=new Set(),authors=new Map();
  const date=value=>!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
  check(date(backlog.created_on),'Invalid backlog date');
  check(date(backlog.updated_on)&&backlog.updated_on>=backlog.created_on,'Invalid backlog update date');
  for(const source of backlog.sources){
    check(!sources.has(source.id),'Duplicate source ID '+source.id);sources.set(source.id,source);
    check(date(source.checked_on)&&source.checked_on<=backlog.updated_on,'Invalid evidence date '+source.id);
    try{check(['http:','https:'].includes(new URL(source.url).protocol),'Unsafe source URL '+source.id);}catch{errors.push('Invalid source URL '+source.id);}
  }
  for(const item of backlog.works){
    check(!ids.has(item.id),'Duplicate work ID '+item.id);ids.add(item.id);
    check(!orders.has(item.queue_order),'Duplicate queue order '+item.queue_order);orders.add(item.queue_order);
    const identity=normalize(item.author)+'/'+normalize(item.title);
    check(!identities.has(identity),'Duplicate author/title '+item.id);identities.add(identity);
    const author=normalize(item.author);authors.set(author,(authors.get(author)||0)+1);
    check(item.publication_year===null||item.publication_year<=Number(backlog.updated_on.slice(0,4)),'Publication year postdates the queue update: '+item.id);
    check(item.original_language!=='vi','Vietnamese originals do not belong in a Vietnamese translation queue: '+item.id);
    for(const id of item.source_ids)check(sources.has(id),'Unknown source '+id+' for '+item.id);
    if(item.rights_screen==='permission_required')check(item.status==='blocked_rights','Permission-required work must stay on rights hold: '+item.id);
    if(item.rights_screen==='cleared_in_corpus')check(editions.some(e=>e.work_id===item.id&&e.kind==='source'&&e.status==='published'&&['cleared','public_domain_assessed'].includes(e.rights.status)),'No assessed corpus source supports clearance: '+item.id);
    const supply=item.vietnamese_supply;
    if(supply.status==='atlas_evidence_available')check(supply.atlas_work_id===item.id&&atlas.works.some(w=>w.id===item.id&&w.target_assessments.some(t=>t.language==='vi')),'Missing Vietnamese Atlas evidence: '+item.id);
    else check(supply.atlas_work_id===null,'Unaudited supply cannot claim an Atlas match: '+item.id);
    const published=editions.filter(e=>e.work_id===item.id&&e.kind==='translation'&&e.language==='vi'&&e.status==='published');
    if(item.status==='published'){
      const edition=published.find(e=>e.id===item.publication_edition_id),work=works.find(w=>w.id===item.id);
      check(Boolean(edition&&work?.visibility==='public'&&edition.content_path),'Published TODO needs an actual public Vietnamese edition: '+item.id);
      if(edition){
        check(['cleared','public_domain_assessed'].includes(edition.rights.status),'Published TODO lacks lawful reuse: '+item.id);
        check(edition.publication_policy==='litmundi-literary-v2'&&edition.review.status==='ai_reviewed'&&edition.review.score>=8.6&&edition.review.record_paths?.length>0,'Published TODO lacks the current AI publication evidence: '+item.id);
      }
    }else{
      check(item.publication_edition_id===null,'Unfinished TODO cannot carry a publication edition: '+item.id);
      check(published.length===0,'TODO status is stale: Vietnamese edition already published for '+item.id);
    }
  }
  for(let order=1;order<=500;order++)check(orders.has(order),'Missing queue order '+order);
  for(const [author,count] of authors)if(!/^(anonymous|traditional|various|unknown|collective)/.test(author))check(count<=6,'More than six works by one author: '+author);
  for(const id of ['wilde-the-artist','machado-um-apologo'])check(!ids.has(id),'Already completed baseline work cannot count as a new TODO: '+id);
  return errors;
}

export function renderTodo(backlog,context){
  const sources=new Map(backlog.sources.map(source=>[source.id,source]));
  const items=[...backlog.works].sort((a,b)=>a.queue_order-b.queue_order);
  const counts=Object.fromEntries(Object.keys(labels).map(status=>[status,items.filter(item=>item.status===status).length]));
  const out=['# Vietnamese translation TODO — 500 works','',
    '> Generated from [the canonical queue](research/vietnamese-translation-backlog.json). Edit the JSON, then run `npm run todo:render`; CI rejects a stale checklist.','',
    `**${items.length} selected works · ${counts.published} published · ${counts.todo} todo · ${counts.translating+counts.in_review} in progress · ${counts.blocked_rights+counts.blocked_source} on hold.**`,'',
    'These are 500 new or unfinished translation tasks as of '+backlog.created_on+'. The previously published Wilde *The Artist* and Machado *Um Apólogo* are outside this count. A checked box means a complete Vietnamese edition is actually published in the corpus.','',
    'Order is an editorial execution priority, not an objective ranking of world literature. The first batch finishes an existing near-ready draft and two bounded stories. Discovery titles may be established English titles; the exact original witness and translated title are settled before ingestion.','',
    'A source link can be an item record, anthology, author bibliography or collection lead: read its scope in the JSON. Inclusion does not establish source rights, a missing Vietnamese translation or reader demand. Existing translations are welcome evidence; most Vietnamese supply remains unaudited.','',
    'Publication still requires a complete current AI assessment with an unrounded weighted score **≥8.6**, full passage/title coverage, source and reuse clearance, and no unresolved major/critical finding. Human review is optional after publication.','',
    '[Selection and working method](docs/VIETNAMESE-500.md) · `npm run todo:next -- 10` · `npm run todo:check`',''];
  for(let offset=0;offset<items.length;offset+=50){
    out.push(`## ${offset+1}–${Math.min(offset+50,items.length)}`,'');
    for(const item of items.slice(offset,offset+50)){
      const edition=context.editions.find(e=>e.id===item.publication_edition_id);
      const title=safe(item.title),source=sources.get(item.source_ids[0]);
      const reader=edition?' · [Đọc bản dịch](https://streamentry.github.io/LitMundi/vi/read/'+item.id+'/'+edition.id+'/)' : '';
      out.push(`- [${item.status==='published'?'x':' '}] **${String(item.queue_order).padStart(3,'0')}. ${safe(item.author)} — ${title}** · ${item.original_language} · ${item.form.replaceAll('_',' ')} · **${labels[item.status]}** · [Evidence](${source.url})${reader}`);
    }
    out.push('');
  }
  return out.join('\n');
}

export function nextTodos(backlog,limit=10){return [...backlog.works].filter(item=>['translating','in_review','todo'].includes(item.status)).sort((a,b)=>Number(b.status!=='todo')-Number(a.status!=='todo')||a.queue_order-b.queue_order).slice(0,limit);}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const backlog=read('research/vietnamese-translation-backlog.json'),context=loadTodoContext();
  const errors=validateTodo(backlog,context),mode=process.argv[2]||'check';
  if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
  else if(mode==='write'){fs.writeFileSync(path.join(root,'TODO.md'),renderTodo(backlog,context));console.log('Rendered 500-work TODO from the canonical queue.');}
  else if(mode==='next'){
    const limit=Number(process.argv[3]||10);
    if(!Number.isInteger(limit)||limit<1||limit>500)throw new Error('Limit must be an integer from 1 to 500');
    for(const item of nextTodos(backlog,limit))console.log(`${String(item.queue_order).padStart(3,'0')} [${item.status}] ${item.author} — ${item.title} (${item.original_language}; ${item.rights_screen})\n  ${item.rationale}\n  Next: ${item.status==='todo'?'verify the exact original witness and rights, audit existing Vietnamese supply, then translate the complete work':item.status==='translating'?'finish and revise the complete source-aligned translation':'complete a current hash-bound AI assessment and resolve findings'}.`);
  }else if(mode==='check'){
    const file=path.join(root,'TODO.md');
    if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==renderTodo(backlog,context)){console.error('TODO.md is stale; run npm run todo:render.');process.exitCode=1;}
    else console.log(`Vietnamese TODO valid: 500 unique ordered works, ${backlog.sources.length} linked evidence records, ${backlog.works.filter(w=>w.status==='published').length} actual published translations. Bibliography and rights screens are not publication clearance.`);
  }else throw new Error('Unknown TODO command: '+mode);
}
