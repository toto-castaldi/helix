# Phase 21: Response Polish - Research

**Researched:** 2026-02-24
**Domain:** MCP tool input validation and JSON response compaction
**Confidence:** HIGH

## Summary

Phase 21 is a focused polish pass on the MCP server (`supabase/functions/helix-mcp/index.ts`, ~2410 lines). It covers two requirements: pre-execution input validation (POL-01) and compact JSON responses (POL-02). No new libraries, no database migrations, no frontend changes are needed. All work is within the single Edge Function file.

**POL-01 (Input Validation):** Currently, tool parameters are extracted via TypeScript `as` casts with zero runtime validation. Missing required fields become `undefined`, invalid UUIDs are passed directly to Supabase queries (which return generic PGRST errors or empty results), and invalid dates cause silent database errors. The fix is a thin validation layer at the top of `executeTool()` that checks required fields exist, UUIDs match the UUID v4 regex, dates match YYYY-MM-DD format, enums match allowed values, and numbers are actually numbers. This catches bad input before any database query fires, returning a clear `[validation_error]` via the existing `toolError()` helper.

**POL-02 (Compact JSON):** Currently, all 18 resource responses use `JSON.stringify(data, null, 2)` (pretty-printed with 2-space indentation). For an MCP server consumed by Claude Code, this whitespace is pure waste -- it inflates every response by ~30-40% with no readability benefit (Claude Code never shows raw JSON to humans). Additionally, Supabase returns `null` for every nullable column not set (e.g., `gym_id: null`, `notes: null`, `weight_kg: null`, `duration_seconds: null`). A `stripNulls()` helper that recursively removes null-valued keys before serialization can further reduce payload size by 10-20% for typical responses.

**Primary recommendation:** Implement a `validateToolInput()` function with per-tool validation rules, and replace all `JSON.stringify(data, null, 2)` calls with `JSON.stringify(stripNulls(data))`. Both changes are mechanical, low-risk transformations in the single `index.ts` file.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| POL-01 | Input validation on tool parameters before executing queries | 16 tools currently extract params via `as` casts with no runtime checks. ~25 UUID params, ~8 date params, ~2 enum params, ~12 numeric params need validation. The existing `toolError('validation_error', ...)` category is already defined and ready. |
| POL-02 | Compact JSON responses, reduced token usage | 18 resource endpoints use `JSON.stringify(data, null, 2)`. Changing to minified JSON + null stripping reduces response tokens by ~30-50%. The JSON-RPC envelope responses (5 places) also use pretty-print. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Edge Functions (Deno) | Current | Runtime for helix-mcp | Already in use, no changes needed |
| Built-in RegExp | N/A | UUID and date format validation | Available in all JS/Deno runtimes |

### Supporting
No new libraries needed. UUID validation uses a regex pattern, date validation uses a regex + `Date.parse()` check.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled regex validation | Zod / Valibot schema library | Adds dependency for 16 schemas; overkill for UUID/date/enum checks on a 2400-line file |
| `JSON.stringify()` replacer function | Custom serializer | Replacer approach is fragile with nested objects; `stripNulls()` recursive walk is simpler and more predictable |

**Installation:** None required.

## Architecture Patterns

### Pattern 1: Centralized Validation Function
**What:** A single `validateToolInput()` function that accepts tool name + args and returns either a validation error or null.
**When to use:** Called at the top of `executeTool()`, before any business logic.
**Example:**
```typescript
// Validation helpers
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidUuid(s: unknown): s is string {
  return typeof s === "string" && UUID_RE.test(s)
}

function isValidDate(s: unknown): s is string {
  return typeof s === "string" && DATE_RE.test(s) && !isNaN(Date.parse(s))
}

function validateToolInput(
  name: string,
  args: Record<string, unknown>
): string | null {
  // Returns error message string, or null if valid
  switch (name) {
    case "create_session": {
      if (!isValidUuid(args.client_id)) return "client_id must be a valid UUID."
      if (!isValidDate(args.session_date)) return "session_date must be a valid date (YYYY-MM-DD)."
      if (args.gym_id !== undefined && !isValidUuid(args.gym_id)) return "gym_id must be a valid UUID."
      return null
    }
    // ... per-tool validation
  }
  return null
}
```

