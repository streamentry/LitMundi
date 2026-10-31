# ADR-0001: Static corpus first

Status: Accepted — 2026-10-31

## Context
Literary content must outlive web frameworks, providers and databases; hosting costs should remain low.

## Decision
Use plain UTF-8 JSON as the canonical corpus. Generate HTML via Astro static mode. Serve statically without a runtime database or mutable backend.

## Consequences
Excellent portability and low attack surface; publishing is PR/build-based, not real-time. Add separate APIs only when evidence demands them.
