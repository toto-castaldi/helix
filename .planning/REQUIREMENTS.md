# Requirements: Helix

**Defined:** 2026-02-21
**Core Value:** During group lessons, the coach can manage shared exercises from a single view, completing them once for all participants

## v1.6 Requirements

Requirements for MCP Assessment & Fix milestone. Each maps to roadmap phases.

### Security & Auth

- [x] **SEC-01**: OAuth 2.1 dead code removed (endpoints, Bearer auth, discovery, ~150 lines)
- [x] **SEC-02**: Write tools verify coach ownership before executing mutations (6 tools: update_session, delete_session, complete_session, update_session_exercise, remove_session_exercise, reorder_session_exercises)

### Protocol Compliance

- [x] **PROTO-01**: Server declares MCP protocol version `2025-03-26`
- [x] **PROTO-02**: Notifications (`initialized`) receive HTTP 202 response instead of JSON-RPC response
- [x] **PROTO-03**: GET requests receive clean 405 response, CORS headers correct for Streamable HTTP

### Tool Quality

- [ ] **TOOL-01**: All tool and resource descriptions translated to English
- [ ] **TOOL-02**: Error responses include `isError: true` flag
- [ ] **TOOL-03**: Tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`) added to all tools
- [x] **TOOL-04**: Duplicate read-only tools removed (keep resources as the read mechanism)

### Polish

- [ ] **POL-01**: Input validation on tool parameters before executing queries
- [ ] **POL-02**: Compact JSON responses, reduced token usage

### Testing & Documentation

- [ ] **TEST-01**: Systematic end-to-end testing of all tools, resources, and prompts with Claude Code
- [ ] **TEST-02**: Landing page section explaining how to configure Claude Code to use Helix MCP

## Future Requirements

None — scope is fix and polish only.

## Out of Scope

| Feature | Reason |
|---------|--------|
| MCP SDK migration | Rewriting 2,500 lines of business logic for marginal benefit |
| New MCP tools/resources | Scope is fix existing, not add new |
| Claude Web / OAuth support | Claude Web integration broken, removing dead code instead |
| SSE streaming | Stateless JSON responses sufficient for Supabase Edge Functions |
| Session management | Stateless pattern correct for serverless, no session IDs needed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 18 | Complete |
| SEC-02 | Phase 18 | Complete |
| PROTO-01 | Phase 19 | Complete |
| PROTO-02 | Phase 19 | Complete |
| PROTO-03 | Phase 19 | Complete |
| TOOL-01 | Phase 20 | Pending |
| TOOL-02 | Phase 20 | Pending |
| TOOL-03 | Phase 20 | Pending |
| TOOL-04 | Phase 20 | Complete |
| POL-01 | Phase 21 | Pending |
| POL-02 | Phase 21 | Pending |
| TEST-01 | Phase 22 | Pending |
| TEST-02 | Phase 22 | Pending |

**Coverage:**
- v1.6 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

**Integration gaps (from v1.6 audit, no REQ-ID):**
- Read resource ownership (goals, sessions) → Phase 20
- Inconsistent list_sessions join pattern → Phase 20

---
*Requirements defined: 2026-02-21*
*Last updated: 2026-02-23 after gap closure analysis (integration gaps assigned to Phase 20)*