### Pattern 2: Compact JSON Serialization
**What:** Replace `JSON.stringify(data, null, 2)` with `JSON.stringify(stripNulls(data))` for all resource responses.
**When to use:** Every resource response that returns `application/json`.
**Example:**
```typescript
function stripNulls(obj: unknown): unknown {
  if (obj === null || obj === undefined) return undefined
  if (Array.isArray(obj)) return obj.map(stripNulls)
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const stripped = stripNulls(value)
      if (stripped !== undefined) result[key] = stripped
    }
    return result
  }
  return obj
}

// Usage: replace all occurrences
// Before:
JSON.stringify(data || [], null, 2)
// After:
JSON.stringify(stripNulls(data || []))
```

### Pattern 3: Integration Point in executeTool()
**What:** Validation runs as the first step in `executeTool()`, before the switch statement.
**Why:** Single integration point, no duplication across 16 tool cases.
**Example:**
```typescript
async function executeTool(name, args, supabase, userId) {
  // Validation gate - runs before any DB query
  const validationError = validateToolInput(name, args)
  if (validationError) {
    return toolError('validation_error', validationError)
  }

  switch (name) {
    // ... existing tool handlers unchanged
  }
}
```

### Anti-Patterns to Avoid
- **Validation inside each case block:** Duplicates validation logic across 16 tools, easy to miss one.
- **Using JSON schema validation library:** Adding a dependency for what amounts to regex checks on ~45 parameters is over-engineering.
- **Removing nulls at the Supabase query level:** Changing `.select("*")` to explicit column lists is correct for other reasons, but `stripNulls()` handles nested objects/arrays from joins that explicit selects cannot clean.
- **Pretty-printing only the JSON-RPC envelope:** The resource `text` field contains the actual payload; minifying only the outer envelope saves almost nothing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID format check | Custom parser | Regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` | Standard UUID v4 pattern, widely used, no edge cases |
| Date format check | Custom parser | Regex + `Date.parse()` | Catches both format errors (not YYYY-MM-DD) and semantic errors (2024-02-31) |

**Key insight:** The validation surface is small enough (UUIDs, dates, enums, required fields, type checks) that a hand-rolled function per tool is the correct approach. Schema libraries add dependency weight and complexity for marginal benefit at this scale.

## Common Pitfalls

### Pitfall 1: Over-Validating Optional Parameters
**What goes wrong:** Validating that optional params exist, causing valid calls to fail when params are omitted.
**Why it happens:** Confusing "required" schema fields with "must validate if present."
**How to avoid:** Only validate the format of optional params when they are actually provided (`!== undefined`).
**Warning signs:** Tests fail on minimal valid input (e.g., `create_session` with only `client_id` and `session_date`).

### Pitfall 2: stripNulls Breaking Falsy Values
**What goes wrong:** Accidentally stripping `false`, `0`, or `""` alongside `null`.
**Why it happens:** Using `if (!value)` instead of `if (value === null)`.
**How to avoid:** Strict null check: `if (stripped !== undefined)` after converting `null` to `undefined`.
**Warning signs:** Boolean fields like `completed: false` or `skipped: false` disappear from responses; `order_index: 0` is stripped.

### Pitfall 3: Validating Resource URI Parameters
**What goes wrong:** Trying to validate parameters extracted from resource URIs via regex match groups.
**Why it happens:** Resources extract IDs from `helix://clients/{id}` via regex, which is different from tool args.
**How to avoid:** POL-01 scope is tool parameter validation only. Resource URI parsing already returns not_found for invalid IDs via Supabase query failures. Do not add UUID validation to resource handlers -- it would be redundant.
**Warning signs:** Scope creep into resource handlers for something that already works.

### Pitfall 4: Date Validation Rejecting Valid Postgres Dates
**What goes wrong:** Using JavaScript `Date.parse()` which may reject dates that PostgreSQL accepts, or vice versa.
**Why it happens:** Timezone handling differences between JS and Postgres.
**How to avoid:** Validate format only with regex (`/^\d{4}-\d{2}-\d{2}$/`), then use `Date.parse()` only to catch clearly invalid dates like `2024-13-01` or `2024-02-30`. Do not compare against arbitrary min/max dates.
**Warning signs:** Valid dates like `2024-02-29` (leap year) fail validation.

### Pitfall 5: Enum Validation on status Field
**What goes wrong:** Forgetting that `update_session` accepts `status` as optional, and `apply_template_to_session` has `mode` as required with specific enum values.
**Why it happens:** Not checking the inputSchema definitions carefully.
**How to avoid:** Validate enums only when the value is provided (for optional) or always (for required). Currently two enum fields: `status` in `update_session` (optional, values: "planned"/"completed") and `mode` in `apply_template_to_session` (required, values: "append"/"replace").
**Warning signs:** Calls to `update_session` without `status` param fail validation.

## Code Examples

