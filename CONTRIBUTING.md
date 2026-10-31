# Contributing
All languages and cultures are welcome. Use respectful, evidence-based discussion.

## Report a translation concern
1. Open a passage and select the pencil icon, or open [a correction issue](https://github.com/streamentry/LitMundi/issues/new/choose).
2. Provide work ID, edition language, stable passage ID, current wording, proposed wording, source citation, and rationale.
3. Please do not paste copyrighted third-party translations without permission.
4. A maintainer triages the report; domain experts validate; changes go through reviewable PRs. GitHub sign-in is required by GitHub, not LitMundi.

## Add an edition
1. Verify source bibliographic identity and rights for intended countries.
2. Open a translation-proposal issue and attach translation-gap evidence.
3. Supply provenance and a human-review plan. Obtain written contributor permission for the chosen content license.
4. Create an edition record with a globally unique ID in `corpus/catalog/editions.json`, UTF-8 aligned segment file under `corpus/segments/<work-id>/<edition-id>.json`, and the explicit translation alignment file. Never renumber published IDs. Do not invent missing text.
5. Run `npm run validate && npm test && npm run build`.
6. Submit a PR with source citations, change log, and editorial reviewers.

## Editorial rules
Preserve ambiguity, register, names, punctuation and structure unless there is a documented reason to change them. AI output is a draft, never evidence of accuracy. Maintain a glossary for recurring terms. No edition goes live solely from model self-review. Translation publication is blocked until at least two distinct qualified bilingual reviewers, explicit author/editor consent and a lawful content license are recorded. Record disagreements, not just the final reading. Corrections to existing translations must preserve source rights and attribution.

## Scope
Avoid bulk-generated low-value pages; add a work when genuine demand, rights and verification capacity are demonstrated.
