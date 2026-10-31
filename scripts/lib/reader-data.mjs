/** Pure reader rules shared by the static site and regression tests. */
export function isPublicEdition(edition, work) {
  return Boolean(work?.visibility === 'public' && edition?.status === 'published' && edition.content_path);
}

export function preferredEdition(editions, locale, originalLanguage) {
  const published = editions.filter(e => e.status === 'published' && e.content_path);
  return published.find(e => e.language === locale) ??
    published.find(e => e.kind === 'source' && e.language === originalLanguage) ?? published[0] ?? null;
}

export function normalizeQuery(value) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLocaleLowerCase().trim();
}

/**
 * Alignment is explicit, never inferred by array position. A group may contain
 * multiple passages on either side; every passage must occur exactly once.
 * Refuse incomplete graphs instead of silently displaying misleading pairs.
 */
export function alignedPassages(sourcePassages, targetPassages, alignment) {
  const source = new Map(sourcePassages), target = new Map(targetPassages);
  const sourceSeen = new Set(), targetSeen = new Set();
  if (!Array.isArray(alignment?.links) || !alignment.links.length) throw new Error('Missing passage alignment');
  const rows = alignment.links.map(link => {
    const side = (ids, texts, seen) => {
      if (!Array.isArray(ids) || !ids.length) throw new Error('Empty alignment group');
      return ids.map(id => {
        if (!texts.has(id) || seen.has(id)) throw new Error('Unknown or repeated aligned passage: ' + id);
        seen.add(id);
        return [id, texts.get(id)];
      });
    };
    return { source: side(link.source, source, sourceSeen), target: side(link.target, target, targetSeen) };
  });
  if (sourceSeen.size !== source.size || targetSeen.size !== target.size) throw new Error('Incomplete passage alignment');
  const positions = new Map(targetPassages.map(([id], index) => [id, index]));
  return rows.sort((a, b) => positions.get(a.target[0][0]) - positions.get(b.target[0][0]));
}