### Complete Validation Helper
```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidUuid(s: unknown): s is string {
  return typeof s === "string" && UUID_RE.test(s)
}

function isValidDate(s: unknown): s is string {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false
  const parsed = Date.parse(s)
  return !isNaN(parsed)
}

function isPositiveNumber(n: unknown): n is number {
  return typeof n === "number" && n > 0 && isFinite(n)
}

function isNonNegativeNumber(n: unknown): n is number {
  return typeof n === "number" && n >= 0 && isFinite(n)
}

function isNonEmptyString(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0
}
```

### Per-Tool Validation (all 16 tools)
```typescript
function validateToolInput(name: string, args: Record<string, unknown>): string | null {
  switch (name) {
    case "create_session": {
      if (!isValidUuid(args.client_id)) return "client_id must be a valid UUID."
      if (!isValidDate(args.session_date)) return "session_date must be a valid date (YYYY-MM-DD)."
      if (args.gym_id !== undefined && !isValidUuid(args.gym_id)) return "gym_id must be a valid UUID."
      return null
    }
    case "update_session": {
      if (!isValidUuid(args.session_id)) return "session_id must be a valid UUID."
      if (args.session_date !== undefined && !isValidDate(args.session_date)) return "session_date must be a valid date (YYYY-MM-DD)."
      if (args.gym_id !== undefined && !isValidUuid(args.gym_id)) return "gym_id must be a valid UUID."
      if (args.status !== undefined && args.status !== "planned" && args.status !== "completed") return "status must be 'planned' or 'completed'."
      return null
    }
    case "delete_session":
    case "complete_session": {
      if (!isValidUuid(args.session_id)) return "session_id must be a valid UUID."
      return null
    }
    case "duplicate_session": {
      if (!isValidUuid(args.session_id)) return "session_id must be a valid UUID."
      if (!isValidDate(args.new_date)) return "new_date must be a valid date (YYYY-MM-DD)."
      if (args.new_client_id !== undefined && !isValidUuid(args.new_client_id)) return "new_client_id must be a valid UUID."
      return null
    }
    case "add_session_exercise": {
      if (!isValidUuid(args.session_id)) return "session_id must be a valid UUID."
      if (!isValidUuid(args.exercise_id)) return "exercise_id must be a valid UUID."
      if (args.sets !== undefined && !isPositiveNumber(args.sets)) return "sets must be a positive number."
      if (args.reps !== undefined && !isPositiveNumber(args.reps)) return "reps must be a positive number."
      if (args.weight_kg !== undefined && !isNonNegativeNumber(args.weight_kg)) return "weight_kg must be a non-negative number."
      if (args.duration_seconds !== undefined && !isPositiveNumber(args.duration_seconds)) return "duration_seconds must be a positive number."
      return null
    }
    case "update_session_exercise": {
      if (!isValidUuid(args.session_exercise_id)) return "session_exercise_id must be a valid UUID."
      if (args.sets !== undefined && !isPositiveNumber(args.sets)) return "sets must be a positive number."
      if (args.reps !== undefined && !isPositiveNumber(args.reps)) return "reps must be a positive number."
      if (args.weight_kg !== undefined && !isNonNegativeNumber(args.weight_kg)) return "weight_kg must be a non-negative number."
      if (args.duration_seconds !== undefined && !isPositiveNumber(args.duration_seconds)) return "duration_seconds must be a positive number."
      return null
    }
    case "remove_session_exercise": {
      if (!isValidUuid(args.session_exercise_id)) return "session_exercise_id must be a valid UUID."
      return null
    }
    case "reorder_session_exercises": {
      if (!isValidUuid(args.session_id)) return "session_id must be a valid UUID."
      if (!Array.isArray(args.exercise_ids)) return "exercise_ids must be an array."
      if (args.exercise_ids.length === 0) return "exercise_ids must not be empty."
      for (const id of args.exercise_ids) {
        if (!isValidUuid(id)) return `exercise_ids contains invalid UUID: ${id}`
      }
      return null
    }
    case "create_training_plan": {
      if (!isValidUuid(args.client_id)) return "client_id must be a valid UUID."
      if (!isValidDate(args.session_date)) return "session_date must be a valid date (YYYY-MM-DD)."
      if (args.gym_id !== undefined && !isValidUuid(args.gym_id)) return "gym_id must be a valid UUID."
      if (!Array.isArray(args.exercises)) return "exercises must be an array."
      if (args.exercises.length === 0) return "exercises must not be empty."
      for (let i = 0; i < args.exercises.length; i++) {
        const ex = args.exercises[i]
        if (!ex || typeof ex !== "object") return `exercises[${i}] must be an object.`
        if (!isNonEmptyString((ex as Record<string,unknown>).exercise_name)) return `exercises[${i}].exercise_name is required.`
      }
      return null
    }
    case "create_group_template": {
      if (!isNonEmptyString(args.name)) return "name is required and must not be empty."
      return null
    }
    case "update_group_template": {
      if (!isValidUuid(args.template_id)) return "template_id must be a valid UUID."
      if (!isNonEmptyString(args.name)) return "name is required and must not be empty."
      return null
    }
    case "delete_group_template": {
      if (!isValidUuid(args.template_id)) return "template_id must be a valid UUID."
      return null
    }
    case "add_template_exercise": {
      if (!isValidUuid(args.template_id)) return "template_id must be a valid UUID."
      if (!isValidUuid(args.exercise_id)) return "exercise_id must be a valid UUID."
      if (args.sets !== undefined && !isPositiveNumber(args.sets)) return "sets must be a positive number."
      if (args.reps !== undefined && !isPositiveNumber(args.reps)) return "reps must be a positive number."
      if (args.weight_kg !== undefined && !isNonNegativeNumber(args.weight_kg)) return "weight_kg must be a non-negative number."
      if (args.duration_seconds !== undefined && !isPositiveNumber(args.duration_seconds)) return "duration_seconds must be a positive number."
      return null
    }
    case "remove_template_exercise": {
      if (!isValidUuid(args.template_exercise_id)) return "template_exercise_id must be a valid UUID."
      return null
    }
    case "apply_template_to_session": {
      if (!isValidUuid(args.template_id)) return "template_id must be a valid UUID."
      if (!isValidUuid(args.session_id)) return "session_id must be a valid UUID."
      if (args.mode !== "append" && args.mode !== "replace") return "mode must be 'append' or 'replace'."
      return null
    }
    default:
      return null // Unknown tools handled by existing switch default
  }
}
```

