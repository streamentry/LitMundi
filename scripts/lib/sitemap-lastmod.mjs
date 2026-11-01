import {execFileSync} from 'node:child_process';

/**
 * Return a date only when Git can attest to every relevant input. A dirty
 * checkout, missing file/history, shallow clone or missing Git omits the date.
 * Filesystem mtimes, build time and unrelated HEAD commits are never used.
 */
export function createGitLastmod(cwd=process.cwd()) {
  const run=args=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
  let complete=false;
  try { complete=run(['rev-parse','--is-shallow-repository'])==='false'; } catch {}
  const cache=new Map();
  return paths=>{
    const files=[...new Set(paths)].sort();
    if (!complete || !files.length) return undefined;
    const key=JSON.stringify(files);
    if (cache.has(key)) return cache.get(key);
    let lastmod;
    try {
      if (files.some(path=>typeof path!=='string'||!path||path.startsWith('/')||path.split('/').includes('..'))) throw new Error('Unsafe input path');
      const pathspecs=files.map(file=>':(literal)'+file);
      if (run(['status','--porcelain','--untracked-files=all','--',...pathspecs])) throw new Error('Uncommitted page inputs');
      const tracked=run(['ls-files','-z','--',...pathspecs]).split('\0').filter(Boolean);
      if (new Set(tracked).size!==files.length || files.some(file=>!tracked.includes(file))) throw new Error('Untracked page inputs');
      const date=run(['log','-1','--format=%cI','--',...pathspecs]);
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(date) && Number.isFinite(Date.parse(date)) && Date.parse(date)<=Date.now()) lastmod=date;
    } catch {}
    cache.set(key,lastmod);
    return lastmod;
  };
}
