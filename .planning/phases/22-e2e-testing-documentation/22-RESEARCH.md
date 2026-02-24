# Phase 22: End-to-End Testing & Documentation - Research

**Researched:** 2026-02-24
**Domain:** MCP server E2E testing with Claude Code + landing page documentation
**Confidence:** HIGH

## Summary

Phase 22 has two distinct requirements: (1) systematically test every MCP capability end-to-end with Claude Code to confirm it works, and (2) add a documentation section to the landing page explaining how coaches configure Claude Code to use Helix MCP.

The MCP server (`supabase/functions/helix-mcp/index.ts`) exposes 20 resources, 16 tools, and 5 prompts. All have been progressively hardened through Phases 18-21 (security, protocol compliance, quality, polish). The E2E testing is a manual verification pass using curl against the local Supabase Edge Functions, confirming every JSON-RPC method returns correct results. The landing page (`src/landing/main.ts`) is a vanilla TypeScript + Tailwind CSS SPA that needs a new "MCP Integration" section with the `claude mcp add` command.

**Primary recommendation:** Create two plans: (1) a systematic E2E test plan that exercises every resource URI, every tool, and every prompt via curl against local Supabase, and (2) a landing page documentation plan that adds an MCP integration section with the exact `claude mcp add --transport http` command and configuration examples.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEST-01 | Systematic end-to-end testing of all tools, resources, and prompts with Claude Code | Complete MCP inventory (20 resources, 16 tools, 5 prompts) documented; curl-based testing protocol against local Supabase established in CLAUDE.md; JSON-RPC request format known |
| TEST-02 | Landing page section explaining how to configure Claude Code to use Helix MCP | `claude mcp add --transport http` syntax verified from official docs; landing page source structure understood (vanilla TS + i18n); production MCP URL pattern known |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase CLI | 2.x | Local Edge Functions serving for E2E tests | Already installed, `npx supabase functions serve` documented in CLAUDE.md |
| curl | system | JSON-RPC request testing | Universal HTTP client, already used in project's test documentation |
| jq | system | JSON response parsing/validation | Standard JSON processor for shell-based testing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 4.x (via @tailwindcss/vite) | Landing page styling | Already used in landing page CSS |
| Vite | 6.x | Landing page dev/build | Already configured in vite.config.landing.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| curl-based testing | Playwright/Puppeteer E2E tests | Massive complexity for testing a JSON-RPC API; curl is sufficient and already documented |
| Manual test script | Automated test suite (Vitest/Jest) | No test infrastructure exists in this project; creating one is out of scope for v1.6 "fix and polish" |

## Architecture Patterns

### Pattern 1: Curl-Based MCP E2E Testing

**What:** A systematic bash-based test sequence that exercises every MCP method by sending JSON-RPC POST requests to the local Supabase Edge Functions endpoint.

**When to use:** For verifying MCP server correctness without adding test framework dependencies.

**The test flow:**
1. Start local Supabase (`npm run supabase:start`)
2. Serve Edge Functions (`npx supabase functions serve --env-file supabase/.env`)
3. Generate test API key and insert hash into database
4. Run curl requests for each method category in order: initialize, resources/list, resources/read (all 20 URIs), tools/list, tools/call (all 16 tools), prompts/list, prompts/get (all 5 prompts)
5. Verify responses contain expected structure (jsonrpc, id, result fields)

**Request template:**
```bash
curl -s -X POST http://127.0.0.1:54321/functions/v1/helix-mcp \
  -H "Content-Type: application/json" \
  -H "X-Helix-API-Key: $TEST_API_KEY" \
  -d '{"jsonrpc": "2.0", "method": "METHOD_NAME", "id": N, "params": PARAMS}' | jq .
```

### Pattern 2: Landing Page I18n Section Addition

**What:** Adding a new bilingual feature card and/or documentation section to the landing page's translation system.

**When to use:** The landing page uses a `translations` record with `it` and `en` keys. Any new content must be added to both languages.

