---
status: complete
phase: 25-token-recovery
source: [25-01-SUMMARY.md, 25-02-SUMMARY.md]
started: 2026-03-11T14:00:00Z
updated: 2026-03-11T14:12:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Sync Failed Error Display
expected: On the Repositories page, a repository with sync_failed status shows a red/destructive error block on its card with the error message and an "Aggiorna token" button.
result: pass

### 2. Update Token Dialog Opens
expected: Clicking the "Aggiorna token" button on a sync_failed card opens a centered card dialog (not full-screen) with a password-type input field for the new PAT token, plus Cancel and Submit buttons.
result: issue
reported: "UpdateTokenDialog.tsx:26  POST http://127.0.0.1:54321/functions/v1/docora-update-token 404 (Not Found)"
severity: blocker

### 3. Token Update Success Flow
expected: Pasting a valid new PAT token and clicking Submit calls the docora-update-token Edge Function. On success, the dialog closes and the repository card's sync_failed error disappears automatically (via realtime subscription), with sync_status reset to 'pending'.
result: pass

### 4. Token Update Error Handling
expected: If an invalid token is submitted, the dialog shows an error message (e.g., Docora rejected the token). The dialog stays open so the user can retry with a different token.
result: pass

### 5. Dialog Cancel
expected: Clicking Cancel or closing the dialog dismisses it without making any changes. The sync_failed error block remains on the card.
result: pass

### 6. Loading State During Update
expected: After clicking Submit, the dialog shows a loading state (disabled button, spinner or similar indicator) while the Edge Function call is in progress, preventing double submission.
result: pass

## Summary

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Clicking Aggiorna token opens dialog and Edge Function is reachable"
  status: failed
  reason: "User reported: UpdateTokenDialog.tsx:26  POST http://127.0.0.1:54321/functions/v1/docora-update-token 404 (Not Found)"
  severity: blocker
  test: 2
  root_cause: "Local dev environment issue — supabase functions serve needs restart to pick up new docora-update-token function. Function exists on disk and deploys correctly. Tests 3-4 passed confirming function works when reachable."
  artifacts:
    - path: "supabase/functions/docora-update-token/index.ts"
      issue: "Function exists but not served locally until supabase restart"
  missing:
    - "Restart supabase functions serve to include new function"
  debug_session: ""
