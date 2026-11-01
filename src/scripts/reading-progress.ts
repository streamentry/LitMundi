const controls=document.querySelector<HTMLElement>('[data-progress-controls]');
const shell=document.querySelector<HTMLElement>('[data-edition]');
if(controls&&shell){
  const passages=[...shell.querySelectorAll<HTMLElement>('[data-reading-segment]')];
  const progress=controls.querySelector<HTMLProgressElement>('#reading-progress')!;
  const output=controls.querySelector<HTMLOutputElement>('#progress-count')!;
  const remember=controls.querySelector<HTMLInputElement>('#remember-place')!;
  const resume=controls.querySelector<HTMLAnchorElement>('#resume-reading')!;
  const clear=controls.querySelector<HTMLButtonElement>('#clear-progress')!;
  const message=controls.querySelector<HTMLElement>('#progress-message')!;
  const comparison=shell.querySelector<HTMLInputElement>('#show-original');
  const key='litmundi:reading:v1:'+shell.dataset.edition;
  let index=-1,lastSaved='',pending=false;
  controls.hidden=false;
  const unavailable=()=>{remember.checked=false;remember.disabled=true;clear.hidden=true;resume.hidden=true;message.textContent=controls.dataset.storageError!;};
  try{
    const saved=JSON.parse(localStorage.getItem(key)??'null');
    if(saved?.enabled===true&&passages.some(p=>p.dataset.readingSegment===saved.segment)){
      remember.checked=true;lastSaved=saved.segment;resume.hash=saved.segment;resume.hidden=false;clear.hidden=false;
    }
  }catch{unavailable();}
  const save=()=>{
    if(!remember.checked||index<0)return;
    const segment=passages[index].dataset.readingSegment!;
    if(segment===lastSaved)return;
    try{localStorage.setItem(key,JSON.stringify({enabled:true,segment}));lastSaved=segment;clear.hidden=false;}catch{unavailable();}
  };
  const update=()=>{
    const previousIndex=index;
    pending=false;index=-1;
    passages.forEach((passage,i)=>{if(passage.getBoundingClientRect().top<innerHeight*.45)index=i;});
    if(passages.length&&passages[passages.length-1].getBoundingClientRect().bottom<=innerHeight&&index>=0)index=passages.length-1;
    if(index!==previousIndex){
      progress.value=index+1;output.textContent=(index+1)+' / '+passages.length;
    }
    save();
  };
  remember.addEventListener('change',()=>{
    if(remember.checked){lastSaved='';save();}
    else{try{localStorage.removeItem(key);lastSaved='';clear.hidden=true;resume.hidden=true;}catch{unavailable();}}
  });
  clear.addEventListener('click',()=>{try{localStorage.removeItem(key);lastSaved='';remember.checked=false;clear.hidden=true;resume.hidden=true;}catch{unavailable();}});
  if(comparison){
    // CSS owns the view mode. JavaScript only refreshes progress and prevents
    // browser form/BFCache restoration from overriding the translation default.
    comparison.checked=false;
    comparison.addEventListener('change',update);
    addEventListener('pageshow',()=>{comparison.checked=false;update();});
  }
  addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(update);}},{passive:true});
  addEventListener('resize',update);update();
}
export {};
