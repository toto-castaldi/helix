# Phase 7: MCP Template Integration - Research

**Researched:** 2026-02-02
**Domain:** MCP Protocol Extension / Supabase Edge Functions
**Confidence:** HIGH

## Summary

This phase extends the existing helix-mcp Edge Function with resources and tools for group templates. The existing MCP implementation is mature (17 resources, 10+ tools, 4 prompts) and provides clear patterns to follow. The template database schema (Phase 5) and UI hook (Phase 6) are complete and provide the data access patterns to replicate.

The implementation is straightforward:
1. Add 2 new resources following existing patterns
2. Add 6 new tools following existing patterns
3. Update 1 existing prompt to be template-aware
4. Add 1 new analysis prompt

**Primary recommendation:** Follow the existing helix-mcp patterns exactly. Copy-paste existing resource/tool handlers and adapt for templates. No new libraries or patterns needed.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Edge Functions | Deno runtime | Serverless function hosting | Already in use by helix-mcp |
| supabase-js | v2 | Database client with RLS | Already in use, handles auth |
| JSON-RPC 2.0 | 2024-11-05 | MCP protocol transport | Already implemented |

### Supporting
No additional libraries needed. All infrastructure exists.

### Alternatives Considered
None - this is an extension of existing code.

**Installation:**
```bash
# No additional installation - extend existing helix-mcp/index.ts
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/functions/helix-mcp/
└── index.ts           # Single file, extend with template handlers
```

The existing MCP server is a single ~1950 line file. Templates will add approximately 300-400 lines:
- ~50 lines for 2 resources
- ~200 lines for 6 tools
- ~50 lines for 2 prompts (1 new, 1 enhanced)
- ~50 lines for type definitions

### Pattern 1: Resource Handler Pattern
**What:** Resources return data via `readResource()` function, matching URI patterns
**When to use:** For read-only data access
**Example (from existing code):**
```typescript
// helix://sessions/{id} pattern in readResource()
const sessionDetailMatch = uri.match(/^helix:\/\/sessions\/([^\/]+)$/)
if (sessionDetailMatch) {
  const sessionId = sessionDetailMatch[1]
  const { data, error } = await supabase
    .from("sessions")
    .select(`*...`)
    .eq("id", sessionId)
    .single()

  if (error) throw new Error(`Sessione non trovata: ${sessionId}`)
  return [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }]
}
```

### Pattern 2: Tool Handler Pattern
**What:** Tools execute mutations via `executeTool()` switch statement
**When to use:** For data mutations (create, update, delete)
**Example (from existing code):**
```typescript
// In executeTool() switch
case "create_session": {
  const { client_id, session_date, gym_id, notes } = args as { ... }

  // Validate ownership
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id")
    .eq("id", client_id)
    .eq("user_id", userId)
    .single()

  if (clientErr || !client) {
    return { content: [{ type: "text", text: "Errore: Cliente non trovato o non autorizzato" }] }
  }

  // Execute mutation
  const { data, error } = await supabase.from("sessions").insert({...}).select("id").single()

  if (error) {
    return { content: [{ type: "text", text: `Errore: ${error.message}` }] }
  }

  return { content: [{ type: "text", text: `Sessione creata con successo. ID: ${data.id}` }] }
}
```

### Pattern 3: Tool Definition Pattern
**What:** Tool definitions in `getToolDefinitions()` use JSON Schema
**When to use:** All tools
**Example (from existing code):**
```typescript
{
  name: "add_session_exercise",
  description: "Aggiunge un esercizio a una sessione",
  inputSchema: {
    type: "object",
    properties: {
      session_id: { type: "string", description: "ID della sessione" },
      exercise_id: { type: "string", description: "ID dell'esercizio" },
      sets: { type: "number", description: "Numero di serie" },
      // ...optional fields...
    },
    required: ["session_id", "exercise_id"],
  },
}
```

