# Requirements: Helix v1.4

**Defined:** 2026-02-17
**Core Value:** Helix si presenta con una landing page professionale multilingua e riorganizza i domini per separare presentazione e applicazioni

## v1.4 Requirements

### Landing Page

- [x] **LAND-01**: Landing page con hero section, tagline e visual identity Helix
- [x] **LAND-02**: Sezione features/benefici che spiega il servizio
- [x] **LAND-03**: CTA buttons che linkano a Coach app e Live app
- [x] **LAND-04**: Toggle manuale IT/EN per multilingua
- [x] **LAND-05**: Terzo entry point Vite (landing.html + vite.config.landing.ts)

### Domini & Routing

- [ ] **DOM-01**: Coach app servita su coach.helix.toto-castaldi.com
- [ ] **DOM-02**: Landing page servita su helix.toto-castaldi.com
- [ ] **DOM-03**: Live app resta su live.helix.toto-castaldi.com

### Infrastruttura

- [x] **INFRA-01**: GitHub Actions aggiornate per build e deploy landing + coach su domini separati
- [x] **INFRA-02**: Configurazione Nginx per i tre domini (landing, coach, live)
- [ ] **INFRA-03**: Certificati HTTPS per coach.helix.toto-castaldi.com

## Future Requirements

None.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Blog o sezione news nella landing | Complessita, non necessario per v1.4 |
| Form di contatto nella landing | Il coach accede direttamente alle app |
| SEO avanzato (sitemap, meta tags dinamici) | Puo essere aggiunto dopo |
| Analytics nella landing | Puo essere aggiunto dopo |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAND-01 | Phase 13 | Complete |
| LAND-02 | Phase 13 | Complete |
| LAND-03 | Phase 13 | Complete |
| LAND-04 | Phase 13 | Complete |
| LAND-05 | Phase 12 | Complete |
| DOM-01 | Phase 14 | Pending |
| DOM-02 | Phase 14 | Pending |
| DOM-03 | Phase 14 | Pending |
| INFRA-01 | Phase 15 | Complete |
| INFRA-02 | Phase 15 | Complete |
| INFRA-03 | Phase 15 | Pending |

**Coverage:**
- v1.4 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-17 after roadmap creation (traceability added)*
