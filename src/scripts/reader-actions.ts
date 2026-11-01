document.querySelectorAll<HTMLElement>('[data-citation-copy-text]').forEach(citation=>{
  const button=citation.querySelector<HTMLButtonElement>('[data-citation-copy]');
  const status=citation.querySelector<HTMLElement>('[data-citation-copy-status]');
  const selection=citation.querySelector<HTMLElement>('[data-citation-selection]');
  if(!button||!status)return;
  button.hidden=false;
  button.addEventListener('click',async()=>{
    status.textContent='';
    button.disabled=true;
    try{
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(citation.dataset.citationCopyText!);
      status.textContent=button.dataset.copied!;
    }catch{
      // Keep a selectable native citation when clipboard permission is denied.
      if(selection){
        const range=document.createRange(),selected=getSelection();
        range.selectNodeContents(selection);
        selected?.removeAllRanges();selected?.addRange(range);
      }
      status.textContent=button.dataset.copyFailed!;
    }finally{button.disabled=false;}
  });
});
export {};
