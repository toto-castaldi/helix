# Project Research Summary

**Project:** Helix v1.6 — MCP Assessment & Fix
**Domain:** MCP server audit, protocol compliance, and Claude Code integration
**Researched:** 2026-02-21
**Confidence:** HIGH

## Executive Summary

Helix has a working MCP server (23 tools, 19 resources, 5 prompts) running as a Supabase Edge Function, but it was built for a Claude Web OAuth flow that never worked. The server has accumulated ~150 lines of dead OAuth code, Italian-language tool descriptions, missing error flags, security gaps in write tools, and an outdated protocol version (`2024-11-05`, two revisions behind). Research confirms the fix is surgical: keep the existing 2,500-line hand-rolled JSON-RPC implementation and make targeted protocol-layer corrections. Do NOT adopt the MCP TypeScript SDK or rewrite the business logic.

The recommended approach is a three-phase cleanup: first remove dead code and fix security (OAuth removal, ownership checks, auth simplification), then upgrade protocol compliance and tool quality (English descriptions, `isError` flags, tool annotations, resource template separation, protocol version bump to `2025-03-26`), and finally polish for optimal Claude Code experience (compact responses, input validation, timezone handling). The most dangerous finding is that Claude Code has recurring bugs where custom HTTP headers are silently dropped (issues #7290, #14977, #17069), causing it to enter OAuth discovery flows. The existing OAuth code actively makes this worse by responding to `.well-known` requests. Removing OAuth endpoints is the single highest-priority fix.

The security audit found 6 write tools that lack ownership verification while operating with a service-role key that bypasses RLS. Any authenticated user could modify another user's sessions. This must be fixed alongside the OAuth removal as a P0 priority before any other improvements.

## Key Findings

### Recommended Stack

No new technologies needed. The existing hand-rolled JSON-RPC implementation on Supabase Edge Functions (Deno) is the correct approach. The MCP TypeScript SDK (v1.27.0, with v2 pre-alpha in progress) was evaluated and rejected -- it would require rewriting all 2,500 lines of working business logic for no functional gain. The `mcp-lite` package (v0.10.0) was similarly rejected for immaturity and refactor cost.

**Core technologies (no changes):**
- **Supabase Edge Functions (Deno):** Server runtime -- already deployed, working, correct for stateless MCP
- **`@supabase/supabase-js` v2:** Database access -- works with service role for API key auth pattern
- **Hand-rolled JSON-RPC:** Transport layer -- ~100 lines need protocol fixes, ~2,400 lines of business logic untouched

**Protocol changes needed:**
- **Protocol version:** `2024-11-05` to `2025-03-26` -- adds tool annotations, Streamable HTTP compliance; skip `2025-06-18` (adds complexity without benefit)
- **Auth:** API key only (`X-Helix-API-Key`) -- remove OAuth 2.1 and Bearer token fallback entirely
- **Transport:** Stateless Streamable HTTP -- JSON responses (no SSE), 202 for notifications, 405 for GET

### Expected Features

**Must fix (table stakes -- broken or missing):**
- English tool descriptions -- Italian descriptions degrade Claude Code's tool selection accuracy
- `isError: true` flag on all tool error responses -- enables LLM error recovery
- Ownership verification on 6 write tools -- security gap, service role bypasses RLS
- Remove dead OAuth code (~150 lines) -- actively interferes with authentication
- Remove verbose debug logging (~25 lines) -- security risk and log noise
- Consistent English field names in responses -- `name` not `nome`, `status` not `stato`

**Should fix (quality improvement):**
- Tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`) -- improves Claude Code approval flow
- Separate resources vs resource templates in protocol responses -- currently mixed incorrectly
- Actionable English error messages -- help Claude recover from failures
- Compact JSON responses (strip null fields) -- reduce token usage toward 10k warning threshold

**Defer (nice-to-have):**
- `title` field on tools and resources (spec `2025-06-18` feature)
- Resource annotations (audience, priority)
- Server instructions for Tool Search optimization
- Structured output schemas

**Anti-features (do NOT build):**
- OAuth 2.1 / Claude Web support -- remove existing dead code
- SSE streaming -- not needed, JSON responses are correct for stateless server
- Session management (`Mcp-Session-Id`) -- Edge Functions are stateless, this is correct behavior
- JSON-RPC batching -- added in `2025-03-26` but removed in `2025-06-18`, not worth implementing

### Architecture Approach

The architecture stays identical: single Edge Function file, stateless HTTP POST handler, API key auth with SHA-256 hash lookup, service-role Supabase client filtered by `userId`. The file drops from ~2,516 to ~2,200 lines after removing dead code. No new files, tables, or infrastructure needed.

**Major components (unchanged, reorganized):**
1. **Authentication** -- API key only, ~30 lines (down from ~130 with OAuth fallbacks)
2. **Protocol Handler** -- initialize, notification detection (202 for `initialized`), method routing
3. **Resource/Tool/Prompt Handlers** -- all existing business logic preserved, descriptions translated to English
4. **HTTP Entry Point** -- POST handler (JSON-RPC), GET returns 405, CORS headers updated for MCP spec

**Key patterns to follow:**
- Notification detection: messages without `id` field get HTTP 202, no JSON-RPC body
- Tool error responses: always include `isError: true` with actionable English message
- Ownership verification: fetch record, check `user_id` matches authenticated coach, then mutate
- Stateless operation: no `Mcp-Session-Id`, authenticate every request independently

### Critical Pitfalls

1. **Claude Code header bugs drop API keys** -- Claude Code has documented regressions (#7290, #14977, #17069) where custom headers are silently dropped, causing it to enter OAuth discovery. **Prevention:** Remove all `.well-known` and OAuth endpoints so Claude Code cannot enter OAuth flow; test with exact `claude mcp add --header` command; consider query parameter fallback as backup.

2. **OAuth dead code actively interferes with auth** -- The existing `.well-known/oauth-protected-resource` endpoint and `WWW-Authenticate: Bearer resource_metadata=` response header tell Claude Code to use OAuth instead of API keys, creating an unrecoverable auth loop. **Prevention:** Remove ALL OAuth code paths as P0 priority.

3. **6 write tools lack ownership verification** -- `update_session`, `delete_session`, `complete_session`, `update_session_exercise`, `remove_session_exercise`, `reorder_session_exercises` operate by ID without checking the session belongs to the authenticated coach. Service role key bypasses RLS. **Prevention:** Add explicit ownership check (fetch + verify `user_id`) to every write tool.

4. **Italian descriptions degrade tool selection** -- All 23 tool descriptions and error messages are in Italian, reducing Claude Code's ability to select the right tool. **Prevention:** Rewrite all descriptions in English following MCP best practices (what it does, when to use it, what it returns).

5. **Missing `isError` flag masks failures** -- Tool errors return as normal text content without `isError: true`, so Claude treats failures as successful results. **Prevention:** Add `isError: true` to every error response across all tool handlers.

## Implications for Roadmap

Based on research, suggested phase structure prioritizes security and auth fixes before protocol and quality improvements.

### Phase 1: Security & Dead Code Removal
**Rationale:** OAuth dead code actively breaks authentication (Pitfall 1 + 3), and ownership gaps are a security vulnerability. These block all other improvements because you cannot test quality fixes if auth is unreliable.
**Delivers:** Clean, secure, working auth with Claude Code
**Addresses:** Remove OAuth code, remove debug logging, simplify auth to API-key-only, add ownership checks to 6 write tools, fix `list_sessions` join bug
**Avoids:** Pitfall 1 (header bugs), Pitfall 2 (OAuth interference), Pitfall 9 (RLS bypass)

### Phase 2: Protocol Compliance
**Rationale:** With auth working, upgrade the protocol layer to be spec-compliant. This is prerequisite for tool annotations (Phase 3) which require `2025-03-26`.
**Delivers:** Streamable HTTP compliant server at protocol version `2025-03-26`
**Addresses:** Protocol version bump, 202 for notifications, proper 405 for GET, CORS header updates, `Accept` header validation, `MCP-Protocol-Version` header handling
**Avoids:** Pitfall 2 (version mismatch causing connection rejection)

### Phase 3: Tool & Resource Quality
**Rationale:** With protocol compliance done, the descriptions and error handling improvements make Claude Code's tool selection and error recovery work well. This is the highest-impact phase for user experience.
**Delivers:** English descriptions, `isError` flags, tool annotations, clean error messages, consistent field names
**Addresses:** All "must fix" and "should fix" items from FEATURES.md -- English descriptions, isError flag, tool annotations, resource template separation, consistent response format, actionable errors
**Avoids:** Pitfall 4 (Italian descriptions), Pitfall 5 (duplicate tools confusion), Pitfall 7 (missing isError)

### Phase 4: Response Optimization & Polish
**Rationale:** With everything working correctly, optimize for Claude Code's token limits and edge cases.
**Delivers:** Compact responses, input validation, timezone handling, documentation updates
**Addresses:** Token budget optimization (strip nulls, compact JSON), input validation on tool parameters, timezone awareness for `helix://today`, CLAUDE.md updates to remove OAuth references
**Avoids:** Pitfall 10 (token limit exceeded), Pitfall 14 (timezone mismatch), Pitfall 15 (no input validation)

### Phase 5: End-to-End Testing & Documentation
**Rationale:** Final phase verifies the complete flow with Claude Code and documents the configuration for coaches.
**Delivers:** Verified Claude Code integration, coach-facing setup documentation, `.mcp.json` template
**Addresses:** Full test sequence (initialize, tool calls, resource reads, prompt invocations), documentation of `claude mcp add` command and configuration scopes

### Phase Ordering Rationale

- **Security first (Phase 1):** Cannot test anything reliably while OAuth code interferes with auth and write tools have security gaps
- **Protocol before quality (Phase 2 before 3):** Tool annotations require `2025-03-26` protocol version; notification handling must be correct before testing tool calls
- **Quality before optimization (Phase 3 before 4):** English descriptions and error flags have much higher impact than response size optimization
- **Testing last (Phase 5):** Only meaningful after all fixes are in place; testing earlier would just find known issues

**Critical path:** Phase 1 -> Phase 2 -> Phase 3 is the minimum viable fix. Phases 4-5 are important but could ship after initial release if needed.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Security):** Needs phase research to audit all 23 tools and 19 resources for ownership verification gaps. The 6 identified are confirmed, but there may be more.
- **Phase 3 (Tool Quality):** Needs research on MCP best practices for tool descriptions (SEP-1382 patterns) and on whether to keep or remove the 7 duplicate read tools vs resources.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Protocol Compliance):** Well-documented in MCP spec `2025-03-26`. Changes are mechanical (version string, status codes, headers).
- **Phase 4 (Response Optimization):** Straightforward engineering -- strip nulls, add validation, parameterize timezone.
- **Phase 5 (Testing):** Standard verification, documented test sequence in ARCHITECTURE.md.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Decision to keep hand-rolled implementation is well-justified. SDK evaluation thorough. Protocol version choice (`2025-03-26`) backed by spec analysis. |
| Features | HIGH | Issues identified through direct codebase analysis + MCP spec comparison. Security gaps confirmed by code line references. |
| Architecture | HIGH | Stateless Streamable HTTP pattern verified against official Supabase and MCP docs. No architectural changes needed. |
| Pitfalls | HIGH | Claude Code header bugs confirmed via 3 GitHub issues with specific version numbers. OAuth interference identified through code analysis. Security gaps verified with line numbers. |

