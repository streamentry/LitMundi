const shell=document.querySelector<HTMLElement>('[data-edition]');
const sections=shell?[...shell.querySelectorAll<HTMLElement>('.chapter[data-chapter]')]:[];
if(shell&&sections.length>1){
  const pagers=[...shell.querySelectorAll<HTMLElement>('[data-chapter-pager]')];
  const selects=[...shell.querySelectorAll<HTMLSelectElement>('[data-chapter-select]')];
  const counts=[...shell.querySelectorAll<HTMLElement>('[data-chapter-count]')];
  const prevs=[...shell.querySelectorAll<HTMLButtonElement>('[data-chapter-prev]')];
  const nexts=[...shell.querySelectorAll<HTMLButtonElement>('[data-chapter-next]')];
  const total=sections.length,word=pagers[0]?.querySelector('.chapter-count')?.textContent?.split(' ')[1]??'/';
  let current=-1;
  const indexOfHash=(hash:string)=>{
    const id=decodeURIComponent(hash.replace(/^#/,''));
    if(!id)return -1;
    const target=document.getElementById(id);
    const section=target?.closest<HTMLElement>('.chapter[data-chapter]');
    return section?sections.indexOf(section):-1;
  };
  const show=(index:number,{scroll=true,hash=true}={})=>{
    const next=Math.min(Math.max(index,0),total-1);
    sections.forEach((section,i)=>{section.hidden=i!==next;});
    pagers.forEach(pager=>{pager.hidden=false;});
    selects.forEach(select=>{select.value=String(next);});
    counts.forEach(count=>{count.textContent=(next+1)+' '+word+' '+total;});
    prevs.forEach(button=>{button.disabled=next===0;});
    nexts.forEach(button=>{button.disabled=next===total-1;});
    if(next!==current){
      current=next;
      if(hash&&!(location.hash&&indexOfHash(location.hash)===next))history.replaceState(null,'','#'+sections[next].id);
      if(scroll)(shell.querySelector('.chapter-pager')??shell).scrollIntoView({block:'start'});
      dispatchEvent(new CustomEvent('chapterchange',{detail:{index:next}}));
    }
  };
  shell.classList.add('is-paged');
  const fromHash=()=>{
    const index=indexOfHash(location.hash);
    if(index>=0){
      show(index,{scroll:false,hash:false});
      const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if(target&&!target.matches('.chapter[data-chapter]'))requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
      return true;
    }
    return false;
  };
  if(!fromHash())show(0,{scroll:false,hash:false});
  addEventListener('hashchange',fromHash);
  prevs.forEach(button=>button.addEventListener('click',()=>show(current-1)));
  nexts.forEach(button=>button.addEventListener('click',()=>show(current+1)));
  selects.forEach(select=>select.addEventListener('change',()=>show(Number(select.value))));
  shell.querySelectorAll<HTMLAnchorElement>('[data-chapter-link]').forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault();show(sections.findIndex(section=>section.id===link.hash.slice(1)));
  }));
  addEventListener('keydown',event=>{
    const el=event.target as HTMLElement|null;
    if(event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return;
    if(el&&(el.isContentEditable||/^(input|select|textarea)$/i.test(el.tagName)))return;
    if(event.key==='ArrowRight'){show(current+1);event.preventDefault();}
    else if(event.key==='ArrowLeft'){show(current-1);event.preventDefault();}
  });
}
export {};
