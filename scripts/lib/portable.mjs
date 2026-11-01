import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {zipSync,strToU8} from 'fflate';
import {editionTitle} from './reader-data.mjs';
import {canonicalReaderPath,siteOrigin} from './seo.mjs';
import siteConfig from '../../src/lib/site.json' with {type:'json'};
import locales from '../../src/lib/locales.json' with {type:'json'};

export const sha256 = data => createHash('sha256').update(data).digest('hex');
export const json = value => JSON.stringify(value,null,2)+'\n';
export const xml = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export const zipOptions = () => ({level:6,mtime:new Date(1980,0,1,0,0,0),os:3,attrs:0o100644<<16});
export const aiDisclosure = edition => edition.publication_policy==='litmundi-literary-v2'||edition.review.status==='ai_reviewed'
  ? 'AI-reviewed translation. Weighted AI assessment: '+Number(edition.review.score).toFixed(2)+'/10 under '+edition.publication_policy+'. No independent human literary review is claimed. Reader corrections may lead to revision.' : '';

const canonicalUrl = edition => siteOrigin(siteConfig.site)+canonicalReaderPath(edition,Object.keys(locales),siteConfig.base);
function referenceUrl(value,field) {
  if(value===null||value===undefined||value==='')return null;
  let url;
  try{url=new URL(value);}catch{throw new Error('Invalid source '+field+' URL');}
  if(typeof value!=='string'||value.trim()!==value||!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Invalid source '+field+' URL');
  return value;
}

export function loadCorpus(root=process.cwd()) {
  const read = file => JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
  return {root,read,works:read('corpus/catalog/works.json'),editions:read('corpus/catalog/editions.json')};
}
export function publicEditions(corpus) {
  const publicWorks=new Set(corpus.works.filter(w=>w.visibility==='public').map(w=>w.id));
  return corpus.editions.filter(e=>publicWorks.has(e.work_id)&&e.status==='published'&&e.content_path&&
    ['cleared','public_domain_assessed'].includes(e.rights.status)).sort((a,b)=>a.id<b.id?-1:1);
}
export function editionBundle(corpus,edition) {
  const work=corpus.works.find(w=>w.id===edition.work_id);
  if(!work)throw new Error('Unknown work for portable edition: '+edition.id);
  const source=edition.kind==='source'?edition:corpus.editions.find(e=>e.id===edition.source_edition_id);
  if(!source||source.kind!=='source'||source.work_id!==edition.work_id||
    (edition.kind==='translation'&&!publicEditions(corpus).some(e=>e.id===source.id)))throw new Error('Portable translation needs its exact public source: '+edition.id);
  const structure=corpus.read('corpus/structure/'+work.id+'.json');
  const bytes=fs.readFileSync(path.join(corpus.root,edition.content_path));
  const segments=JSON.parse(bytes.toString('utf8'));
  return {
    format:'LitMundi portable edition v1',title:editionTitle(work,edition),original_title:work.title,work,edition,structure,
    canonical_url:canonicalUrl(edition),
    source:{
      edition_id:source.id,title:editionTitle(work,source),language:source.language,canonical_url:canonicalUrl(source),
      citation:source.provenance.citation,text_url:referenceUrl(source.provenance.text_url,'text'),
      catalog_url:referenceUrl(source.provenance.catalog_url,'catalog'),
      source_witness:source.provenance.source_witness??null,retrieved_at:source.provenance.retrieved_at??null,
    },
    content_sha256:sha256(bytes),
    original_source_sha256:source?.content_path?sha256(fs.readFileSync(path.join(corpus.root,source.content_path))):null,
    // Retain the v1 alias for clients; this is the edition's canonical JSON digest.
    source_content_sha256:sha256(bytes),
    segments:Object.fromEntries(structure.segment_ids.map(id=>[id,segments[id]]))
  };
}
export function plainText(bundle) {
  const {work,edition,segments,source}=bundle;
  const head=[
    editionTitle(work,edition),work.author,'Original title: '+work.title,edition.label,'Edition: '+edition.id,
    'Canonical URL: '+bundle.canonical_url,
    ...(aiDisclosure(edition)?[aiDisclosure(edition)]:[]),
    'Publication: '+edition.status+'; '+edition.review.status,
    'Translator: '+(edition.credits.translator??'not applicable'),
    'Editors: '+(edition.credits.editors.join(', ')||'none recorded'),
    'Reviewers: '+(edition.review.reviewers.join(', ')||'no independent literary certification'),
    'AI assessment systems: '+((edition.review.ai_reviewers??[]).join(', ')||'none recorded'),
    'Review evidence: '+edition.review.evidence_urls.join(' ; '),
    'Source edition: '+source.edition_id,
    'Source edition URL: '+source.canonical_url,
    'Source: '+source.citation,
    'Source witness URL: '+(source.text_url??''),
    'Source catalog URL: '+(source.catalog_url??''),
    'Source witness description: '+(source.source_witness??''),
    ...(edition.kind==='translation'?['Edition provenance: '+edition.provenance.citation]:[]),
    'License: '+(edition.rights.license??'No reuse license granted'),
    'Rights: '+edition.rights.basis,
    'Canonical content SHA-256: '+bundle.source_content_sha256,
    'Content rights are edition-specific; the software MIT license does not relicense literature.'
  ].join('\n');
  return head+'\n\n'+Object.entries(segments).map(([id,text])=>'['+id+']\n'+text).join('\n\n')+'\n';
}
export function tabSeparated(bundle) {
  const cell = value => String(value).replace(/\\/g,'\\\\').replace(/\t/g,'\\t').replace(/\r/g,'\\r').replace(/\n/g,'\\n');
  const {work,edition,source}=bundle;
  const fields=['work_id','edition_id','title','original_title','language','author','translator','editors','reviewers','ai_reviewers','review_status','publication_policy','ai_score','review_evidence','license','rights_basis','source_citation','source_url','content_sha256','passage_id','text','canonical_url','source_edition_id','source_canonical_url','source_catalog_url','edition_provenance'];
  const metadata=[work.id,edition.id,editionTitle(work,edition),work.title,edition.language,work.author,edition.credits.translator??'',edition.credits.editors.join('; '),edition.review.reviewers.join('; '),(edition.review.ai_reviewers??[]).join('; '),edition.review.status,edition.publication_policy??'',edition.review.score??'',edition.review.evidence_urls.join('; '),edition.rights.license??'No reuse permission granted',edition.rights.basis,source.citation,source.text_url??'',bundle.source_content_sha256];
  const references=[bundle.canonical_url,source.edition_id,source.canonical_url,source.catalog_url??'',edition.provenance.citation];
  return fields.join('\t')+'\n'+Object.entries(bundle.segments).map(([id,text])=>[...metadata,id,text,...references].map(cell).join('\t')).join('\n')+'\n';
}
export function epub(bundle) {
  const {work,edition,segments,source}=bundle;
  const date=/^\d{4}-\d{2}-\d{2}$/.test(edition.provenance.retrieved_at??'')?edition.provenance.retrieved_at:'1980-01-01';
  const title=editionTitle(work,edition),language=edition.language,titleLanguage=edition.title?language:work.original_language;
  const labelLanguage=edition.kind==='source'?'en':language;
  const heading='<?xml version="1.0" encoding="UTF-8"?>\n';
  const lang=value=>' lang="'+xml(value)+'" xml:lang="'+xml(value)+'"';
  const link=url=>'<a href="'+xml(url)+'">'+xml(url)+'</a>';
  const start=documentLanguage=>heading+'<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"'+lang(documentLanguage)+'><head><title'+lang(titleLanguage)+'>'+xml(title)+'</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body>';
  const text=start(language)+'<main><h1'+lang(titleLanguage)+'>'+xml(title)+'</h1><p>'+xml(work.author)+'</p>'+
    (aiDisclosure(edition)?'<p lang="en" xml:lang="en">'+xml(aiDisclosure(edition))+'</p>':'')+
    Object.entries(segments).map(([id,value])=>'<p id="'+xml(id)+'">'+xml(value)+'</p>').join('\n')+
    '<section id="provenance"'+lang('en')+'><h2>Edition and rights</h2><p>Original title: <span'+lang(work.original_language)+'>'+xml(work.title)+'</span></p><p class="edition-label"'+lang(labelLanguage)+'>'+xml(edition.label)+'</p>'+
    '<p>Canonical edition URL: '+link(bundle.canonical_url)+'</p><p>Source edition: '+xml(source.edition_id)+'</p><p>Source edition URL: '+link(source.canonical_url)+'</p><p>'+xml(source.citation)+'</p>'+
    (edition.kind==='translation'?'<p>Edition provenance: '+xml(edition.provenance.citation)+'</p>':'')+
    '<p>Translator: '+xml(edition.credits.translator??'not applicable')+'</p><p>Editors: '+xml(edition.credits.editors.join(', ')||'none recorded')+'</p>'+
    '<p>Review: '+xml(edition.review.status)+'. '+xml(edition.review.notes)+'</p><p>Reviewers: '+xml(edition.review.reviewers.join(', ')||'No independent literary certification')+'</p>'+
    '<p>AI assessment systems: '+xml((edition.review.ai_reviewers??[]).join(', ')||'none recorded')+'</p>'+
    '<p>Review evidence: '+xml(edition.review.evidence_urls.join(' ; '))+'</p><p>Source witness URL: '+(source.text_url?link(source.text_url):'')+'</p>'+
    '<p>Source catalog URL: '+(source.catalog_url?link(source.catalog_url):'')+'</p><p>Source witness description: '+xml(source.source_witness)+'</p>'+
    '<p>License: '+xml(edition.rights.license)+'</p><p>'+xml(edition.rights.basis)+'</p><p>Rights evidence: '+xml(edition.rights.evidence_urls.join(' ; '))+'</p>'+
    '<p>Canonical content SHA-256: '+bundle.source_content_sha256+'</p></section></main></body></html>';
  const nav=start('en')+'<nav epub:type="toc" id="toc"><h1>Contents</h1><ol><li><a href="text.xhtml"'+lang(titleLanguage)+'>'+xml(title)+'</a></li><li><a href="text.xhtml#provenance">Edition and rights</a></li></ol></nav></body></html>';
  const opf=heading+'<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="edition-id" xml:lang="'+xml(language)+'">'+
    '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="edition-id">urn:litmundi:'+xml(edition.id)+':sha256:'+bundle.source_content_sha256+'</dc:identifier>'+
    '<dc:identifier id="canonical-url">'+xml(bundle.canonical_url)+'</dc:identifier>'+
    '<dc:title xml:lang="'+xml(titleLanguage)+'">'+xml(title)+'</dc:title><dc:creator>'+xml(work.author)+'</dc:creator><dc:language>'+xml(language)+'</dc:language>'+
    '<dc:publisher>LitMundi</dc:publisher><dc:rights xml:lang="en">'+xml(edition.rights.license)+'. '+xml(edition.rights.basis)+'</dc:rights><dc:source xml:lang="en">'+xml('Original title: '+work.title+'; '+source.citation)+'</dc:source>'+
    '<meta property="dcterms:modified">'+date+'T00:00:00Z</meta></metadata>'+
    '<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="text" href="text.xhtml" media-type="application/xhtml+xml"/><item id="style" href="style.css" media-type="text/css"/></manifest>'+
    '<spine><itemref idref="text"/></spine></package>';
  // EPUB requires mimetype first, uncompressed, without extra fields.
  return zipSync({
    mimetype:[strToU8('application/epub+zip'),{level:0}],
    'META-INF/container.xml':strToU8(heading+'<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'),
    'EPUB/package.opf':strToU8(opf),'EPUB/nav.xhtml':strToU8(nav),'EPUB/text.xhtml':strToU8(text),
    'EPUB/style.css':strToU8('body{font-family:serif;line-height:1.7;margin:1em;}p{margin:0 0 1em;}h1{line-height:1.2;}#provenance{margin-top:3em;font-size:.85em;}')
  },zipOptions());
}
export function portableFiles(corpus) {
  const result={};
  for(const edition of publicEditions(corpus)){
    const bundle=editionBundle(corpus,edition);
    result[edition.id+'.json']=Buffer.from(json(bundle));
    result[edition.id+'.txt']=Buffer.from(plainText(bundle));
    result[edition.id+'.tsv']=Buffer.from(tabSeparated(bundle));
    result[edition.id+'.epub']=Buffer.from(epub(bundle));
  }
  return result;
}