**Overall confidence:** HIGH

All four research files drew from official MCP specifications (`2025-03-26`, `2025-06-18`), Claude Code documentation, Supabase official docs, and direct codebase analysis. The findings are concrete (specific line numbers, specific issue numbers, specific code examples) rather than theoretical.

### Gaps to Address

- **Claude Code header bug status:** Issue #7290 was closed as NOT_PLANNED on 2026-02-20. Need to verify whether current Claude Code version actually sends headers correctly. If headers still fail, the query parameter fallback (`?api_key=xxx`) becomes necessary rather than optional.

- **Duplicate read tools decision:** Research identifies 7 read-only tools that duplicate resource functionality (added for Claude Web compatibility). The recommendation is to keep both but make them consistent. However, removing read tools entirely would reduce context token consumption. This needs validation during Phase 3 by testing whether Claude Code effectively uses resources via `@` mentions for read operations.

- **Prompt language strategy:** Tool descriptions should be English (machine-facing), but prompt templates are user-facing content for Italian-speaking coaches. The boundary between "machine-facing" and "user-facing" in prompt templates needs clarification during Phase 3.

- **`exercises/tags/{tag}` resource:** Declared in CLAUDE.md but never implemented in code. Needs decision: implement or remove from documentation.

## Sources

### Primary (HIGH confidence)
- [MCP Specification 2025-03-26](https://modelcontextprotocol.io/specification/2025-03-26/) -- Transport, lifecycle, tool annotations
- [MCP Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/) -- Changelog, transport updates, version negotiation
- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp) -- Transport types, headers, scopes, Tool Search, output limits
- [Supabase Deploy MCP Servers](https://supabase.com/docs/guides/getting-started/byo-mcp) -- Edge Function patterns
- Helix codebase analysis -- `supabase/functions/helix-mcp/index.ts` (2,516 lines)

### Secondary (MEDIUM confidence)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) -- v1.27.0 evaluation, v2 pre-alpha status
- [Claude Code issue #7290](https://github.com/anthropics/claude-code/issues/7290) -- Header bug (CLOSED/NOT_PLANNED)
- [Claude Code issue #14977](https://github.com/anthropics/claude-code/issues/14977) -- Custom headers not sent
- [Claude Code issue #17069](https://github.com/anthropics/claude-code/issues/17069) -- Header not added in config
- [SEP-1382: MCP Tool Description Best Practices](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1382)
- [Anthropic Engineering: Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)

### Tertiary (LOW confidence)
- [Why MCP Deprecated SSE](https://blog.fka.dev/blog/2025-06-06-why-mcp-deprecated-sse-and-go-with-streamable-http/) -- Background context
- [15 Best Practices for Building MCP Servers](https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/) -- Production patterns
- Various Claude Code GitHub issues on token management (#7172, #3406, #2638)

---
*Research completed: 2026-02-21*
*Ready for roadmap: yes*
