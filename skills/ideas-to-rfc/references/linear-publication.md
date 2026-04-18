# Publishing an RFC to Linear

Read this file only when the user wants the RFC published in Linear.

## Goal

Create a reviewable Linear document in the `RFCs` project without losing the full RFC markdown.

## Workflow

1. Confirm tool availability
- Check whether Linear MCP tools are exposed in the current session.
- If not, stop after producing the markdown RFC and tell the user that the Linear MCP server is not installed, not connected, or not exposed to the session.
- Confirm that the available Linear tools can create a document, not just read or search documents.

2. Build destination context
- Identify the workspace, team, project, and any RFC-specific conventions.
- Default to the `RFCs` project unless the user explicitly asks for another project.
- Reuse an existing RFC project, label, or issue type when the workspace already has one.
- Ask only for the smallest missing identifier that cannot be inferred safely.

3. Create the Linear record
- Preferred record type: document
- Preferred title: `RFC: <Title>`
- Preferred project: `RFCs`
- Preferred body:
  - The full RFC markdown
  - A short opening summary if the Linear document format benefits from one
- If the current Linear MCP session supports document creation, create the document directly in `RFCs`.
- If the current session does not support document creation, do not create an issue as a silent fallback. Tell the user what capability is missing and wait for direction.

4. Add collaboration details
- If a dedicated `linear` skill is available in the session, use it for the publication step.
- Reuse an existing `rfc` label if present.
- Only create labels or change workflow state if the user asked or the team conventions are already clear.
- Put unresolved questions at the end of the document so reviewers know where to focus.

5. Report back
- Return the created document identifier and link.
- Note that the full RFC content was stored in the document body.
- Call out any skipped step caused by missing permissions, missing identifiers, or missing MCP tools.

## Notes

- Some Linear MCP setups expose issue and comment operations but not document creation. In that case, report the limitation explicitly. Only fall back to an issue or comment if the user asks for that alternative.
- Do not claim publication succeeded until the create call returns successfully.
- If the `RFCs` project cannot be found, ask for the correct project identifier instead of guessing.