**The landing page structure:**
- `landing.html` - Entry point HTML
- `src/landing/main.ts` - Renders the page from `translations` object, includes hero, features grid, and footer
- `src/landing/style.css` - All styles (vanilla CSS with Tailwind)
- Build: `npm run build:landing` outputs to `dist-landing/`

**Current feature cards (4):**
1. AI Planning / Pianificazione AI
2. Client Management / Gestione Clienti
3. Live Coaching / Coaching Live
4. Exercise Library / Libreria Esercizi

**Adding the MCP section** requires:
1. Adding new translation entries to both `it` and `en` in the `translations` object
2. Adding a new section to the `render()` function template literal
3. Adding CSS styles for the new section (code block styling, copy-friendly formatting)
4. Rebuilding with `npm run build:landing`

### Anti-Patterns to Avoid

- **Testing only happy paths:** Must also test error cases (invalid UUID, missing required params, non-existent resources) to confirm Phase 21 validation works
- **Testing tools without seed data:** Tools like `create_session` need a real `client_id` -- must use seed data or create test data first
- **Hardcoding Supabase project URL in landing page:** The MCP URL contains the Supabase project ref which is a secret. Use a placeholder like `<YOUR_SUPABASE_URL>` in the landing page and explain coaches find it in Settings
- **Adding the MCP section as a feature card:** An MCP setup section with code blocks does not fit the current feature card grid format. Use a dedicated documentation section below the features grid

## Complete MCP Inventory

### Resources (20 total)

**Concrete URIs (8):**
| URI | Name | Type |
|-----|------|------|
| `helix://clients` | clients-list | application/json |
| `helix://gyms` | gyms-list | application/json |
| `helix://exercises` | exercises-list | application/json |
| `helix://exercises/tags` | exercise-tags | application/json |
| `helix://sessions` | sessions-list | application/json |
| `helix://sessions/planned` | sessions-planned | application/json |
| `helix://group-templates` | group-templates-list | application/json |
| `helix://coach/summary` | coach-summary | application/json |
| `helix://today` | today-sessions | application/json |

**Templated URIs (11):**
| URI Template | Name | Type |
|--------------|------|------|
| `helix://clients/{clientId}` | client-detail | application/json |
| `helix://clients/{clientId}/card` | client-card | text/markdown |
| `helix://clients/{clientId}/goals` | client-goals | application/json |
| `helix://clients/{clientId}/sessions` | client-sessions | application/json |
| `helix://gyms/{gymId}` | gym-detail | application/json |
| `helix://exercises/{exerciseId}` | exercise-detail | application/json |
| `helix://exercises/{exerciseId}/lumio` | exercise-lumio | text/markdown |
| `helix://exercises/tags/{tag}` | exercises-by-tag | application/json |
| `helix://sessions/date/{date}` | sessions-by-date | application/json |
| `helix://sessions/{sessionId}` | session-detail | application/json |
| `helix://group-templates/{templateId}` | group-template-detail | application/json |

### Tools (16 total)

| Tool | Required Params | Destructive |
|------|----------------|-------------|
| `create_session` | client_id, session_date | No |
| `update_session` | session_id | No |
| `delete_session` | session_id | Yes |
| `complete_session` | session_id | No |
| `duplicate_session` | session_id, new_date | No |
| `add_session_exercise` | session_id, exercise_id | No |
| `update_session_exercise` | session_exercise_id | No |
| `remove_session_exercise` | session_exercise_id | Yes |
| `reorder_session_exercises` | session_id, exercise_ids[] | No |
| `create_training_plan` | client_id, session_date, exercises[] | No |
| `create_group_template` | name | No |
| `update_group_template` | template_id, name | No |
| `delete_group_template` | template_id | Yes |
| `add_template_exercise` | template_id, exercise_id | No |
| `remove_template_exercise` | template_exercise_id | Yes |
| `apply_template_to_session` | template_id, session_id, mode | No |

### Prompts (5 total)

| Prompt | Required Args |
|--------|--------------|
| `plan-session` | client_id |
| `weekly-plan` | client_id, start_date, sessions_count |
| `session-review` | session_id |
| `daily-briefing` | (none required, optional: date) |
| `template-analysis` | (none) |

