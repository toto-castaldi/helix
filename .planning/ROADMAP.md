# Roadmap: Helix v1.1

## Overview

5 phases to deliver group exercise templates, client view separation in tablet, and mobile cleanup. Phase numbering continues from v1.0 (which ended at Phase 4).

## Milestones

- **v1.0 Esercizi di Gruppo** - Phases 1-4 (shipped 2026-01-28) - see milestones/v1.0-ROADMAP.md
- **v1.1 Group Exercise Improvements** - Phases 5-9 (in progress)

## Phases

- [x] **Phase 5: Template Database Schema** - Tables for group templates and exercises
- [x] **Phase 6: Template Management UI** - CRUD for templates in main app
- [ ] **Phase 7: MCP Template Integration** - Resources and tools for templates
- [ ] **Phase 8: Client View Separation** - Two tabs in tablet client view
- [ ] **Phase 9: Mobile Cleanup + Bugfix** - Remove Live from mobile, fix export

## Phase Details

### Phase 5: Template Database Schema
**Goal**: Database foundation for reusable group exercise templates
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: None directly (enables TMPL-01 to TMPL-05)
**Success Criteria** (what must be TRUE):
  1. Table `group_templates` exists with name, user_id, timestamps
  2. Table `group_template_exercises` exists with exercise_id, parameters (sets, reps, weight, duration), order_index
  3. RLS policies enforce coach isolation (user_id)
  4. TypeScript types exported for template entities
**Plans**: 1 plan

Plans:
- [x] 05-01-PLAN.md — Create migration with tables, RLS, indexes; add TypeScript types; update CLAUDE.md

---

### Phase 6: Template Management UI
**Goal**: Coach can create, edit, delete, and apply group templates
**Depends on**: Phase 5
**Requirements**: TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05
**Success Criteria** (what must be TRUE):
  1. Coach can create a new template with a name from the main app
  2. Coach can add exercises to a template with parameters (sets, reps, weight, duration)
  3. Coach can edit template name and exercises
  4. Coach can delete a template
  5. Coach can apply a template to a session (exercises copied as group exercises)
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Schema migration for template_id + useGroupTemplates hook
- [x] 06-02-PLAN.md — Template management UI components and Sessions integration
- [x] 06-03-PLAN.md — Apply template to session with linked behavior

---

### Phase 7: MCP Template Integration
**Goal**: Templates accessible via MCP for AI-assisted planning
**Depends on**: Phase 5
**Requirements**: MCP-01, MCP-02, MCP-03, MCP-04, MCP-05, MCP-06, MCP-07, MCP-08
**Success Criteria** (what must be TRUE):
  1. Resource `helix://group-templates` lists all coach's templates
  2. Resource `helix://group-templates/{id}` returns template with exercises
  3. Tool `create_group_template` creates new template
  4. Tool `update_group_template` modifies existing template
  5. Tool `delete_group_template` removes template
  6. Tool `add_template_exercise` adds exercise to template
  7. Tool `remove_template_exercise` removes exercise from template
  8. Tool `apply_template_to_session` copies template exercises to session as group
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Add MCP resources for group templates (list + detail)
- [ ] 07-02-PLAN.md — Add MCP tools and prompts for templates (CRUD + apply)

---

### Phase 8: Client View Separation
**Goal**: Tablet client view separates individual and group exercises
**Depends on**: Phase 4 (v1.0 live tablet)
**Requirements**: VIEW-01, VIEW-02, VIEW-03
**Success Criteria** (what must be TRUE):
  1. Client view in tablet has two tabs: "I miei" and "Gruppo"
  2. "I miei" tab shows only individual exercises (is_group=false)
  3. "Gruppo" tab shows only group exercises (is_group=true)
**Plans**: TBD

Plans:
- [ ] 08-01: Client view tabs implementation

---

### Phase 9: Mobile Cleanup + Bugfix
**Goal**: Remove Live from mobile app and fix export bug
**Depends on**: None (independent)
**Requirements**: MOBL-01, MOBL-02, FIX-01
**Success Criteria** (what must be TRUE):
  1. Live page does not exist in mobile app
  2. No navigation or links to Live functionality in mobile app
  3. Client export works without errors
**Plans**: TBD

Plans:
- [ ] 09-01: Remove Live from mobile
- [ ] 09-02: Fix client export

---

## Progress

**Execution Order:** 5 -> 6 -> 7 -> 8 -> 9 (Phases 7 and 8 can run parallel after 5)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 5. Template Database Schema | 1/1 | ✓ Complete | 2026-01-30 |
| 6. Template Management UI | 3/3 | ✓ Complete | 2026-02-02 |
| 7. MCP Template Integration | 0/2 | Not started | - |
| 8. Client View Separation | 0/1 | Not started | - |
| 9. Mobile Cleanup + Bugfix | 0/2 | Not started | - |

---
*Roadmap created: 2026-01-30*
*Last updated: 2026-02-02*
