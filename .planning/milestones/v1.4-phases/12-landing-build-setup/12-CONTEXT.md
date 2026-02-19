# Phase 12: Landing Build Setup - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Third Vite entry point for the landing page that builds independently alongside the existing coach and live apps. This phase creates the build infrastructure and a stub page — real content is Phase 13.

</domain>

<decisions>
## Implementation Decisions

### Tech approach
- Plain HTML + Tailwind CSS, no React — landing page is static content
- Vite as the build tool (consistent with coach/live apps)
- Shared Tailwind config (same tailwind.config.js) for consistent brand colors and spacing
- Vanilla JS only — no frameworks or libraries (needed later for IT/EN toggle in Phase 13)

### Stub content
- Use Helix color palette (amber, coral, violet) on the placeholder page
- Browser tab title: "Helix - AI Fitness Coach"
- No PWA manifest — it's a plain web page, not an installable app

### Build conventions
- npm scripts follow existing pattern: `dev:landing`, `build:landing`
- Include `dev:clean` equivalent for landing (cache clearing for consistency)

### Claude's Discretion
- Project structure: whether to use `src/landing/` + `public-landing/` pattern or a simpler flat structure (pick what fits a plain HTML+Tailwind page best)
- Logo/asset handling: copy to landing's own public folder or reference from shared location
- Tailwind content paths in vite.config.landing.ts
- Dev server port and build output directory (follow established patterns)
- Stub page content and layout (branded placeholder with Helix colors)
- Whether stub includes links to existing apps

</decisions>

<specifics>
## Specific Ideas

- The existing live app pattern (live.html, vite.config.live.ts, src/live/, public-live/, dist-live/) is the reference model for the multi-entry setup
- Logo source files: logo.svg (no background, for page body) and logo-circle.svg (with white circle, for favicon)
- Helix brand palette: amber, coral, violet (from the robotic hand logo)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-landing-build-setup*
*Context gathered: 2026-02-17*
