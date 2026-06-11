---
name: rocket
description: Orchestrates the Rocket Tortoise change workflow (Grill → Issue → TDD → Implement → Self-Validate → Qualitron Coverage → Review → PR). Use when starting any non-trivial change, adding a feature, fixing a bug beyond a few lines, or when the user invokes /rocket. Also use when the user mentions "the way we work", "onboarding workflow", or asks how to ship a change in this repo.
---

# The way we work

Operating agreement for changes in this repo. The authoritative source is [ONBOARDING.md](../../../ONBOARDING.md); this skill drives the sequence.

## Sequence

Run these in order. At each step, name the opt-out in the eventual PR description if you skip — silent skips are the failure mode.

0. **Ticket** — every change starts from a Linear ticket. If none is linked, ask the user whether to create one, and draft it from what they provided — do not expand the scope yet.
1. **Grill** — invoke `/grill-with-docs`. Reach a shared design concept before writing code. Skip only for genuinely trivial work that needs no design decision from a human; record `Skipped grill: <reason>` in the PR.
2. **Plan** — invoke `/to-issues`. Add fine-grained detail to the ticket, including the self-validation method for each implementation slice. Break mixed-concern issues into sub-issues or separate issues first.
3. **TDD** — invoke `/tdd` for any change that adds or modifies **logic** (see Appendix A in ONBOARDING.md). UI, wiring, and config may carve out — name the carve-out in the PR.
4. **Implement** — interface first, body delegated. Stay in the ubiquitous language of the module's `CONTEXT.md`. Update `CONTEXT.md` in the same diff when the interface or domain language shifts; `/grill-with-docs` writes those updates as the grill resolves.
5. **Self-Validation** — after implementation, derive a checklist from the Grill decisions, issue acceptance criteria, TDD tests, changed package scripts, and touched behavior. Run the strongest feasible local checks: targeted tests first, then typecheck/lint/package verification, contract/schema/codegen validation, or UI smoke/manual evidence. If a check fails, fix and rerun it. Record commands and results in the PR `Tests` section; if no useful local check exists, record `Self-validation opt-out: <reason>`, and if a check is blocked by local prerequisites, record `Self-validation blocked: <reason>`.
6. **Qualitron Coverage** — invoke `/qualitron-coverage` for non-trivial changes. Update runnable Qualitron cases, contract-backed coverage, or the coverage ledger where product behavior changed. When Qualitron harness or fixtures are required to cover the implementation, improve them where practical before marking coverage blocked; otherwise record `Qualitron Coverage opt-out: <reason>` in the PR.
7. **Review** — invoke `/review`. The author reads every line. AI review is supplementary signal, never a substitute.
8. **PR** — invoke `/create-pr` (plain `gh`), or the `graphite` skill (`gt`) for stacked PRs. Run `mise run verify:quick` before opening, and `mise run verify` on modified packages before requesting human review.

Note: **When PR approaching the 400-LOC cap, stop and ask** — split, stack, or opt-out. Do not compress code, drop comments, or collapse names to fit.

## Opt-outs are visible, not approval-gated

Treat every change as non-trivial by default. When a rule doesn't fit, write one line in the PR description:

- `Skipped grill: 3-line bug fix in known module`
- `No tests: pure UI tweak, manually verified on macOS`
- `Self-validation opt-out: docs-only wording change`
- `Self-validation blocked: local credentials unavailable for provider smoke test`
- `Qualitron Coverage opt-out: internal refactor with no product behavior change`
- `Over size cap: atomic rename across 12 files, splitting harms reviewability`

The author owns the reasoning. Auditable in retro.

## If you change these rules

Open a PR against `ONBOARDING.md` with the case in the description. No separate governance.
