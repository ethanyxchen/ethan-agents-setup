---
name: pr-change-overview
description: >
  Analyze the changes in a GitHub pull request or the current branch diff and produce a high-level overview of what changed, how the change is structured, and which parts of the codebase moved. Include an ASCII diagram that highlights structural additions, removals, renames, moves, and major flow or dependency shifts. Use when the user asks for a PR summary, branch diff overview, change walkthrough, release-note style explanation of a PR, or a structural map of changed code. Do NOT use for a defect-focused code review unless the user explicitly asks for findings.
---

# PR Change Overview

You are explaining a change set, not performing a bug hunt.

## Principles
- Ground every claim in the actual diff, PR metadata, or nearby source files.
- Optimize for fast comprehension: intent first, structure second, detail last.
- Separate net-new behavior from code motion, renames, and reshaping.
- Call out uncertainty when the diff is too large or the comparison base is ambiguous.

## Workflow

### 1) Resolve the comparison target
- If the user gives a PR number or URL, prefer GitHub CLI:
  - `gh pr view <pr> --json number,title,body,baseRefName,headRefName,url`
  - `gh pr diff <pr> --name-only`
- If the current branch already has an open PR, use:
  - `gh pr view --json number,title,body,baseRefName,headRefName,url`
- Otherwise analyze the local branch diff against its merge-base with the default remote branch:
  - `git symbolic-ref refs/remotes/origin/HEAD`
  - `git merge-base HEAD <default-remote-branch>`
- If the default remote branch cannot be resolved, fall back to `main`, then `master`, and state the fallback explicitly.

### 2) Build the change map
- Capture the shape of the diff before reading files in detail:
  - `git diff --stat <base>...HEAD`
  - `git diff --name-status --find-renames <base>...HEAD`
  - `git diff --dirstat=files,0 <base>...HEAD`
  - `git diff --summary <base>...HEAD`
  - `git log --oneline <base>..HEAD`
- Identify:
  - added, deleted, and renamed paths
  - new or removed top-level directories
  - touched entrypoints, exported modules, routes, schemas, jobs, and configs
  - tests added or updated

### 3) Read for intent
- Read the PR title and body when available.
- Open only the files that explain the structure of the change:
  - manifests and workspace configs
  - entrypoints
  - public exports
  - moved or renamed modules
  - representative files from each changed subsystem
- For large PRs, cluster files by subsystem and sample the files that best explain each cluster.

### 4) Infer structural change
- Distinguish between:
  - user-visible behavior changes
  - internal refactors
  - module boundary shifts
  - tooling, build, or deployment changes
- Call out when a change is primarily code motion rather than new behavior.
- Note any new or removed seams: packages, services, layers, routes, queues, schemas, or ownership boundaries.

### 5) Produce the overview
Use this exact structure:

1. **What changed**
   - 2-4 sentences on the intent and outcome.
2. **Change areas**
   - Major themes with concrete scopes.
3. **Structural changes**
   - New, removed, moved, or rewired boundaries.
4. **ASCII diagram**
   - A compact structural diagram focused on changed nodes.
5. **Risk / follow-up**
   - Unknowns, rollout implications, migration edges, or testing gaps.
6. **Evidence**
   - Base/head refs and the key files or commands that supported the summary.

## Diagram rules
- Prefer a compact tree or flow diagram over a full repo map.
- Show only changed nodes and the immediate unchanged neighbors needed for context.
- Use these markers:
  - `+` added
  - `-` removed
  - `~` modified
  - `=>` moved or rewired
- If multiple areas changed independently, use two small diagrams instead of one wide one.
- If there is no meaningful structural change, say so and provide a minimal layer diagram anyway.

Example tree diff:

```text
repo
├── apps
│   ├── web
│   │   ├── ~ routes/account.ts
│   │   └── + routes/settings.ts
│   └── worker
│       └── + sync-users.ts
├── packages
│   ├── api-client
│   │   └── ~ index.ts
│   └── => auth -> identity
└── infra
    └── ~ ci.yml
```

Example flow diff:

```text
Before
Client -> web route -> auth service -> database

After
Client -> web route
               -> identity module
               -> audit queue
               -> database
```

## Guardrails
- Do not present speculation as fact.
- Do not turn the task into a bug review unless the user explicitly asks for findings.
- Do not dump a file list without synthesis.
- If the PR cannot be resolved from GitHub, continue with the local git diff and say so.
- Keep the final overview skimmable and structural rather than exhaustive.
