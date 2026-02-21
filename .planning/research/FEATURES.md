# Feature Landscape: MCP Server Quality for Claude Code

**Domain:** MCP server assessment and fix for Claude Code integration
**Researched:** 2026-02-21
**Confidence:** HIGH (based on official MCP specification, Claude Code docs, and codebase analysis)

## Context

This research focuses on what makes an MCP server work well with Claude Code specifically. Helix already has a working MCP server (23 tools, 19 resources, 5 prompts) that was partially built for Claude Web OAuth integration (now broken/dead code). The goal is to assess and fix it for Claude Code as the primary consumer.

Claude Code connects to MCP servers via HTTP transport with custom headers for API key authentication. The current Helix server uses JSON-RPC over HTTP POST, which is the correct approach. However, several quality issues have been identified through code analysis and comparison with MCP specification best practices.

## Table Stakes

Features Claude Code expects from a well-functioning MCP server. Missing = broken or degraded experience.

| Feature | Why Expected | Complexity | Current Status |
|---------|--------------|------------|----------------|
| **English tool descriptions** | Claude Code's LLM processes tool descriptions to decide which to use. Italian descriptions degrade tool selection accuracy. | Low | BROKEN - All descriptions in Italian |
| **isError flag on tool failures** | MCP spec requires `isError: true` on tool execution errors so LLM knows the operation failed and can recover | Low | MISSING - Errors returned as normal text content |
| **Tool annotations (readOnlyHint, destructiveHint)** | Tells Claude Code which tools are safe vs destructive. Affects approval prompts and auto-approval settings. | Low | MISSING - No annotations on any tool |
| **Proper resource templates separation** | MCP spec distinguishes static resources (resources/list) from parameterized templates (resources/templates/list). Current server mixes them. | Medium | BROKEN - All returned as flat resources, uriTemplate rendered as uri |
| **Remove dead OAuth code** | ~150 lines of OAuth 2.1 code (RFC 9728 metadata, authorization server proxy, unauthorized hints) for broken Claude Web flow. Dead code adds confusion. | Low | DEAD CODE - OAuth never worked, Claude Web not supported |
| **Remove excessive debug logging** | Main handler logs every request header and body. Noise in production, potential security issue (logging body content). | Low | PRESENT - ~25 lines of debug console.log in main handler |
| **Clean error messages** | Error text should help Claude Code understand what went wrong and how to fix it, not just say "Errore: non trovato" | Low | POOR - Terse Italian error messages |
| **Consistent tool response format** | All tools should return data in a consistent, parseable format. Currently some return Italian field names, some English. | Medium | INCONSISTENT - Mix of `nome`/`name`, `stato`/`status` |
| **Authorization ownership checks on writes** | Write tools must verify the coach owns the resource being modified. Some tools skip this check. | Medium | PARTIAL - update_session, delete_session lack ownership verification |

## Differentiators

Features that make the MCP server notably better for Claude Code interaction. Not strictly required, but significantly improve the experience.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Concise tool descriptions with context** | Rich descriptions following MCP best practices: what it does, when to use it, what it returns. Helps Claude Code pick the right tool. | Medium | Follow SEP-1382 patterns: tool-level description for "what/when", parameter-level for details |
| **Structured output schemas** | MCP 2025-06-18 spec supports `outputSchema` on tools. Helps Claude Code parse results and integrate them programmatically. | High | Nice-to-have, not all clients support yet |
| **Token-efficient resource responses** | Claude Code warns at 10k tokens, max 25k. Resources returning full JSON with null fields and pretty-printing waste tokens. | Medium | Trim nulls, compact JSON for large lists |
| **title field on tools and resources** | MCP 2025-06-18 spec added `title` for human-readable display names. Improves `/mcp` and tool search UX. | Low | New spec feature, backwards compatible |
| **Pagination support for list endpoints** | MCP spec supports cursor-based pagination on resources/list, tools/list, prompts/list. Prevents overloading context with large datasets. | Medium | Needed if coach has many clients/sessions |
| **Resource annotations (audience, priority)** | Tells Claude Code which resources are most important and who they're for. Helps with resource prioritization. | Low | New spec feature, backwards compatible |
| **Server instructions for Tool Search** | When Claude Code has many MCP servers, Tool Search dynamically loads tools on demand. Server instructions help Claude know when to search for Helix tools. | Low | Set via server info in initialize response |
| **Prompt descriptions with usage examples** | Prompts become slash commands in Claude Code (`/mcp__helix__plan-session`). Good descriptions help coaches discover them. | Low | Already has descriptions, could be richer |

## Anti-Features

