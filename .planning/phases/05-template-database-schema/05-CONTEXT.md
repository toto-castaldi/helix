# Phase 5: Template Database Schema - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Database foundation for reusable group exercise templates. Creates tables for storing templates and their exercises, RLS policies for coach isolation, and TypeScript types. UI and MCP integration are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Template Parameters
- Store core parameters: sets, reps, weight_kg, duration_seconds (same as session_exercises)
- All parameters are optional — template can specify some, none, or all
- When applied to session, empty parameters stay null (coach can fill later)
- Include notes field — templates can have default notes per exercise, copied to session

### Template Metadata
- Template has name only (no description, no tags)
- Template names do NOT need to be unique — coach's responsibility
- Hard delete (no soft delete / archive)
- No limit on exercises per template
- Templates can be empty (name only, exercises added later)
- Free text for name (no validation rules)
- Templates are gym-agnostic (not tied to specific gym)

### Ordering & Grouping
- Use order_index integer (same pattern as session_exercises)
- No exercise grouping (supersets/circuits) — flat list only
- Same exercise CAN appear multiple times in a template (e.g., warm-up and main set)

### Template Scope
- Private to coach only (standard RLS with user_id)
- No system/default templates — coaches create all their own
- No versioning — edit in place (sessions have copied exercises anyway)
- Optional link: sessions CAN have nullable template_id for reference

### Claude's Discretion
- Whether last_used_at timestamp is useful (probably skip for simplicity)
- order_index strategy: contiguous (1,2,3) vs gapped (10,20,30)
- Any additional indexes for query performance

</decisions>

<specifics>
## Specific Ideas

- Pattern should match existing session_exercises table structure
- RLS policies should follow same pattern as other coach-owned tables (clients, sessions, gyms)
- TypeScript types should be generated and exported like existing types

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-template-database-schema*
*Context gathered: 2026-01-30*
