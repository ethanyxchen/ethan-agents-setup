---
name: report
description: Create brief, informative, reproducible bug reports or Linear tickets. Use when the user asks to file, create, write, or update a bug report, issue, ticket, Linear issue, defect report, or reproduction report.
---

# Report

## Bug Report Standard

Keep bug reports short enough to scan, but complete enough for another engineer to reproduce.

Include:

- a concise title naming the broken behavior
- the observed behavior
- expected behavior
- reproducible steps
- relevant environment or scope when known
- supporting evidence only when it changes triage or reproduction

Avoid:

- long investigation narratives
- raw logs unless a short excerpt is necessary
- speculative root cause unless clearly marked as a hypothesis
- secrets, credentials, private tokens, or unnecessary sensitive content

## Linear Ticket Handling

When the user passes a Linear URL, issue identifier, or hyperlink:

1. Inspect the referenced ticket before creating a new one when Linear tools are available.
2. Use that ticket directly when it is empty, placeholder-like, or already matches the same bug.
3. Create a new child ticket when the referenced ticket is a parent feature, project slice, epic, or broader tracking ticket.
4. Copy team, project, priority, and relevant labels from the referenced ticket when they fit the bug.
5. Keep the relationship explicit by setting the referenced ticket as `parentId` for the new ticket.

If Linear tools are unavailable, draft the report and state how the passed ticket should be used.

## Description Shape

Use this structure by default:

```markdown
## Bug

<one or two sentences describing what breaks and when>

## Repro

1. <first required step>
2. <next step>
3. <observe failure>

## Expected

<one sentence>
```

Add `## Notes` only for short, material evidence such as model name, browser/app version, failing endpoint, or a known workaround.

## Filing Rules

Prefer a new ticket over expanding a parent feature ticket when the report describes a concrete defect. Keep parent tickets clean and use child tickets for reproducible bugs.

Use `Bug` as the label when labels are available. Preserve the user's requested priority; otherwise infer from severity and parent context without overstating impact.
