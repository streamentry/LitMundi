import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {compareIdentifiers} from './lib/identifiers.mjs';
const requested=process.argv[2]||process.env.LITMUNDI_BASE_SHA||'HEAD';
if(/^0+$/.test(requested)){
  console.log('Initial repository push: no previous identifier snapshot.');
}else{
  const resolved=spawnSync('git',['rev-parse','--verify','--end-of-options',requested+'^{commit}'],{encoding:'utf8'});
  const sha=resolved.stdout.trim();
  if(resolved.status!==0||!/^[a-f0-9]{40,64}$/.test(sha))throw new Error('Cannot resolve identifier baseline '+requested);
  const previousFile=file=>{
    const r=spawnSync('git',['show',sha+':'+file],{encoding:'utf8'});
    if(r.status!==0)throw new Error('Cannot read baseline '+file);
    return JSON.parse(r.stdout);
  };
  const currentFile=file=>JSON.parse(fs.readFileSync(file,'utf8'));
  const snapshot=read=>{
    const works=read('corpus/catalog/works.json');
    return {works,editions:read('corpus/catalog/editions.json'),structures:Object.fromEntries(works.map(w=>[w.id,read('corpus/structure/'+w.id+'.json')]))};
  };
  const errors=compareIdentifiers(snapshot(previousFile),snapshot(currentFile));
  if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
  else console.log('Canonical work, edition, passage and legacy URL identities preserved against '+sha.slice(0,12)+'.');
}
