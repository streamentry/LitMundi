# ADR-0003: GitHub-owned authentication and feedback

Status: Accepted — 2026-10-31

## Decision
Use external GitHub issue creation and GitHub's own sign-in. Do not build site-owned OAuth, collect tokens or store user accounts. Report links contain work/edition/segment context. Any correction to canonical data requires reviewed PR.

## Tradeoffs
GitHub account is a barrier for nontechnical readers and GitHub itself can disappear. Future alternative contribution channels must be possible without changing corpus identifiers. Inline site-hosted comments are explicitly out of scope.
