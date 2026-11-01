import {publicWorks,publishedEditions,passagesFor,languageNames,reviewCategory,editionTitle} from '../lib/corpus';
export const prerender=true;
export function GET(){
  const index=publicWorks().flatMap(work=>publishedEditions(work.id).map(edition=>({
    workId:work.id,editionId:edition.id,title:editionTitle(work,edition),originalTitle:work.title,titleLanguage:edition.title?edition.language:work.original_language,author:work.author,language:edition.language,languageName:languageNames[edition.language]??edition.language,reviewCategory:reviewCategory(edition),passages:passagesFor(edition)
  })));
  return new Response(JSON.stringify(index),{headers:{'Content-Type':'application/json; charset=utf-8'}});
}
