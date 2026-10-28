---
name: compare-summaries-with-html
description: Generate a private, rendered-HTML side-by-side comparison of summary outputs from exactly two Langfuse experiment runs. Use when reviewing per-item summary changes, not aggregate benchmark metrics.
---

# Compare Summaries With HTML

Use this skill only when the requester has authorized access to the raw summary outputs. Those outputs can contain private meeting content. Do not commit them, print them to the terminal, or include them in a ticket, PR, or chat response.

Run the bundled script from the repository root. The output path must be absolute and outside the repository.

```bash
mise exec -- node \
  .agents/skills/compare-summaries-with-html/scripts/compare-summaries-with-html.mjs \
  --dataset <dataset-name> \
  --baseline-run <baseline-run-name> \
  --candidate-run <candidate-run-name> \
  --output /tmp/<comparison-name>.html
```

Optional `--baseline-label` and `--candidate-label` replace the report column headings. The script reads `LANGFUSE_BASE_URL`, `LANGFUSE_PUBLIC_KEY`, and `LANGFUSE_SECRET_KEY`; never print their values. If configuration or an API request fails, report only the missing variable names or HTTP status.

The report pairs the two runs by dataset item ID and refuses to render a partial or mismatched comparison. It contains only run metadata and rendered summary outputs—never transcript inputs, scores, or credentials. It is self-contained, uses no client-side network requests, and collapses to one readable column on narrow screens.

Preserve Markdown list hierarchy: indented bullets must render as nested lists inside their parent list item, including mixed ordered and unordered lists. Do not strip indentation or flatten supporting details into sibling bullets. Apply this requirement to any combined report built from the skill's renderer.

Before handing over a report, compare source nested-list counts with the generated HTML hierarchy without printing summary text. If source summaries have sub-bullets but the HTML has no nested list items, fix the rendering and regenerate the report. When changing the renderer, run `mise exec -- pnpm test:compare-summaries-with-html`; retain regression coverage for child and grandchild bullets, sibling transitions, and mixed list types.

Return the output path and pair count. Do not reproduce summaries in the response.
