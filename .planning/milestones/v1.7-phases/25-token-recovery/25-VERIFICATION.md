---
phase: 25-token-recovery
verified: 2026-03-11T13:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
human_verification:
  - test: "Open a sync_failed repository card and click 'Aggiorna token'"
    expected: "UpdateTokenDialog appears centered on screen with a password-type PAT input, repository name shown, cancel and submit buttons present"
    why_human: "Visual layout and modal rendering cannot be verified by grep alone"
  - test: "Submit a new PAT from the UpdateTokenDialog"
    expected: "Loading state ('Aggiornamento...') is shown during submission; on success dialog closes and the sync_failed error block disappears from the card automatically (via realtime subscription)"
    why_human: "Realtime state update and UI transition require browser execution to confirm"
  - test: "Submit an invalid/rejected token from the UpdateTokenDialog"
    expected: "Error message appears inside the dialog (not a page-level error); dialog stays open; coach can correct and retry"
    why_human: "Error display path requires actual Docora API interaction or a mock response"
---

# Phase 25: Token Recovery Verification Report

**Phase Goal:** Token recovery — Edge Function + UI dialog to update GitHub PAT and retry failed syncs
**Verified:** 2026-03-11T13:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Calling docora-update-token EF with valid repo ID and new token saves token to DB | VERIFIED | `supabase/functions/docora-update-token/index.ts` lines 105-121: updates `access_token`, `sync_status`, `sync_error_message`, `sync_failed_at` |
| 2 | Edge Function calls Docora PATCH API to update token on their side | VERIFIED | Lines 90-94: `docoraApiCall('/api/repositories/${repo.docora_repository_id}', "PATCH", { github_token: newToken })` |
| 3 | After successful update, sync_status reset to 'pending' and error fields cleared | VERIFIED | Lines 107-111: `sync_status: "pending", sync_error_message: null, sync_failed_at: null` |
| 4 | Edge Function rejects unauthenticated requests and requests for repos user does not own | VERIFIED | Lines 31-37 (auth header check), 46-53 (JWT validation), 67-79 (ownership query with `.eq("user_id", user.id)`) |
| 5 | 'Aggiorna token' button on sync_failed card opens focused dialog with PAT input | VERIFIED | `RepositoryCard.tsx` lines 145-157: button calls `onUpdateToken(repository)`; `Repositories.tsx` line 106: `onUpdateToken={setUpdatingTokenRepo}`; lines 117-121 render UpdateTokenDialog |
| 6 | Dialog calls docora-update-token Edge Function on submit | VERIFIED | `UpdateTokenDialog.tsx` lines 26-31: `supabase.functions.invoke('docora-update-token', { body: { repositoryId, newToken } })` |
| 7 | Dialog shows loading state during submission and error messages on failure | VERIFIED | Lines 17-18: `isSubmitting`/`error` state; line 99: `{isSubmitting ? 'Aggiornamento...' : 'Aggiorna'}`; lines 73-77: error block rendered |
| 8 | Dialog can be dismissed without submitting via close button or cancel | VERIFIED | Lines 62-64: X button with `onClick={onClose}`; lines 95-97: Annulla button; both disabled only during submission |
| 9 | PATCH method support in docoraApiCall shared helper | VERIFIED | `_shared/docora.ts` line 151: method union type is `"GET" \| "POST" \| "DELETE" \| "PATCH"` |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/docora-update-token/index.ts` | Edge Function handling token update flow | VERIFIED | 137 lines; full auth, ownership, Docora PATCH, DB update flow |
| `supabase/functions/_shared/docora.ts` | PATCH method support in docoraApiCall | VERIFIED | Line 151 includes `"PATCH"` in method union; substantive 324-line shared helper |
| `.github/workflows/deploy.yml` | Deploy step for docora-update-token | VERIFIED | Line 178: `supabase functions deploy docora-update-token --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}` |
| `src/components/repositories/UpdateTokenDialog.tsx` | Token update dialog component | VERIFIED | 109 lines; exports `UpdateTokenDialog`; full form with loading/error states |
| `src/components/repositories/index.ts` | Updated barrel export including UpdateTokenDialog | VERIFIED | Line 6: `export { UpdateTokenDialog } from './UpdateTokenDialog'` |
| `src/pages/Repositories.tsx` | Dialog state management and onUpdateToken wired | VERIFIED | Lines 16, 106, 117-121: `updatingTokenRepo` state; `onUpdateToken={setUpdatingTokenRepo}`; `{updatingTokenRepo && <UpdateTokenDialog ...>}` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `docora-update-token/index.ts` | `_shared/docora.ts` | `import docoraApiCall` | WIRED | Line 3: `import { docoraApiCall } from "../_shared/docora.ts"`; used at line 90 |
| `docora-update-token/index.ts` | `lumio_repositories` table | Supabase service role `.update()` | WIRED | Lines 105-113: `.from("lumio_repositories").update({...}).eq("id", repositoryId)` |
| `Repositories.tsx` | `UpdateTokenDialog.tsx` | `updatingTokenRepo` state-controlled render | WIRED | Line 16 declares state; line 106 sets it via `onUpdateToken`; lines 117-121 render when truthy |
| `UpdateTokenDialog.tsx` | `supabase.functions.invoke('docora-update-token')` | Edge Function call on form submit | WIRED | Lines 26-31: invoked inside `handleSubmit`, response checked for errors; `onClose()` called on success |
| `Repositories.tsx` | `RepositoryCard.tsx` (via RepositoryList) | `onUpdateToken` callback chain | WIRED | `Repositories.tsx:106` → `RepositoryList.tsx:44` → `RepositoryCard.tsx:152`: all three components declare and pass `onUpdateToken` prop |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| TOKN-01 | 25-02-PLAN | "Update token" button opens focused dialog with PAT input | SATISFIED | `RepositoryCard.tsx:145-157` triggers `onUpdateToken`; `UpdateTokenDialog.tsx` renders password input |
| TOKN-02 | 25-01-PLAN | Token update saves new token to Helix database | SATISFIED (note below) | `docora-update-token/index.ts:107`: `access_token: newToken` saved to `lumio_repositories` |
| TOKN-03 | 25-01-PLAN | Token update calls Docora PATCH API | SATISFIED | `docora-update-token/index.ts:90-94`: `docoraApiCall` with PATCH before DB write |
| TOKN-04 | 25-01-PLAN + 25-02-PLAN | After successful update, sync_status resets to 'pending' | SATISFIED | EF sets `sync_status: "pending"` (line 109); realtime subscription in `useRepositories` propagates change to UI |

**Note on TOKN-02 "(encrypted)":** The REQUIREMENTS.md description mentions "encrypted" in parentheses. The project stores `access_token` as plain text in Supabase, protected by Row Level Security — this is the established pattern across all existing functionality (`docora-register`, `useRepositories`). The migration comment `-- encrypted, for private repos` is legacy aspirational language. Phase 25 follows the existing project convention; no encryption regression was introduced.

**Orphaned requirements:** None. All four TOKN-* IDs (TOKN-01 through TOKN-04) are accounted for in the phase plans and verified in the codebase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `UpdateTokenDialog.tsx` | 89 | `placeholder="ghp_..."` | Info | HTML input placeholder attribute — not a code stub, appropriate UX hint |

No blockers or warnings found. The one "placeholder" match is a legitimate HTML `placeholder` attribute on the token input field.

**Stub check — Edge Function:**
- No `return Response.json({ message: "Not implemented" })` pattern found
- Full auth + ownership + Docora PATCH + DB update flow implemented (137 lines)
- Docora-first fail-fast ordering correctly implemented (PATCH on line 90, DB update on line 105)

**Stub check — UpdateTokenDialog:**
- No empty `onSubmit={(e) => e.preventDefault()}` pattern; handler makes real API call
- State is used: `token` drives input value and submit-button disabled state; `isSubmitting` drives loading text; `error` is rendered in UI

### Human Verification Required

#### 1. Dialog Visual Rendering

**Test:** Navigate to a repository with `sync_status = 'sync_failed'`. Click "Aggiorna token".
**Expected:** Centered card dialog appears on backdrop-blurred overlay; shows repository name; password input with `ghp_...` placeholder; "Annulla" and "Aggiorna" buttons; X dismiss button.
**Why human:** CSS layout and z-index stacking cannot be confirmed by static analysis.

#### 2. Success Flow and Realtime Card Update

**Test:** Submit a valid new GitHub PAT from the dialog.
**Expected:** "Aggiornamento..." appears on button during call; dialog closes on success; the `sync_failed` error block on the repository card disappears automatically (realtime subscription fires when `sync_status` changes to `'pending'`).
**Why human:** Realtime Supabase subscription behavior and UI state transitions require a running browser + live Supabase connection.

#### 3. Error Display on Failed Token

**Test:** Submit a token that Docora rejects (e.g., expired token, wrong format).
**Expected:** Error message appears inline within the dialog (not as a page-level alert); dialog stays open; input remains editable; coach can correct and retry.
**Why human:** Requires actual Docora API error response (502 from Edge Function) or a controlled mock to verify the UI error handling path end-to-end.

### Gaps Summary

No gaps. All must-haves verified.

The phase delivered the complete token recovery flow:

1. **Backend (Plan 01):** `docora-update-token` Edge Function implements auth validation, ownership check, Docora-first PATCH call (fail-fast if Docora rejects), then atomic DB update resetting `sync_status` to `pending` and clearing error fields. `docoraApiCall` shared helper extended with PATCH. Deploy workflow updated.

2. **Frontend (Plan 02):** `UpdateTokenDialog` component with password-type PAT input, loading state, inline error display, cancel/dismiss. `Repositories.tsx` replaces the Phase 24 no-op stub with real state (`updatingTokenRepo`) that opens the dialog. The callback chain `Repositories → RepositoryList → RepositoryCard → onUpdateToken` is fully wired.

3. All 4 TOKN-* requirements satisfied. 6 commits in git history confirm atomic task execution.

---

_Verified: 2026-03-11T13:00:00Z_
_Verifier: Claude (gsd-verifier)_
