# Corpus format v1
This directory is the durable source of truth. The Astro app is a replaceable presentation layer.

- `catalog/works.json`: immutable canonical work identifiers, authorship, edition manifest, rights/provenance.
- `catalog/languages.json`: BCP 47 language labels.
- `segments/<work-id>/<lang>.json`: one immutable segment key to UTF-8 plaintext value, inspired by SuttaCentral/Bilara.
- In the future, each edition SHOULD have its own edition ID and provenance record, independent of language; multiple translations in one language must coexist. See ADR-0002.
- Use NFC normalization, UTF-8, real Unicode punctuation and standard JSON.
- Published segment IDs MUST NOT be reused or renumbered. For corrections use new versioned commits; for structural splits use a migration map and redirects.
- Do not insert HTML into segment values. Render as escaped text.
- **Demo is intentionally not publishable**. This corpus sample only proves the interface. No work is represented as fully available or peer-reviewed.
- Before publication attach exact source edition metadata, jurisdiction-specific rights review, translator credits, license permissions, independent human verification, and a review log.
- Export corpus independently with `npm run export`. Long-term preservation cannot depend on Node or Astro.
