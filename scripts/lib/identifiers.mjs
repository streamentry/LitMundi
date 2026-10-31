/** Identity changes require an explicit migration; prose corrections retain passage IDs. */
export function compareIdentifiers(previous,current){
  const errors=[];
  const works=new Map(current.works.map(w=>[w.id,w]));
  const editions=new Map(current.editions.map(e=>[e.id,e]));
  for(const work of previous.works){
    const next=works.get(work.id);
    if(!next){errors.push('Removed work ID '+work.id+'; archive its visibility instead.');continue;}
    if(next.original_language!==work.original_language)errors.push('Reassigned original language for '+work.id+'.');
    const before=previous.structures[work.id],after=current.structures[work.id];
    if(!after){errors.push('Removed structure '+work.id);continue;}
    for(const id of before.segment_ids){
      if(!after.segment_ids.includes(id)&&!after.deprecated_ids[id])errors.push('Removed passage without a deprecation mapping: '+id);
    }
    for(const [oldId,target] of Object.entries(before.deprecated_ids)){
      if(after.segment_ids.includes(oldId))errors.push('Recycled deprecated passage ID '+oldId);
      if(after.deprecated_ids[oldId]!==target)errors.push('Changed permanent deprecation mapping '+oldId);
    }
  }
  for(const edition of previous.editions){
    const next=editions.get(edition.id);
    if(!next){errors.push('Removed edition ID '+edition.id+'; mark it withdrawn instead.');continue;}
    for(const key of ['work_id','language','kind','source_edition_id'])if(next[key]!==edition[key])errors.push('Reassigned '+key+' for '+edition.id);
    for(const slug of edition.legacy_slugs)if(!next.legacy_slugs.includes(slug))errors.push('Removed legacy URL '+edition.id+'/'+slug);
    if(edition.content_path&&next.content_path!==edition.content_path)errors.push('Changed canonical content path '+edition.id);
  }
  return errors;
}
