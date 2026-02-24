# Phase 20: Tool & Resource Quality - Research

**Researched:** 2026-02-24
**Domain:** MCP server tool/resource descriptions, error handling, annotations, and ownership verification
**Confidence:** HIGH

## Summary

Phase 20 is a quality-of-life overhaul of the MCP server's tool and resource definitions in a single file (`supabase/functions/helix-mcp/index.ts`, ~2500 lines). The work is entirely within this one Edge Function and involves no new libraries, no database migrations, and no frontend changes. The four requirements (TOOL-01 through TOOL-04) cover: translating all descriptions to English with rich MCP-style content, adding `isError: true` flags to all error responses, adding MCP tool annotations, and removing 7 duplicate read-only tools. Two integration gaps from the v1.6 audit must also be closed: ownership verification on `helix://clients/{id}/goals` and `helix://clients/{id}/sessions` resources, and fixing the `list_sessions` tool's inconsistent join pattern before removing it.

The MCP protocol specification (2025-03-26 and 2025-06-18) defines clear patterns for all of these: `isError: true` in tool result objects for execution errors, `ToolAnnotations` interface with `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint` booleans. The `annotations` field is placed at the top level of each tool definition alongside `name`, `description`, and `inputSchema`.

**Primary recommendation:** Execute TOOL-04 (remove read tools) first, then TOOL-01 (descriptions), then TOOL-02 (isError), then TOOL-03 (annotations), and finally the gap closures. This order avoids translating/annotating tools that will be deleted. The filter tools decision (list_sessions filtering, list_exercises tag filtering) should be resolved by adding resource URI templates rather than keeping query tools.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Remove all 7 duplicate read-only tools: list_clients, get_client, list_exercises, list_sessions, get_session, list_gyms, get_coach_summary
- Resources are the read mechanism, tools are for mutations only
- Only MCP client is Claude Code (no need to worry about other clients)
- No concern about workflow change -- resources work fine for reading
- All descriptions translated from Italian to English
- Rich descriptions following MCP best practices: what it does + when to use it + what it returns
- Same rich format for both tools and resources (consistency)
- Include cross-references between related tools/resources (e.g., create_session mentions where to get client_id from)
- Parameter descriptions also get richer treatment: format hints, constraints, usage context
- All error responses include `isError: true` flag
- Guidance-rich error messages: what went wrong + suggestion for recovery
- Ownership violations use distinct "access denied" message (not generic "not found")
- Include error categories for programmatic handling (e.g., 'not_found', 'access_denied', 'validation_error')
- Same error pattern for both tool and resource errors (consistency)
- delete_session: destructiveHint=true (irreversible, needs confirmation)
- remove_session_exercise: destructiveHint=true (irreversible, needs confirmation)
- complete_session: NOT destructive (normal workflow action, no friction)
- update_session, update_session_exercise: NOT destructive (normal CRUD)
- Create operations (create_session, create_training_plan, add_session_exercise, duplicate_session): NOT idempotent (calling twice creates duplicates)

### Claude's Discretion
- list_sessions and list_exercises have filtering capabilities that simple resources may not cover -- Claude decides whether to move filters to resource URIs, keep them as query tools, or find another approach
- Exact annotation values for idempotentHint on update/complete operations
- How to structure the error category field in responses
- Whether to add openWorldHint or other MCP annotations beyond the three specified

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TOOL-01 | All tool and resource descriptions translated to English | Current code has ~24 Italian description strings in tool/resource definitions, ~35+ Italian error strings, Italian field names in tool responses. Rich English descriptions follow MCP best practices pattern documented in spec. |
| TOOL-02 | Error responses include `isError: true` flag | MCP spec defines `isError: true` in CallToolResult object. Currently 0 occurrences of isError in codebase. ~45 error return paths in executeTool() need the flag. Resource errors thrown as exceptions need consistent pattern too. |
| TOOL-03 | Tool annotations added to all tools | MCP spec defines ToolAnnotations interface with readOnlyHint, destructiveHint, idempotentHint, openWorldHint. Currently 0 annotations in codebase. After read tool removal, 17 mutation tools need annotations. |
| TOOL-04 | Duplicate read-only tools removed | 7 read-only tools (list_clients, get_client, list_exercises, list_sessions, get_session, list_gyms, get_coach_summary) duplicate resource functionality. Lines ~262-335 (definitions) and ~992-1172 (handlers) to remove. |