### Pattern 4: Prompt Handler Pattern
**What:** Prompts build context and return structured messages
**When to use:** For AI-guided workflows
**Example (from existing code):**
```typescript
case "plan-session": {
  const { client_id, focus_areas, session_date } = args as {...}

  // Fetch context
  const result = await fetchClientWithDetails(supabase, userId, client_id)
  if (!result) throw new Error(`Cliente non trovato: ${client_id}`)

  // Build prompt text
  return {
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Sei un personal trainer esperto. Pianifica una sessione...`
      }
    }]
  }
}
```

### Anti-Patterns to Avoid
- **Separate files:** Don't split MCP handlers into multiple files. Keep in single index.ts.
- **Complex RLS bypass:** Don't use service role for data that should respect RLS. Use authenticated client.
- **Missing validation:** Always validate ownership before mutations.
- **Inconsistent language:** Keep Italian for user-facing messages to match existing code.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URI parsing | Custom parser | Regex patterns like existing code | Consistent with rest of codebase |
| JSON-RPC handling | Custom protocol | Existing handleJsonRpc() | Already implemented |
| Error responses | Custom format | `{ content: [{ type: "text", text: "Errore: ..." }] }` | MCP standard format |
| Template counting | Complex queries | Simple count query on session_exercises | Already have the pattern |

**Key insight:** This is purely additive code. Every pattern exists already.

## Common Pitfalls

### Pitfall 1: RLS not respected in template queries
**What goes wrong:** Template data leaks to other coaches
**Why it happens:** Using service role client or missing user_id filter
**How to avoid:** Always filter by user_id for templates, rely on RLS for session_exercises
**Warning signs:** Tests pass locally but fail in production

### Pitfall 2: apply_template_to_session overwrites individual exercises
**What goes wrong:** mode='replace' removes ALL exercises, not just group ones
**Why it happens:** Missing `is_group=true` filter in delete
**How to avoid:** Match the UI implementation exactly:
```typescript
if (mode === 'replace') {
  await supabase
    .from('session_exercises')
    .delete()
    .eq('session_id', sessionId)
    .eq('is_group', true)  // CRITICAL: Only group exercises!
}
```
**Warning signs:** Individual exercises disappear after applying template

### Pitfall 3: Delete template while in use
**What goes wrong:** Database constraint error (ON DELETE RESTRICT)
**Why it happens:** Not checking session_exercises.template_id before delete
**How to avoid:** Check canDeleteTemplate() pattern from useGroupTemplates:
```typescript
const { count } = await supabase
  .from('session_exercises')
  .select('id', { count: 'exact', head: true })
  .eq('template_id', templateId)

if (count > 0) {
  return { content: [{ type: "text", text: "Errore: Template in uso in una o piu sessioni" }] }
}
```
**Warning signs:** DB constraint error returned to AI client

### Pitfall 4: order_index not auto-calculated for template exercises
**What goes wrong:** Exercises have duplicate or null order_index
**Why it happens:** Not computing next order_index when adding exercise
**How to avoid:** Copy pattern from addExercise in useGroupTemplates:
```typescript
const { data: existing } = await supabase
  .from('group_template_exercises')
  .select('order_index')
  .eq('template_id', templateId)
  .order('order_index', { ascending: false })
  .limit(1)

