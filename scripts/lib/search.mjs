import {normalizeQuery} from './reader-data.mjs';

/** @typedef {{workId:string,editionId:string,title:string,originalTitle?:string,titleLanguage:string,author:string,language:string,languageName:string,reviewCategory:string}} SearchEdition */
/** @typedef {SearchEdition & {passages:[string,string][]}} SearchRecord */
/** @typedef {{edition:SearchEdition,metadata:string,passages:{id:string,text:string,normalized:string}[],order:number}} PreparedEdition */
/** @typedef {{query:string,locale?:string,author?:string,language?:string}} SearchParameters */
/** @typedef {{batchSize?:number,yieldControl?:()=>Promise<void>}} BatchOptions */
/** @typedef {{editions:SearchEdition[],passages:{edition:SearchEdition,id:string,text:string}[],passageCount:number,workIds:Set<string>}} SearchResults */

/** @returns {Promise<void>} */
const yieldToMain=()=>new Promise(resolve=>setTimeout(resolve,0));
/** @returns {SearchResults} */
const emptyResults=()=>({editions:[],passages:[],passageCount:0,workIds:new Set()});

/**
 * Prepare the existing published-only endpoint once. Keeping metadata separate
 * prevents an author/title match from turning every paragraph into a result.
 * The original text is retained for excerpts; normalization never changes it.
 * @param {SearchRecord[]} records
 * @param {BatchOptions} options
 * @returns {Promise<PreparedEdition[]>}
 */
export async function prepareSearchIndex(records,{batchSize=200,yieldControl=yieldToMain}={}) {
  if(!Number.isInteger(batchSize)||batchSize<1)throw new RangeError('Invalid search batch size');
  if(!Array.isArray(records))throw new TypeError('Invalid search index');
  const prepared=[];
  let processed=0;
  for(const [order,record] of records.entries()){
    const {passages,...edition}=record;
    const item={edition,order,metadata:normalizeQuery([edition.title,edition.originalTitle,edition.author,edition.languageName].filter(Boolean).join(' ')),passages:[]};
    if(++processed>=batchSize){processed=0;await yieldControl();}
    for(const [id,text] of passages){
      item.passages.push({id,text,normalized:normalizeQuery(text)});
      if(++processed>=batchSize){processed=0;await yieldControl();}
    }
    prepared.push(item);
  }
  return prepared;
}

/**
 * All query terms must match either edition metadata or the same passage.
 * A wholly bibliographic query returns one edition link and no paragraph fanout.
 * Other queries count every matching passage, even beyond the display limit.
 * @param {PreparedEdition[]} index
 * @param {SearchParameters} parameters
 * @param {BatchOptions & {limit?:number,isCurrent?:()=>boolean}} options
 * @returns {Promise<SearchResults|null>}
 */
export async function searchIndex(index,{query,locale='',author='',language=''},{limit=50,batchSize=200,yieldControl=yieldToMain,isCurrent=()=>true}={}) {
  if(!Number.isInteger(batchSize)||batchSize<1)throw new RangeError('Invalid search batch size');
  if(!Number.isInteger(limit)||limit<0)throw new RangeError('Invalid search display limit');
  const terms=[...new Set(normalizeQuery(query).split(/\s+/).filter(Boolean))];
  /** @type {SearchResults} */
  const result=emptyResults();
  if(!isCurrent())return null;
  if(!terms.length)return result;
  const rank=item=>item.edition.language===locale?0:item.edition.reviewCategory==='source'?1:2;
  const ordered=[...index].sort((a,b)=>rank(a)-rank(b)||a.order-b.order);
  let processed=0;
  for(const item of ordered){
    if(++processed>=batchSize){processed=0;await yieldControl();if(!isCurrent())return null;}
    const edition=item.edition;
    if((author&&edition.author!==author)||(language&&edition.language!==language))continue;
    const remaining=terms.filter(term=>!item.metadata.includes(term));
    if(!remaining.length){
      result.editions.push(edition);result.workIds.add(edition.workId);
      continue;
    }
    for(const {id,text,normalized} of item.passages){
      if(remaining.every(term=>normalized.includes(term))){
        result.passageCount++;result.workIds.add(edition.workId);
        if(result.passages.length<limit)result.passages.push({edition,id,text});
      }
      if(++processed>=batchSize){processed=0;await yieldControl();if(!isCurrent())return null;}
    }
  }
  return isCurrent()?result:null;
}

/**
 * Share an in-flight download and preparation. A failure clears the promise so
 * the next submitted search can retry. Superseded searches never return results
 * or errors to the UI, but their shared index preparation remains reusable.
 * @param {()=>Promise<SearchRecord[]>} load
 * @param {BatchOptions} options
 */
export function createSearchController(load,{batchSize=200,yieldControl=yieldToMain}={}) {
  /** @type {Promise<PreparedEdition[]>|null} */
  let pending=null;
  let version=0;
  return {
    cancel(){version++;},
    /** @param {SearchParameters} parameters */
    async search(parameters){
      const current=++version;
      if(!normalizeQuery(parameters.query))return emptyResults();
      try{
        if(!pending)pending=Promise.resolve().then(load).then(records=>prepareSearchIndex(records,{batchSize,yieldControl})).catch(error=>{pending=null;throw error;});
        const index=await pending;
        if(current!==version)return null;
        return await searchIndex(index,parameters,{batchSize,yieldControl,isCurrent:()=>current===version});
      }catch(error){
        if(current!==version)return null;
        throw error;
      }
    },
  };
}
