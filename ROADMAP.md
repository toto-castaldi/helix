# Roadmap - Fitness Coach Assistant

## Milestone 1: Palestre ✅

### 1.1 Database

- [x] Migration: tabella `gyms` (id, user_id, name, address, description, created_at, updated_at)
- [x] RLS policies per `gyms`

### 1.2 Types

- [x] Aggiungere tipi TypeScript: `Gym`, `GymInsert`, `GymUpdate`

### 1.3 Hook

- [x] Creare `useGyms.ts` con CRUD operations

### 1.4 Componenti

- [x] `GymForm.tsx` - Form creazione/modifica palestra
- [x] `GymCard.tsx` - Card per lista palestre

### 1.5 Pagina

- [x] `Gyms.tsx` - Pagina lista palestre con CRUD
- [x] Aggiungere route `/gyms` in App.tsx
- [x] Aggiungere bottone navigazione in Layout.tsx

### 1.6 Test & Build

- [x] Verificare build senza errori
- [x] Test manuale funzionalità

---

## Milestone 2: Sessioni

### 2.1 Database

- [x] Migration `006_sessions.sql`:
  - Tabella `sessions` (id, client_id, gym_id, session_date, status, notes, created_at, updated_at)
  - Tabella `session_exercises` (id, session_id, exercise_id, order_index, sets, reps, weight_kg, duration_seconds, notes)
  - RLS policies per entrambe le tabelle
  - Trigger updated_at per sessions
  - Indici per performance

### 2.2 Hook

- [x] Creare `useSessions.ts` con:
  - `fetchSessions()` - lista sessioni con filtri opzionali
  - `getSession(id)` - sessione singola con client, gym, exercises
  - `createSession()`, `updateSession()`, `deleteSession()`
  - `addExercise()`, `updateExercise()`, `removeExercise()`, `reorderExercises()`

### 2.3 Componenti

- [x] `SessionForm.tsx` - Form creazione/modifica sessione
- [x] `SessionCard.tsx` - Card per lista sessioni
- [x] `SessionExerciseCard.tsx` - Card esercizio con controlli inline
- [x] `ExercisePicker.tsx` - Dialog selezione esercizio da catalogo

### 2.4 Pagine

- [x] `Sessions.tsx` - Lista sessioni con filtri
- [x] `SessionDetail.tsx` - Dettaglio sessione con CRUD esercizi
- [x] Aggiungere route `/sessions` in App.tsx
- [x] Aggiungere route `/sessions/:id` in App.tsx
- [x] Aggiungere bottone navigazione in Layout.tsx

### 2.5 Test & Build

- [x] Verificare build senza errori
- [X] Test manuale funzionalità

---

## Milestone 3: AI Planning

---

## Milestone 4: Live Coaching

---