Features to explicitly NOT build or keep.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **OAuth 2.1 / Claude Web support** | Never worked. Complex code (~150 lines) for broken flow. Claude Web MCP connector has different requirements. | Remove entirely. API key auth via X-Helix-API-Key works well with Claude Code. |
| **SSE/Streamable HTTP transport** | Current server correctly rejects SSE with 405. Claude Code uses simple HTTP POST. No need for streaming. | Keep JSON-RPC over HTTP POST. This is the correct transport for Supabase Edge Functions. |
| **Read tools duplicating resources** | 7 read tools (list_clients, get_client, etc.) duplicate resource functionality. Added "for Claude Web compatibility" per comment. Claude Code supports resources natively. | Evaluate if resources alone suffice. If keeping read tools, document why. |
| **Italian-language prompt templates** | Prompt templates are in Italian. While the coach speaks Italian, Claude Code's LLM works better when prompts are in the language of the user interaction. | Make prompts language-aware or default to English for Claude Code tool descriptions, keep Italian for user-facing content if coach prefers |
| **Verbose debug logging in production** | Every request logs all headers and body content. Performance impact and security concern. | Remove or gate behind environment variable. Keep only structured error logging. |
| **Protocol version pinned to 2024-11-05** | Outdated. Current spec is 2025-06-18. Missing features like tool annotations, titles, output schemas. | Update to latest supported version. Maintain backward compatibility. |

## Feature Dependencies

```
English tool descriptions (foundation)
    |
    +-- Clean error messages (same language pass)
    |
    +-- Consistent response format (English field names)

isError flag on errors
    |
    +-- Clean error messages (actionable content for LLM recovery)

Remove dead OAuth code
    |
    +-- Remove debug logging (same cleanup pass)
    |
    +-- Simplify auth to API-key-only

Tool annotations
    |
    +-- Requires understanding which tools are read vs write vs destructive
    |
    +-- readOnlyHint: list_*, get_*, list_sessions, list_exercises, etc.
    |
    +-- destructiveHint: delete_session, delete_group_template
    |
    +-- idempotentHint: update_session, update_session_exercise, complete_session

Proper resource templates separation
    |
    +-- Resource annotations (audience, priority) - enhancement pass
    |
    +-- title field on resources - enhancement pass

Authorization ownership checks
    |
    +-- Must fix before any tool polish (security first)
```

## Detailed Analysis of Current Issues

### Issue 1: Italian Tool Descriptions (Critical)

Claude Code's LLM reads tool descriptions to decide which tool to invoke. When descriptions are in Italian ("Elenca tutti i clienti del coach con i loro dati base"), the LLM must translate mentally before deciding. This degrades tool selection accuracy, especially for edge cases.

**Current example:**
```typescript
{
  name: "list_clients",
  description: "Elenca tutti i clienti del coach con i loro dati base",
}
```

**Should be:**
```typescript
{
  name: "list_clients",
  description: "List all clients with basic info (name, birth date, gender). Use this to discover client IDs before calling other client tools.",
  annotations: { readOnlyHint: true },
}
```

### Issue 2: Missing isError Flag (Critical)

MCP spec clearly separates protocol errors (JSON-RPC error codes) from tool execution errors (`isError: true` in result). Current server returns errors as normal text content, so Claude Code cannot distinguish success from failure.

**Current pattern:**
```typescript
if (error) {
  return { content: [{ type: "text", text: `Errore: ${error.message}` }] }
}
```

**Should be:**
```typescript
if (error) {
  return {
    content: [{ type: "text", text: `Failed to list clients: ${error.message}` }],
    isError: true,
  }
}
```

### Issue 3: Resources vs Resource Templates (Medium)

MCP spec has two distinct methods:
- `resources/list` - returns static, fixed-URI resources
- `resources/templates/list` - returns URI templates with parameters

Current server returns everything from `resources/list`, mixing static URIs (`helix://clients`) with template URIs (`helix://clients/{clientId}`). The templates are rendered as plain URIs which cannot be used without knowing the ID values.

### Issue 4: Duplicate Read Tools vs Resources (Medium)

The server has 7 read-only tools that duplicate resource functionality:
- `list_clients` vs `helix://clients` resource
- `get_client` vs `helix://clients/{clientId}` resource
- `list_exercises` vs `helix://exercises` resource
- `list_sessions` vs `helix://sessions` resource
- `get_session` vs `helix://sessions/{sessionId}` resource
- `list_gyms` vs `helix://gyms` resource
- `get_coach_summary` vs `helix://coach/summary` resource

These were added "for Claude Web compatibility" (per code comment) because Claude Web reportedly did not support resources. Claude Code does support resources via `@` mentions. However, tools are more naturally invoked by the LLM during conversation, while resources are user-initiated. **Recommendation: keep read tools but remove duplication in response format. Both should return the same data shape.**

### Issue 5: Missing Ownership Checks (Security)

Several write tools do not verify the coach owns the session being modified:
- `update_session` - updates any session by ID without checking client.user_id
- `delete_session` - deletes any session by ID without ownership check
- `complete_session` - same issue
- `reorder_session_exercises` - no ownership verification

RLS policies at the database level may provide protection, but since the server uses `supabaseServiceKey` (service role) for API key auth, RLS is bypassed. These tools need explicit ownership verification.

