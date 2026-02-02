# Phase 9: Mobile Cleanup + Bugfix - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove Live functionality from the main mobile app (helix.toto-castaldi.com) and fix the client export bug. The tablet PWA (live.helix.toto-castaldi.com) remains unchanged and fully functional.

</domain>

<decisions>
## Implementation Decisions

### Live Removal Scope
- Complete removal from main app — page, route, navigation links, and any Live-specific components not used elsewhere
- Tablet PWA stays separate and unchanged (live.helix.toto-castaldi.com)
- Full cleanup of unused imports, types, hooks that were only for Live in main app
- Preserve anything in src/shared/ that tablet app needs

### Export Bug Fix
- Error message currently appears when attempting export
- Investigate the bug in code to identify root cause
- Export should produce a markdown file download (.md)
- Uses Edge Function (client-export) to generate markdown

### User Feedback on Removed Features
- Direct access to /live URL should show 404 (standard React Router missing route behavior)
- No mention of tablet app in main mobile app — clean separation
- Investigate current navigation structure to identify all references to remove

### Claude's Discretion
- Analyzing codebase to identify shared code dependencies
- Determining exact components/hooks to preserve vs remove
- Identifying all navigation elements that reference Live
- Investigating the specific export bug and fix approach

</decisions>

<specifics>
## Specific Ideas

- Clean separation between apps — no cross-references
- Standard 404 behavior for removed routes, no special messaging

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-mobile-cleanup-bugfix*
*Context gathered: 2026-02-02*
