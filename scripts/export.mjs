import fs from 'node:fs/promises';
import path from 'node:path';
import {zipSync} from 'fflate';
import {loadCorpus,portableFiles,sha256,json,zipOptions} from './lib/portable.mjs';
import {reviewPackets} from './lib/review-packets.mjs';

const out=path.resolve('dist-archive');
await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(out,{recursive:true});
const corpus=loadCorpus();
const files={};
async function regularFile(file){
  let current='';
  for(const part of file.split('/')){
    current=path.join(current,part);
    if((await fs.lstat(current)).isSymbolicLink())throw new Error('Cannot archive symlink: '+current);
  }
  if(!(await fs.lstat(file)).isFile())throw new Error('Expected regular archival file: '+file);
  return fs.readFile(file);
}
async function collect(dir) {
  if((await fs.lstat(dir)).isSymbolicLink())throw new Error('Cannot archive symlink: '+dir);
  for(const entry of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name<b.name?-1:1)){
    const p=path.join(dir,entry.name);
    if(entry.isSymbolicLink()) throw new Error('Cannot archive symlink: '+p);
    if(entry.isDirectory()) await collect(p);
    else if(entry.isFile()) files[p.replaceAll(path.sep,'/')]=await fs.readFile(p);
  }
}
await collect('corpus');
await collect('docs');
try {await fs.access('research');await collect('research');} catch(error) {if(error.code!=='ENOENT') throw error;}
for(const p of ['LICENSE','GOVERNANCE.md','CONTRIBUTING.md']) files[p]=await regularFile(p);
files['restore.py']=await regularFile('scripts/restore.py');
files['README.txt']=Buffer.from(
  'LitMundi editorial archive v2\n\n'+
  'This is an EDITORIAL SNAPSHOT, not a blanket open-content license or a claim that drafts are approved.\n'+
  'Canonical corpus files include unpublished drafts and historical review evidence. Read rights-manifest.json before reuse.\n'+
  'Only published editions have portable exports. The offline reader also excludes all drafts and demonstrations.\n\n'+
  'Requirements: Python 3 (standard library only). No network, npm, Astro, GitHub, or original domain is needed.\n'+
  '1. python3 restore.py --verify-only\n'+
  '2. python3 restore.py --output ../litmundi-restored\n'+
  '3. Open ../litmundi-restored/index.html, or read the generated UTF-8 TXT files.\n\n'+
  'manifest.json records bytes and SHA-256 of every file. manifest.sha256 covers that manifest.\n'+
  'Retain the manifest digest independently: internal hashes detect corruption but do not authenticate the publisher.\n'+
  'ZIP timestamps are fixed for reproducibility. No external steward or mirror is implied by this archive.\n'+
  'See docs/PRESERVATION.md and GOVERNANCE.md for lawful continuity and remaining stewardship work.\n'
);
files['rights-manifest.json']=Buffer.from(json({
  format:'LitMundi per-edition rights manifest v1',
  scope:'Editorial snapshot; possession of a draft does not grant publication or reuse permission.',
  code_and_documentation:'MIT; corpus content is governed separately by the following edition records.',
  editions:corpus.editions.map(e=>({
    edition_id:e.id,work_id:e.work_id,status:e.status,language:e.language,kind:e.kind,
    content_path:e.content_path,source_edition_id:e.source_edition_id,
    rights:e.rights,credits:e.credits,provenance:e.provenance,review:e.review,
    publication_policy:e.publication_policy??null,generation:e.generation??null,
    publication_note:e.status==='published'?'Published under the stated assessed rights; jurisdiction and edition remain material.':'Not publication-approved; no license is inferred.'
  }))
}));
for(const [name,bytes] of Object.entries(portableFiles(corpus))) files['exports/'+name]=bytes;
for(const [name,bytes] of Object.entries(reviewPackets(corpus))) files['review-packets/'+name]=bytes;
const entries=Object.entries(files).sort(([a],[b])=>a<b?-1:1);
const manifest={format:'LitMundi corpus archive v2',scope:'editorial-snapshot',files:entries.map(([name,data])=>({path:name,sha256:sha256(data),bytes:data.length}))};
files['manifest.json']=Buffer.from(json(manifest));
files['manifest.sha256']=Buffer.from(sha256(files['manifest.json'])+'  manifest.json\n');
for(const [name,bytes] of Object.entries(files)){
  const file=path.join(out,name);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);
}
const zipFiles=Object.fromEntries(Object.entries(files).sort(([a],[b])=>a<b?-1:1));
await fs.writeFile('dist-archive.zip',zipSync(zipFiles,zipOptions()));
console.log('Exported '+entries.length+' files; manifest SHA-256 '+sha256(files['manifest.json'])+'.');
