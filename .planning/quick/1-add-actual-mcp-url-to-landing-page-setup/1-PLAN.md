---
phase: quick-1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/landing/main.ts
  - .github/workflows/deploy.yml
autonomous: true
requirements: [QUICK-1]
must_haves:
  truths:
    - "Landing page MCP setup section shows the actual production MCP URL, not a placeholder"
    - "The MCP command block is copy-pasteable with the real URL (only API key needs replacing)"
    - "Landing page build receives VITE_SUPABASE_URL from CI so the URL is injected at build time"
  artifacts:
    - path: "src/landing/main.ts"
      provides: "Dynamic MCP URL constructed from VITE_SUPABASE_URL"
      contains: "functions/v1/helix-mcp"
    - path: ".github/workflows/deploy.yml"
      provides: "VITE_SUPABASE_URL passed to landing build step"
      contains: "VITE_SUPABASE_URL"
  key_links:
    - from: ".github/workflows/deploy.yml"
      to: "src/landing/main.ts"
      via: "VITE_SUPABASE_URL env var at build time"
      pattern: "import\\.meta\\.env\\.VITE_SUPABASE_URL"
---

<objective>
Replace the placeholder `YOUR_HELIX_MCP_URL` in the landing page MCP integration section with the actual production Supabase Edge Function URL, so coaches see a ready-to-use `claude mcp add` command.

Purpose: Coaches currently see "YOUR_HELIX_MCP_URL" and a vague note to "find your personal MCP URL in Settings" -- but the MCP URL is the same for all coaches (it is the Supabase Edge Function endpoint). Only the API key is personal. This change removes confusion and makes the setup truly copy-pasteable.

Output: Updated landing page with real MCP URL derived from `VITE_SUPABASE_URL` at build time, and updated CI to pass that env var to the landing build.
</objective>

<execution_context>
@/home/toto/.claude/get-shit-done/workflows/execute-plan.md
@/home/toto/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/landing/main.ts
@.github/workflows/deploy.yml
@CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Pass VITE_SUPABASE_URL to landing build and replace MCP URL placeholder</name>
  <files>src/landing/main.ts, .github/workflows/deploy.yml</files>
  <action>
**Step 1 - Update `.github/workflows/deploy.yml`:**

In the "Build landing app" step (around line 52-55), add `VITE_SUPABASE_URL` to the env block, matching how it is already done for "Build main app" and "Build live app":

```yaml
      - name: Build landing app
        run: npm run build:landing
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_APP_VERSION: ${{ steps.version.outputs.version }}
```

**Step 2 - Update `src/landing/main.ts`:**

At the top of the file (near the existing `APP_VERSION` const), add:
```ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const MCP_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/helix-mcp` : 'YOUR_HELIX_MCP_URL'
```

This provides a graceful fallback: if the env var is missing (local dev without .env), it falls back to the placeholder.

**Step 3 - Update the `mcpCommand` strings for both `it` and `en` translations:**

Replace `YOUR_HELIX_MCP_URL` with `${MCP_URL}` in the template literal. The result should look like:

For `it`:
```ts
mcpCommand: `claude mcp add --transport http helix \\
  --header "X-Helix-API-Key: YOUR_API_KEY" \\
  ${MCP_URL}`,
```

For `en`:
```ts
mcpCommand: `claude mcp add --transport http helix \\
  --header "X-Helix-API-Key: YOUR_API_KEY" \\
  ${MCP_URL}`,
```

**Step 4 - Update the `mcpNote` strings:**

Since the URL is no longer a mystery, update the note text:

For `it`:
```ts
mcpNote: 'Sostituisci YOUR_API_KEY con la chiave generata nella pagina Impostazioni.',
```

For `en`:
```ts
mcpNote: 'Replace YOUR_API_KEY with the key generated in the Settings page.',
```

This makes the note focus on the only remaining placeholder (the API key), instead of the now-resolved URL.

**Do NOT** change any other part of the landing page (CSS, HTML structure, features, etc.).
  </action>
  <verify>
    <automated>cd /home/toto/scm-projects/helix && npx vite build --config vite.config.landing.ts 2>&1 | tail -5 && grep -c "YOUR_HELIX_MCP_URL" src/landing/main.ts | xargs -I{} test {} -eq 0 && echo "PASS: no placeholder in source" || echo "FAIL: placeholder still present"</automated>
    <manual>Check dist-landing output contains "functions/v1/helix-mcp" (or fallback if no env var). Check deploy.yml has VITE_SUPABASE_URL in landing build step.</manual>
  </verify>
  <done>
    - `src/landing/main.ts` no longer contains the literal string `YOUR_HELIX_MCP_URL` as a hardcoded value (it may appear only as a fallback in the const declaration)
    - The `mcpCommand` for both IT and EN uses the dynamic `MCP_URL` variable
    - The `mcpNote` for both IT and EN references only the API key placeholder, not the URL
    - `.github/workflows/deploy.yml` passes `VITE_SUPABASE_URL` to the landing build step
    - `npm run build:landing` succeeds without errors
  </done>
</task>

</tasks>

<verification>
- `npm run build:landing` completes successfully
- `grep "functions/v1/helix-mcp" src/landing/main.ts` finds the MCP endpoint pattern
- `grep "VITE_SUPABASE_URL" .github/workflows/deploy.yml` shows the env var in the landing build step
- The mcpCommand template literals use the dynamic MCP_URL variable instead of a hardcoded placeholder
</verification>

<success_criteria>
The landing page MCP integration section displays the actual production MCP endpoint URL (derived from VITE_SUPABASE_URL at build time). Coaches can copy the `claude mcp add` command and only need to replace their API key -- the URL is pre-filled.
</success_criteria>

<output>
After completion, create `.planning/quick/1-add-actual-mcp-url-to-landing-page-setup/1-SUMMARY.md`
</output>
