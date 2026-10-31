import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateAtlas} from '../scripts/validate-atlas.mjs';

const load = () => JSON.parse(readFileSync('research/translation-gap-atlas.json', 'utf8'));

test('Atlas covers at least 20 works in every compared language with linked evidence', () => {
  assert.deepEqual(validateAtlas(load()), []);
});
test('an empty web search cannot become a verified translation gap', () => {
  const atlas = load();
  atlas.works[0].target_assessments[1].classification = 'verified_gap';
  assert.ok(validateAtlas(atlas).some(error => /gap_verification/.test(error)));
});
test('catalog evidence cannot disappear behind a dangling reference', () => {
  const atlas = load();
  atlas.works[0].target_assessments[0].evidence_ids.push('not-a-real-source');
  assert.ok(validateAtlas(atlas).some(error => /Unknown evidence/.test(error)));
});
test('language coverage is checked per work, not only at atlas level', () => {
  const atlas = load();
  atlas.works[0].target_assessments[1].language = 'fr';
  assert.ok(validateAtlas(atlas).some(error => /target language/.test(error)));
});
test('bibliographic leads cannot be promoted into measured demand or committed reviewers', () => {
  const atlas = load();
  atlas.works[0].reader_interest.actual_reader_feedback_collected = true;
  atlas.works[0].editorial_cost.reviewer_capacity.confirmed_reviewers = 2;
  const errors = validateAtlas(atlas);
  assert.ok(errors.some(error => /observed feedback/.test(error)));
  assert.ok(errors.some(error => /commitments/.test(error)));
});
test('an inadequacy claim needs independent, edition-specific evidence', () => {
  const atlas = load();
  atlas.works[0].target_assessments[0].classification = 'existing_translation_independently_assessed_inadequate';
  assert.ok(validateAtlas(atlas).some(error => /independent_assessment/.test(error)));
});
