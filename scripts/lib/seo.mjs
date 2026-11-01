import {isPublicEdition} from './reader-data.mjs';

/** @typedef {{hreflang:string, href:string}} Alternate */
/** @typedef {{url:string,path:string,locale:string,kind:'home'|'quality'|'authors'|'about'|'work'|'reader',workId?:string,editionId?:string,alternates:Alternate[],sourceFiles:string[],lastmod?:string}} SeoEntry */

// Match the corpus schema instead of introducing a second identifier policy.
const idPattern = /^[a-z][a-z0-9-]+$/;
export const languagePattern = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const compare = (a,b) => a < b ? -1 : a > b ? 1 : 0;

export function normalizedBase(base='/') {
  if (!/^\/(?:[A-Za-z0-9._~-]+\/)*[A-Za-z0-9._~-]*\/?$/.test(base) || base.split('/').some(part=>part==='.'||part==='..')) throw new Error('Invalid site base');
  return base.replace(/\/?$/, '/');
}

export function siteOrigin(site) {
  const url = new URL(site);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Site must be an HTTPS origin');
  return url.origin;
}

function checkedLocales(locales) {
  if (!Array.isArray(locales) || !locales.length || locales.some(locale=>!languagePattern.test(locale)) || new Set(locales).size!==locales.length) throw new Error('Invalid or duplicate interface locales');
  return [...locales].sort(compare);
}

function identifier(value) {
  if (typeof value!=='string' || !idPattern.test(value)) throw new Error('Unsafe work or edition identifier');
  return value;
}

const fallbackLocale = locales => locales.includes('en') ? 'en' : locales[0];

/** A translated interface is not another translation of the literary text. */
export function canonicalReaderPath(edition, locales, base='/') {
  const available = checkedLocales(locales);
  const locale = available.includes(edition.language) ? edition.language : fallbackLocale(available);
  return normalizedBase(base)+locale+'/read/'+identifier(edition.work_id)+'/'+identifier(edition.id)+'/';
}

const sharedInputs = [
  'astro.config.mjs', 'src/layouts/Base.astro', 'src/styles/global.css',
  'src/lib/locales.json', 'src/lib/i18n.ts', 'src/lib/urls.ts', 'src/lib/seo.ts',
  'scripts/lib/seo.mjs', 'scripts/lib/reader-data.mjs', 'corpus/reviews/rubric-literary-v2.json',
  'src/lib/discovery.json','src/lib/discovery.ts','scripts/lib/discovery.mjs',
  'scripts/social-images.mjs','scripts/fonts/DejaVuSerif.ttf','public/favicon.svg','package.json','package-lock.json',
];
const catalogInputs = ['corpus/catalog/works.json','corpus/catalog/editions.json','corpus/catalog/languages.json','src/lib/corpus.ts','src/components/OriginalTitle.astro'];

function sourceFiles(kind, edition, source) {
  const inputs = [...sharedInputs];
  if (kind==='quality') inputs.push('src/pages/[lang]/quality.astro');
  else if (kind==='about') inputs.push('src/pages/[lang]/about.astro','src/lib/about-content.json');
  else {
    inputs.push(...catalogInputs);
    if (kind==='home') inputs.push('src/pages/[lang]/index.astro');
    if (kind==='authors') inputs.push('src/pages/[lang]/authors.astro');
    if (kind==='work') inputs.push('src/pages/[lang]/works/[work].astro');
    if (kind==='reader') {
      inputs.push('src/pages/[lang]/read/[work]/[edition].astro','src/components/Passage.astro',
        'src/components/Citation.astro',
        'src/scripts/reading-progress.ts',edition.content_path,'corpus/structure/'+edition.work_id+'.json');
      if (source) inputs.push(source.content_path,'corpus/alignments/'+edition.work_id+'/'+edition.id+'.json');
    }
  }
  return [...new Set(inputs)].sort(compare);
}

/**
 * One inventory drives HTML annotations and sitemap discovery. Published
 * editions keep their identity; other interface wrappers remain accessible.
 * @param {{works:any[],editions:any[],locales:string[],site:string|URL,base?:string}} options
 * @returns {{entries:SeoEntry[]}}
 */
export function createSeoManifest({works,editions,locales,site,base='/'}) {
  const languages=checkedLocales(locales), prefix=normalizedBase(base), origin=siteOrigin(site);
  const workMap=new Map(works.map(work=>[identifier(work.id),work]));
  const editionMap=new Map(editions.map(edition=>[identifier(edition.id),edition]));
  if (workMap.size!==works.length || editionMap.size!==editions.length) throw new Error('Duplicate corpus identity');
  const published=editions.filter(edition=>isPublicEdition(edition,workMap.get(edition.work_id)));
  for (const edition of published) {
    if (!languagePattern.test(edition.language)) throw new Error('Invalid edition language: '+edition.id);
    if (edition.kind==='translation') {
      const source=editionMap.get(edition.source_edition_id);
      if (!published.includes(source) || source.kind!=='source' || source.work_id!==edition.work_id) throw new Error('Published translation needs its exact public source: '+edition.id);
    }
  }
  const visible=works.filter(work=>published.some(edition=>edition.work_id===work.id));
  /** @type {SeoEntry[]} */
  const entries=[];
  const absolute=path=>origin+path;
  const pagePath=(locale,suffix='')=>prefix+locale+'/'+suffix;
  const genericAlternates=suffix=>[
    ...languages.map(locale=>({hreflang:locale,href:absolute(pagePath(locale,suffix))})),
    {hreflang:'x-default',href:absolute(pagePath(fallbackLocale(languages),suffix))},
  ];
  for (const locale of languages) {
    for (const [kind,suffix,workId] of [
      ['home','',undefined],['quality','quality/',undefined],
      ['authors','authors/',undefined],['about','about/',undefined],
      ...visible.map(work=>['work','works/'+work.id+'/',work.id]),
    ]) {
      const path=pagePath(locale,suffix);
      entries.push({url:absolute(path),path,locale,kind, ...(workId?{workId}:{}),alternates:genericAlternates(suffix),sourceFiles:sourceFiles(kind)});
    }
  }
  for (const edition of published) {
    const source=edition.kind==='translation'?editionMap.get(edition.source_edition_id):edition;
    const family=published.filter(other=>other.id===source.id || other.source_edition_id===source.id);
    const ambiguous=new Set(family.map(other=>other.language)).size!==family.length;
    // Same-language editions have no implicit preferred version. Self-only
    // clusters keep their identity without nonreciprocal language alternates.
    const members=ambiguous?[edition]:family;
    const path=canonicalReaderPath(edition,languages,prefix);
    const alternates=members.map(other=>({hreflang:other.language,href:absolute(canonicalReaderPath(other,languages,prefix))})).sort((a,b)=>compare(a.hreflang,b.hreflang));
    alternates.push({hreflang:'x-default',href:absolute(canonicalReaderPath(ambiguous?edition:source,languages,prefix))});
    entries.push({url:absolute(path),path,locale:path.slice(prefix.length).split('/')[0],kind:'reader',workId:edition.work_id,editionId:edition.id,alternates,sourceFiles:sourceFiles('reader',edition,edition.kind==='translation'?source:undefined)});
  }
  entries.sort((a,b)=>compare(a.url,b.url));
  if (new Set(entries.map(entry=>entry.url)).size!==entries.length) throw new Error('Duplicate canonical URL');
  return {entries};
}
