# ADR-0006: Weighted literary quality rubric and evidence-backed release gate

Status: **Accepted** — 2026-10-31

## Context
An undifferentiated “AI translated” label makes no testable claim about literary fidelity. Model self-review is correlated with model generation and cannot establish independent publication quality.

## Decision
Use the published, versioned rubric `litmundi-literary-v1` with five weighted dimensions (35/25/15/15/10). Both independent qualified human assessors must individually reach 9.0/10; fidelity ≥9.0; no other dimension <8.0; no unresolved major/critical issue; full-text coverage; SHA-256 binding to exact source and translation versions; explicit rights clearance and consent. AI preflight is advisory and has zero approval authority.

Publication requires changing the edition to `published` in a reviewed PR; the production validator refuses publishing without all structured evidence. After merge, GitHub Actions deploys automatically.

## Limits
CI cannot verify that a GitHub handle belongs to the named literary expert, that a reviewer is truly independent, that rights evidence is legally sufficient, or that a 9/10 numerical rating captures all literary qualities. Maintainers must validate these through the PR and documented governance. A score is a necessary threshold, not a sufficient substitute for judgement.

## Alternatives rejected
- Automatically declaring model-generated output “human approved” when an LLM assigns 9.
- Averaging a low reviewer score with a high score.
- Letting one critical misreading be compensated by grammar or typography.
- Reusing a previous score after the translation changes.