### Protocol Methods

| Method | Auth Required | Notes |
|--------|--------------|-------|
| `initialize` | No | Returns protocolVersion 2025-03-26, serverInfo, capabilities |
| `notifications/initialized` | No | Returns HTTP 202 with no body |
| `resources/list` | Yes | Returns 20 resources |
| `resources/read` | Yes | Requires `uri` param |
| `tools/list` | Yes | Returns 16 tools |
| `tools/call` | Yes | Requires `name` and `arguments` params |
| `prompts/list` | Yes | Returns 5 prompts |
| `prompts/get` | Yes | Requires `name` param |
| `ping` | Yes | Returns empty result |
| GET request | No | Returns 405 |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test framework | Custom test runner | Bash script with curl + jq | No test infrastructure exists; curl is already documented as the testing approach in CLAUDE.md |
| Landing page framework | React/Vue component system | Vanilla TS template literals (existing pattern) | Landing page is intentionally lightweight; stick with existing architecture |
| Code syntax highlighting | Custom highlighter | CSS-only `<pre><code>` styling | A single code block does not justify a syntax highlighting library |

**Key insight:** Phase 22 is a verification and documentation phase, not a feature-building phase. Use the simplest tools that get the job done.

## Common Pitfalls

### Pitfall 1: Testing Resources Without Seed Data
**What goes wrong:** Templated resources like `helix://clients/{clientId}` need real UUIDs from the database. Testing against an empty database returns empty arrays or not-found errors that look like bugs.
**Why it happens:** Local Supabase starts with only seed exercises, no clients, sessions, or gyms.
**How to avoid:** The test script must create test data first: insert a test client, gym, session, and exercises via SQL or via the MCP tools themselves (create_session, add_session_exercise, etc.). Use the tools to bootstrap data, then verify reads return it correctly.
**Warning signs:** All `resources/read` calls return empty arrays or "not found" errors.

### Pitfall 2: Test Data Cleanup Between Test Runs
**What goes wrong:** Repeated test runs accumulate test data, causing list endpoints to return unexpected counts.
**Why it happens:** No cleanup step between test runs.
**How to avoid:** Use `npm run supabase:reset` before each test run to start from a clean seed state, then create test data fresh.

### Pitfall 3: Landing Page Code Block Not Copy-Friendly on Mobile
**What goes wrong:** The `claude mcp add` command is long. On mobile screens, `<pre>` blocks with horizontal scroll are hard to select and copy.
**Why it happens:** CSS overflow-x: auto on narrow screens.
**How to avoid:** Style the code block with word-wrap for mobile, or break the command into multiple lines with backslash continuations. Add a CSS class for the code block that ensures readability.

### Pitfall 4: Forgetting to Build Landing Page After Changes
**What goes wrong:** Changes to `src/landing/main.ts` or `src/landing/style.css` are not reflected in `dist-landing/` which is what gets deployed.
**Why it happens:** The build output (`dist-landing/`) is committed to git and deployed directly.
**How to avoid:** Always run `npm run build:landing` after making changes and commit both source and built files.

### Pitfall 5: MCP URL Contains Secret Supabase Project Reference
**What goes wrong:** The Supabase URL (e.g., `https://abcdefg.supabase.co`) contains the project reference which is stored as a GitHub secret.
**Why it happens:** The URL is dynamic per-deployment.
**How to avoid:** In the landing page, do NOT embed the actual production URL. Instead, explain that coaches find their specific URL in the Helix Settings page (which already shows the MCP configuration with the correct URL). Use a placeholder like `https://<project-ref>.supabase.co/functions/v1/helix-mcp` or better, reference the Settings page as the source of truth.

## Code Examples

### E2E Test: Initialize
```bash
curl -s -X POST http://127.0.0.1:54321/functions/v1/helix-mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "id": 1, "params": {"protocolVersion": "2025-03-26", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0"}}}' | jq .
# Expected: result.protocolVersion == "2025-03-26", result.serverInfo.name == "helix-fitness-coach"
```

