# Phase 20: Tool & Resource Quality - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve MCP server tool and resource quality so Claude Code can accurately select, invoke, and recover from errors across all tools and resources. Covers: English descriptions, isError flags, tool annotations, duplicate read-tool removal, and gap closures (resource ownership verification, consistent join patterns).

</domain>

<decisions>
## Implementation Decisions

### Read tool removal
- Remove all 7 duplicate read-only tools: list_clients, get_client, list_exercises, list_sessions, get_session, list_gyms, get_coach_summary
- Resources are the read mechanism, tools are for mutations only
- Only MCP client is Claude Code (no need to worry about other clients)
- No concern about workflow change — resources work fine for reading

### Claude's Discretion: filter tools
- list_sessions and list_exercises have filtering capabilities (by client/date/status, by tag) that simple resources may not cover
- Claude decides whether to move filters to resource URIs, keep them as query tools, or find another approach based on what MCP protocol supports

### Description style & language
- All descriptions translated from Italian to English
- Rich descriptions following MCP best practices: what it does + when to use it + what it returns
- Same rich format for both tools and resources (consistency)
- Include cross-references between related tools/resources (e.g., create_session mentions where to get client_id from)
- Parameter descriptions also get richer treatment: format hints, constraints, usage context (not just Italian-to-English translation)

### Error response format
- All error responses include `isError: true` flag
- Guidance-rich error messages: what went wrong + suggestion for recovery (e.g., "Session abc123 not found. Use helix://sessions resource to find valid session IDs.")
- Ownership violations use distinct "access denied" message (not generic "not found")
- Include error categories for programmatic handling (e.g., 'not_found', 'access_denied', 'validation_error')
- Same error pattern for both tool and resource errors (consistency)

### Tool annotations
- delete_session: destructiveHint=true (irreversible, needs confirmation)
- remove_session_exercise: destructiveHint=true (irreversible, needs confirmation)
- complete_session: NOT destructive (normal workflow action, no friction)
- update_session, update_session_exercise: NOT destructive (normal CRUD)
- Create operations (create_session, create_training_plan, add_session_exercise, duplicate_session): NOT idempotent (calling twice creates duplicates)

### Claude's Discretion
- Exact annotation values for idempotentHint on update/complete operations
- How to structure the error category field in responses
- Whether to add openWorldHint or other MCP annotations beyond the three specified

</decisions>

<specifics>
## Specific Ideas

- Error message example style: "Session abc123 not found. Use helix://sessions resource to find valid session IDs."
- Description example style: "Creates a new training session for a client. Use when planning a new workout. Returns the created session with its ID, ready for adding exercises."
- Cross-reference in descriptions: mention which resources to use to discover valid IDs for required parameters

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-tool-resource-quality*
*Context gathered: 2026-02-24*
