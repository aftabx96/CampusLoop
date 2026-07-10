# CampusLoop 🎓♻️

**AI-Powered University Resource Sharing Platform** — Web Technologies course project (Full-Stack Track).

> Team **Unemployed Developers** · SZABIST · Instructor: Mustafa Hassan
> Aftab Ahmed Samoo (#2312398) · Javeria Masroor (#2312400) · Laiba Aamir (#2312398)

CampusLoop turns idle university assets — lab instruments, study rooms, AV gear, textbooks,
bicycles — into a trusted internal marketplace with concurrent-safe booking, peer lending,
lost & found, and four AI features behind a NestJS proxy.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript, Vite, React Router v6, Axios, Zustand, framer-motion, Recharts, socket.io-client |
| Backend | NestJS + TypeScript, TypeORM (migrations), Passport-JWT (access+refresh), Socket.io gateway, @nestjs/schedule crons |
| Database | PostgreSQL 15 (Dockerised) — full-text search, `btree_gist` exclusion constraint against double-bookings |
| AI | Anthropic Claude **or** OpenAI via backend proxy — no keys in the frontend, graceful fallbacks everywhere |
| Docs / tests | Swagger auto-generated at `/api` · Jest + Supertest role-guard integration tests |

## Quick start

```bash
# 1. backend env
cd backend
copy .env.example .env          # then set AI_API_KEY if you have one (optional)

# 2. database + backend in one command (Docker)
cd ..
docker compose up --build       # Postgres 15 + API on :3000, migrations run automatically

# 3. seed demo data (departments, users, 12 assets, listings, study profiles)
cd backend && npm install && npm run seed

# 4. frontend
cd ../frontend
npm install
npm run dev                     # http://localhost:5173 (proxies API + WebSocket to :3000)
```

**No Docker?** Point `backend/.env` at any Postgres 15, then `npm run start:dev` in `backend/`.

### Demo logins (password: `Password123!`)

| Role | Email |
|---|---|
| Student | `aftab@szabist.edu.pk` · `javeria@szabist.edu.pk` · `laiba@szabist.edu.pk` |
| Staff / Lab Manager | `staff@meridian.edu` |
| Lost & Found Officer | `officer@meridian.edu` |
| Admin | `admin@meridian.edu` |

## AI features (all proxied through NestJS — spec constraint 5.1)

1. **Smart Search** — natural-language asset discovery with ranked rationale, alternatives and
   predicted return dates. Fallback: PostgreSQL full-text keyword search.
2. **Condition Assessment** — return photo + note → AI pre-fills the inspection report
   (condition, damage, recommended action, confidence); manager confirms or overrides.
   Fallback: manual form.
3. **Study Group Matcher** — modules + slots + style → ranked compatible partners; WebSocket
   proposal flow where **both** must accept before contact details are exchanged.
   Fallback: deterministic overlap scoring.
4. **Utilisation Anomaly Detector (bonus)** — Monday 08:00 cron analyses 8 weeks of bookings,
   flags bottlenecks and idle assets, "emails" faculty admins (log + admin WebSocket room), and is
   runnable on demand from the admin dashboard.

Set `AI_PROVIDER` and `AI_API_KEY` in `backend/.env`. With `none` (or any API failure) every
feature degrades gracefully — the UI labels non-AI results.

**Free API keys** (no credit card needed):

| Provider | Get a key | `.env` |
|---|---|---|
| Google Gemini (recommended — free tier incl. vision) | <https://aistudio.google.com/apikey> | `AI_PROVIDER=gemini` |
| Groq (free tier, very fast, vision) | <https://console.groq.com/keys> | `AI_PROVIDER=groq` |
| OpenRouter (`:free` models) | <https://openrouter.ai/settings/keys> | `AI_PROVIDER=openrouter` |
| Anthropic / OpenAI (paid) | console.anthropic.com / platform.openai.com | `AI_PROVIDER=anthropic\|openai` |

Sign up, copy the key into `AI_API_KEY=`, restart the backend — done. `AI_MODEL` is optional
(sensible per-provider defaults are built in).

## Tests & docs

```bash
cd backend
npm test            # 29 Jest + Supertest tests over role-protected routes
npm run test:cov    # coverage (controllers)
```

- Swagger: <http://localhost:3000/api>
- System design: [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md)
- AI integration report: [docs/AI_INTEGRATION_REPORT.md](docs/AI_INTEGRATION_REPORT.md)
- Demo script + reflection outline: [docs/REFLECTION_GUIDE.md](docs/REFLECTION_GUIDE.md)

## Project structure

```
CampusLoop/
├── docker-compose.yml        # Postgres + API, single command
├── backend/
│   ├── src/entities/         # TypeORM entities (polymorphic Asset, Booking, …)
│   ├── src/migrations/       # runs cleanly from scratch (incl. FTS trigger, exclusion constraint)
│   ├── src/modules/          # auth, users, departments, assets, bookings, lending,
│   │                         # lostfound, study, analytics, ai (LLM proxy), notifications (WS)
│   ├── src/seed/seed.ts      # demo data
│   └── test/                 # Jest + Supertest role-guard suites
├── frontend/
│   └── src/                  # Liquid-glass design system, role dashboards, AI UI, charts
└── docs/                     # deliverable documents
```
