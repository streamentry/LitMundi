import works from '../../corpus/catalog/works.json';
import languages from '../../corpus/catalog/languages.json';
import editionRecords from '../../corpus/catalog/editions.json';
export const supported = ['en','vi','fr','es'] as const;
export type Locale = typeof supported[number];
export const isLocale = (v: string): v is Locale => supported.includes(v as Locale);
export const strings: Record<Locale,Record<string,string>> = {
en:{tag:'A living library of literary heritage',title:'Great literature. Every language.',intro:'Carefully sourced, openly accessible literary texts and translations—with their origins, review status and history in plain sight.',explore:'Explore the library',works:'The collection',why:'Built for generations, not platforms',whytext:'Plain-text JSON, stable passage identifiers, source attribution, independent backups and community review.',about:'About',read:'Read',original:'Original language',feedback:'Suggest a correction',draft:'This text is a demonstration, not a reviewed or authoritative literary translation.',empty:'No translation is published in this language yet.',all:'View all available editions',copyright:'Check the source and license before reuse.',github:'Contribute on GitHub',sample:'Demonstration'},
vi:{tag:'Thư viện di sản văn chương',title:'Tinh hoa văn học. Mọi ngôn ngữ.',intro:'Tác phẩm và bản dịch được tuyển chọn, minh bạch về nguồn, mức kiểm định và lịch sử chỉnh sửa, mở cho mọi người đọc.',explore:'Khám phá thư viện',works:'Tủ sách',why:'Xây cho nhiều thế hệ, không phụ thuộc nền tảng',whytext:'JSON thuần, ID đoạn bền vững, nguồn rõ ràng, bản sao độc lập và kiểm định cộng đồng.',about:'Giới thiệu',read:'Đọc',original:'Ngôn ngữ gốc',feedback:'Góp ý bản dịch',draft:'Đây chỉ là văn bản minh họa, chưa phải bản dịch văn học đã kiểm định.',empty:'Chưa xuất bản bản dịch trong ngôn ngữ này.',all:'Xem các bản có sẵn',copyright:'Kiểm tra nguồn và giấy phép trước khi tái sử dụng.',github:'Đóng góp qua GitHub',sample:'Bản minh họa'},
fr:{tag:'Une bibliothèque vivante du patrimoine littéraire',title:'La grande littérature. Toutes les langues.',intro:'Des textes littéraires accessibles, avec leurs sources, leurs licences et leur statut de vérification.',explore:'Explorer',works:'La collection',why:'Conçu pour durer',whytext:'JSON ouvert, identifiants stables, provenance et révision collective.',about:'À propos',read:'Lire',original:'Langue originale',feedback:'Proposer une correction',draft:'Texte de démonstration, non vérifié.',empty:'Aucune traduction publiée dans cette langue.',all:'Voir les éditions disponibles',copyright:'Vérifiez la source et la licence.',github:'Contribuer sur GitHub',sample:'Démonstration'},
es:{tag:'Una biblioteca viva del patrimonio literario',title:'Gran literatura. Todos los idiomas.',intro:'Textos literarios accesibles con fuentes, licencias y estados de revisión transparentes.',explore:'Explorar',works:'La colección',why:'Diseñado para generaciones',whytext:'JSON abierto, identificadores estables, procedencia y revisión comunitaria.',about:'Acerca de',read:'Leer',original:'Idioma original',feedback:'Sugerir una corrección',draft:'Texto de demostración; no es una traducción revisada.',empty:'No hay traducción publicada en este idioma.',all:'Ver ediciones disponibles',copyright:'Compruebe la fuente y la licencia.',github:'Contribuir en GitHub',sample:'Demostración'}
};

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
export const readableEditions = (id: string) => editionsForWork(id).filter(e => e.status === 'published' || e.status === 'sample');
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
