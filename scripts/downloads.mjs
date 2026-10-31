import fs from 'node:fs/promises';
import path from 'node:path';
import {loadCorpus,portableFiles,sha256,json} from './lib/portable.mjs';

const output=path.resolve('public/downloads');
// Generated directory only: clearing it prevents withdrawn editions remaining downloadable.
await fs.rm(output,{recursive:true,force:true});
await fs.mkdir(output,{recursive:true});
const files=portableFiles(loadCorpus());
const manifest=[];
for(const [name,bytes] of Object.entries(files)){
  await fs.writeFile(path.join(output,name),bytes);
  manifest.push({path:name,sha256:sha256(bytes),bytes:bytes.length});
}
await fs.writeFile(path.join(output,'manifest.json'),json({format:'LitMundi public downloads v1',files:manifest}));
console.log('Generated '+Object.keys(files).length+' portable files for published editions only.');
