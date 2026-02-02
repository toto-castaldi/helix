# Phase 8: Client View Separation - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Tablet client view separates individual and group exercises into two tabs. "I miei" tab shows only individual exercises (is_group=false), "Gruppo" tab shows only group exercises (is_group=true). This is the client-facing view during live sessions.

</domain>

<decisions>
## Implementation Decisions

### Tab design & switching
- Tab position: Claude's discretion (based on existing tablet UI patterns)
- Tab memory: Claude's discretion (reasonable default)
- Tab animation: Claude's discretion (touch UX patterns)
- Tab badges (counts): Claude's discretion (information density needs)

### Exercise display per tab
- Same card style for both individual and group exercises — separation is only by tab, no visual distinction
- Group context (showing other clients): Claude's discretion based on live session usefulness
- Completed exercises handling: Claude's discretion based on session flow
- Card interaction (tap behavior): Claude's discretion based on client view purpose

### Empty states
- Empty "I miei" message: Claude's discretion on tone
- Empty "Gruppo" handling: Claude's discretion (show message vs hide tab)
- Empty visuals (icon/illustration): Claude's discretion based on existing app style
- Fully empty (no exercises): Claude's discretion on edge case handling

### Real-time sync behavior
- **Auto-sync on completion: YES, instant update** — exercise marked complete appears immediately on client view
- **Category change behavior: Instant tab move** — if exercise changes is_group flag, it moves tabs immediately
- Auto-switch when tab empties: Claude's discretion based on session flow
- Sound/haptic feedback: Claude's discretion based on tablet UX norms

### Claude's Discretion
Most UI details left to Claude, with two firm decisions:
1. Real-time updates must be instant (no delay, no notification)
2. Exercises moving between tabs must be instant (no transition animation)

</decisions>

<specifics>
## Specific Ideas

- Card style consistency: both tabs should look identical — the tab itself provides the separation
- Live session focus: this is the client-facing view during active coaching, so instant feedback matters

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-client-view-separation*
*Context gathered: 2026-02-02*
