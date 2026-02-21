# Requirements: Helix

**Defined:** 2026-02-21
**Core Value:** Durante le lezioni di gruppo, il coach puo gestire gli esercizi condivisi da un'unica vista, completandoli una volta per tutti i partecipanti

## v1.5 Requirements

Requirements for milestone v1.5 Versioning GSD.

### CI/CD

- [ ] **CICD-01**: Il build estrae automaticamente la versione dall'ultima milestone in `.planning/MILESTONES.md`
- [ ] **CICD-02**: Rimossa la generazione versione date-time (`YYYY.MM.DD.HHMM`)
- [ ] **CICD-03**: Rimosso lo step di update README con versione
- [ ] **CICD-04**: Rimosso il commit automatico `chore: update version to...`

### Version Display

- [ ] **VDSP-01**: Coach app mostra versione milestone (es. `v1.5`) nel menu utente
- [ ] **VDSP-02**: Live tablet mostra versione milestone nell'header/toolbar
- [ ] **VDSP-03**: Landing page mostra versione milestone
- [ ] **VDSP-04**: Landing page include link al repository GitHub (`github.com/toto-castaldi/helix`)

## Future Requirements

None for this milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Semantic versioning automatico (semver) | Versione e' manuale, segue milestone GSD |
| Changelog automatico | Non necessario, MILESTONES.md serve gia da storico |
| Version bumping tools (standard-version, etc.) | Overengineering per questo use case |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CICD-01 | — | Pending |
| CICD-02 | — | Pending |
| CICD-03 | — | Pending |
| CICD-04 | — | Pending |
| VDSP-01 | — | Pending |
| VDSP-02 | — | Pending |
| VDSP-03 | — | Pending |
| VDSP-04 | — | Pending |

**Coverage:**
- v1.5 requirements: 8 total
- Mapped to phases: 0
- Unmapped: 8 ⚠️

---
*Requirements defined: 2026-02-21*
*Last updated: 2026-02-21 after initial definition*
