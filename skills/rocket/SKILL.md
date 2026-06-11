---
name: rocket
description: "Guides a disciplined agentic coding workflow: clarify the goal, inspect the codebase, plan, test first when behavior changes, implement, validate, review, and commit or prepare a PR. Use for non-trivial coding tasks, feature work, bug fixes beyond a few lines, refactors, or when the user invokes /rocket or asks for the coding workflow."
---

# Agentic Coding Workflow

Use this workflow to make code changes with scoped intent, local evidence, and a clean handoff.

## Sequence

Run these steps in order, scaling the depth to the risk and size of the change.

1. **Clarify** - identify the user's goal, constraints, expected behavior, and definition of done. Prefer quick discovery reads over asking questions. Ask only when a missing answer would make the work risky or ambiguous.
2. **Map** - inspect the current git state, relevant files, tests, package scripts, entry points, and neighboring patterns. Preserve unrelated user changes.
3. **Plan** - for non-trivial work, state a concise implementation and validation plan. Split mixed concerns before editing when the work would otherwise become hard to review.
4. **Test first** - when logic or behavior changes, add or update the smallest useful regression test before implementation. For UI, config, docs, or wiring changes, choose the strongest relevant validation instead.
5. **Implement** - make the smallest coherent change that fits the existing architecture. Prefer existing abstractions, one source of truth, derived data over stored duplicates, and narrow public surfaces.
6. **Validate** - run targeted tests first, then lint, typecheck, build, smoke checks, or other repository checks as appropriate. Fix failures and rerun the failed check. If validation is impossible, record the exact blocker.
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
