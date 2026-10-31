import works from '../../corpus/catalog/works.json';
import languages from '../../corpus/catalog/languages.json';
import editionRecords from '../../corpus/catalog/editions.json';
export {supported,isLocale,strings} from './i18n';
export type {Locale} from './i18n';
import {isPublicEdition,preferredEdition,alignedPassages} from '../../scripts/lib/reader-data.mjs';

/** The corpus, not the website, is the system of record. */
export interface Work {
  id: string; title: string; author: string; author_death_year: number;
  first_published_year: number; original_language: string; genre: string;
  description: string; visibility: 'public' | 'demo' | 'archived';
  translation_gap: { status: string; notes: string };
}
export interface Edition {
  id: string; work_id: string; language: string; kind: 'source' | 'translation';
  status: 'planned' | 'draft' | 'sample' | 'published' | 'withdrawn';
  label: string; content_path: string | null; source_edition_id: string | null;
  legacy_slugs: string[];
  provenance: { citation: string; catalog_url: string | null; text_url: string | null; retrieved_at: string | null; source_witness: string | null };
  rights: { status: string; license: string | null; basis: string; jurisdictions_assessed: string[]; evidence_urls: string[] };
  credits: { author: string; translator: string | null; editors: string[]; ai_assisted: boolean };
  review: { status: string; reviewers: string[]; evidence_urls: string[]; notes: string };
}
export const catalog = works as Work[];
export const editions = editionRecords as Edition[];
export const languageNames = languages as Record<string,string>;
export const editionsForWork = (id: string) => editions.filter(e => e.work_id === id);
export const readableEditions = (id: string) => editionsForWork(id).filter(e => isPublicEdition(e,workById(id)) || (e.status === 'sample' && workById(id)?.visibility === 'demo'));
export const publishedEditions = (id: string) => editionsForWork(id).filter(e => isPublicEdition(e,workById(id)));
export const publicWorks = () => catalog.filter(w => w.visibility === 'public' && publishedEditions(w.id).length > 0);
export const bestEdition = (work:Work,locale:string):Edition|null => preferredEdition(publishedEditions(work.id),locale,work.original_language);
export const workById = (id: string) => catalog.find(w => w.id === id);
export const editionById = (id: string) => editions.find(e => e.id === id);
export const resolveEdition = (workId: string, slug: string) =>
  editionsForWork(workId).find(e => e.id === slug || e.legacy_slugs.includes(slug));

/**
 * Build-time, static JSON import. The client receives no database credentials or API.
 * Drafts are excluded at call sites and MUST NOT have generated public read routes.
 */
const segmentModules = import.meta.glob('../../corpus/segments/**/*.json', { eager: true, import: 'default' }) as Record<string,Record<string,string>>;
const structures = import.meta.glob('../../corpus/structure/*.json', { eager: true, import: 'default' }) as Record<string,{ segment_ids: string[] }>;
export function passagesFor(edition: Edition): [string,string][] {
  if (!edition.content_path) return [];
  const data = segmentModules['../../' + edition.content_path];
  if (!data) throw new Error('Missing edition JSON: '+edition.content_path);
  const structure = structures['../../corpus/structure/' + edition.work_id + '.json'];
  if (!structure) throw new Error('Missing structure: '+edition.work_id);
  return structure.segment_ids.filter(key => key in data).map(key => [key,data[key]]);
}
export function issueUrl(workId: string, editionId: string, segment?: string): string {
  const title = 'Text correction: '+workId+' / '+editionId+(segment?' / '+segment:'');
  const body = [
    '## Text identity',
    'Work ID: '+workId,
    'Edition ID: '+editionId,
    'Segment ID: '+(segment??'(whole edition)'),
    '',
    '## Current reading and proposed correction',
    '',
    '## Evidence (cite primary source and bibliographic edition)',
    '',
    '## Notes on wording, style and implications',
    '',
    'Please do not paste unlicensed modern translations.'
  ].join('\n');
  return 'https://github.com/streamentry/LitMundi/issues/new?' + new URLSearchParams({title,body}).toString();
}

const alignmentModules = import.meta.glob('../../corpus/alignments/*/*.json', {eager:true,import:'default'}) as Record<string,{links:{source:string[],target:string[]}[]}>;
export function parallelFor(edition:Edition): {source:Edition,rows:{source:[string,string][],target:[string,string][]}[]}|null {
  if(edition.kind !== 'translation' || edition.status !== 'published') return null;
  const source=editionById(edition.source_edition_id??'');
  if(!source || !isPublicEdition(source,workById(edition.work_id))) throw new Error('Published translation requires a public source');
  const alignment=alignmentModules['../../corpus/alignments/'+edition.work_id+'/'+edition.id+'.json'];
  return {source,rows:alignedPassages(passagesFor(source),passagesFor(edition),alignment)};
}
