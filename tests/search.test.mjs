import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareSearchIndex,searchIndex,createSearchController} from '../scripts/lib/search.mjs';
import {isPublicEdition,editionTitle,reviewCategory} from '../scripts/lib/reader-data.mjs';

const immediate=async()=>{};
const deferred=()=>{let resolve,reject;const promise=new Promise((done,fail)=>{resolve=done;reject=fail;});return {promise,resolve,reject};};
const original={workId:'machado',editionId:'machado-pt',title:'Um Apólogo',originalTitle:'Um Apólogo',titleLanguage:'pt',author:'Machado de Assis',language:'pt',languageName:'Português',reviewCategory:'source',passages:[['p:1','Era uma vez uma agulha.'],['p:2','A linha atravessava o tecido.']]};
const translation={...original,editionId:'machado-vi',title:'Một ngụ ngôn',titleLanguage:'vi',language:'vi',languageName:'Tiếng Việt',reviewCategory:'ai',passages:[['p:1','Đường kim xuyên qua tấm vải.'],['p:2','Sợi chỉ theo sau.']]};
const unrelated={workId:'saki',editionId:'saki-en',title:'The Open Window',originalTitle:'The Open Window',titleLanguage:'en',author:'Saki',language:'en',languageName:'English',reviewCategory:'source',passages:[['p:1','A needle lay beside the window.']]};
const records=[original,translation,unrelated];

test('bibliographic matches produce one link per edition, preferring the UI language then stable source order',async()=>{
  const index=await prepareSearchIndex(records,{yieldControl:immediate});
  for(const query of ['Um Apólogo','um apologo','MACHADO']){
    const result=await searchIndex(index,{query,locale:'vi'});
    assert.deepEqual(result.editions.map(edition=>edition.editionId),['machado-vi','machado-pt']);
    assert.deepEqual([...result.workIds],['machado']);
    assert.equal(result.passageCount,0);assert.deepEqual(result.passages,[]);
  }
  const fallback=await searchIndex(index,{query:'Machado',locale:'fr'});
  assert.deepEqual(fallback.editions.map(edition=>edition.editionId),['machado-pt','machado-vi']);
  const translatedTitle=await searchIndex(index,{query:'MỘT NGỤ NGÔN',locale:'vi'});
  assert.deepEqual(translatedTitle.editions.map(edition=>edition.editionId),['machado-vi']);
  const languageLabel=await searchIndex(index,{query:'tieng viet'});
  assert.deepEqual(languageLabel.editions.map(edition=>edition.editionId),['machado-vi']);
});

test('mixed author/title and passage terms match the same passage without requiring metadata words in the prose',async()=>{
  const index=await prepareSearchIndex(records,{yieldControl:immediate});
  const mixed=await searchIndex(index,{query:'Machado đường KIM',locale:'vi'});
  assert.deepEqual(mixed.editions,[]);
  assert.deepEqual(mixed.passages.map(({edition,id,text})=>[edition.editionId,id,text]),[['machado-vi','p:1',translation.passages[0][1]]]);
  const originalTitle=await searchIndex(index,{query:'Um Apólogo linha',locale:'vi'});
  assert.deepEqual(originalTitle.passages.map(({edition,id})=>[edition.editionId,id]),[['machado-pt','p:2']]);
  const split=await searchIndex(index,{query:'agulha tecido',locale:'pt'});
  assert.equal(split.passageCount,0,'Terms in different passages must not form a false match');
  const absent=await searchIndex(index,{query:'Machado impossibleword'});
  assert.equal(absent.workIds.size,0);assert.equal(absent.passageCount,0);
});

test('language and author filters refine both result types and never broaden the supplied inventory',async()=>{
  const index=await prepareSearchIndex(records,{yieldControl:immediate});
  const metadata=await searchIndex(index,{query:'Machado',locale:'vi',language:'pt',author:original.author});
  assert.deepEqual(metadata.editions.map(edition=>edition.editionId),['machado-pt']);
  const filtered=await searchIndex(index,{query:'needle',author:original.author});
  assert.equal(filtered.workIds.size,0);
  const passage=await searchIndex(index,{query:'needle',author:'Saki',language:'en'});
  assert.deepEqual(passage.passages.map(item=>item.edition.editionId),['saki-en']);
  const missingLanguage=await searchIndex(index,{query:'Machado',language:'fr'});
  assert.equal(missingLanguage.workIds.size,0);
});

test('passage display stops at 50 but total count and matching works include all later matches',async()=>{
  const many=Array.from({length:3},(_,work)=>({...unrelated,workId:'work-'+work,editionId:'edition-'+work,language:work===1?'vi':'en',passages:Array.from({length:60},(_,passage)=>['p:'+passage,'A matching needle '+passage])}));
  let preparationYields=0,scanYields=0;
  const index=await prepareSearchIndex(many,{batchSize:20,yieldControl:async()=>{preparationYields++;}});
  const result=await searchIndex(index,{query:'needle',locale:'vi'},{batchSize:20,yieldControl:async()=>{scanYields++;}});
  assert.equal(result.passageCount,180);assert.equal(result.passages.length,50);
  assert.deepEqual([...result.workIds],['work-1','work-0','work-2']);
  assert.ok(result.passages.every(item=>item.edition.editionId==='edition-1'));
  assert.ok(preparationYields>1&&scanYields>1,'Both normalization and the full scan must yield during a larger index');
});