### E2E Test: Notification (HTTP 202)
```bash
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:54321/functions/v1/helix-mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "notifications/initialized"}')
# Expected: STATUS == 202
```

### E2E Test: Resource Read
```bash
curl -s -X POST http://127.0.0.1:54321/functions/v1/helix-mcp \
  -H "Content-Type: application/json" \
  -H "X-Helix-API-Key: $TEST_API_KEY" \
  -d '{"jsonrpc": "2.0", "method": "resources/read", "id": 10, "params": {"uri": "helix://coach/summary"}}' | jq .
# Expected: result.contents[0].text contains JSON with total_clients, total_sessions, etc.
```

### E2E Test: Tool Call
```bash
curl -s -X POST http://127.0.0.1:54321/functions/v1/helix-mcp \
  -H "Content-Type: application/json" \
  -H "X-Helix-API-Key: $TEST_API_KEY" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "id": 50, "params": {"name": "create_session", "arguments": {"client_id": "'$CLIENT_ID'", "session_date": "2026-03-01"}}}' | jq .
# Expected: result.content[0].text contains JSON with session id
```

### E2E Test: Validation Error
```bash
curl -s -X POST http://127.0.0.1:54321/functions/v1/helix-mcp \
  -H "Content-Type: application/json" \
  -H "X-Helix-API-Key: $TEST_API_KEY" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "id": 60, "params": {"name": "create_session", "arguments": {"client_id": "not-a-uuid", "session_date": "2026-03-01"}}}' | jq .
# Expected: result.content[0].text contains "client_id must be a valid UUID", result.isError == true
```

### Landing Page: Claude Code MCP Add Command
```bash
# The exact command coaches will run:
claude mcp add --transport http helix \
  --header "X-Helix-API-Key: YOUR_API_KEY" \
  https://<project-ref>.supabase.co/functions/v1/helix-mcp
```

### Landing Page: Translation Entry Pattern
```typescript
// In src/landing/main.ts translations object:
// Add to both 'it' and 'en' keys
mcpTitle: 'Integrazione Claude Code',     // or English equivalent
mcpDescription: '...',
mcpCommand: 'claude mcp add --transport http helix ...',
```

