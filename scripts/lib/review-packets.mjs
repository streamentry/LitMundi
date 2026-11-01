import fs from 'node:fs';
import path from 'node:path';
import {sha256,xml,json} from './portable.mjs';
import {alignedPassages} from './reader-data.mjs';
import {ACTIVE_RUBRIC_ID} from './quality.mjs';

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
    const page='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Editorial review — '+xml(work.title)+'</title><style>body{max-width:80em;margin:2em auto;padding:1em;color:#222;background:white;font:1.1em/1.7 Georgia,serif}.pair{display:grid;grid-template-columns:1fr 1fr;gap:2em;border-top:1px solid #bbb;padding:1em 0}h3{font:0.8em system-ui;overflow-wrap:anywhere}code{overflow-wrap:anywhere}.notice{border:2px solid #753b00;padding:1em} @media(max-width:700px){.pair{grid-template-columns:1fr}}</style></head><body><main><h1>'+xml(work.title)+'</h1><div class="notice"><strong>UNPUBLISHED TRANSLATION DRAFT — FOR EDITORIAL REVIEW</strong><p>This packet is not a published reading edition or an approval. Edition-specific rights apply; no human literary certification is claimed.</p></div><p>'+xml(work.author)+'</p><p>Source: '+xml(source.provenance.citation)+'</p><p>Source SHA-256: <code>'+sha256(sourceBytes)+'</code></p><p>Target SHA-256: <code>'+sha256(targetBytes)+'</code></p><p>Compare every passage against the exact witness, then score independently before reading other reviews or AI grades. Record uncertainty and disagreements. One explicit v2 AI assessment with weighted score at least 8.6/10 can qualify for publication. All passages, exact content hashes, lawful reuse and resolution of major/critical findings are still required. Human reading and feedback are optional after release.</p><h2>Original / target-language draft</h2>'+rows+'<h2>Submission</h2><p>See docs/QUALITY.md and the matching literary dossier in the repository. Use the adjacent JSON template, replacing every placeholder and null score with your own findings. The template is deliberately invalid until honestly completed. Do not claim an approval you did not give.</p></main></body></html>\n';
    files[edition.id+'.html']=Buffer.from(page);
    files[edition.id+'.review-template.json']=Buffer.from(json({
      rubric_id:ACTIVE_RUBRIC_ID,edition_id:edition.id,source_edition_id:source.id,reviewed_at:'YYYY-MM-DD',kind:'ai_review',
      reviewer:{identifier:'UNFILLED-AI-ASSESSMENT',display_name:'UNFILLED AI assessment',github_handle:null,independent:false,evidence_url:null},
      ai_assessment:{model:'UNFILLED — RECORD THE ACTUAL MODEL',method:'UNFILLED — DESCRIBE THE ACTUAL FULL-TEXT ASSESSMENT',limitations:'UNFILLED — RECORD UNCERTAINTIES; THIS IS NOT A HUMAN REVIEW'},
      source_sha256:sha256(sourceBytes),target_sha256:sha256(targetBytes),segments_reviewed:[],
      scores:{semantic_fidelity:null,literary_voice:null,target_naturalness:null,imagery_consistency:null,editorial_mechanics:null},findings:[],
      summary:'UNFILLED TEMPLATE. NOT A REVIEW OR AN APPROVAL. Replace with an honest AI passage-grounded assessment after comparing all source and target passages. Do not adjust scores to obtain publication.'
    }));
  }
  return files;
}
