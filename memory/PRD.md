# GPSC Gujarat PYQ — PRD

## Original Problem Statement
"I want to generate website for gujrat gpsc previous year question"

## User Choices
- Features: Browse by year/exam, Practice mode (MCQ + instant reveal), Mock test (timer/scoring), Search & filter
- Content language: Gujarati only
- Accounts: Both public browsing AND signup for progress/bookmarks
- Data: Seed sample questions + Admin panel for additions
- AI: AI explanation per answer + AI-generated practice questions
- AI provider: Gemini 3 Flash (via EMERGENT_LLM_KEY)
- App name: GPSC Gujarat PYQ
- Admin: admin@gpscpyq.in / Admin@123 (changed from `.local` due to email validator rejection)

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) + JWT auth + bcrypt + emergentintegrations (Gemini 3 Flash)
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn/ui + sonner + lucide-react
- **Fonts**: Outfit (UI), Hind Vadodara (Gujarati content), JetBrains Mono (stats/timers)

## User Personas
1. **Aspirant (anonymous)** — browses PYQs, practices without account
2. **Aspirant (registered)** — tracks progress, saves bookmarks, AI-generated practice
3. **Admin** — manages question bank via /admin

## Core Requirements (Static)
- Gujarati-first MCQ presentation
- 4-option MCQ with single correct answer
- AI explanation in Gujarati on demand
- Mock test with timer + result review
- Practice with instant reveal
- Admin CRUD for questions
- Filter by exam / year / subject / search

## What's Been Implemented (2026-12)
### Backend (FastAPI, /app/backend/server.py)
- Auth: signup, login, /me (JWT, 30-day expiry, bcrypt)
- Questions: list (filters + search), random sampling, get-by-id, admin create/delete, filters meta
- Attempts: submit (auto-scoring), list per user
- Stats: aggregated user stats (accuracy, mock best, bookmarks count)
- Bookmarks: add / remove / list
- AI: `/ai/explain` (open) + `/ai/generate` (auth required) using Gemini 3 Flash
- Startup seeding: 1 admin user + 12 Gujarati MCQs across 3 exams (GPSC Class 1-2, Dy.SO, PI)

### Frontend (React, /app/frontend/src)
- Routes: `/`, `/browse`, `/practice`, `/practice/run`, `/mock`, `/dashboard`, `/bookmarks`, `/login`, `/signup`, `/admin`, `/question/:id`
- Landing with hero + features + CTA
- Browse with filters + Gujarati search + grid + bulk-practice CTA
- Practice setup (PYQ + AI generation) → run with reveal + AI explanation
- Mock test with countdown timer + question palette + auto-submit + review
- Dashboard with stat tiles + recent attempts
- Admin panel with form + question table + delete
- Bookmarks page
- Shared Header (sticky glass) + dropdown user menu
- Light theme, Swiss/high-contrast aesthetic, monospace stats

## Test Results (Iteration 1)
- Backend: 23/23 pytest passing
- Frontend: 11/11 flows passing
- AI integration: working (occasional transient upstream "budget" warning, retry resolves)

## Backlog (next phases)
### P0
- Bulk question import (CSV/JSON) in admin panel for real PYQ data
### P1
- Subject-wise analytics on dashboard (radial chart per subject)
- Leaderboard for mock test scores
- Email verification on signup
### P2
- Daily question / streak gamification
- PDF export of bookmarked questions
- Marathi/Hindi alternate language toggle
- Discussion thread per question
