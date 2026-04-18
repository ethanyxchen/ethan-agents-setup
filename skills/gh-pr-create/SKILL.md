---
name: gh-pr-create
description: Create GitHub pull requests with gh by learning the author's recent PR template, analyzing the current branch commits and diff, then generating and creating a PR. Use when asked to create a PR, draft PR text, or ensure the PR matches repository patterns.
---

# Github PR Create

## Overview

Generate and create a GitHub PR from the current branch using the gh CLI while matching the author's recent PR structure, tone, and labels.

## Workflow

1. Detect recent PR pattern
   - Run `gh pr list --author @me --state all --limit 5 --json title,body,labels`
   - Extract section order, headings, formatting, boilerplate, and label usage
   - If no PRs exist, search for templates in `.github/PULL_REQUEST_TEMPLATE.md` or similar files

2. Analyze current branch
   - Determine branch name with `git branch --show-current`
   - Identify base branch with `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'`
   - Fetch latest remote state with `git fetch origin <base>`
   - Collect commits with `git log origin/<base>..HEAD`
   - Summarize changes with `git diff origin/<base>...HEAD --stat`
   - Infer intent from branch name and commit messages

3. Draft PR content
   - Follow the observed template exactly
   - Preserve all hidden HTML markers (`<!-- -->`) from the template
   - Fill all sections with accurate details from commits and diff
   - Mention tests that were run; if none, explicitly state not run
   - Reference issues if branch name or commits include IDs

4. Create PR
   - Show the drafted content to the user and asking for final confirmation unless explicitly asked not to.
   - Use `gh pr create` with `--title`, `--body-file` (via process substitution), `--base`, `--label`, and `--draft` if applicable
   - Example:
     ```bash
     gh pr create --title "PR TITLE" --base main --body-file <(cat <<'EOF'
     PR BODY
     EOF
     )
     ```

5. Report results
   - After creation of the PR, report the PR URL immediately
   - If pattern mismatches exist, call them out briefly

## Quality checks

- Ensure PR body renders correctly in GitHub markdown
- Ensure no empty sections or placeholder text
- Ensure technical details align with the actual diff

## Error handling

- If the branch has no commits ahead of base, stop and inform the user
- If gh is not authenticated, provide steps to authenticate
- If base branch cannot be determined, ask the user to specify
- If required tooling is missing, state the missing command

## Constraints

- Use gh for GitHub operations
- Use git for local branch and diff analysis
- Be extremely concise; prioritize brevity over grammar
