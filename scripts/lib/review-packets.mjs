import fs from 'node:fs';
import path from 'node:path';
import {sha256,xml,json} from './portable.mjs';
import {alignedPassages} from './reader-data.mjs';

/** Private/editorial artifacts only. Never copied into the public site's downloads. */
export function reviewPackets(corpus){
  const files={};
  for(const edition of corpus.editions.filter(e=>e.kind==='translation'&&e.status==='draft'&&e.content_path)){
    const source=corpus.editions.find(e=>e.id===edition.source_edition_id);
    const work=corpus.works.find(w=>w.id===edition.work_id);
    const sourceBytes=fs.readFileSync(path.join(corpus.root,source.content_path));
    const targetBytes=fs.readFileSync(path.join(corpus.root,edition.content_path));
    const sourceText=JSON.parse(sourceBytes),targetText=JSON.parse(targetBytes);
    const alignment=corpus.read('corpus/alignments/'+work.id+'/'+edition.id+'.json');
    const structure=corpus.read('corpus/structure/'+work.id+'.json');
    for(const text of [sourceText,targetText]){
      if(Object.keys(text).length!==structure.segment_ids.length||!structure.segment_ids.every(id=>typeof text[id]==='string'&&text[id].trim()))throw new Error('Review packet requires every canonical passage: '+edition.id);
    }
    const aligned=alignedPassages(structure.segment_ids.map(id=>[id,sourceText[id]]),structure.segment_ids.map(id=>[id,targetText[id]]),alignment);
    const render=(passages,lang)=>passages.map(([id,text])=>'<section><h3>'+xml(id)+'</h3><p lang="'+xml(lang)+'">'+xml(text)+'</p></section>').join('');
    const rows=aligned.map(row=>'<div class="pair"><div>'+render(row.source,source.language)+'</div><div>'+render(row.target,edition.language)+'</div></div>').join('\n');
    const page='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Editorial review — '+xml(work.title)+'</title><style>body{max-width:80em;margin:2em auto;padding:1em;color:#222;background:white;font:1.1em/1.7 Georgia,serif}.pair{display:grid;grid-template-columns:1fr 1fr;gap:2em;border-top:1px solid #bbb;padding:1em 0}h3{font:0.8em system-ui;overflow-wrap:anywhere}code{overflow-wrap:anywhere}.notice{border:2px solid #753b00;padding:1em} @media(max-width:700px){.pair{grid-template-columns:1fr}}</style></head><body><main><h1>'+xml(work.title)+'</h1><div class="notice"><strong>UNPUBLISHED TRANSLATION DRAFT — FOR EDITORIAL REVIEW</strong><p>No human literary certification or open publication license is claimed. This packet is not a public reading edition.</p></div><p>'+xml(work.author)+'</p><p>Source: '+xml(source.provenance.citation)+'</p><p>Source SHA-256: <code>'+sha256(sourceBytes)+'</code></p><p>Target SHA-256: <code>'+sha256(targetBytes)+'</code></p><p>Compare every passage against the exact witness, then score independently before reading other reviews or AI grades. Record uncertainty and disagreements. Two qualified independent humans must each reach 9.0/10; fidelity at least 9 and all other dimensions at least 8. A maintainer must authenticate qualifications, independence and contributor consent.</p><h2>Original / target-language draft</h2>'+rows+'<h2>Submission</h2><p>See docs/QUALITY.md and the matching literary dossier in the repository. Use the adjacent JSON template, replacing every placeholder and null score with your own findings. The template is deliberately invalid until honestly completed. Do not claim an approval you did not give.</p></main></body></html>\n';
    files[edition.id+'.html']=Buffer.from(page);
    files[edition.id+'.review-template.json']=Buffer.from(json({
      rubric_id:'litmundi-literary-v1',edition_id:edition.id,source_edition_id:source.id,reviewed_at:'YYYY-MM-DD',kind:'independent_human',
      reviewer:{identifier:'YOUR-GITHUB-HANDLE',display_name:'YOUR NAME',github_handle:'YOUR-GITHUB-HANDLE',independent:false,evidence_url:null,qualifications:'DESCRIBE YOUR ACTUAL BILINGUAL LITERARY EXPERIENCE',languages:[source.language,edition.language],conflicts_of_interest:'DISCLOSE RELEVANT RELATIONSHIPS AND CONTRIBUTIONS'},
      source_sha256:sha256(sourceBytes),target_sha256:sha256(targetBytes),segments_reviewed:[],
      scores:{semantic_fidelity:null,literary_voice:null,target_naturalness:null,imagery_consistency:null,editorial_mechanics:null},findings:[],
      summary:'UNFILLED TEMPLATE. NOT A REVIEW OR AN APPROVAL. Replace with an independent passage-grounded assessment after reading all source and target passages.'
    }));
  }
  return files;
}
