import {publicWorks,publishedEditions,passagesFor} from '../lib/corpus';
export const prerender=true;
export function GET(){
  const index=publicWorks().flatMap(work=>publishedEditions(work.id).map(edition=>({
    workId:work.id,editionId:edition.id,title:work.title,author:work.author,language:edition.language,passages:passagesFor(edition)
  })));
  return new Response(JSON.stringify(index),{headers:{'Content-Type':'application/json; charset=utf-8'}});
}
