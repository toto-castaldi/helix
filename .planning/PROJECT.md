# Helix — Fitness Coach Assistant

## What This Is

Helix e un'app web per fitness coach che gestisce clienti, sessioni di allenamento e esercizi. Include una PWA tablet per il live coaching in palestra con supporto per esercizi di gruppo e template riutilizzabili, e un server MCP per pianificazione AI via Claude.

## Core Value

Durante le lezioni di gruppo, il coach puo gestire gli esercizi condivisi da un'unica vista, completandoli una volta per tutti i partecipanti. I template permettono di riutilizzare combinazioni di esercizi predefinite.

## Requirements

### Validated

- ✓ Gestione clienti (anagrafica, obiettivi, storico) — existing
- ✓ Catalogo esercizi con tag e carte Lumio — existing
- ✓ Pianificazione sessioni con esercizi — existing
- ✓ Live coaching tablet (carousel esercizi, completamento, skip) — existing
- ✓ Sincronizzazione real-time — existing
- ✓ MCP server per integrazione AI (resources, tools, prompts) — existing
- ✓ Autenticazione Google OAuth — existing
- ✓ Gestione palestre — existing
- ✓ Repository Lumio con sync Docora — existing
- ✓ Flag `is_group` su session_exercises (database) — v1.0
- ✓ UI pianificazione: toggle "di gruppo" su esercizi in sessione — v1.0
- ✓ Live tablet: tab toggle "Individuali" | "Gruppo" — v1.0
- ✓ Live tablet: vista gruppo con esercizi del giorno — v1.0
- ✓ Live tablet: completamento di gruppo (un tap -> tutti i clienti) — v1.0
- ✓ MCP: lettura/scrittura campo is_group negli esercizi sessione — v1.0
- ✓ Template esercizi di gruppo riutilizzabili (CRUD completo) — v1.1
- ✓ MCP template integration (8 tools, 2 resources) — v1.1
- ✓ Live tablet: vista cliente con separazione individuali/gruppo — v1.1
- ✓ Mobile app senza Live (tablet-only) — v1.1
- ✓ Export cliente funzionante (JWT refresh fix) — v1.1

### Active

- [ ] Live tablet: immagine esercizio da scheda Lumio nella card del carousel (prima immagine, se presente) — v1.2

### Out of Scope

- Tracciamento esplicito dei partecipanti per esercizio — non necessario, ogni cliente ha la sua sessione
- Orario pianificato per esercizi — l'ordine basta, usa order_index
- Statistiche aggregate per esercizi di gruppo — puo essere v2
- Notifiche ai clienti per esercizi di gruppo — non richiesto
- Class booking/scheduling — Helix e per coaching, not gym management
- Client-facing group view — gruppi sono strumento interno coach
- Associazione automatica template per orario — complessita, selezione manuale sufficiente
- Parametri variabili per cliente nel template — complicherebbe UX

## Context

**Shipped v1.1 Group Exercise Improvements** with:
- 71 files modified, +9,604 / -1,434 lines
- 5 phases, 10 plans completed
- Tech stack unchanged: React 19 + Vite + TypeScript + Supabase

**Current codebase:**
- ~13,000 LOC TypeScript
- Two entry points: main app + live tablet PWA
- MCP server with 23 tools, 19 resources, 5 prompts
- Realtime enabled on `session_exercises` for cross-tablet sync

**Key additions in v1.1:**
- Tables: `group_templates`, `group_template_exercises`
- Column: `template_id` in `session_exercises` for linked exercises
- Components: TemplateManager, ApplyTemplateDialog, ClientExerciseView
- MCP: Template CRUD tools, apply_template_to_session, template-analysis prompt

## Constraints

- **Tech stack**: Supabase + React esistente — nessuna nuova dipendenza
- **Schema**: Aggiungere colonne, non ristrutturare tabelle
- **Backward compatible**: Sessioni esistenti devono funzionare
- **RLS**: Mantenere isolamento per coach (user_id)
- **Mobile-first**: UI tablet deve funzionare bene con touch

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Flag booleano `is_group` invece di relazione | Semplice, ogni sessione e indipendente | ✓ Good — works well, minimal complexity |
| Tab toggle invece di filtro | Piu chiaro per il coach, due modalita di lavoro distinte | ✓ Good — clean UX separation |
| Completamento automatico per tutti | Efficienza durante la lezione, un tap basta | ✓ Good — with undo toast for safety |
| Ordine da order_index | Riusa campo esistente, no schema aggiuntivo | ✓ Good — no changes needed |
| Partial index for is_group | Most exercises not group, saves space | ✓ Good — efficient queries |
| SECURITY INVOKER for RPC | Respects RLS policies, user context preserved | ✓ Good — secure by default |
| Toast duration 4 seconds | Enough time to react, not too long | ✓ Good — balanced UX |
| ON DELETE RESTRICT for template_id FK | Coach must explicitly remove template from sessions | ✓ Good — prevents accidental data loss |
| Template exercises linked via template_id | Enables edit blocking, consistent updates | ✓ Good — clear ownership semantics |
| refreshSession() for Edge Function calls | Ensures valid JWT token for authenticated requests | ✓ Good — fixes stale token issues |

## Current Milestone: v1.2 Lumio Exercise Images

**Goal:** Mostrare la prima immagine della scheda Lumio direttamente nella card dell'esercizio nel carousel della live tablet app.

**Target features:**
- Prima immagine Lumio visibile nella ExerciseCard del carousel (se l'esercizio ha una scheda Lumio con immagini)

---
*Last updated: 2026-02-12 after v1.2 milestone start*
