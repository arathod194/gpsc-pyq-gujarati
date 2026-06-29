# GPSC Gujarat PYQ — PRD

## Original Problem Statement
"I want to generate website for gujrat gpsc previous year question"

## User Choices
- Features: Browse / Practice / Mock / Search / Daily / Leaderboard / Bookmarks / Admin
- Content language: Gujarati only
- Accounts: Public browsing + signup for progress/bookmarks/streak
- Data: 12 seeded samples + Admin manual entry + Bulk CSV/JSON import (user owns data entry)
- AI: AI explanation per answer + AI-generated practice questions (Gemini 3 Flash via EMERGENT_LLM_KEY)
- Email: Resend (scaffolded; works in dev-link mode until user adds RESEND_API_KEY)
- App name: GPSC Gujarat PYQ
- Admin: admin@gpscpyq.in / Admin@123

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) + JWT + bcrypt + Resend (email) + emergentintegrations (Gemini 3 Flash)
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn/ui + sonner + lucide-react + recharts

## Implemented (iter 1 + iter 2)

### Backend (`/app/backend/server.py`)
**Auth**
- POST `/auth/signup` (sends verification email)
- POST `/auth/login`
- GET `/auth/me`
- POST `/auth/verify` (token)
- POST `/auth/resend-verification`
- POST `/auth/forgot-password` (dev_link returned when no RESEND_API_KEY)
- POST `/auth/reset-password`

**Questions**
- GET `/questions` (filters: exam/year/subject/search)
- GET `/questions/filters` (distinct lists)
- GET `/questions/random?count=&exam=&subject=`
- GET `/questions/{id}`
- POST `/questions` (admin)
- DELETE `/questions/{id}` (admin)
- POST `/questions/bulk_import` (admin, JSON array)
- POST `/questions/import_csv` (admin, multipart CSV)

**Attempts & Stats**
- POST `/attempts` (records + auto-scores)
- GET `/attempts`
- GET `/stats` (returns total_attempts, accuracy, best_mock_score, bookmarks, **subject_breakdown**, **current_streak**, **longest_streak**)

**Bookmarks**: POST / GET / DELETE `/bookmarks`

**Daily + Streak**
- GET `/daily` — deterministic question per UTC date; includes attempted state + streak for authed users
- POST `/daily/answer` — records answer once per day; updates streak

**Leaderboard**: GET `/leaderboard?scope=mock|weekly|streak&limit=20`

**AI**
- POST `/ai/explain` (open) — Gujarati MCQ explanation
- POST `/ai/generate` (auth) — 5 AI-generated questions on a topic

### Frontend (`/app/frontend/src`)
Routes: `/`, `/browse`, `/practice`, `/practice/run`, `/mock`, `/dashboard`, `/bookmarks`, `/login`, `/signup`, `/admin`, `/question/:id`, `/daily`, `/leaderboard`, `/verify-email`, `/forgot-password`, `/reset-password`

- Landing (hero + features + CTA, bilingual)
- Browse (filters + Gujarati search + grid + bulk-practice CTA)
- PracticeStart (PYQ + AI generation) + PracticeRun (reveal + AI explain + bookmark)
- MockTest (timer + palette + result + question review)
- Dashboard (5 stat cards, subject-accuracy bar chart, streak card, leaderboard quick link, email-verify banner with resend, recent attempts)
- Daily (today's question + streak + once-per-day lock)
- Leaderboard (3 tabs: best mock / weekly / streak)
- Admin (form + JSON & CSV bulk import + delete)
- Bookmarks page
- Auth: Login (+ forgot link) / Signup / VerifyEmail / ForgotPassword / ResetPassword
- Header: sticky glass, dropdown user menu

### Seeded Data
- 12 sample Gujarati MCQs across GPSC Class 1-2 / Dy.SO / PI (years 2021-2023, 6 subjects)
- 1 admin user (admin@gpscpyq.in / Admin@123)
- User chose option D: rely on these seeds + Admin panel for real PYQs (legacy non-Unicode font in GPSC PDFs prevented automated import)

## Tests
- Iteration 1: 23/23 backend + 11/11 frontend flows passing
- Iteration 2: 15/15 new backend + 7/7 new frontend flows passing

## Backlog
### P0
- Wire RESEND_API_KEY when user provides one
### P1
- Mobile nav drawer (md menu currently hidden on mobile)
- Streak read-time decay (currently updated only on POST `/daily/answer`)
- Pagination/virtualization on Browse for 1000+ questions
- Shareable mock result cards (Twitter/WhatsApp)
### P2
- Discussion thread per question
- PDF export of bookmarks
- Hindi/Marathi language toggle
- Server-side rendering for SEO
- OCR pipeline for legacy GPSC PDFs (if user later provides access)

## Known Limitations
- GPSC's official PDFs use non-Unicode legacy Gujarati fonts (Shree-Lipi/Krutidev/ISFOC); automated text extraction yields garbled bytes. User entering real PYQ data via Admin (manual form or CSV/JSON upload).
- Email delivery is mocked (logs `[email-mock]`) until `RESEND_API_KEY` is set in `/app/backend/.env`. UI gracefully shows `dev_link` for forgot/verify flows.
