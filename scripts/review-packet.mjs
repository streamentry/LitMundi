import fs from 'node:fs/promises';
import {loadCorpus} from './lib/portable.mjs';
import {reviewPackets} from './lib/review-packets.mjs';
await fs.rm('review-packets',{recursive:true,force:true});
await fs.mkdir('review-packets',{recursive:true});
const files=reviewPackets(loadCorpus());
for(const [name,bytes] of Object.entries(files))await fs.writeFile('review-packets/'+name,bytes);
console.log('Prepared '+Object.keys(files).length+' clearly labelled editorial packet/template files in review-packets/. Not public editions.');
