---
name: gh-pr-split
description: Split a large branch or mixed work into a sequence of concise, reviewable GitHub PRs (stacked or independent) using git and gh. Use when asked to break a big feature branch into smaller PRs, create a PR stack, separate unrelated changes, or reorganize existing commits before opening PRs.
---

# GitHub PR Split

## Overview

Turn one large branch into a clean set of small PRs with clear scope and testable behavior.

Prefer behavioral slices over file-type slices. Each PR should be easy to review in isolation and safe to merge independently (or as a stack when dependencies exist).

## Workflow

1. Confirm split constraints
   - Ask for `base` branch (default: repo default branch)
   - Ask for `stacked` vs `independent` PRs
   - Ask for target PR size (default: 150-400 changed lines)
   - Ask whether commit SHAs must be preserved

2. Inspect current branch
   - `git branch --show-current`
   - `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'`
   - `git fetch origin <base>`
   - `git log --oneline origin/<base>..HEAD`
   - `git diff --stat origin/<base>...HEAD`

3. Draft a split plan before changing history
   - Produce a numbered PR plan with: branch name, purpose, dependency, test plan
   - Keep each PR focused on one user-visible behavior or one infrastructure change
   - Identify ordering constraints explicitly

4. Build branches
   - If work is already commit-separated:
     - Reorder/squash with `git rebase -i origin/<base>` if needed
     - For stacked PRs, create each branch from the previous slice branch (first branch from `origin/<base>`)
     - For independent PRs, create each branch from `origin/<base>`
     - Move only the intended commits with `git cherry-pick <sha...>`
   - If work is tangled:
     - Create a temporary safety branch from current HEAD
     - For each target PR branch, create branch from the correct parent:
       - Stacked: previous slice branch (or `origin/<base>` for first slice)
       - Independent: always `origin/<base>`
     - Pull only that slice from safety branch (`git restore -p --source <safety-branch> .`), then commit and run tests
     - Do not carry working-tree leftovers from one slice branch to the next

5. Validate each slice
   - Run relevant tests per branch
   - Check diff size and remove unrelated changes
   - Verify the branch builds and passes minimal quality gates
   - For independent PRs, verify branch scope against base before opening PR:
     - `git diff --name-status origin/<base>...HEAD`

6. Push and open PRs
   - Push each branch: `git push -u origin <branch>`
   - For stacked PRs, set each PR base to the previous branch
   - For independent PRs, set base to `<base>`
   - Use `gh pr create` with concise title/body and explicit dependency notes

7. Report stack
   - Return ordered PR list with:
     - PR number/link
     - base branch
     - merge order
     - known risks or follow-up cleanups

## PR quality rules

- Keep each PR single-purpose and reviewable in under ~15 minutes
- Avoid mixing refactors with behavior changes unless required
- Include tests for the observable behavior introduced by that PR
- State dependencies clearly in PR description: `Depends on #<pr-number>`
- If a slice cannot be tested independently, call it out and explain why

## Safety rules

- Avoid destructive commands (`reset --hard`, force push) unless explicitly requested
- Preserve original branch until all split PRs are opened
- If history rewrite is required, explain impact before executing
- Stop and ask when branch state is ambiguous or when changes appear unrelated

## Independent split example

- Goal: split one branch into three independent PRs (`pr-a`, `pr-b`, `pr-c`) on `<base>`
- `git switch -c safety/all-work HEAD`
- `git switch -c pr-a origin/<base>` -> restore only slice A from `safety/all-work` -> commit -> test
- `git switch -c pr-b origin/<base>` -> restore only slice B from `safety/all-work` -> commit -> test
- `git switch -c pr-c origin/<base>` -> restore only slice C from `safety/all-work` -> commit -> test
- Open all three PRs with base `<base>`

## Error handling

- If branch is not ahead of base, stop and report no split work needed
- If changes are too interleaved to split safely, propose a two-step path:
  1. land a pure refactor PR first
  2. land behavior PRs on top
- If tests are unavailable, state that explicitly in each PR body
