# Phase 7: MCP Template Integration - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend helix-mcp Edge Function with resources and tools for group templates, enabling AI clients (Claude Desktop, Cursor) to read, create, modify, and apply templates. This builds on the existing MCP infrastructure (17 resources, 10 tools, 4 prompts).

</domain>

<decisions>
## Implementation Decisions

### Resource Data Shape
- Template list (`helix://group-templates`): Full preview — id, name, exercise_count, created_at, updated_at, plus first 3 exercise names
- Template detail (`helix://group-templates/{id}`): Full exercise data — include tags, description, lumio_card_id for each exercise

### Tool Behavior
- `apply_template_to_session`: Exercises are **linked** (keep template_id FK), same as UI
- Apply mode: **Required parameter** — tool requires `mode: 'append' | 'replace'` to handle existing exercises
- Delete behavior: **Match UI** — follow Phase 6 implementation (ON DELETE RESTRICT, block if in use)

### Error Handling
- Error verbosity: **Match existing MCP** — follow the error style of current helix-mcp tools
- No rate limiting or bulk operation limits — trust the AI client

### Prompt Templates
- Enhance `plan-session`: Make it **aware of templates** — suggest available templates when planning sessions
- Add `template-analysis` prompt: For reviewing which templates are used most
- Language: **Match existing** — follow whatever language the current prompts use

### Claude's Discretion
- Lumio content in template detail: Decide based on implementation simplicity (inline vs separate resource)
- Usage stats in templates: Evaluate if easy to implement (times_applied count)
- `update_group_template` scope: Choose whether to allow full update or name-only
- Invalid exercise errors: Decide whether to suggest alternatives
- Validation error detail: Follow existing MCP patterns
- Create-template prompt: Evaluate if useful to add

</decisions>

<specifics>
## Specific Ideas

- Template list should show a preview of first 3 exercises so AI can quickly understand what each template contains
- Apply mode parameter ensures AI explicitly chooses how to handle existing exercises (no accidental overwrites)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-mcp-template-integration*
*Context gathered: 2026-02-02*