**Integration gaps (from v1.6 audit, no REQ-ID):**
- `helix://clients/{id}/goals` resource (line 670-682) queries goal_history by client_id without verifying the client belongs to the coach
- `helix://clients/{id}/sessions` resource (line 684-703) queries sessions by client_id without verifying the client belongs to the coach
- `list_sessions` tool (line 1066-1106) uses soft join `client:clients(...)` + `.eq("clients.user_id", userId)` + post-filter instead of `clients!inner(...)` pattern used by all resource queries
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Edge Functions (Deno) | Current | Runtime for helix-mcp | Already in use, no changes needed |
| MCP Protocol | 2025-03-26 | Protocol version declared by server | Already set in Phase 19 |

### Supporting
No new libraries needed. This phase is pure refactoring of existing code within `index.ts`.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled error helper | MCP SDK error classes | SDK migration explicitly out of scope (REQUIREMENTS.md) |

**Installation:**
No installation needed -- no new dependencies.

## Architecture Patterns

### Recommended Project Structure
No structural changes. All work is within:
```
supabase/functions/helix-mcp/index.ts
```

### Pattern 1: Tool Error Response with isError Flag
**What:** Every tool execution error returns `isError: true` in the result object alongside content.
**When to use:** Any error path within `executeTool()` function.
**Example:**
```typescript
// Source: MCP spec 2025-06-18 - tools.mdx
// Current pattern (WRONG - no isError):
return { content: [{ type: "text", text: "Errore: Cliente non trovato" }] }

// Correct pattern:
return {
  content: [{ type: "text", text: "Client abc123 not found. Use helix://clients resource to find valid client IDs." }],
  isError: true,
}
```

### Pattern 2: Tool Annotations in Definition
**What:** Add `annotations` object to each tool definition with behavioral hints.
**When to use:** Every tool in `getToolDefinitions()`.
**Example:**
```typescript
// Source: MCP spec 2025-06-18 - schema.mdx (ToolAnnotations interface)
{
  name: "delete_session",
  description: "Permanently deletes a training session and all its exercises...",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: { ... },
}
```

### Pattern 3: Error Helper Function
**What:** Centralized error response builder to ensure consistent format across all tools.
**When to use:** Replace every ad-hoc error return in `executeTool()` and every `throw new Error()` in `readResource()`.
**Example:**
```typescript
type ErrorCategory = 'not_found' | 'access_denied' | 'validation_error' | 'database_error' | 'unknown_tool'

function toolError(category: ErrorCategory, message: string): { content: Array<{ type: string; text: string }>; isError: true } {
  return {
    content: [{ type: "text", text: `[${category}] ${message}` }],
    isError: true,
  }
}

// Usage:
return toolError('not_found', 'Session abc123 not found. Use helix://sessions resource to find valid session IDs.')
return toolError('access_denied', 'Access denied. You do not own this session.')
```

### Pattern 4: Resource Error Consistency
**What:** Resource errors (thrown from `readResource()`) should be caught in the JSON-RPC handler and returned with the same error category pattern.
**When to use:** The catch block in `handleJsonRpc()` for `resources/read` method.
**Example:**
```typescript
case "resources/read": {
  const uri = (params as { uri: string })?.uri
  if (!uri) {
    return { jsonrpc: "2.0", id, error: { code: -32602, message: "Missing uri parameter" } }
  }
  try {
    const contents = await readResource(uri, supabase, userId)
    return { jsonrpc: "2.0", id, result: { contents } }
  } catch (err) {
    // Resource errors go through JSON-RPC error (not isError, which is tool-specific)
    return { jsonrpc: "2.0", id, error: { code: -32000, message: err.message } }
  }
}
```
Note: `isError` is a field on tool call results only. Resource read errors are protocol-level JSON-RPC errors. The user's decision to have "same error pattern for both tool and resource errors" means consistent English messages with category prefixes and recovery suggestions, but the transport mechanism differs (tool results vs JSON-RPC errors).

