# Phase 11: Image Auto-Play Slideshow - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Add automatic slideshow to the existing ImageGallery component on the live tablet. Coach can start/stop auto-play by tapping, with visual play/pause feedback and automatic stop on manual swipe. Only affects exercises with multiple Lumio images — single-image exercises are unaffected.

</domain>

<decisions>
## Implementation Decisions

### Play/Pause Overlay
- Always visible — small persistent icon in top-right corner of image
- Two states only: play icon (not playing) and pause icon (playing) — no distinction between "never started" and "paused"
- Tap target is the full image area, not just the icon — simplest for a coach with hands busy in the gym

### Gesture Conflict Resolution
- Tap anywhere on image toggles auto-play on/off
- Manual swipe during auto-play stops the slideshow (IMGAP-04)
- Dot indicator taps and swipe-to-stop behavior: Claude's discretion on whether to honor the swipe navigation or just consume it as a stop action

### Slideshow Transition
- Reuse the existing translateX slide animation (same as manual swipe) — consistent, no new animation type
- Loop transition (last→first) uses the same forward slide, not a snap reset
- Dot indicators switch instantly when the active image changes (no animated transitions on dots)

### Auto-Play Visual Feedback
- Subtle amber glow or border around the image container while auto-play is active
- When auto-play stops: icon changes from pause to play — no additional flash/pulse feedback
- Dot indicators look identical whether auto-playing or manually browsing (no special dot state)

### Claude's Discretion
- Icon style (filled circle + icon vs icon with shadow) and color (amber vs white)
- Transition speed for auto-play (may differ from the 300ms swipe animation)
- Whether to include a progress bar/timer showing countdown to next image
- Swipe-during-autoplay: whether to honor the swipe direction (stop + navigate) or just stop
- Dot indicator tap during autoplay: jump + stop vs jump + continue

</decisions>

<specifics>
## Specific Ideas

- Auto-play interval is fixed at 3 seconds (from requirements, not configurable)
- Slideshow loops: after last image, cycles back to first with same slide transition
- Feature is tablet live-only (ImageGallery in `src/live/components/`)
- Existing swipe gesture uses 30px threshold and stopPropagation for isolation from parent carousel — auto-play must coexist with this

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-image-auto-play-slideshow*
*Context gathered: 2026-02-12*
