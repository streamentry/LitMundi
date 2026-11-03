/**
 * Many works carry each section's own title as the first text unit ("I. Mở đầu", "STAVE ONE.").
 * Such a unit is shown as the section heading instead of a generic "Section N" label.
 * Conservative on purpose: short, no sentence punctuation, and either numbered or capitalised.
 */
export function sectionTitle(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.trim();
  if (t.length > 70 || /[\n“”‘’"«»—…!?;:,，、。！？]/.test(t)) return null;
  const periods = (t.match(/\./g) ?? []).length;
  if (periods > 1) return null;
  const trailing = /\.\s*$/.test(t);
  if (!trailing) return /^[\p{Lu}\d]/u.test(t) ? t : null;
  const numbered = /^[IVXLC\d]+\.\s/.test(t);
  const upper = t === t.toLocaleUpperCase() && /\p{L}/u.test(t);
  return numbered || upper ? t : null;
}
