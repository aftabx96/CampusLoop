# CampusLoop - Project Reflection

> **Team:** Unemployed Developers - Aftab Ahmed Samoo (#2312398), Javeria Masroor (#2312400), Laiba Aamir (#2312398)
> **Course:** Web Technologies - Instructor: Mustafa Hassan - SZABIST
>
> Note on integrity (course spec §8): the course's Academic Integrity policy states that AI tools
> may not be used to write the submitted reflection report. This document is a **structured
> draft/starting point** built from the implemented codebase - the team should read it, verify
> every claim against the actual system, and rewrite it in their own words and voice before
> submission. Treat it as a scaffold, not a final answer.

## 1. About the Project

CampusLoop is a full-stack, AI-assisted resource-sharing platform built for the fictional
Meridian University as the course project for Web Technologies. It models a real problem many
universities face: expensive equipment, rooms and everyday items sit idle in one department while
students in another department queue for the same category of resource, and the whole process is
coordinated by email. CampusLoop replaces that with a single, role-aware web application: a
searchable catalogue of assets, conflict-safe booking, a peer-to-peer lending marketplace, a lost
and found desk, a study-partner matcher, an analytics dashboard for administrators, and a help
chatbot available to logged-in users and anonymous visitors alike, all backed by a NestJS API, a
PostgreSQL database (hosted on Neon) and three mandatory AI features plus one bonus feature and
one general-purpose assistant, all proxied through the backend.

The system was designed and implemented end-to-end by the team: database schema and migrations,
JWT authentication with role-based guards, a WebSocket notification layer, an AI proxy module with
graceful degradation, and a React frontend with a distinct "liquid glass" visual identity.

## 2. Scope

### In scope (delivered)
- Four user roles (Student, Staff/Lab Manager, Lost & Found Officer, Admin) with JWT-based
  authentication carrying role, department and faculty claims.
- A polymorphic asset catalogue covering physical items, rooms and loanable goods, with
  department ownership, condition tracking, full-text search and photo uploads.
- Conflict-safe booking with two independent layers of protection (an application-level
  pessimistic lock plus a database exclusion constraint), manager approval for high-value assets,
  and real-time WebSocket notifications.
- A peer lending marketplace with reputation scoring, mutual ratings and automated overdue
  escalation.
- A lost and found workflow with AI-assisted match suggestions for officers.
- A study-group matcher that proposes compatible partners and only exchanges contact details once
  both students accept.
- An admin analytics dashboard with four distinct chart types (utilisation, demand ranking,
  approval turnaround, lending volume) plus a bonus weekly AI utilisation-anomaly report.
- All three mandatory AI features (smart search, condition assessment, study matching) and the
  bonus anomaly detector, each with a working, honest fallback when AI is unavailable.
- A help chatbot reachable before and after login, with a role-aware system prompt and a
  keyword-matched fallback of its own.
- Admin accounts cannot be self-registered: the public sign-up form only offers Student, Staff and
  Lost & Found Officer, and the backend independently rejects `role: ADMIN` even if the API is
  called directly - a deliberate security boundary enforced server-side, not just hidden in the UI.
- Automated Jest + Supertest tests covering role-guard behaviour on every protected route family.
- Swagger documentation generated directly from the NestJS controllers.

### Out of scope (acknowledged, not built)
- Real email delivery (OTP verification, transactional notification emails) - the team deliberately
  scoped this out of the current submission in favour of the in-app WebSocket notification channel,
  which meets the spec's real-time requirement without adding an external mail dependency.
- Payment processing or financial reconciliation - CampusLoop tracks asset **value** only to decide
  whether manager approval is required; no money moves through the system.
- Native mobile apps - the frontend is a responsive web app (tablet-usable, per the spec), not a
  packaged iOS/Android client.
- Multi-tenancy across multiple real universities - the system is built and seeded for a single
  institution's data model, though nothing in the schema prevents extending it later.

## 3. Who Benefits, and How

- **Students** get a single place to discover what already exists on campus instead of buying or
  going without - the AI smart search is built specifically to surface assets they wouldn't have
  known to search for by exact name (spec's "documentary audio recorder" example).
- **Staff / lab managers** get an approval queue instead of an inbox, and an AI-drafted condition
  report instead of a blank form every time equipment comes back - cutting the manual overhead the
  spec's real-world scenario describes (200+ manual bookings a week, no automated conflict check).
- **Lost & Found officers** get a searchable digital record instead of a shelf of unlogged items,
  plus AI-suggested matches so fewer than the scenario's "40% never reunited" figure go unclaimed.
- **Administrators** get real utilisation numbers (which the scenario says sit at ~34%) instead of
  guesswork, so reallocation decisions - and the bonus anomaly detector's bottleneck/idle
  recommendations - are based on data.
- **The university as a whole** benefits from higher utilisation of existing assets before buying
  more, and from an accountability trail (bookings, ratings, condition history) that informal
  email- and word-of-mouth-based sharing never had.

## 4. What We Learned / Key Technical Decisions

Three decisions shaped the system more than any others, and are worth reflecting on honestly:

1. **Modelling every asset in one polymorphic table** (a `kind` discriminator plus a JSONB
   `attributes` column) instead of a table per asset type. This kept booking, search and analytics
   code uniform across rooms, physical items and loanable goods, at the cost of losing
   database-level validation on kind-specific fields (a room's capacity, say). For a system this
   size the trade-off favoured simplicity; a larger deployment with many more kind-specific rules
   might eventually want to split it out.
2. **Two independent layers against double-booking** - an application-level `SELECT ... FOR UPDATE`
   transaction, and a PostgreSQL exclusion constraint as a hard backstop. Belt-and-braces, but it
   means a bug in the application layer can never actually corrupt the booking table, which felt
   like the right bar for a resource people are relying on to be available when they arrive.
3. **Treating the AI provider as an optional dependency, not a hard requirement.** Every AI feature
   has a real, working, non-AI fallback, and the LLM client is written to return `null` on any
   failure rather than throw. This took more code than assuming AI is always available, but it
   directly satisfies the spec's mandatory graceful-degradation constraint and meant the whole
   system stayed testable and demoable even before an AI API key was configured.
4. **Removing `AnimatePresence` from route transitions after finding it caused real navigation
   failures.** The original design wrapped every page change in a spring-based exit/enter
   animation (`mode="wait"`), which looks polished but has a hard dependency: the outgoing page
   must fire an animation-completion callback before the next route mounts. In testing, that
   callback occasionally never fired (an interrupted spring, a backgrounded tab, React
   StrictMode's double render), which left the app looking broken - the URL changed but the screen
   didn't, until the user manually refreshed. We traced this by instrumenting `useLocation()` and
   confirming the router state *was* updating correctly while the DOM wasn't, then isolated the
   cause by removing `AnimatePresence` entirely and watching the bug disappear. The lesson: a
   decorative animation should never sit on the critical path of core functionality like
   navigation - each page's own entrance animation still runs on mount, so the trade-off (losing
   the old page's exit fade) was clearly worth navigation that always works.

## 5. Limitations and Future Work

- Email notifications and OTP-based email verification were intentionally left out of this
  submission (see Scope); a production deployment would add these via a transactional email
  provider.
- The anomaly detector's weekly report is currently delivered as a structured log line and an
  in-app admin notification rather than an actual email, since no SMTP provider is configured.
- Photo storage is local disk (`uploads/`) rather than object storage (S3-compatible); acceptable
  for a course deployment, but the next step for a real rollout.
- Refresh tokens are stored hashed but not bound to a device/session identity; adding that would
  reduce the blast radius of a leaked refresh token.

## 6. Conclusion

CampusLoop demonstrates a complete, working answer to the brief: a polymorphic resource-sharing
platform with real-time booking, peer lending, lost & found, a help chatbot, and three-plus-one AI
features that behave honestly when AI is and isn't available - all documented, tested, and running
against a live Postgres database. The team's biggest takeaways were how much of "AI integration" is
really about disciplined fallback design and tight context management rather than just calling an
API, and how a small, seemingly cosmetic choice (an animation library's transition mode) can
silently become a functional bug if it's allowed to sit on the critical path.
