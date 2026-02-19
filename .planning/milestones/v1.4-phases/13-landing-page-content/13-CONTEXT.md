# Phase 13: Landing Page Content - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Professional bilingual landing page that communicates what Helix is and links visitors to the Coach app and Live app. Content, layout, and IT/EN language toggle. No backend, no auth, no database — pure static content on the vanilla JS landing entry point built in Phase 12.

</domain>

<decisions>
## Implementation Decisions

### Visual identity & hero
- Warm & approachable mood — soft tones, friendly feel, inviting, conveys personal coaching relationship
- Hero layout: logo prominently centered with tagline underneath (classic landing style)
- Tagline: Claude writes it — should fit the warm/approachable mood, bilingual (IT + EN)

### Content & messaging
- Tone: professional but friendly — "Your AI-powered coaching assistant" style, clear, competent, approachable
- Features presented as icon cards (3-4 cards) in a grid, each with icon, title, and 1-2 line description
- AI capabilities should be highlighted prominently — AI-powered coaching is a key differentiator
- Feature card content: Claude picks 3-4 features that best represent Helix's value to coaches

### Language toggle
- Default language: auto-detect from browser language
- Fallback: Italian if browser language is neither IT nor EN
- Language choice persists via localStorage across visits
- Toggle UI: Claude's discretion — pick what fits the warm/professional design best

### Page structure
- Minimal structure: Hero + Features + CTA (no footer, no "how it works" section)
- Single scroll, no navigation bar — clean one-page experience
- CTA buttons appear in hero area AND repeated at bottom after features
- CTA buttons link to Coach app (coach.helix.toto-castaldi.com) and Live app (live.helix.toto-castaldi.com)

### Claude's Discretion
- Color approach (Lumio palette usage: full vs neutral base with accents)
- Language toggle placement and visual style (given no navbar)
- Feature card content selection (3-4 best features for coaches)
- Tagline copy in both IT and EN
- Exact spacing, typography, and responsive breakpoints

</decisions>

<specifics>
## Specific Ideas

- Logo is the stylized robotic hand (mano robotica) with Lumio palette (amber, coral, violet)
- Logo source: `logo.svg` (no background, for page body), `logo-circle.svg` (with white circle, for favicon)
- Landing uses vanilla JS (no React), decided in Phase 12 — build on `src/landing/` entry point
- Existing assets in `public-landing/` from Phase 12

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-landing-page-content*
*Context gathered: 2026-02-18*