test('a scan stops at its next cooperative boundary when superseded',async()=>{
  const record={...unrelated,passages:Array.from({length:100},(_,id)=>['p:'+id,'needle'])};
  const index=await prepareSearchIndex([record],{yieldControl:immediate});
  let current=true,yields=0;
  const result=await searchIndex(index,{query:'needle'},{batchSize:10,isCurrent:()=>current,yieldControl:async()=>{yields++;current=false;}});
  assert.equal(result,null);assert.equal(yields,1);
});

test('concurrent first searches share one download and preparation, with only the newest result returned',async()=>{
  const download=deferred();let loads=0,preparationYields=0;
  const large={...original,passages:Array.from({length:220},(_,id)=>['p:'+id,'agulha'])};
  const controller=createSearchController(async()=>{loads++;return download.promise;},{yieldControl:async()=>{preparationYields++;}});
  const first=controller.search({query:'Machado',locale:'pt'});
  const second=controller.search({query:'The Open Window',locale:'en'});
  download.resolve([large,unrelated]);
  assert.equal(await first,null);
  assert.deepEqual((await second).editions.map(edition=>edition.editionId),['saki-en']);
  assert.equal(loads,1);assert.ok(preparationYields>0);
  const preparedYields=preparationYields;
  assert.deepEqual((await controller.search({query:'Machado',locale:'pt'})).editions.map(edition=>edition.editionId),['machado-pt']);
  assert.equal(loads,1);assert.equal(preparationYields,preparedYields,'A subsequent metadata query must reuse the normalized index');
});

test('only the newest failed search reports an error, and both load and preparation failures remain retryable',async()=>{
  for(const fail of ['download','invalid-index']){
    const download=deferred();let loads=0;
    const controller=createSearchController(async()=>{loads++;return loads===1?download.promise:records;},{yieldControl:immediate});
    const first=controller.search({query:'Machado'}),second=controller.search({query:'Saki'});
    const rejected=assert.rejects(second,fail==='download'?/offline/:/Invalid search index/);
    if(fail==='download')download.reject(new Error('offline'));else download.resolve({unexpected:'shape'});
    assert.equal(await first,null);await rejected;
    const retry=await controller.search({query:'Machado',locale:'vi'});
    assert.deepEqual(retry.editions.map(edition=>edition.editionId),['machado-vi','machado-pt']);
    assert.equal(loads,2);
  }
});

test('a newer query can finish while an older scan is yielded, and clearing input cancels pending results',async()=>{
  const paused=deferred(),resume=deferred();let pause=false,pausedOnce=false,loads=0;
  const controller=createSearchController(async()=>{loads++;return records;},{batchSize:2,yieldControl:async()=>{if(pause&&!pausedOnce){pausedOnce=true;paused.resolve();await resume.promise;}}});
  await controller.search({query:'Machado'});
  pause=true;
  const old=controller.search({query:'needle'});await paused.promise;
  const newest=await controller.search({query:'Một ngụ ngôn',locale:'vi'});
  assert.deepEqual(newest.editions.map(edition=>edition.editionId),['machado-vi']);
  resume.resolve();assert.equal(await old,null);
  const pending=controller.search({query:'Machado'});controller.cancel();assert.equal(await pending,null);
  assert.equal(loads,1);
});

test('empty browsing and filter-only changes do not download the text index',async()=>{
  let loads=0;const controller=createSearchController(async()=>{loads++;return records;});
  const result=await controller.search({query:'  ',language:'vi',author:original.author});
  assert.equal(loads,0);assert.equal(result.passageCount,0);assert.equal(result.workIds.size,0);
});

test('the actual public Machado editions resolve title and author searches without paragraph fanout',async()=>{
  const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
  const works=read('corpus/catalog/works.json'),editions=read('corpus/catalog/editions.json'),languages=read('corpus/catalog/languages.json');
  const published=editions.filter(edition=>isPublicEdition(edition,works.find(work=>work.id===edition.work_id)));
  const inventory=published.map(edition=>{
    const work=works.find(work=>work.id===edition.work_id),text=read(edition.content_path);
    return {workId:work.id,editionId:edition.id,title:editionTitle(work,edition),originalTitle:work.title,titleLanguage:edition.title?edition.language:work.original_language,author:work.author,language:edition.language,languageName:languages[edition.language]??edition.language,reviewCategory:reviewCategory(edition),passages:read('corpus/structure/'+work.id+'.json').segment_ids.map(id=>[id,text[id]])};
  });
  const index=await prepareSearchIndex(inventory,{yieldControl:immediate});
  const expected=published.filter(edition=>edition.work_id==='machado-um-apologo').map(edition=>edition.id).sort();
  assert.ok(expected.length>0);
  for(const query of ['Um Apólogo','Machado']){
    const result=await searchIndex(index,{query,locale:'vi'});
    assert.deepEqual(result.editions.map(edition=>edition.editionId).sort(),expected);
    assert.equal(result.editions[0].language,'vi');
    assert.equal(result.passageCount,0);assert.equal(result.passages.length,0);
  }
});
