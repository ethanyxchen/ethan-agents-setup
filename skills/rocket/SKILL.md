---
name: rocket
description: "Guides a disciplined agentic coding workflow: Ticket, Grill, Plan, TDD, Implement, Self-validation, Review, and Handoff. Use for non-trivial coding tasks, feature work, bug fixes beyond a few lines, refactors, or when the user invokes /rocket or asks for the coding workflow."
---

# Agentic Coding Workflow

Use this workflow to make code changes with scoped intent, local evidence, and a clean handoff.

## Sequence

Run these stages in order, scaling the depth to the risk and size of the change.

1. **Ticket** - anchor the work in a clear task statement: problem, desired outcome, scope, constraints, and definition of done. If no external issue exists, derive a concise local ticket from the user's request before expanding scope.
2. **Grill** - pressure-test the idea before editing. Inspect the codebase, identify the real design choices, challenge weak assumptions, and converge on the simplest coherent approach. Skip only for truly trivial changes.
3. **Plan** - turn the chosen approach into implementation slices and validation steps. Split mixed concerns before editing when the work would otherwise become hard to review.
4. **TDD** - when logic or behavior changes, add or update the smallest useful failing regression test before implementation. For UI, config, docs, or wiring changes, name the validation that replaces a test-first loop.
5. **Implement** - make the smallest coherent change that fits the existing architecture. Prefer existing abstractions, one source of truth, derived data over stored duplicates, and narrow public surfaces.
6. **Self-validation** - run targeted tests first, then lint, typecheck, build, smoke checks, or other repository checks as appropriate. Fix failures and rerun the failed check. If validation is impossible, record the exact blocker.
7. **Review** - read the full diff as the author. Check correctness, simplicity, error handling, security, performance, user-owned changes, and test coverage.
8. **Handoff** - summarize what changed and what passed. When commits or PRs are expected, stage only task-related files and use a clear message.

## Operating Rules

- Read before editing.
- Keep changes atomic and reviewable.
- Do not overwrite changes you did not make.
- Do not invent compatibility layers unless the user explicitly asks or an external contract requires them.
- Prefer removing complexity over adding structure; add an abstraction only when it reduces real duplication or meaningful complexity.
- Make skipped validation explicit with `No useful local check: <reason>` or `Validation blocked: <reason>`.
- End with the concrete result, the checks run, and any residual risk.

## Commit Discipline

- Commit only when the user, repo instructions, or workflow requires it.
- Stage explicit files, never broad unrelated changes.
- Keep one logical change per commit.
- Use the commit body only when it adds useful intent or validation context.
