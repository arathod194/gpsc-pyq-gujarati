# GPSC Gujarat PYQ — PRD

## Original Problem Statement
"I want to generate website for gujrat gpsc previous year question"

## Contact + Admin Data (Feb 2026)
- **Contact form now works end-to-end.** POST /api/contact (public) saves to `db.contact_messages` AND emails the site owner via Emergent managed email proxy (httpx → integrations.emergentagent.com/api/v1/email/send).
- Owner notification email: `CONTACT_NOTIFY_EMAIL=amitrathod194@hotmail.com` (in backend/.env). Sender display name: `EMAIL_FROM_NAME=GPSC Gujarat PYQ`. Auth key: `EMERGENT_EMAIL_KEY` in .env.
- **Admin panel now has 3 tabs**: Questions (existing), Messages (list/mark-read/delete + unread badge), Data Overview (counts for questions/users/attempts/bookmarks/messages + questions-by-subject chart).
- New backend routes: GET /api/admin/messages, POST /api/admin/messages/{id}/read, DELETE /api/admin/messages/{id}, GET /api/admin/overview.
- Note: legacy auth emails (verify/reset) still use old Resend path (dev-mock, no key). New contact email uses the working proxy. Could migrate auth emails to the proxy later if real delivery is wanted.

## Decisions
- Content language: Gujarati only
- Accounts: Public browsing + signup for progress/bookmarks/streak
- Data entry: Admin manual + Bulk CSV/JSON import (user owns data entry)
- AI: Gemini 3 Flash via EMERGENT_LLM_KEY (with rate limiting for cost safety)
- Email: Resend scaffolded (no key yet — falls back to dev_link)
- Monetization: AdSense (no key yet — placeholders ready)
- Admin: admin@gpscpyq.in / Admin@123

## Resolved (Feb 2026)
- **Admin panel "not visible" issue** — RESOLVED. Not a bug. Root cause: user was logged in with a personal (role="user") account, not the admin account. Admin nav only shows for admin role. Verified full admin login → /admin flow works on preview via Playwright. User confirmed working.
- Note for future testing: in the screenshot tool's async context, ALWAYS `await` page.* calls; un-awaited calls return truthy coroutines and give false positives.

## Where We Left Off (last session)
- App is **deploy-ready** (deployment_agent verified PASS)
- All major features built, tested, polished
- User will **deploy tomorrow**, then upload real questions, then apply for AdSense after 1 week of traffic

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) + JWT + bcrypt + Resend + emergentintegrations (Gemini 3 Flash)
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn/ui + sonner + lucide-react + recharts

## Implemented Features

### Core MVP
- Browse questions (filters: exam/year/subject + Gujarati search)
- Practice mode (PYQ + AI-generated, instant reveal, AI explanation, bookmark)
- Mock test (timer, question palette, auto-submit, result + review)
- Daily question + streak (one-per-day, current/longest tracked)
- Leaderboard (3 scopes: best mock / weekly / longest streak)
- Bookmarks
- Admin panel (form + Bulk JSON/CSV import + delete)
- Auth (signup, login, password reset, email verification — Resend scaffold)
- Dashboard (5 stats, subject-accuracy chart, streak card, recent attempts, **"Next Step" AI-free suggestion**)

### Monetization & Growth
- AdSense slots (Landing, Browse, Daily, Practice, Leaderboard, sticky mobile)
- Ads auto-hide for logged-in users
- Shareable mock results (WhatsApp + Twitter)
- Real-time public stats on Landing (social proof)
- SEO: meta tags, OG, Twitter card, JSON-LD, dynamic sitemap, robots.txt, per-page titles

### Mobile & Performance
- PWA (manifest, icons, service worker, offline mode, install prompt)
- Mobile hamburger drawer
- Code-splitting (React.lazy on 20 routes)
- Skeleton loaders on Browse + Dashboard
- 404 page

### Trust & Compliance
- Privacy Policy, Terms of Service, About, Contact pages (AdSense requirement)
- Footer with legal + practice + company links
- Disclaimer: not affiliated with GPSC

### Cost Protection
- MongoDB-backed AI rate limiting (anon: 4/min, 20/day · user: 10/min, 200/day)
- TTL auto-cleanup
- X-Forwarded-For aware (works behind ingress)

## Files of Note
- `/app/backend/server.py` — all backend routes
- `/app/frontend/src/App.js` — routes with code-splitting
- `/app/frontend/src/pages/*` — all page components
- `/app/frontend/src/components/AdSlot.jsx` + `StickyAd.jsx` — AdSense scaffolding
- `/app/frontend/src/components/InstallPrompt.jsx` — PWA install
- `/app/frontend/public/manifest.json` + `sw.js` + `icon-*.svg`
- `/app/memory/test_credentials.md` — admin login info

## Environment Variables (already set)
**Backend (.env):**
- `MONGO_URL`, `DB_NAME` (auto-managed)
- `JWT_SECRET`
- `EMERGENT_LLM_KEY` (for AI)
- `RESEND_API_KEY` (empty — falls back to dev links)
- `SENDER_EMAIL`, `FRONTEND_URL`, `CORS_ORIGINS`

**Frontend (.env):**
- `REACT_APP_BACKEND_URL` (auto-managed)
- `REACT_APP_ADSENSE_CLIENT` (empty — placeholders shown in dev only)
- `REACT_APP_ADSENSE_SLOT_INLINE` (empty)
- `REACT_APP_ADSENSE_SLOT_LEADERBOARD` (empty)

## Tomorrow's Resume Checklist
1. **Deploy** via Emergent's Deploy button → get production URL
2. **Add real questions** via Admin panel (Bulk JSON or CSV) — target 30-50 across 5+ subjects
3. Share with WhatsApp/Telegram GPSC groups for first users
4. After ~7 days of traffic, **apply for AdSense** at google.com/adsense
5. Share your `ca-pub-XXXXX` ID with me → I'll wire it in 1 min
6. After AdSense approval, share slot IDs → ads go live

## Optional Polish (not blocking)
- Streak calendar heatmap on Dashboard (backend endpoint `/me/streak-calendar` already exists — frontend pending)
- Topic-level filter on Practice
- PDF export of bookmarks
- Question reporting/admin moderation
- Hindi/English language toggle

## Known Limitations
- GPSC's official PDFs use non-Unicode legacy Gujarati fonts → can't auto-extract. User uploads questions manually.
- Email currently mock (logs only) until `RESEND_API_KEY` is set. UI shows `dev_link` for forgot/verify flows.
- AdSense ads show only after publisher ID is added.

## Tests
- Iteration 1 (MVP): 23/23 backend + 11/11 frontend passing
- Iteration 2 (5 features): 15/15 backend + 7/7 frontend passing
- All later additions (PWA, SEO, AdSense, rate limit, social proof, next-step) verified via curl + screenshots