### Pattern 5: Resource URI Templates for Filtering
**What:** Add resource URI templates for filtered queries instead of keeping filter tools.
**When to use:** To replace the filtering capabilities of `list_sessions` and `list_exercises` tools being removed.
**Example:**
```typescript
// Already exists (but not implemented):
{ uriTemplate: "helix://exercises/tags/{tag}", name: "exercises-by-tag", description: "...", mimeType: "application/json" }

// Already exists and IS implemented:
{ uriTemplate: "helix://sessions/date/{date}", ... }
{ uri: "helix://sessions/planned", ... }

// Additional templates to consider:
{ uriTemplate: "helix://sessions/client/{clientId}", ... }
```

### Pattern 6: Ownership Verification Before Resource Read
**What:** Verify the client belongs to the coach before returning client sub-resources.
**When to use:** `helix://clients/{id}/goals` and `helix://clients/{id}/sessions` resource handlers.
**Example:**
```typescript
// helix://clients/{id}/goals
const clientGoalsMatch = uri.match(/^helix:\/\/clients\/([^\/]+)\/goals$/)
if (clientGoalsMatch) {
  const clientId = clientGoalsMatch[1]
  // ADD: verify client ownership first
  const ownership = await verifyClientOwnership(supabase, userId, clientId)
  if (!ownership.owned) throw new Error("[access_denied] Client not found or access denied.")

  const { data, error } = await supabase
    .from("goal_history")
    .select("*")
    .eq("client_id", clientId)
    .order("started_at", { ascending: false })
  // ...
}
```

