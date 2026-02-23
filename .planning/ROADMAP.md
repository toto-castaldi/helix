# Roadmap: Helix

## Milestones

- ✅ **v1.0 Esercizi di Gruppo** — Phases 1-4 (shipped 2026-01-28)
- ✅ **v1.1 Group Exercise Improvements** — Phases 5-9 (shipped 2026-02-02)
- ✅ **v1.2 Lumio Exercise Images** — Phase 10 (shipped 2026-02-12)
- ✅ **v1.3 Image Auto-Play** — Phase 11 (shipped 2026-02-13)
- ✅ **v1.4 Landing Page + Domini** — Phases 12-15 (shipped 2026-02-18)
- ✅ **v1.5 Versioning GSD** — Phases 16-17 (shipped 2026-02-21)
- 🚧 **v1.6 MCP Assessment & Fix** — Phases 18-22 (in progress)

## Phases

<details>
<summary>✅ v1.0 Esercizi di Gruppo (Phases 1-4) — SHIPPED 2026-01-28</summary>

See `.planning/milestones/v1.0-ROADMAP.md` for details.

</details>

<details>
<summary>✅ v1.1 Group Exercise Improvements (Phases 5-9) — SHIPPED 2026-02-02</summary>

See `.planning/milestones/v1.1-ROADMAP.md` for details.

</details>

<details>
<summary>✅ v1.2 Lumio Exercise Images (Phase 10) — SHIPPED 2026-02-12</summary>

See `.planning/milestones/v1.2-ROADMAP.md` for details.

</details>

<details>
<summary>✅ v1.3 Image Auto-Play (Phase 11) — SHIPPED 2026-02-13</summary>

See `.planning/milestones/v1.3-ROADMAP.md` for details.

</details>

<details>
<summary>✅ v1.4 Landing Page + Domini (Phases 12-15) — SHIPPED 2026-02-18</summary>

See `.planning/milestones/v1.4-ROADMAP.md` for details.

</details>

<details>
<summary>✅ v1.5 Versioning GSD (Phases 16-17) — SHIPPED 2026-02-21</summary>

See `.planning/milestones/v1.5-ROADMAP.md` for details.

</details>

### 🚧 v1.6 MCP Assessment & Fix (In Progress)

**Milestone Goal:** Audit, fix, and polish the MCP server for reliable Claude Code integration, removing dead OAuth code and fixing security gaps.

- [ ] **Phase 18: Security & Dead Code Removal** - Remove OAuth dead code and fix ownership verification on write tools
- [ ] **Phase 19: Protocol Compliance** - Upgrade to MCP 2025-03-26 with correct HTTP semantics
- [ ] **Phase 20: Tool & Resource Quality** - English descriptions, error flags, annotations, and deduplication
- [ ] **Phase 21: Response Polish** - Input validation and compact JSON responses
- [ ] **Phase 22: End-to-End Testing & Documentation** - Systematic verification with Claude Code and setup guide on landing page

## Phase Details

### Phase 18: Security & Dead Code Removal
**Goal**: Coach can authenticate reliably with API key and all write operations are secure against cross-user access
**Depends on**: Nothing (first phase of v1.6)
**Requirements**: SEC-01, SEC-02
**Success Criteria** (what must be TRUE):
  1. All OAuth 2.1 code is removed -- no `.well-known` endpoints, no Bearer token auth, no OAuth discovery responses
  2. Claude Code connects with `X-Helix-API-Key` header without being redirected to OAuth flows
  3. A coach cannot modify another coach's sessions or exercises through any write tool (update_session, delete_session, complete_session, update_session_exercise, remove_session_exercise, reorder_session_exercises)
  4. Unauthenticated requests receive a clear error response (not a redirect or discovery document)
**Plans**: 3 plans

Plans:
- [ ] 18-01-PLAN.md — Frontend OAuth removal + CLAUDE.md documentation cleanup
- [ ] 18-02-PLAN.md — Edge Function OAuth removal + auth error cleanup
- [ ] 18-03-PLAN.md — Write tool ownership verification (8 tools)

### Phase 19: Protocol Compliance
**Goal**: MCP server speaks spec-compliant Streamable HTTP at protocol version 2025-03-26
**Depends on**: Phase 18
**Requirements**: PROTO-01, PROTO-02, PROTO-03
**Success Criteria** (what must be TRUE):
  1. Server declares protocol version `2025-03-26` in initialize response and Claude Code accepts the connection
  2. Sending an `initialized` notification (JSON-RPC message without `id`) returns HTTP 202 with no body
  3. GET requests to the MCP endpoint return HTTP 405 Method Not Allowed with correct CORS headers
**Plans**: TBD

Plans:
- [ ] 19-01: TBD

### Phase 20: Tool & Resource Quality
**Goal**: Claude Code can accurately select, invoke, and recover from errors across all tools and resources
**Depends on**: Phase 19
**Requirements**: TOOL-01, TOOL-02, TOOL-03, TOOL-04
**Success Criteria** (what must be TRUE):
  1. All tool and resource descriptions are in English, following MCP best practices (what it does, when to use it, what it returns)
  2. Every tool error response includes `isError: true` flag so Claude Code can detect and recover from failures
  3. All tools have annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`) and Claude Code shows appropriate confirmation prompts for destructive operations
  4. No duplicate read-only tools that replicate resource functionality -- resources are the read mechanism, tools are for mutations
**Plans**: TBD

Plans:
- [ ] 20-01: TBD
- [ ] 20-02: TBD

### Phase 21: Response Polish
**Goal**: Tool parameters are validated before execution and responses are compact for efficient token usage
**Depends on**: Phase 20
**Requirements**: POL-01, POL-02
**Success Criteria** (what must be TRUE):
  1. Invalid tool parameters (missing required fields, wrong types, invalid UUIDs) return clear validation errors before any database query executes
  2. JSON responses omit null fields and unnecessary whitespace, keeping responses compact for Claude Code's context window
**Plans**: TBD

Plans:
- [ ] 21-01: TBD

### Phase 22: End-to-End Testing & Documentation
**Goal**: Every MCP capability is verified working with Claude Code and coaches have setup instructions
**Depends on**: Phase 21
**Requirements**: TEST-01, TEST-02
**Success Criteria** (what must be TRUE):
  1. All tools, resources, and prompts have been systematically tested end-to-end with Claude Code and confirmed working
  2. The landing page includes a section explaining how to configure Claude Code to use Helix MCP (with `claude mcp add` command and configuration example)
**Plans**: TBD

Plans:
- [ ] 22-01: TBD
- [ ] 22-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 18 -> 19 -> 20 -> 21 -> 22

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-4 | v1.0 | 6/6 | Complete | 2026-01-28 |
| 5-9 | v1.1 | 10/10 | Complete | 2026-02-02 |
| 10 | v1.2 | 2/2 | Complete | 2026-02-12 |
| 11 | v1.3 | 1/1 | Complete | 2026-02-13 |
| 12-15 | v1.4 | 5/5 | Complete | 2026-02-18 |
| 16-17 | v1.5 | 2/2 | Complete | 2026-02-21 |
| 18. Security & Dead Code Removal | v1.6 | 0/? | Not started | - |
| 19. Protocol Compliance | v1.6 | 0/? | Not started | - |
| 20. Tool & Resource Quality | v1.6 | 0/? | Not started | - |
| 21. Response Polish | v1.6 | 0/? | Not started | - |
| 22. End-to-End Testing & Documentation | v1.6 | 0/? | Not started | - |

---
*Roadmap created: 2026-01-28*
*Last updated: 2026-02-21 after v1.6 milestone roadmap created*
