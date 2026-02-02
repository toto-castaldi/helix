# Phase 9: Mobile Cleanup + Bugfix - Research

**Researched:** 2026-02-02
**Domain:** React code cleanup, Edge Function debugging
**Confidence:** HIGH

## Summary

This phase involves two distinct tasks: (1) removing Live functionality from the main mobile app while preserving the tablet PWA, and (2) investigating and fixing the client export bug.

For Live removal, the codebase has a clear separation between main app (`src/`) and tablet app (`src/live/`), with shared code in `src/shared/`. The main app's Live feature consists of a page (`LiveCoaching.tsx`), route in `App.tsx`, navigation link in `Sessions.tsx`, and components in `src/components/live/`. Some components in `src/components/live/` are also used by the main app (specifically `ExerciseDetailModal`), requiring careful preservation.

For the export bug, the Edge Function (`client-export`) appears well-implemented. The bug is likely related to runtime behavior (JWT issues, missing data, relation queries) rather than code logic. Investigation will need to reproduce the error locally.

**Primary recommendation:** Systematically remove Live-specific code from main app while preserving shared dependencies; investigate export bug by reproducing it locally with Supabase CLI.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI framework | Already in project |
| React Router | 6+ | Routing | Already in project |
| Supabase | 2.x | Backend/Edge Functions | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vite | 5.x | Build tool | Already configured with multi-entry |
| Supabase CLI | latest | Local development/debugging | Edge Function testing |

## Architecture Patterns

### Project Structure Analysis

The codebase has a well-organized multi-entry architecture:

```
src/
├── main.tsx           # Main app entry point
├── App.tsx            # Main app routes (includes /live route TO REMOVE)
├── main-live.tsx      # Tablet app entry point (KEEP)
├── AppLive.tsx        # Tablet app routes (KEEP)
├── pages/
│   ├── LiveCoaching.tsx    # TO REMOVE (main app Live page)
│   ├── Sessions.tsx        # EDIT (remove Live button)
│   └── ...
├── components/
│   ├── live/               # Components used by main app's Live
│   │   ├── index.ts        # EDIT (remove Live-specific exports)
│   │   ├── ExerciseDetailModal.tsx  # KEEP (used by Exercises.tsx)
│   │   ├── LiveDashboard.tsx        # DELETE
│   │   ├── LiveClientCard.tsx       # DELETE
│   │   ├── LiveExerciseControl.tsx  # DELETE
│   │   ├── SaveIndicator.tsx        # DELETE (main app version)
│   │   └── ResumeDialog.tsx         # DELETE
│   └── ...
├── hooks/
│   ├── useLiveCoaching.ts  # Re-export from shared (KEEP)
│   └── ...
├── lib/
│   ├── liveCoachingStorage.ts  # Re-export from shared (KEEP)
│   └── ...
├── live/                   # Tablet-specific components (KEEP ALL)
│   ├── components/         # Has own SaveIndicator.tsx
│   └── pages/
└── shared/                 # Shared code between apps (KEEP ALL)
    ├── hooks/
    │   └── useLiveCoaching.ts
    ├── lib/
    │   └── liveCoachingStorage.ts
    ├── types/
    │   └── index.ts
    └── components/ui/
```

### Pattern: Shared Code Architecture

**What:** Code in `src/shared/` is used by both main app and tablet app
**When to use:** When functionality is needed by both entry points
**Critical insight:** `useLiveCoaching` and `liveCoachingStorage` are in shared because they're used by tablet app. Main app re-exports them via `src/hooks/` and `src/lib/`.

### Pattern: Main App Live Components

**What:** `src/components/live/` contains components that were originally for main app's Live feature
**Critical insight:** `ExerciseDetailModal` is also used by `src/pages/Exercises.tsx` and must be preserved. Other components are Live-specific and can be removed.

### Anti-Patterns to Avoid
- **Removing shared re-exports:** Don't delete `src/hooks/useLiveCoaching.ts` or `src/lib/liveCoachingStorage.ts` - they're re-exports that maintain backward compatibility
- **Moving components without checking dependencies:** Always verify no other files import the component before deleting

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Finding all Live imports | Manual file-by-file search | `grep -r` for imports | Ensures complete removal |
| Route 404 handling | Custom 404 page | React Router default behavior | Standard, expected UX |

**Key insight:** React Router handles missing routes gracefully by default. No special 404 handling needed for removed `/live` route.

## Common Pitfalls

### Pitfall 1: Accidentally Removing ExerciseDetailModal

