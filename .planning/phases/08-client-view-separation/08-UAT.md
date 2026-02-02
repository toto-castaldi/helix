---
status: diagnosed
phase: 08-client-view-separation
source: [08-01-SUMMARY.md]
started: 2026-02-02T12:00:00Z
updated: 2026-02-02T12:15:00Z
---

## Current Test

[testing complete - fix applied]

## Tests

### 1. Two Tabs Visible
expected: Client view shows "I miei" and "Gruppo" tabs with icons and count badges
result: issue
reported: "la grafica delle card degli esercizi personale è rovinata. Devi usare lo stesso layout di prima"
severity: major
fix_applied: true
fix_commit: 4e4eb12

### 2. Individual Exercises in "I miei" Tab
expected: Individual exercises (is_group=false) appear only in the "I miei" tab
result: pass

### 3. Group Exercises in "Gruppo" Tab
expected: Group exercises (is_group=true) appear only in the "Gruppo" tab
result: pass

### 4. Empty State - No Individual Exercises
expected: When session has no individual exercises, "I miei" tab shows "Nessun esercizio individuale" message
result: pass

### 5. Empty State - No Group Exercises
expected: When session has no group exercises, "Gruppo" tab shows "Nessun esercizio di gruppo" message
result: pass

### 6. Realtime Tab Move
expected: When an exercise's is_group flag changes (via main app or database), the exercise moves to the correct tab instantly without page refresh
result: pass

## Summary

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0
fixed: 1

## Gaps

- truth: "Exercise cards in client view should use the same layout as before (ExerciseCarousel)"
  status: fixed
  reason: "User reported: la grafica delle card degli esercizi personale è rovinata. Devi usare lo stesso layout di prima"
  severity: major
  test: 1
  root_cause: "ClientExerciseView used a simple grid layout instead of reusing ExerciseCarousel component"
  artifacts:
    - path: "src/live/components/ClientExerciseView.tsx"
      issue: "Grid layout instead of carousel"
    - path: "src/live/components/ExerciseCarousel.tsx"
      issue: "Did not support filtered exercise lists"
  missing:
    - "ExerciseCarousel props for exercises, currentIndex, indexMap"
    - "ClientExerciseView should use ExerciseCarousel for each tab"
  fix_commit: "4e4eb12"
