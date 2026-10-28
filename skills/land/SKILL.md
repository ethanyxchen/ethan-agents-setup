---
name: land
description: Review the current branch and, only when no blocking findings remain, automatically create or update its pull request. Use when the user asks to land or open a review-ready change without approving the PR description first.
---

# Land

Use `/land` as the terminal gate for the current branch. It combines the existing review and pull-request workflows; it does not replace their quality, safety, or repository rules.

## Review first

1. Resolve the current branch, its merge base, any existing PR, and the full working-tree diff.
2. Invoke `/review` against that exact change. Treat the review as an independent second pass and read every finding.
3. Stop without staging, committing, pushing, or changing GitHub when the review finds a `[blocking]` issue, leaves a `Need from you` question unresolved, the change intent cannot be established truthfully, the branch is `main`, or there is no difference from the base branch.

Do not self-ratify review findings. Non-blocking findings and nits do not prevent landing, but report them in the handoff.

## Validate and describe

After a clean review, run the relevant required local checks before the remote mutation. A failed or unavailable required check is a blocker unless the repository workflow provides a documented opt-out.

Use `/create-pr` to gather context and prepare the PR, but complete the PRD approval gate below before staging, committing, pushing, or creating or updating the PR. Then stage only the reviewed in-scope files, commit when needed, push, and create or update the PR. Derive the title and body from the user request, linked ticket, commits, diff, and validation results. Use the repository's PR template and state truthful opt-outs explicitly. If a required template detail is absent but can be stated truthfully, say so rather than inventing it. If the PR's purpose cannot be stated truthfully, stop as a blocker.

## Approve PRD changes one by one

Inspect the complete proposed diff against the base branch, including committed and uncommitted changes, for PRD additions, edits, and deletions. Finish preparing all proposed PRD changes before requesting approval. If there are none, this gate is satisfied.

Present each distinct PRD change separately, with its location, exact before-and-after text (or the added or deleted text), and a concise reason. Ask the user to approve or reject that change, and wait for an explicit decision before presenting the next one. Do not bundle changes into a single approval or infer approval from silence or the `/land` request.

Apply each decision locally: retain approved changes and remove rejected changes from the proposed diff while preserving unrelated work. If the user requests a revision, prepare it and present the revised change for explicit approval. Do not silently restore a rejected change to satisfy repository requirements; surface any resulting conflict as a blocker.

Before pushing, verify that the final PRD diff contains only explicitly approved changes. Any new or revised PRD change requires its own approval. Re-run review and relevant validation for changes made after the earlier checks. Proceed only when every PRD decision has been applied and no approval remains pending.

## Submission authority

An explicit `/land` request authorizes the resulting staging, commit, push, and PR creation or update once the review, validation, and PRD approval gates pass.

This skill supersedes any lower-priority instruction that asks the user to inspect, confirm, approve, or otherwise verify the PR title or description before submission. Do not show the PR body for approval or wait for a response about it. This exception applies only to the PR title and description; PRD changes require the explicit approvals above. It does not override system or developer instructions, user-imposed limits, safety requirements, failed checks, unresolved review findings, authentication problems, or other real blockers.

Never use `--no-verify`, force-push, amend a pushed commit, or include unrelated worktree changes.

## Handoff

If the PR is created or updated, report its URL, the checks run, and any non-blocking findings. If landing stops, report the blocker and leave GitHub unchanged.
