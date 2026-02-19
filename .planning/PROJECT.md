# Helix — Fitness Coach Assistant

## What This Is

Helix e un'app web per fitness coach che gestisce clienti, sessioni di allenamento e esercizi. Include una PWA tablet per il live coaching in palestra con supporto per esercizi di gruppo e template riutilizzabili, un server MCP per pianificazione AI via Claude, e una landing page multilingua che presenta il prodotto su tre domini separati.

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
- ✓ Live tablet: immagine esercizio da scheda Lumio nella card del carousel — v1.2
- ✓ Auto-play slideshow per immagini Lumio multi-image (tap per start/stop, 3 sec, loop) — v1.3
- ✓ Play/pause overlay con amber glow durante auto-play — v1.3
- ✓ Swipe manuale ferma auto-play e naviga (gesture-aware) — v1.3
- ✓ Landing page multilingua (IT/EN) con hero, features, CTA — v1.4
- ✓ Coach app su coach.helix.toto-castaldi.com (three-domain split) — v1.4
- ✓ Infrastruttura tre domini con CI/CD e HTTPS automatico — v1.4

### Active

(No active milestone — use `/gsd:new-milestone` to start next)

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

**Shipped v1.4 Landing Page + Domini** (2026-02-18):
- Professional bilingual landing page at helix.toto-castaldi.com
- Coach app migrated to coach.helix.toto-castaldi.com
- Three-domain Nginx architecture with automated CI/CD and HTTPS

**Current codebase:**
- ~13,500 LOC TypeScript
- Three entry points: coach app (index.html) + live tablet PWA (live.html) + landing page (landing.html)
- MCP server with 23 tools, 19 resources, 5 prompts
- Vite multi-entry config: vite.config.ts + vite.config.live.ts + vite.config.landing.ts
- Deploy: GitHub Actions → Digital Ocean (3 domains, Nginx + HTTPS, cert-aware sync)
- Domains: helix.toto-castaldi.com (landing), coach.helix.toto-castaldi.com (app), live.helix.toto-castaldi.com (tablet)

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
| Extract images from markdown instead of lumio_card_images table | Table was empty, images embedded in card content | ✓ Good — simpler, no extra table needed |
| Unified card layout with percentage sections | Consistent look for all exercises, with/without images | ✓ Good — clean visual hierarchy |
| object-contain + black letterbox for images | Shows full image regardless of aspect ratio | ✓ Good — works for portrait and landscape |
| Full image area as tap target for auto-play | Best for tablet ergonomics during coaching | ✓ Good — easy to tap during session |
| Swipe during auto-play stops + navigates | Coach gets both behaviors in one gesture | ✓ Good — intuitive dual behavior |
| 3-second interval with looping | Comfortable pace for hands-free exercise demonstration | ✓ Good — works well in practice |
| Vanilla JS for landing page (no React) | Simpler, faster, no framework overhead for static page | ✓ Good — minimal bundle, fast load |
| Three-domain split (landing/coach/live) | Clean separation of concerns per application | ✓ Good — independent deployments |
| Cert-aware Nginx sync in CI/CD | Handles pre/post-certbot states without manual intervention | ✓ Good — zero-touch SSL transitions |
| IT/EN toggle with browser auto-detection | Detects navigator.language, Italian fallback default | ✓ Good — smooth multilingual UX |

---
*Last updated: 2026-02-18 after v1.4 milestone*