### Anti-Patterns to Avoid
- **Soft join for ownership filtering:** The `list_sessions` tool uses `client:clients(...)` (left join) + `.eq("clients.user_id", userId)` which returns sessions where the join yields null (other coach's sessions appear with null client). Use `clients!inner(...)` instead which excludes non-matching rows entirely.
- **Inconsistent error language:** Mixing Italian and English in the same response. After Phase 20 everything must be English.
- **Missing isError on errors:** Tool errors without `isError: true` appear as successful results to Claude Code, preventing error recovery logic.
- **Translating dead code:** Do not translate read tool descriptions/errors that will be removed. Remove first, translate remaining.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error response formatting | Ad-hoc string returns in each case | Centralized `toolError()` helper | 45+ error paths need identical format; one helper prevents drift |
| Ownership verification | Inline ownership checks in resource handlers | Existing `verifyClientOwnership()` helper | Already battle-tested in write tools (Phase 18); reuse for resources |

**Key insight:** The error helper is the most important pattern because it enforces isError, category, and English simultaneously across all ~45 error paths. Without it, each error site must be individually audited.

## Common Pitfalls

### Pitfall 1: Translating Then Deleting
**What goes wrong:** Time wasted translating descriptions/errors for the 7 read-only tools that will be removed.
**Why it happens:** Working on TOOL-01 before TOOL-04.
**How to avoid:** Execute TOOL-04 (remove read tools) FIRST, then translate remaining tools/resources.
**Warning signs:** Editing case blocks for "list_clients", "get_client", etc.

### Pitfall 2: isError on Resource Errors
**What goes wrong:** Adding `isError: true` to resource error responses, which is incorrect per MCP spec.
**Why it happens:** User decision says "same error pattern for both tool and resource errors."
**How to avoid:** `isError` is a field on `CallToolResult` only. Resources use JSON-RPC error responses. "Same pattern" means consistent message format (English, category prefix, recovery suggestion), not identical transport.
**Warning signs:** `readResource()` returning objects with `isError` field.

### Pitfall 3: Soft Join Leaking Other Users' Data
**What goes wrong:** `list_sessions` returns sessions belonging to other coaches with null client field.
**Why it happens:** `client:clients(...)` is a LEFT JOIN in PostgREST; it includes sessions where the join condition fails, returning null for the joined table.
**How to avoid:** Always use `clients!inner(...)` for ownership-filtered session queries.
**Warning signs:** Sessions in results where `client` is null.

### Pitfall 4: Forgetting Resource Handler Error Messages
**What goes wrong:** Tool errors get translated to English but resource `throw new Error()` messages stay Italian.
**Why it happens:** Resource errors are thrown as exceptions (lines 650, 659, 728, 773, 788, 872, 925), not returned as objects. Easy to miss in a search for "Errore".
**How to avoid:** Search for both `throw new Error` and `return { content:` patterns containing Italian.
**Warning signs:** Italian text appearing in JSON-RPC error responses during testing.

### Pitfall 5: Annotations Default Values
**What goes wrong:** Setting `destructiveHint: false` explicitly when the default is `true`, or vice versa.
**Why it happens:** Misunderstanding MCP spec defaults.
**How to avoid:** MCP spec defaults: `destructiveHint` defaults to `true`, `readOnlyHint` defaults to `false`, `idempotentHint` defaults to `false`, `openWorldHint` defaults to `true`. Always set values explicitly for clarity, but be aware of defaults.
**Warning signs:** Claude Code showing unexpected confirmation prompts (or missing them).

### Pitfall 6: Filter Tool Removal Without Replacement
**What goes wrong:** Removing `list_sessions` and `list_exercises` tools eliminates the ability to filter by client_id/date/status/tag.
**Why it happens:** Resources don't have equivalent URI templates for all filters.
**How to avoid:** Add resource URI templates for the most important filters before removing tools. Specifically: `helix://exercises/tags/{tag}` (documented in CLAUDE.md but NOT implemented) and `helix://sessions/client/{clientId}` resource.
**Warning signs:** Claude Code unable to find sessions for a specific client after tool removal.

## Code Examples

### Complete Tool Definition with Annotations and Rich Description
```typescript
// Source: MCP spec ToolAnnotations + project CONTEXT.md decisions
{
  name: "create_session",
  description: "Creates a new training session for a client. Use when planning a new workout. Returns the created session ID. Requires a valid client_id (from helix://clients) and session_date. Optionally specify gym_id (from helix://gyms) and notes.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,  // calling twice creates duplicate sessions
    openWorldHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      client_id: { type: "string", description: "UUID of the client. Get valid IDs from helix://clients resource." },
      session_date: { type: "string", description: "Session date in YYYY-MM-DD format (e.g., '2026-03-15')." },
      gym_id: { type: "string", description: "UUID of the gym (optional). Get valid IDs from helix://gyms resource." },
      notes: { type: "string", description: "Free-text notes about the session (optional)." },
    },
    required: ["client_id", "session_date"],
  },
}
```

### Complete Tool Definition for Destructive Tool
```typescript
{
  name: "delete_session",
  description: "Permanently deletes a training session and all its exercises. This action cannot be undone. Use when a session was created by mistake or is no longer needed. The session must belong to the authenticated coach.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,   // irreversible deletion
    idempotentHint: true,    // deleting already-deleted session is a no-op (returns not_found)
    openWorldHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      session_id: { type: "string", description: "UUID of the session to delete. Get valid IDs from helix://sessions resource." },
    },
    required: ["session_id"],
  },
}
```

### Error Helper Implementation
```typescript
type ErrorCategory = 'not_found' | 'access_denied' | 'validation_error' | 'database_error' | 'unknown_tool' | 'template_in_use'

function toolError(
  category: ErrorCategory,
  message: string
): { content: Array<{ type: string; text: string }>; isError: true } {
  return {
    content: [{ type: "text", text: `[${category}] ${message}` }],
    isError: true,
  }
}

// Usage examples:
return toolError('not_found', 'Session abc123 not found. Use helix://sessions resource to find valid session IDs.')
return toolError('access_denied', 'Access denied to session abc123. You can only access sessions belonging to your clients.')
return toolError('validation_error', 'Invalid date format. Expected YYYY-MM-DD (e.g., 2026-03-15).')
return toolError('database_error', `Database error: ${error.message}`)
return toolError('template_in_use', 'Cannot delete template because it is used in one or more sessions. Remove template exercises from sessions first.')
```

### Resource Description Style (Rich Format)
```typescript
{
  uri: "helix://clients",
  name: "clients-list",
  description: "Lists all clients belonging to the authenticated coach. Returns client ID, name, age, birth date, gender, and current goal. Use this to discover client IDs needed by tools like create_session.",
  mimeType: "application/json",
}
```

### Ownership-Verified Resource Handler
```typescript
// helix://clients/{id}/goals - WITH ownership verification
const clientGoalsMatch = uri.match(/^helix:\/\/clients\/([^\/]+)\/goals$/)
if (clientGoalsMatch) {
  const clientId = clientGoalsMatch[1]
  const ownership = await verifyClientOwnership(supabase, userId, clientId)
  if (!ownership.owned) {
    throw new Error("[access_denied] Client not found or you do not have access.")
  }
  const { data, error } = await supabase
    .from("goal_history")
    .select("*")
    .eq("client_id", clientId)
    .order("started_at", { ascending: false })
  if (error) throw new Error(`[database_error] ${error.message}`)
  return [{ uri, mimeType: "application/json", text: JSON.stringify(data || [], null, 2) }]
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tools for both read and write | Resources for read, tools for mutations only | MCP best practice (spec 2024-11-05+) | Cleaner separation of concerns, Claude Code handles both |
| No tool annotations | `ToolAnnotations` with behavioral hints | MCP spec 2025-03-26 | Clients can show confirmation prompts for destructive ops |
| Silent error (no isError) | `isError: true` on tool execution failures | MCP spec 2024-11-05 | Claude Code detects failures and can retry/recover |

**Deprecated/outdated:**
- Read-only tools (7 tools) are deprecated because resources serve the same purpose with better semantics
- Italian descriptions are a legacy artifact from when the project was Italian-only

## Open Questions

1. **Filter Tool Replacement Strategy**
   - What we know: `list_sessions` supports filtering by client_id, date, status. `list_exercises` supports filtering by tag. Resources already cover date (`helix://sessions/date/{date}`) and status (`helix://sessions/planned`).
   - What's unclear: Whether to add `helix://exercises/tags/{tag}` and `helix://sessions/client/{clientId}` resource URI templates, or if the existing resources are sufficient (Claude Code can filter client-side).
   - Recommendation: Add `helix://exercises/tags/{tag}` (it's already documented in CLAUDE.md but not implemented) as a resource URI template with handler. For client-specific sessions, the `helix://clients/{id}/sessions` resource already exists. The `list_sessions` client_id+date+status combination filtering is edge-case enough that Claude Code can chain `helix://sessions/date/{date}` with `helix://clients/{id}/sessions` to cover it. No new filter resources needed beyond implementing the documented `helix://exercises/tags/{tag}`.

2. **Prompt Text Language**
   - What we know: TOOL-01 says "all tool and resource descriptions translated to English." Prompt definitions have Italian descriptions and prompt text is entirely Italian.
   - What's unclear: Whether prompt text (the actual content sent to the LLM) should also be translated.
   - Recommendation: Prompt metadata (name, description, argument descriptions) should be translated to English. The actual prompt body text (user messages) is the coach's language and is arguably a UX decision, but since TOOL-01 scope is "descriptions" not "prompt content," keep prompt body text as-is (Italian) and only translate the metadata. Flag this decision in the plan.

3. **Error Category Format**
   - What we know: User wants error categories for programmatic handling.
   - What's unclear: Exact format -- prefix in text `[not_found]`, separate JSON field, or structured content.
   - Recommendation: Use prefix in text format `[category] Human-readable message with recovery suggestion.` This is simple, works with existing content array format, and Claude Code can parse the bracket prefix if needed. Avoids changing the response structure which would require updating the tool result type.

## Sources

### Primary (HIGH confidence)
- MCP Protocol Specification (Context7 /modelcontextprotocol/specification) - Tool annotations, isError flag, CallToolResult, ToolAnnotations interface, error handling patterns
- Helix codebase direct analysis (supabase/functions/helix-mcp/index.ts) - Current state of all tools, resources, error patterns, ownership gaps

### Secondary (MEDIUM confidence)
- v1.6 Milestone Audit (.planning/v1.6-MILESTONE-AUDIT.md) - Integration gap identification (resource ownership, join pattern inconsistency)
- CLAUDE.md project documentation - Resource URI list including undocumented `helix://exercises/tags/{tag}`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries, pure refactoring of existing code
- Architecture: HIGH - MCP spec clearly defines annotations, isError, and tool structure
- Pitfalls: HIGH - All identified from direct codebase analysis and audit document

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (stable -- MCP spec changes are versioned, server code is internal)
