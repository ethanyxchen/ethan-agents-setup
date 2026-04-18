---
name: ideas-to-rfc
description: Turn rough ideas, brainstorming notes, meeting summaries, issue threads, and conversations with agents into structured RFCs. Use when the user wants a reviewable markdown RFC, needs help extracting decisions and tradeoffs from messy source material, or wants the RFC written to a local file. Keep the workflow portable so the same skill works in Codex and Claude Code.
---

# Ideas to RFC

Turn messy source material into a clean RFC that is ready for review. Draft immediately when the available context is enough; ask only for missing details that materially change the title, ownership, or scope.

## Portability

- Keep all required behavior in `SKILL.md` and `assets/`.
- Treat `agents/openai.yaml` as optional UI metadata for Codex, not as the only place where instructions live.
- Write instructions that remain valid in Codex and Claude Code, both of which can load this shared skill directory.

## Workflow

1. Collect source material
- Accept notes, chat transcripts, brainstorms, issue discussions, PRDs, design notes, or mixed fragments.
- Identify the proposal, the problem it solves, constraints, decisions already made, and open questions.

2. Normalize the content
- Separate firm decisions from speculation.
- Collapse repetitive back-and-forth into one concise statement per decision.
- Convert missing facts into `Assumption:` or `Open question:` callouts instead of inventing them.
- Collect only the assumptions that are explicitly grounded in the conversation or directly required to interpret it.
- Never use the assumptions list for metadata such as author names, participant names, or other facts outside the proposal discussion.

3. Draft the RFC
- Use `assets/rfc-template.md` as guidance for a common RFC shape, not as a strict schema.
- Rename, omit, reorder, or add sections whenever that makes the RFC clearer.
- Include only the sections that materially improve the document.
- Set the document title to `RFC: <Title>`.
- Keep `Status: Open for Comments` by default.
- Set `Date:` to the current date in ISO format.
- Set `Authors:` from the provided names. If authorship is unclear, use `TBD` instead of turning authorship into an assumption.
- If the RFC contains assumptions, place them inside the first main section of the document, typically as `### Assumptions` under `Context` or whatever section appears first.
- Add extra context subsections under section 1 only when they improve clarity.

4. Shape the RFC to fit the proposal
- When the standard sections are useful, use them well:
  - `1.1 Overview`: Summarize the proposal and expected outcome in 2-4 sentences.
  - `1.2 Problem Statement`: Explain the pain, risk, or opportunity that justifies the RFC.
  - `1.3 Goals`: List observable outcomes or constraints the proposal must satisfy.
  - `1.4 Non-Goals`: Define scope boundaries to keep review focused.
  - `1.5 Decision Summary`: State the recommended path directly. Include the key decisions without burying them in narrative.
  - `2. Rationale`: Explain why this approach wins, what alternatives were considered, and the tradeoffs.
  - `3. Design/Implementation`: Describe architecture, sequencing, migration, rollout, dependencies, and risks.
  - `4. Appendix`: Put supporting notes, links, raw source fragments, glossary items, or deeper examples here.
- Add sections such as `Open Questions`, `Risks`, `Alternatives Considered`, `Migration`, `Rollout`, or `Impact` when they fit better than the stock headings.
- Move assumptions out of later sections when possible and consolidate them under the first major section.
- `Comments`: Reserve this section for human reviewers. Do not populate it with agent-authored questions, analysis, or prompts. Leave it empty or omit it when the publication surface already provides comments.

5. Final check
- Ensure the document is an RFC, not just a cleaned-up transcript.
- Ensure the title begins with `RFC:`.
- If assumptions exist, ensure they appear early inside the first main section, not as a standalone preface and not scattered later in the document.
- Ensure the assumptions section contains only conversation-scoped assumptions, not authorship or unrelated metadata.
- Ensure every open question lives in the main body, `Appendix`, or a dedicated `Open Questions` section.
- If a `Comments` section is present, leave it for human reviewers.
- Ensure the decision summary, rationale, and design sections agree with each other.
- Keep the tone declarative, concise, and review-friendly.

## Working with weak or conflicting input

- Draft the RFC even when the source material is incomplete.
- Surface uncertainty explicitly.
- When multiple options are still live, recommend one path in `1.5 Decision Summary` and explain the remaining options in `2. Rationale`.
- If the user gives a transcript with long exploratory tangents, extract only the durable conclusions and move discarded branches to `Appendix` when they still matter.

## Resources

- Use `assets/rfc-template.md` as a guidance template for common RFC structure, not as a required skeleton.
