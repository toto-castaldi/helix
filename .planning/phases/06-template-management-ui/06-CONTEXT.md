# Phase 6: Template Management UI - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Coach can create, edit, delete, and apply group templates from the main app. Templates are reusable collections of group exercises with parameters.

</domain>

<decisions>
## Implementation Decisions

### Navigation & Access
- Templates live under Sessions section (not a separate nav item)
- Button/link in Sessions page header to access templates
- Private per coach (existing RLS model applies)
- Claude's discretion: full page vs sheet/drawer for template management

### Template Creation Flow
- Single form: name + exercises on same screen
- Reuse existing exercise picker from session planning
- Claude's discretion: which parameters to include (sets, reps, weight, duration — based on session_exercises)
- Claude's discretion: exercise reordering (drag or order by addition)

### Apply to Session UX
- Available during session planning (editing a session)
- If session already has group exercises: prompt coach to choose "add" or "replace"
- **Linked to template**: exercises in session are references, not copies
- **Block editing in session**: coach must edit the template itself to change exercises
- Editing template updates all sessions that use it

### Template List & Display
- Show template name + first 2-3 exercise names at a glance
- Claude's discretion: cards vs list layout for mobile
- Claude's discretion: deletion UX (confirm dialog vs swipe)
- **Block deletion** if any session uses the template

### Claude's Discretion
- Navigation pattern (full page vs sheet/drawer)
- Template list layout (cards vs list)
- Exercise parameters to include
- Exercise reordering mechanism
- Deletion interaction pattern

</decisions>

<specifics>
## Specific Ideas

- Reuse session's exercise picker component — consistent UX
- "Linked" behavior means template changes propagate to sessions
- Coach explicitly said "I can change template" when asked about editing blocked exercises in sessions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-template-management-ui*
*Context gathered: 2026-02-01*