### Landing Page: New Section HTML Pattern
```typescript
// In the render() function template literal, after features section:
<!-- MCP Integration Section -->
<section class="mcp-setup">
  <h2 class="mcp-title">${t.mcpTitle}</h2>
  <p class="mcp-desc">${t.mcpDescription}</p>
  <div class="mcp-code-block">
    <pre><code>${t.mcpCommand}</code></pre>
  </div>
  <p class="mcp-note">${t.mcpNote}</p>
</section>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Claude Desktop JSON config | `claude mcp add --transport http` CLI | Claude Code 2.x (2025) | Coaches use a single terminal command instead of editing JSON files |
| `.mcp.json` manual editing | `claude mcp add-json` CLI | Claude Code 2.1.1+ | JSON configs can be added programmatically |
| OAuth 2.1 for MCP auth | API key via `--header` flag | Phase 18 decision | Simpler, more reliable auth (OAuth code removed) |
| Italian tool descriptions | English descriptions | Phase 20 | Better Claude tool selection and error recovery |

**Deprecated/outdated:**
- SSE transport: Deprecated in favor of HTTP (Streamable HTTP). Use `--transport http` not `--transport sse`.
- Claude Desktop config file editing: Still works but `claude mcp add` CLI is the recommended approach.

## Testing Strategy

### Test Categories

1. **Protocol tests** (4 tests): initialize, notification, GET 405, ping
2. **Resource list tests** (1 test): resources/list returns 20 resources
3. **Resource read tests** (20 tests): One for each resource URI (concrete + templated with test data IDs)
4. **Tool list tests** (1 test): tools/list returns 16 tools
5. **Tool execution tests** (16 tests): One for each tool with valid params
6. **Tool validation tests** (~5 sample tests): Invalid UUID, missing required, wrong type
7. **Prompt list tests** (1 test): prompts/list returns 5 prompts
8. **Prompt get tests** (5 tests): One for each prompt
9. **Auth tests** (2 tests): Missing API key returns 401, invalid API key returns 401

**Total: ~55 test cases**

### Test Data Dependencies

To test templated resources and tools, need:
- 1+ client (for client resources, session creation)
- 1+ gym (for gym resources, session creation)
- 1+ session with exercises (for session resources, exercise tools)
- 1+ group template with exercises (for template resources, template tools)

These can be created either via SQL INSERT or by using the tools themselves (create_session, add_session_exercise, etc.) during the test sequence.

### Test Execution Order

1. **Setup:** Start Supabase, serve functions, generate API key, insert test user
2. **Seed:** Create test client, gym via SQL (or use seed data)
3. **Protocol:** Test initialize, notification, GET, ping
4. **Read:** Test resources/list, then resources/read for all concrete URIs
5. **Create:** Use tools to create session, add exercises, create template -- captures IDs
6. **Read templated:** Test resources/read for all templated URIs using captured IDs
7. **Update:** Test update tools (update_session, update_session_exercise, etc.)
8. **Prompts:** Test prompts/list, then prompts/get for each prompt
9. **Validation:** Test invalid inputs to confirm error responses
10. **Destructive:** Test delete/remove tools last (cleanup)
11. **Auth:** Test unauthenticated and bad-key requests

## Landing Page Design Considerations

### Content Structure

The MCP integration section should be placed between the features grid and the footer, as a dedicated documentation section distinct from the feature cards.

**Content to include:**
1. Section title: "Claude Code Integration" / "Integrazione Claude Code"
2. Brief explanation (1-2 sentences): What this enables
3. Step-by-step setup:
   a. Generate API key in Helix Settings
   b. Run `claude mcp add` command in terminal
4. The exact command with placeholder values
5. Note that the specific URL is available in the Helix Settings page

**MCP URL approach:** Reference the Settings page as the source of truth for the URL. The landing page shows the command structure:
```
claude mcp add --transport http helix \
  --header "X-Helix-API-Key: YOUR_API_KEY" \
  YOUR_HELIX_MCP_URL
```
The Settings page already renders the correct URL using `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/helix-mcp`.

### Styling

Match existing landing page aesthetic:
- Warm background (#fffbf5)
- Amber/coral/violet gradient accents
- Card-style container with subtle border
- `<pre>` code block with `bg-muted` equivalent styling (light gray background)
- Mobile-responsive (code block should not overflow badly)

## Open Questions

1. **Should the test results be persisted in a file?**
   - What we know: The requirement says "systematically tested" and "confirmed working"
   - What's unclear: Whether a test results file should be committed to the repo
   - Recommendation: Create a test script that outputs pass/fail results to stdout. The planner should document results in the plan's SUMMARY.md as evidence of completion.

2. **What is the production Supabase URL?**
   - What we know: It is a GitHub secret (`VITE_SUPABASE_URL`), format `https://<ref>.supabase.co`
   - What's unclear: The exact URL (it is a secret)
   - Recommendation: Use a generic placeholder in the landing page. The Settings page already shows the real URL dynamically.

## Sources

### Primary (HIGH confidence)
- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp) - Verified `claude mcp add --transport http` syntax, `--header` flag, scope options, `add-json` alternative
- Existing codebase (`supabase/functions/helix-mcp/index.ts`) - Complete MCP server implementation with all 20 resources, 16 tools, 5 prompts
- Existing codebase (`src/landing/main.ts`, `src/landing/style.css`) - Landing page architecture, i18n system, styling patterns
- CLAUDE.md - Local development setup, test commands, MCP server test instructions

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` - Known Claude Code header bugs and OAuth interference (documented with issue links)
- Previous phase summaries (20-01, 20-02, 21-01) - Confirmed all prior improvements are in place

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; curl + jq for testing, existing landing page stack for docs
- Architecture: HIGH - Both patterns (curl E2E testing, landing page section) are straightforward with clear precedent in the codebase
- Pitfalls: HIGH - Based on direct codebase analysis and documented issues from prior research

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (stable -- MCP server and landing page are well-understood)
