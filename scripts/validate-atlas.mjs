import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const schema = JSON.parse(fs.readFileSync(new URL('../research/translation-gap-atlas.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({allErrors: true, strict: true, strictRequired: false});
const validateSchema = ajv.compile(schema);
const bibliographicKinds = new Set(['library_catalog', 'national_library_catalog', 'national_bibliography', 'institutional_bibliography']);

/** Mechanical evidence checks cannot certify absence, scholarly quality or legal rights. */
export function validateAtlas(atlas) {
  if (!validateSchema(atlas)) return validateSchema.errors.map(error => `${error.instancePath || '/'} ${error.message}`);
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const sourceById = new Map();
  const validDate = value => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  check(validDate(atlas.researched_on), 'Invalid research date');
  for (const source of atlas.sources) {
    check(!sourceById.has(source.id), `Duplicate evidence ID ${source.id}`);
    sourceById.set(source.id, source);
    check(validDate(source.accessed_on), `Invalid evidence date ${source.id}`);
    check(source.accessed_on <= atlas.researched_on, `Evidence postdates research ${source.id}`);
    try { const url = new URL(source.url); check(['https:', 'http:'].includes(url.protocol), `Unsafe evidence URL ${source.id}`); }
    catch { errors.push(`Invalid evidence URL ${source.id}`); }
  }
  const languages = atlas.target_languages.map(language => language.code);
  check(new Set(languages).size === languages.length, 'Duplicate target language');
  const ids = new Set();
  const refs = (references, at) => references.forEach(id => check(sourceById.has(id), `Unknown evidence ${id} in ${at}`));
  refs(atlas.legal_evidence_ids, 'legal evidence');
  for (const work of atlas.works) {
    check(!ids.has(work.id), `Duplicate work ID ${work.id}`); ids.add(work.id);
    const assessed = work.target_assessments.map(target => target.language);
    check(new Set(assessed).size === assessed.length, `Duplicate target assessment ${work.id}`);
    check(languages.length === assessed.length && languages.every(language => assessed.includes(language)), `Missing or unexpected target language ${work.id}`);
    refs(work.original_source.evidence_ids, work.id);
    refs(work.rights_screen.evidence_ids, work.id);
    refs(work.reader_interest.evidence_ids, work.id);
    const [lower, upper] = work.editorial_cost.estimated_human_hours;
    check(lower <= upper, `Reversed editorial estimate ${work.id}`);
    if (work.editorial_cost.reviewer_capacity.status === 'unverified') check(work.editorial_cost.reviewer_capacity.confirmed_reviewers === 0, `Unverified reviewer capacity cannot claim commitments ${work.id}`);
    if (work.reader_interest.status === 'unvalidated_for_litmundi') check(!work.reader_interest.actual_reader_feedback_collected, `Unvalidated reader interest cannot claim observed feedback ${work.id}`);
    for (const target of work.target_assessments) {
      refs(target.evidence_ids, `${work.id}/${target.language}`);
      for (const edition of target.existing_editions) refs(edition.evidence_ids, edition.title);
      for (const search of target.searches) {
        check(validDate(search.searched_on), `Invalid search date ${work.id}`);
        check(search.searched_on <= atlas.researched_on, `Search postdates research ${work.id}`);
      }
      if (target.classification === 'translation_found') {
        check(target.existing_editions.length > 0, `Translation found without named edition ${work.id}/${target.language}`);
        check(target.evidence_ids.length > 0, `Translation found without evidence ${work.id}/${target.language}`);
      }
      if (target.classification === 'verified_gap') {
        refs(target.gap_verification.bibliographic_source_ids, `${work.id} gap verification`);
        check(target.gap_verification.bibliographic_source_ids.every(id => bibliographicKinds.has(sourceById.get(id)?.kind)), `Verified gap requires bibliographic evidence ${work.id}`);
        check(target.searches.some(search => search.method !== 'web_index_search'), `Web-index results alone cannot verify a gap ${work.id}`);
      }
    }
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const atlas = JSON.parse(fs.readFileSync(new URL('../research/translation-gap-atlas.json', import.meta.url), 'utf8'));
  const errors = validateAtlas(atlas);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`Atlas valid: ${atlas.works.length} works, ${atlas.works.reduce((sum, work) => sum + work.target_assessments.length, 0)} work-language assessments, ${atlas.sources.length} evidence records. Literary gaps and demand remain subject to human verification.`);
}
