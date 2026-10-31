# ADR-0002: Durable passage and edition identity

Status: Proposed — 2026-10-31

## Context
SuttaCentral/Bilara uses stable segment keys to align cognate text and translations. Literature has competing critical editions, line breaks and translations that do not map one-to-one.

## Decision
Use stable, opaque canonical work IDs and passage IDs; permit multiple independent, identified editions per language. Maintain source-edition identity, exact provenance, text alignment graphs, and explicit migration/deprecation maps. The current MVP still keys its single sample edition by language; **do not publish real translations until the schema is upgraded**.

## Consequences
Additional metadata complexity in return for scholarly correctness and permanent references.
