# Requirements: Helix v1.1

**Defined:** 2026-01-30
**Core Value:** Group exercise management for live coaching — separazione vista cliente, template riutilizzabili

## v1.1 Requirements

Requirements for milestone v1.1. Each maps to roadmap phases.

### Template Gruppo

- [ ] **TMPL-01**: Coach può creare un template di allenamento di gruppo con nome
- [ ] **TMPL-02**: Coach può aggiungere esercizi al template con parametri (serie, reps, peso, durata)
- [ ] **TMPL-03**: Coach può modificare un template esistente
- [ ] **TMPL-04**: Coach può eliminare un template
- [ ] **TMPL-05**: Coach può associare un template a una sessione esistente (gli esercizi vengono copiati come gruppo)

### Vista Cliente

- [ ] **VIEW-01**: Vista cliente nel tablet ha due tab: "I miei" e "Gruppo"
- [ ] **VIEW-02**: Tab "I miei" mostra solo esercizi individuali del cliente
- [ ] **VIEW-03**: Tab "Gruppo" mostra solo esercizi di gruppo del cliente

### Cleanup Mobile

- [ ] **MOBL-01**: Rimuovere pagina Live dall'app mobile
- [ ] **MOBL-02**: Rimuovere navigazione/link alla funzionalità Live dall'app mobile

### MCP Integration

- [ ] **MCP-01**: Resource `helix://group-templates` — lista template di gruppo
- [ ] **MCP-02**: Resource `helix://group-templates/{id}` — dettaglio template con esercizi
- [ ] **MCP-03**: Tool `create_group_template` — crea nuovo template
- [ ] **MCP-04**: Tool `update_group_template` — modifica template esistente
- [ ] **MCP-05**: Tool `delete_group_template` — elimina template
- [ ] **MCP-06**: Tool `add_template_exercise` — aggiunge esercizio a template
- [ ] **MCP-07**: Tool `remove_template_exercise` — rimuove esercizio da template
- [ ] **MCP-08**: Tool `apply_template_to_session` — associa template a sessione (copia esercizi come gruppo)

### Bugfix

- [ ] **FIX-01**: Export cliente funziona senza errori

## Future Requirements

Deferred to v1.2+.

### Template Avanzati

- **TMPL-06**: Template con parametri variabili per cliente
- **TMPL-07**: Duplicazione template
- **TMPL-08**: Condivisione template tra coach

### Analytics

- **ANLX-01**: Statistiche utilizzo template
- **ANLX-02**: Report sessioni di gruppo

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Associazione automatica template per orario | Complessità, selezione manuale sufficiente per v1.1 |
| Parametri variabili per cliente nel template | Complicherebbe UX, tutti fanno stesso allenamento |
| Vista cliente-facing separata | Coach e cliente usano stessa vista |
| Class booking/scheduling | Helix è per coaching, not gym management |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TMPL-01 | Phase 6 | Pending |
| TMPL-02 | Phase 6 | Pending |
| TMPL-03 | Phase 6 | Pending |
| TMPL-04 | Phase 6 | Pending |
| TMPL-05 | Phase 6 | Pending |
| VIEW-01 | Phase 8 | Pending |
| VIEW-02 | Phase 8 | Pending |
| VIEW-03 | Phase 8 | Pending |
| MOBL-01 | Phase 9 | Pending |
| MOBL-02 | Phase 9 | Pending |
| MCP-01 | Phase 7 | Pending |
| MCP-02 | Phase 7 | Pending |
| MCP-03 | Phase 7 | Pending |
| MCP-04 | Phase 7 | Pending |
| MCP-05 | Phase 7 | Pending |
| MCP-06 | Phase 7 | Pending |
| MCP-07 | Phase 7 | Pending |
| MCP-08 | Phase 7 | Pending |
| FIX-01 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-01-30*
*Last updated: 2026-01-30 after roadmap creation*
