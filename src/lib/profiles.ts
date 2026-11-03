import type {Locale} from './i18n';

/** Editorial profile for a work: introduction, themes, context and a verified public-domain illustration. */
type Localized<T> = {en: T; vi?: T; fr?: T; es?: T};
export interface Illustration {
  file: string; thumb: string; width: number; height: number; focus: string;
  alt: Localized<string>; caption: Localized<string>; depicts: 'text' | 'related' | 'period';
  creator: string; creator_died: number | null; created: string;
  source_url: string; license: string; credit: string; commons_title: string;
}
export interface Profile {
  work_id: string;
  tagline: Localized<string>; summary: Localized<string>;
  why_it_matters: Localized<string[]>; themes: Localized<string[]>;
  context: Localized<string>; reading_note: Localized<string>;
  key_facts: {label: Localized<string>; value: Localized<string>}[];
  sources: string[]; illustration: Illustration | null;
}

const modules = import.meta.glob('../../corpus/catalog/profiles/*.json', {eager: true, import: 'default'}) as Record<string, Profile>;
const byWork = new Map(Object.values(modules).map(profile => [profile.work_id, profile]));
export const profileFor = (workId: string): Profile | null => byWork.get(workId) ?? null;

/** Text in the reader's language, or its English fallback with an honest language label. */
export function localized<T>(value: Localized<T> | undefined, lang: Locale): {value: T; language: string} | null {
  if (!value) return null;
  const chosen = value[lang];
  return chosen !== undefined ? {value: chosen, language: lang} : {value: value.en, language: 'en'};
}

/** Reading time in whole minutes from the edition's own text. */
export function readingMinutes(passages: [string, string][], language: string): number {
  const text = passages.map(([, passage]) => passage).join(' ');
  const cjk = language === 'ja' || language === 'zh';
  const units = cjk ? [...text].filter(character => !/\s/.test(character)).length : text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(units / (cjk ? 500 : language === 'vi' ? 220 : 240)));
}

/** "7 min read" / "11 h 37 min read" in the reader's language. */
export function readingLabel(minutes: number, ui: {hourUnit: string; minuteUnit: string; readSuffix: string}): string {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return (hours > 0 ? hours + ' ' + ui.hourUnit + (rest ? ' ' + rest + ' ' + ui.minuteUnit : '') : minutes + ' ' + ui.minuteUnit) + ui.readSuffix;
}
