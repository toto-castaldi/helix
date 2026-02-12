# Phase 10: Lumio Image in ExerciseCard - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Show the first Lumio card image inside the exercise carousel card on the live tablet. Exercises with Lumio images display them inline; exercises without images display exactly as today. No new capabilities (fullscreen viewer, image editing, etc.).

</domain>

<decisions>
## Implementation Decisions

### Image placement & sizing
- Image goes between the exercise title and the notes text (user annotated exact position on screenshot)
- Parameters (Serie, Reps, Peso, Durata) move further down below notes
- Keep original aspect ratio — no cropping to a fixed shape
- Image has a maximum height cap (~40-50% of available space between title and parameters) to ensure notes and parameters remain visible

### Image interaction
- No tap action on the image — view-only inline, no fullscreen
- Swipeable gallery when Lumio card has multiple images
- Separate gesture zone: image gallery swipe only works inside the image area, main carousel swipe works outside it
- Smooth slide animation when swiping between gallery images

### Loading & fallback
- Preload images for current exercise card + 1 card before and after for smooth carousel experience
- Gallery image preloading: Claude's discretion based on typical gallery sizes

### Card layout adaptation
- Card does NOT grow taller when image is present — notes area shrinks instead
- Notes truncated with "..." and tap to expand when space is limited
- Parameters section (Serie/Reps/Peso/Durata) must always be visible without scrolling
- Image height is capped to preserve space for notes and parameters

### Claude's Discretion
- Image size (height in pixels) — pick what looks best within the cap
- Rounded corners vs sharp edges on the image
- Loading state while image loads (skeleton, spinner, or collapse)
- Error state when image fails to load
- Gallery indicators style (dots vs counter)
- Gallery state persistence when navigating away and back
- Gallery image preloading strategy
- Vertical scroll behavior when card content overflows

</decisions>

<specifics>
## Specific Ideas

- User provided annotated screenshot showing exact placement: image between exercise title and notes, with "QUI" (here) marking the image zone and "PIU' IN BASSO" (further down) marking where parameters should shift
- Parameters must always remain visible — this is a hard constraint for live coaching usability
- Gallery swipe must not conflict with the main exercise carousel swipe

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-lumio-image-in-exercisecard*
*Context gathered: 2026-02-12*
