---
name: create-worktree
description: Create a new sibling Git worktree with the local `wt` CLI when the user explicitly requests one.
---

# Create worktree

Use this skill only when the user explicitly asks to create a worktree. Do not create or reattach a worktree as task setup.

Run `wt add <branch>` from the provided repository checkout. Use `--base <branch>` or `--path <path>` only when the user specifies an alternative.

Before creating it, inspect the destination with `wt help add` and confirm the current checkout is a Git repository. The default destination is a sibling directory named `<repo>-<branch>`, with `/` in the branch name replaced by `-`. The default base is the remote's `HEAD` branch.

With an explicit `--base <branch>`, `wt add` uses `refs/heads/<branch>` when that local branch exists, including unpushed commits, without fetching. Otherwise it fetches the branch from the selected remote. Without `--base`, it fetches the remote's default branch, even if a local branch has the same name.

When the user asks to base the new worktree on the current checkout, pass its current branch name with `--base`. This includes committed changes only; uncommitted changes are not copied. Confirm the new worktree's HEAD matches the requested local base commit.

The helper symlinks existing root `.env` and `.env.*` files into the new worktree. Do not inspect or expose their contents.

Report the created worktree path. Do not install dependencies, launch an app, or begin work in the new checkout unless the user separately asks.
