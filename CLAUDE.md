# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fitness Coach Assistant - A smartphone-optimized web application that serves as an AI assistant for fitness coaches. The application assists coaches in their gym work as Personal Trainers and Pilates Instructors.

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Styling**: CSS (to be configured)

## Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Project Structure

```
src/
  lib/
    supabase.ts    # Supabase client initialization
  App.tsx          # Main application component
  main.tsx         # Application entry point
  vite-env.d.ts    # TypeScript environment types
```

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

Environment variables must be prefixed with `VITE_` to be accessible in the frontend.