const nextOrder = existing?.[0]?.order_index + 1 ?? 0
```
**Warning signs:** Exercises appear in wrong order

### Pitfall 5: template_id not set when applying template
**What goes wrong:** Session exercises are not linked to template, edit blocking fails
**Why it happens:** Forgetting to include template_id in insert
**How to avoid:** Always include template_id link:
```typescript
const exercisesToInsert = template.exercises.map((ex, idx) => ({
  session_id: sessionId,
  exercise_id: ex.exercise_id,
  template_id: templateId,  // CRITICAL!
  is_group: true,
  // ...other fields
}))
```
**Warning signs:** Edit button enabled on template exercises in UI

## Code Examples

### Resource: Template List (helix://group-templates)
```typescript
// Source: Pattern from existing helix://sessions
if (uri === "helix://group-templates") {
  const { data, error } = await supabase
    .from("group_templates")
    .select(`
      id, name, created_at, updated_at,
      exercises:group_template_exercises(
        id,
        exercise:exercises(id, name)
      )
    `)
    .eq("user_id", userId)
    .order("name")

  if (error) throw new Error(error.message)

  // Transform for preview: count + first 3 exercise names
  const templatesWithPreview = (data || []).map(t => ({
    id: t.id,
    name: t.name,
    exercise_count: t.exercises?.length || 0,
    exercise_preview: t.exercises?.slice(0, 3).map(e => e.exercise?.name).filter(Boolean) || [],
    created_at: t.created_at,
    updated_at: t.updated_at,
  }))

  return [{ uri, mimeType: "application/json", text: JSON.stringify(templatesWithPreview, null, 2) }]
}
```

### Resource: Template Detail (helix://group-templates/{id})
```typescript
// Source: Pattern from existing helix://sessions/{id}
const templateDetailMatch = uri.match(/^helix:\/\/group-templates\/([^\/]+)$/)
if (templateDetailMatch) {
  const templateId = templateDetailMatch[1]
  const { data, error } = await supabase
    .from("group_templates")
    .select(`
      *,
      exercises:group_template_exercises(
        *,
        exercise:exercises(
          id, name, description, lumio_card_id,
          exercise_tags(tag)
        )
      )
    `)
    .eq("id", templateId)
    .eq("user_id", userId)
    .single()

  if (error) throw new Error(`Template non trovato: ${templateId}`)

  // Sort exercises by order_index
  if (data.exercises) {
    data.exercises.sort((a, b) => a.order_index - b.order_index)
  }

  return [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }]
}
```

### Tool: Create Template
```typescript
// Source: Pattern from existing create_session
case "create_group_template": {
  const { name } = args as { name: string }

  const { data, error } = await supabase
    .from("group_templates")
    .insert({ name, user_id: userId })
    .select("id")
    .single()

  if (error) {
    return { content: [{ type: "text", text: `Errore: ${error.message}` }] }
  }

  return { content: [{ type: "text", text: `Template creato con successo. ID: ${data.id}` }] }
}
```

### Tool: Apply Template to Session
```typescript
// Source: Pattern from useGroupTemplates.applyTemplateToSession
case "apply_template_to_session": {
  const { template_id, session_id, mode } = args as {
    template_id: string
    session_id: string
    mode: "append" | "replace"
  }

  // 1. Fetch template with exercises
  const { data: template, error: templateErr } = await supabase
    .from("group_templates")
    .select(`
      *,
      exercises:group_template_exercises(
        *, exercise:exercises(id, name)
      )
    `)
    .eq("id", template_id)
    .eq("user_id", userId)
    .single()

  if (templateErr || !template) {
    return { content: [{ type: "text", text: "Errore: Template non trovato" }] }
  }

  if (!template.exercises?.length) {
    return { content: [{ type: "text", text: "Errore: Template senza esercizi" }] }
  }

  // 2. Verify session exists and belongs to user
  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("id, client:clients!inner(user_id)")
    .eq("id", session_id)
    .eq("client.user_id", userId)
    .single()

  if (sessionErr || !session) {
    return { content: [{ type: "text", text: "Errore: Sessione non trovata" }] }
  }

  // 3. If replace mode, delete existing group exercises
  if (mode === "replace") {
    await supabase
      .from("session_exercises")
      .delete()
      .eq("session_id", session_id)
      .eq("is_group", true)
  }

  // 4. Get starting order_index
  const { data: existing } = await supabase
    .from("session_exercises")
    .select("order_index")
    .eq("session_id", session_id)
    .order("order_index", { ascending: false })
    .limit(1)

  const startIndex = mode === "append" ? ((existing?.[0]?.order_index ?? -1) + 1) : 0

  // 5. Insert exercises with template_id link
  const exercisesToInsert = template.exercises
    .sort((a, b) => a.order_index - b.order_index)
    .map((ex, idx) => ({
      session_id: session_id,
      exercise_id: ex.exercise_id,
      template_id: template_id,
      order_index: startIndex + idx,
      sets: ex.sets,
      reps: ex.reps,
      weight_kg: ex.weight_kg,
      duration_seconds: ex.duration_seconds,
      notes: ex.notes,
      is_group: true,
      completed: false,
      skipped: false,
    }))

  const { error: insertErr } = await supabase
    .from("session_exercises")
    .insert(exercisesToInsert)

  if (insertErr) {
    return { content: [{ type: "text", text: `Errore: ${insertErr.message}` }] }
  }

  return {
    content: [{
      type: "text",
      text: `Template "${template.name}" applicato alla sessione con ${exercisesToInsert.length} esercizi (modalita: ${mode}).`
    }]
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Copy exercises (no link) | Link via template_id | Phase 6 (2026-02-02) | Enables edit blocking, template tracking |

**Deprecated/outdated:**
- Nothing deprecated for this phase

## Open Questions

### 1. Usage Stats for Templates
**What we know:** Context decided this is Claude's discretion
**What's unclear:** How valuable is `times_applied` count for AI planning?
**Recommendation:** Skip for v1. Easy to add later with:
```sql
SELECT template_id, COUNT(DISTINCT session_id) as times_applied
FROM session_exercises WHERE template_id IS NOT NULL
GROUP BY template_id
```
If added, include in list resource only (not a separate query).

### 2. Lumio Content in Template Detail
**What we know:** Context says inline vs separate resource is Claude's discretion
**What's unclear:** Does AI need full Lumio markdown for template exercises?
**Recommendation:** Include `lumio_card_id` in exercise data. AI can fetch full Lumio via existing `helix://exercises/{id}/lumio` if needed. Don't duplicate content.

### 3. update_group_template Scope
**What we know:** Context says Claude's discretion on name-only vs full update
**What's unclear:** Will AI ever need to bulk-update exercise parameters?
**Recommendation:** Name-only for `update_group_template`. For exercises, use `update_template_exercise` (granular). Matches UI behavior.

## Sources

### Primary (HIGH confidence)
- `/home/toto/scm-projects/helix/supabase/functions/helix-mcp/index.ts` - Existing MCP implementation patterns
- `/home/toto/scm-projects/helix/src/hooks/useGroupTemplates.ts` - Template CRUD logic to replicate
- `/home/toto/scm-projects/helix/supabase/migrations/00000000000019_group_templates.sql` - Schema
- `/home/toto/scm-projects/helix/supabase/migrations/00000000000020_session_template_link.sql` - template_id FK
- `/home/toto/scm-projects/helix/.planning/phases/07-mcp-template-integration/07-CONTEXT.md` - User decisions

### Secondary (MEDIUM confidence)
- Context7 MCP Python SDK - Protocol patterns (similar JSON-RPC concepts)

### Tertiary (LOW confidence)
None required - implementation is internal extension.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - using existing infrastructure
- Architecture: HIGH - copying existing patterns
- Pitfalls: HIGH - learned from Phase 6 implementation

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable patterns)