**What goes wrong:** Deleting all of `src/components/live/` removes `ExerciseDetailModal` which is used by `Exercises.tsx`
**Why it happens:** The component is in the `live` folder but serves dual purpose
**How to avoid:** Keep `ExerciseDetailModal.tsx` and update `index.ts` to only export it
**Warning signs:** Build errors referencing `ExerciseDetailModal` import

### Pitfall 2: Breaking Shared Hooks Re-exports

**What goes wrong:** Removing `src/hooks/useLiveCoaching.ts` thinking it's main-app-only
**Why it happens:** File looks like it's for the main app but is actually a re-export
**How to avoid:** Check file contents - if it's a re-export from `@/shared/`, keep it
**Warning signs:** Tablet app fails to build

### Pitfall 3: Export Bug Misdirection

**What goes wrong:** Modifying Edge Function code without first reproducing the bug
**Why it happens:** Assuming code is broken without evidence
**How to avoid:** Test locally first with `supabase functions serve`, check browser console/network
**Warning signs:** Changes don't fix the actual error

### Pitfall 4: Incomplete Import Cleanup

**What goes wrong:** Leaving dead imports after removing components
**Why it happens:** Removing usage but not import statements
**How to avoid:** Run `npm run lint` after changes to catch unused imports
**Warning signs:** Lint warnings about unused imports

## Code Examples

### Files to Remove (Main App Live)

**DELETE these files:**
```
src/pages/LiveCoaching.tsx
src/components/live/LiveDashboard.tsx
src/components/live/LiveClientCard.tsx
src/components/live/LiveExerciseControl.tsx
src/components/live/SaveIndicator.tsx
src/components/live/ResumeDialog.tsx
```

### Files to Edit

**src/App.tsx - Remove Live route:**
```typescript
// REMOVE this import:
import { LiveCoaching } from '@/pages/LiveCoaching'

// REMOVE this route:
<Route path="/live" element={<LiveCoaching />} />
```

**src/pages/Sessions.tsx - Remove Live button:**
```typescript
// REMOVE this import:
import { Play } from 'lucide-react'

// REMOVE this button:
<Button size="sm" variant="default" onClick={() => navigate('/live')}>
  <Play className="h-4 w-4 mr-2" />
  Live
</Button>
```

**src/components/live/index.ts - Keep only ExerciseDetailModal:**
```typescript
// CHANGE FROM:
export { LiveExerciseControl } from './LiveExerciseControl'
export { LiveClientCard } from './LiveClientCard'
export { LiveDashboard } from './LiveDashboard'
export { ExerciseDetailModal } from './ExerciseDetailModal'
export { SaveIndicator } from './SaveIndicator'
export type { SaveStatus } from './SaveIndicator'
export { ResumeDialog } from './ResumeDialog'

// CHANGE TO:
export { ExerciseDetailModal } from './ExerciseDetailModal'
```

### Export Bug Investigation

**Test locally:**
```bash
# Start local Supabase
npm run supabase:start

# Serve Edge Functions
npx supabase functions serve --env-file supabase/.env

# Test with curl (after getting auth token)
curl -X POST http://127.0.0.1:54321/functions/v1/client-export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"clientId": "<CLIENT_ID>"}'
```

**Common export errors to check:**
1. JWT validation failure (401)
2. Client not found (404) - check RLS policies
3. Relation query errors - check exercise/gym joins
4. JSON serialization errors - check null handling

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Live in main app | Live in separate tablet app | Milestone 11 | Apps now separate |

**Deprecated/outdated:**
- Main app's Live feature: Superseded by tablet PWA at `live.helix.toto-castaldi.com`

## Open Questions

### Question 1: What is the specific export error?

**What we know:** Export shows an error message
**What's unclear:** The exact error text and when it occurs
**Recommendation:** Reproduce locally with `supabase functions serve` and check console output. Common causes:
- JWT expiry (getSession returns null)
- RLS policy blocking client read
- Exercise relation returning null for deleted exercises

### Question 2: Are there any other references to /live in the codebase?

**What we know:** Main references are in App.tsx (route) and Sessions.tsx (button)
**What's unclear:** Could be in other places (documentation, comments, tests)
**Recommendation:** After removing main references, run `grep -r "/live" src/` to verify complete cleanup

## Sources

### Primary (HIGH confidence)
- Codebase analysis - `/home/toto/scm-projects/helix/src/`
- CLAUDE.md project documentation
- Direct file inspection of components and routes

### Secondary (MEDIUM confidence)
- Phase 9 CONTEXT.md decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Direct codebase analysis
- Architecture: HIGH - File structure verified
- Pitfalls: HIGH - Based on actual code dependencies

**Research date:** 2026-02-02
**Valid until:** 30 days (stable codebase, no external dependencies)