### stripNulls Helper
```typescript
function stripNulls(obj: unknown): unknown {
  if (obj === null || obj === undefined) return undefined
  if (Array.isArray(obj)) return obj.map(stripNulls)
  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const stripped = stripNulls(value)
      if (stripped !== undefined) result[key] = stripped
    }
    return result
  }
  return obj
}
```

### Compact Resource Response
```typescript
// Before (every resource handler):
return [{ uri, mimeType: "application/json", text: JSON.stringify(data || [], null, 2) }]

// After:
return [{ uri, mimeType: "application/json", text: JSON.stringify(stripNulls(data || [])) }]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Trust LLM to send valid params | Validate before DB query | MCP best practice | Prevents unnecessary DB roundtrips, clearer errors |
| Pretty-print JSON for readability | Minified JSON for machine consumers | Always for API-to-API | 30-40% token reduction per response |
| Return all null fields | Strip null fields from responses | Common in production APIs | 10-20% additional token reduction |

## Open Questions

1. **Should `order_index` allow 0 or only positive?**
   - What we know: DB schema allows 0 (default), current code auto-assigns starting from 0
   - What's unclear: Whether the validation helper should use `isNonNegativeNumber` or `isPositiveNumber` for `order_index`
   - Recommendation: Use `isNonNegativeNumber` for `order_index` since 0 is a valid first position

2. **Should resource URI parameters (e.g., clientId in `helix://clients/{clientId}`) be validated?**
   - What we know: POL-01 says "tool parameters" specifically. Resource handlers extract IDs via regex and pass to Supabase which returns not_found on invalid UUIDs.
   - What's unclear: Whether the success criteria extends to resources
   - Recommendation: Do NOT validate resource URIs -- the success criteria says "tool parameters" and the current behavior already returns clear errors for invalid resource URIs. Scope creep risk.

3. **Should the JSON-RPC envelope itself (outer Response object) also be minified?**
   - What we know: The outer `JSON.stringify(response)` calls (5 places) already use no indentation for error responses, but some use indentation.
   - What's unclear: Whether envelope formatting matters for token count
   - Recommendation: Yes, ensure all `JSON.stringify(response)` calls use no indentation. The envelope is small but consistency matters.

## Inventory: Current Validation Gaps

### Tool Parameters Requiring Validation