## MVP Recommendation (v1.6 Scope)

Prioritize these fixes for a well-functioning Claude Code integration:

### Must Fix (table stakes)

1. **English tool/resource descriptions** - Single most impactful change for tool selection quality
2. **isError flag on all error responses** - Enables LLM error recovery
3. **Remove dead OAuth code** - Clean up ~200 lines of dead code
4. **Remove verbose debug logging** - Security and performance
5. **Fix ownership checks on write tools** - Security (service role bypasses RLS)
6. **Consistent English field names in responses** - `name` not `nome`, `status` not `stato`

### Should Fix (quality)

7. **Tool annotations** (readOnlyHint, destructiveHint, idempotentHint) - Improves Claude Code approval flow
8. **Separate resources vs resource templates** in protocol responses
9. **Clean, actionable error messages** - "Client not found: {id}" instead of "Errore: non trovato"
10. **Compact JSON responses** - Strip null fields, reduce token usage

### Nice to Have (differentiators)

11. **title field** on tools and resources
12. **Resource annotations** (audience, priority)
13. **Update protocol version** to 2025-03-26 or later
14. **Server instructions** for Tool Search optimization

## Claude Code Configuration

For reference, the expected Claude Code configuration for Helix:

```bash
# Add Helix MCP server to Claude Code
claude mcp add --transport http helix \
  --header "X-Helix-API-Key: hx_..." \
  https://<project>.supabase.co/functions/v1/helix-mcp
```

Or in `.mcp.json` (project scope, shared with team):
```json
{
  "mcpServers": {
    "helix": {
      "type": "http",
      "url": "https://<project>.supabase.co/functions/v1/helix-mcp",
      "headers": {
        "X-Helix-API-Key": "${HELIX_MCP_API_KEY}"
      }
    }
  }
}
```

## Token Budget Considerations

Claude Code warns at 10,000 tokens per MCP tool output and has a default max of 25,000 tokens. With 23 tools + 19 resources + 5 prompts, tool definitions alone consume significant context.

**Current tool definitions:** ~23 tool schemas at ~100-200 tokens each = ~3,000-5,000 tokens just for tool list. This is manageable but should be kept lean.

**Resource responses:** A `helix://sessions` resource with 50 sessions, each with exercises, could easily exceed 10,000 tokens. Consider:
- Limiting default list sizes (already done for sessions: limit 50)
- Returning summary data in list endpoints, full data in detail endpoints
- Stripping null fields from JSON responses

## Sources

**Official MCP Specification (HIGH confidence):**
- [MCP Tools Specification](https://modelcontextprotocol.io/docs/concepts/tools) - Protocol revision 2025-06-18, tool definitions, isError, annotations
- [MCP Resources Specification](https://modelcontextprotocol.io/docs/concepts/resources) - Resource vs template separation, URI schemes, annotations
- [MCP Prompts Specification](https://modelcontextprotocol.io/docs/concepts/prompts) - Prompt structure, arguments, slash commands
- [MCP Transports](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) - Streamable HTTP as modern standard

**Claude Code Documentation (HIGH confidence):**
- [Claude Code MCP Integration](https://code.claude.com/docs/en/mcp) - HTTP transport, headers, scopes, Tool Search, output limits, resource @mentions

**MCP Best Practices (MEDIUM confidence):**
- [SEP-1382: Documentation Best Practices for MCP Tools](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1382) - Tool vs schema description separation
- [MCP Tool Annotations Introduction](https://blog.marcnuri.com/mcp-tool-annotations-introduction) - readOnlyHint, destructiveHint, idempotentHint
- [15 Best Practices for Building MCP Servers](https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/) - Production patterns
- [Better MCP Tool Error Responses](https://alpic.ai/blog/better-mcp-tool-call-error-responses-ai-recover-gracefully) - Error message quality for LLM recovery
- [MCP Error Codes](https://www.mcpevals.io/blog/mcp-error-codes) - JSON-RPC error code conventions

**Claude Code Issues (MEDIUM confidence):**
- [Claude Code Token Management with MCP](https://github.com/anthropics/claude-code/issues/7172) - Context bloat from tool definitions
- [MCP Tool Descriptions Token Overhead](https://github.com/anthropics/claude-code/issues/3406) - 10-20k token overhead from tool descriptions
- [Truncated MCP Tool Responses](https://github.com/anthropics/claude-code/issues/2638) - Output limit issues
- [HTTP MCP Custom Headers Bug](https://github.com/anthropics/claude-code/issues/14977) - Known issue with header transmission

---

## Quality Checklist

- [x] Categories clear (table stakes vs differentiators vs anti-features)
- [x] Complexity noted for each feature
- [x] Dependencies mapped
- [x] MVP/priority recommendation provided
- [x] Anti-features explicitly listed with rationale
- [x] Claude Code-specific patterns documented (transport, auth, Tool Search, token limits)
- [x] Current server issues identified with code examples
- [x] Security concerns flagged (ownership checks, service role RLS bypass)
