# CampusLoop 🎓♻️

**AI-Powered University Resource Sharing Platform** - Web Technologies course project (Full-Stack Track).

> Team **Unemployed Developers** · SZABIST · Instructor: Mustafa Hassan
> Aftab Ahmed Samoo (#2312398) · Javeria Masroor (#2312400) · Laiba Aamir (#2312398)

CampusLoop turns idle university assets - lab instruments, study rooms, AV gear, textbooks,
bicycles - into a trusted internal marketplace with concurrent-safe booking, peer lending,
lost & found, and four AI features behind a NestJS proxy.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript, Vite, React Router v6, Axios, Zustand, framer-motion, Recharts, socket.io-client |
| Backend | NestJS + TypeScript, TypeORM (migrations), Passport-JWT (access+refresh), Socket.io gateway, @nestjs/schedule crons |
| Database | PostgreSQL 15 on [Neon](https://neon.tech) (serverless, free tier) - full-text search, `btree_gist` exclusion constraint against double-bookings |
| AI | Anthropic Claude **or** OpenAI via backend proxy - no keys in the frontend, graceful fallbacks everywhere |
| Docs / tests | Swagger auto-generated at `/api` · Jest + Supertest role-guard integration tests |

## Quick start

Database is [Neon](https://neon.tech) - a free serverless Postgres. No local database or Docker
needed.

```bash
# 1. create a free Neon project at neon.tech, copy its connection details

# 2. backend env
cd backend
copy .env.example .env          # fill in DB_HOST/DB_USER/DB_PASSWORD/DB_NAME from Neon,
                                 # keep PGSSLMODE=require, set AI_API_KEY if you have one

# 3. install, migrate, seed
npm install
npm run migration:run           # runs cleanly from scratch against Neon
npm run seed                    # 9 departments, 17 users, 24 assets (with photos), 8-week
                                 # booking history, lending activity, lost & found, study profiles

# 4. run the API
npm run start:dev               # http://localhost:3000, Swagger at /api

# 5. frontend (separate terminal)
cd ../frontend
npm install
npm run dev                     # http://localhost:5173 (proxies API + WebSocket to :3000)
```

### Demo logins (password: `Password123!`)

| Role | Email |
|---|---|
| Student | `aftab@szabist.edu.pk` · `javeria@szabist.edu.pk` · `laiba@szabist.edu.pk` (+ 9 more) |
| Staff / Lab Manager | `sara.malik@szabist.pk` · `imran.farooq@szabist.pk` · `nadia.hussain@szabist.pk` |
| Lost & Found Officer | `officer@szabist.pk` |
| Admin | `admin@szabist.pk` |

> **Admin accounts are never self-registered.** The public registration form only offers Student,
> Staff and Lost & Found Officer; the backend rejects `role: ADMIN` on `POST /auth/register` with a
> 403 even if called directly against the API. New admins can only be created by an existing admin
> promoting a user via `PATCH /users/:id/role`.

## AI features (all proxied through NestJS - spec constraint 5.1)

1. **Smart Search** - natural-language asset discovery with ranked rationale, alternatives and
   predicted return dates. Fallback: PostgreSQL full-text keyword search.
2. **Condition Assessment** - return photo + note → AI pre-fills the inspection report
   (condition, damage, recommended action, confidence); manager confirms or overrides.
   Fallback: manual form.
3. **Study Group Matcher** - modules + slots + style → ranked compatible partners; WebSocket
   proposal flow where **both** must accept before contact details are exchanged.
   Fallback: deterministic overlap scoring.
4. **Utilisation Anomaly Detector (bonus)** - Monday 08:00 cron analyses 8 weeks of bookings,
   flags bottlenecks and idle assets, "emails" faculty admins (log + admin WebSocket room), and is
   runnable on demand from the admin dashboard.
5. **Help Chatbot** - a floating assistant available on every page, including before login, that
   answers questions about using CampusLoop (booking, lending, lost & found, study groups, etc.).
   Role-aware when logged in; addresses anonymous visitors as guests and points them to register.
   Fallback: keyword-matched canned topic answers.

Set `AI_PROVIDER` and `AI_API_KEY` in `backend/.env`. With `none` (or any API failure) every
feature degrades gracefully - the UI labels non-AI results.

**Free API keys** (no credit card needed):

| Provider | Get a key | `.env` |
|---|---|---|
| Google Gemini (recommended - free tier incl. vision) | <https://aistudio.google.com/apikey> | `AI_PROVIDER=gemini` |
| Groq (free tier, very fast, vision) | <https://console.groq.com/keys> | `AI_PROVIDER=groq` |
| OpenRouter (`:free` models) | <https://openrouter.ai/settings/keys> | `AI_PROVIDER=openrouter` |
| Anthropic / OpenAI (paid) | console.anthropic.com / platform.openai.com | `AI_PROVIDER=anthropic\|openai` |

Sign up, copy the key into `AI_API_KEY=`, restart the backend - done. `AI_MODEL` is optional
(sensible per-provider defaults are built in).

## Other platform features

- **PKR pricing** - asset values are shown in PKR (`Rs 1,050,000` style formatting); bookings for
  assets at or above `HIGH_VALUE_THRESHOLD` (default Rs 100,000) require manager approval.
- **Product photos** - every seeded asset and lending listing has a real photo; staff/admin can
  replace an asset's photo any time from its detail page (`PATCH /assets/:id`, multipart).
- **Password visibility toggle** on Login and Register (shared `PasswordInput` component).
- **Centered, responsive card grids** - flexbox-based wrapping (not CSS Grid `auto-fill`) so a
  partially-filled last row of cards centers itself instead of hugging the left edge.

## Tests & docs

```bash
cd backend
npm test            # 29 Jest + Supertest tests over role-protected routes
npm run test:cov    # coverage (controllers)
```

- Swagger: <http://localhost:3000/api>
- System design: [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md)
- AI integration report: [docs/AI_INTEGRATION_REPORT.md](docs/AI_INTEGRATION_REPORT.md)
- Project reflection (benefits, scope, decisions): [docs/REFLECTION.md](docs/REFLECTION.md)
- Demo script + architectural-decision outline: [docs/REFLECTION_GUIDE.md](docs/REFLECTION_GUIDE.md)

## Project structure

```
CampusLoop/
├── backend/
│   ├── src/entities/         # TypeORM entities (polymorphic Asset, Booking, …)
│   ├── src/migrations/       # runs cleanly from scratch (incl. FTS trigger, exclusion constraint)
│   ├── src/modules/          # auth, users, departments, assets, bookings, lending,
│   │                         # lostfound, study, analytics, ai (LLM proxy), notifications (WS)
│   ├── src/seed/seed.ts      # demo data
│   └── test/                 # Jest + Supertest role-guard suites
├── frontend/
│   └── src/
│       ├── components/       # NavBar, Chatbot (floating help widget), shared ui.tsx (glass
│       │                     # primitives, PasswordInput, Modal, Toasts, EmptyState, ...)
│       └── pages/            # role dashboards, AI UI, charts
└── docs/                     # deliverable documents
```