| Tool | Parameter | Type | Required | Current Validation | Needed |
|------|-----------|------|----------|-------------------|--------|
| create_session | client_id | UUID | Yes | None | UUID format |
| create_session | session_date | Date | Yes | None | YYYY-MM-DD format |
| create_session | gym_id | UUID | No | None | UUID format if provided |
| update_session | session_id | UUID | Yes | None | UUID format |
| update_session | session_date | Date | No | None | YYYY-MM-DD if provided |
| update_session | gym_id | UUID | No | None | UUID format if provided |
| update_session | status | Enum | No | None | "planned"/"completed" if provided |
| delete_session | session_id | UUID | Yes | None | UUID format |
| complete_session | session_id | UUID | Yes | None | UUID format |
| duplicate_session | session_id | UUID | Yes | None | UUID format |
| duplicate_session | new_date | Date | Yes | None | YYYY-MM-DD format |
| duplicate_session | new_client_id | UUID | No | None | UUID format if provided |
| add_session_exercise | session_id | UUID | Yes | None | UUID format |
| add_session_exercise | exercise_id | UUID | Yes | None | UUID format |
| add_session_exercise | sets | Number | No | None | Positive number if provided |
| add_session_exercise | reps | Number | No | None | Positive number if provided |
| add_session_exercise | weight_kg | Number | No | None | Non-negative number if provided |
| add_session_exercise | duration_seconds | Number | No | None | Positive number if provided |
| update_session_exercise | session_exercise_id | UUID | Yes | None | UUID format |
| update_session_exercise | sets | Number | No | None | Positive number if provided |
| update_session_exercise | reps | Number | No | None | Positive number if provided |
| update_session_exercise | weight_kg | Number | No | None | Non-negative number if provided |
| update_session_exercise | duration_seconds | Number | No | None | Positive number if provided |
| remove_session_exercise | session_exercise_id | UUID | Yes | None | UUID format |
| reorder_session_exercises | session_id | UUID | Yes | None | UUID format |
| reorder_session_exercises | exercise_ids | UUID[] | Yes | None | Non-empty array of valid UUIDs |
| create_training_plan | client_id | UUID | Yes | None | UUID format |
| create_training_plan | session_date | Date | Yes | None | YYYY-MM-DD format |
| create_training_plan | gym_id | UUID | No | None | UUID format if provided |
| create_training_plan | exercises | Array | Yes | None | Non-empty array with exercise_name |
| create_group_template | name | String | Yes | None | Non-empty string |
| update_group_template | template_id | UUID | Yes | None | UUID format |
| update_group_template | name | String | Yes | None | Non-empty string |
| delete_group_template | template_id | UUID | Yes | None | UUID format |
| add_template_exercise | template_id | UUID | Yes | None | UUID format |
| add_template_exercise | exercise_id | UUID | Yes | None | UUID format |
| add_template_exercise | sets | Number | No | None | Positive number if provided |
| add_template_exercise | reps | Number | No | None | Positive number if provided |
| add_template_exercise | weight_kg | Number | No | None | Non-negative number if provided |
| add_template_exercise | duration_seconds | Number | No | None | Positive number if provided |
| remove_template_exercise | template_exercise_id | UUID | Yes | None | UUID format |
| apply_template_to_session | template_id | UUID | Yes | None | UUID format |
| apply_template_to_session | session_id | UUID | Yes | None | UUID format |
| apply_template_to_session | mode | Enum | Yes | None | "append"/"replace" |

**Summary:** 25 UUID params, 4 date params, 2 enum params, 12 numeric params, 2 string params, 2 array params = ~47 parameter validations across 16 tools.

### JSON.stringify Locations Requiring Compaction

| Location | Current | After |
|----------|---------|-------|
| Resource responses (18 places) | `JSON.stringify(data, null, 2)` | `JSON.stringify(stripNulls(data))` |
| Coach summary (1 place) | `JSON.stringify({...}, null, 2)` | `JSON.stringify({...})` (no nulls in constructed object) |
| JSON-RPC error responses (3 places) | `JSON.stringify({...})` | Already minified, no change |
| JSON-RPC success responses (2 places) | `JSON.stringify(response)` | Already minified, no change |

**Total changes:** ~19 `JSON.stringify` calls to update.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of `supabase/functions/helix-mcp/index.ts` (2410 lines) -- all findings based on current code
- Database schema from `supabase/migrations/00000000000000_initial_schema.sql` -- nullable column analysis
- Phase 20 research and summary -- established patterns (toolError, ErrorCategory) this phase builds on

### Secondary (MEDIUM confidence)
- MCP specification patterns for input validation -- based on general best practice rather than specific spec requirement
- JSON compaction token savings estimates (30-50%) -- based on typical Supabase response structures with nullable fields

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, pure refactoring of existing code
- Architecture: HIGH - validation and serialization patterns are well-understood, code examples are complete
- Pitfalls: HIGH - all identified from direct analysis of the current codebase

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (stable domain, no external dependencies)
