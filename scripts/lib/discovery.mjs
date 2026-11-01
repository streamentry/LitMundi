import discovery from '../../src/lib/discovery.json' with {type:'json'};
import {editionTitle,isPublicEdition,preferredEdition,reviewCategory} from './reader-data.mjs';

/** UI descriptions are separate from the reviewed literary corpus. */
export function labels(locale) {
  return discovery.locales[locale]??discovery.locales.en;
}

/** Untranslated future summaries keep their actual English language label. */
export function workSummary(work,locale) {
  const translated=discovery.summaries[work.id]?.[locale];
  return translated?{text:translated,language:locale}:{text:work.description,language:'en'};
}

export function languageName(code,locale,fallbackNames={}) {
  return labels(locale).languages[code]??fallbackNames[code]??code;
}

export function genreName(code,locale) {
  return labels(locale).genres[code]??code.replaceAll('_',' ');
}

export function authorSlug(name) {
  return name.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/đ/g,'d').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'');
}

export function readerPageTitle(work,edition,languageNames={}) {
  return editionTitle(work,edition)+' — '+work.author+' · '+(languageNames[edition.language]??edition.language);
}

export function workPageTitle(work,edition) {
  return editionTitle(work,edition)+' — '+work.author;
}

const substitute=(template,values)=>template.replace(/\{([a-zA-Z]+)\}/g,(_,key)=>values[key]??'');

export function readerPageDescription(work,edition,locale,languageNames={}) {
  const d=labels(locale),category=reviewCategory(edition);
  const template=!isPublicEdition(edition,work)?d.readerSample:edition.kind==='source'?d.readerSource:d.readerTranslation;
  return substitute(template,{title:editionTitle(work,edition),author:work.author,language:languageName(edition.language,locale,languageNames),review:category==='ai'?d.aiReview:category==='human'?d.humanReview:d.publicationReview});
}

export function workPageDescription(work,editions,locale,languageNames={}) {
  const d=labels(locale),published=editions.filter(edition=>edition.work_id===work.id&&isPublicEdition(edition,work));
  const selected=preferredEdition(published,locale,work.original_language);
  const names=[...new Set(published.map(edition=>edition.language))].sort().map(code=>languageName(code,locale,languageNames));
  const languages=new Intl.ListFormat(Object.hasOwn(discovery.locales,locale)?locale:'en',{style:'long',type:'conjunction'}).format(names);
  return substitute(published.length?d.workDescription:d.workSample,{title:editionTitle(work,selected),author:work.author,languages});
}
