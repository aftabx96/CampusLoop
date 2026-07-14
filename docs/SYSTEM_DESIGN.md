# CampusLoop - System Design Document (Deliverable 1)

> **Team:** Unemployed Developers - Aftab Ahmed Samoo (#2312398), Javeria Masroor (#2312400), Laiba Aamir (#2312398)
> **Course:** Web Technologies · Instructor: Mustafa Hassan · SZABIST
>
> ⚠️ Per the course's Academic Integrity policy (spec §8), AI tools may not be used to *write* this
> document. This file is a **technical draft/skeleton generated from the implemented codebase** -
> the team must review, verify and rewrite it in their own words before submission.

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    DEPARTMENT ||--o{ USER : "employs / enrols"
    DEPARTMENT ||--o{ ASSET : "owns"
    USER ||--o{ BOOKING : "requests"
    ASSET ||--o{ BOOKING : "is booked"
    USER ||--o{ LENDING_LISTING : "lists"
    LENDING_LISTING ||--o{ LOAN_REQUEST : "receives"
    USER ||--o{ LOAN_REQUEST : "borrows"
    LOAN_REQUEST ||--o{ LOAN_RATING : "is rated"
    USER ||--o{ LOST_REPORT : "reports"
    USER ||--o{ FOUND_ITEM : "logs"
    LOST_REPORT |o--o| FOUND_ITEM : "matched to"
    USER ||--o| STUDY_PROFILE : "has"
    USER ||--o{ STUDY_MATCH : "participates"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ COMMUNITY_POST : "authors"
    COMMUNITY_POST ||--o{ POST_COMMENT : "has"
    COMMUNITY_POST ||--o{ POST_LIKE : "receives"
    POST_COMMENT ||--o{ POST_COMMENT : "threaded reply"
    USER ||--o{ POST_COMMENT : "writes"
    USER ||--o{ POST_LIKE : "likes"

    DEPARTMENT { uuid id PK  string name  string faculty  string building }
    USER { uuid id PK  string email  string passwordHash  enum role  uuid departmentId FK  float reputationScore  bool lendingEligible }
    ASSET { uuid id PK  string name  enum category  enum kind  enum condition  enum availability  uuid departmentId FK  numeric value  int bookingLeadTimeHours  jsonb attributes  tsvector searchVector }
    BOOKING { uuid id PK  uuid assetId FK  uuid requesterId FK  timestamptz startsAt  timestamptz endsAt  enum status  enum conditionAtBorrow  enum conditionAtReturn  enum recommendedAction  jsonb aiAssessment }
    LENDING_LISTING { uuid id PK  uuid ownerId FK  string title  string category  int maxLoanDays  bool active }
    LOAN_REQUEST { uuid id PK  uuid listingId FK  uuid borrowerId FK  enum status  timestamptz dueAt  int escalationLevel }
    LOAN_RATING { uuid id PK  uuid loanId FK  uuid raterId  uuid ratedUserId  int score }
    LOST_REPORT { uuid id PK  uuid reporterId FK  string title  string lastSeenLocation  enum status }
    FOUND_ITEM { uuid id PK  uuid loggedById FK  string title  string foundLocation  enum status  uuid matchedLostReportId }
    STUDY_PROFILE { uuid id PK  uuid userId FK  array modules  array availableSlots  enum studyStyle }
    STUDY_MATCH { uuid id PK  uuid userAId FK  uuid userBId FK  float compatibilityScore  enum status  array acceptedBy }
    NOTIFICATION { uuid id PK  uuid userId  string type  string title  bool read  jsonb data }
    COMMUNITY_POST { uuid id PK  uuid authorId FK  text content  string imageUrl  bool isAnnouncement  bool pinned  bool hidden }
    POST_COMMENT { uuid id PK  uuid postId FK  uuid parentId FK  uuid authorId FK  text content }
    POST_LIKE { uuid id PK  uuid postId FK  uuid userId FK }
```

### Polymorphic asset modelling
One `assets` table models three kinds (`PHYSICAL_ITEM`, `ROOM`, `LOANABLE_GOOD`) via a `kind`
discriminator plus a JSONB `attributes` bag (room capacity, ISBN, serial number…). This keeps
booking/search/analytics logic uniform while allowing kind-specific data.

### Concurrency safety (two layers)
1. **Application:** bookings are created inside a transaction that takes a `SELECT … FOR UPDATE`
   pessimistic lock on the asset row, then checks overlap (`startsAt < :endsAt AND endsAt > :startsAt`).
2. **Database:** an **exclusion constraint** (`btree_gist`, `tstzrange && overlap` on active statuses)
   guarantees no double-booking can be committed even if application code regresses.

## 2. API Contract

Swagger auto-generates the authoritative, always-accurate contract at **`/api`**. Summary:

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | /auth/register | public | Register; returns access+refresh pair. `role: ADMIN` is rejected (403) - admins are never self-registered |
| POST | /auth/login | public | Login |
| POST | /auth/refresh | public | Rotate token pair |
| POST | /auth/logout | any | Revoke refresh token |
| GET | /users/me | any | Own profile |
| PATCH | /users/me | any | Edit own profile (name, ID number) |
| POST | /users/me/password | any | Change own password (verifies current) |
| GET | /users | ADMIN | List users |
| PATCH | /users/:id/role | ADMIN | Change role |
| GET | /departments | public | List departments |
| POST | /departments | ADMIN | Create department |
| GET | /assets | any | Catalogue w/ full-text search, filters, paging |
| GET | /assets/:id | any | Asset detail |
| POST | /assets | STAFF, ADMIN | Create (multipart, photo required) |
| PATCH | /assets/:id | STAFF, ADMIN | Update |
| PATCH | /assets/:id/transfer | ADMIN | Transfer between departments |
| DELETE | /assets/:id | STAFF, ADMIN | Delete |
| POST | /bookings | any | Create booking (conflict-safe) |
| GET | /bookings/availability/:assetId | any | Booked slots in range |
| GET | /bookings/mine | any | My bookings |
| GET | /bookings/pending | STAFF, ADMIN | Approval queue (dept-scoped) |
| GET | /bookings/inspections | STAFF, ADMIN | Returns awaiting inspection |
| PATCH | /bookings/:id/decision | STAFF, ADMIN | Approve/decline → WS notify |
| POST | /bookings/:id/return | any | Return w/ photo → AI assessment |
| PATCH | /bookings/:id/inspection | STAFF, ADMIN | Confirm/override AI report |
| GET | /lending/listings | any | Marketplace |
| POST | /lending/listings | any (rep ≥ 2.5) | List item |
| POST | /lending/loans/:listingId/request | any | Request loan |
| PATCH | /lending/loans/:id/decision | owner | Accept/decline |
| PATCH | /lending/loans/:id/return | owner | Mark returned |
| POST | /lending/loans/:id/rate | both parties | Mutual rating |
| GET | /lending/loans/mine · /incoming | any | Borrowed / lent |
| POST | /lost-found/lost | any | Report lost (multipart) |
| POST | /lost-found/found | OFFICER, ADMIN | Log found (multipart) |
| GET | /lost-found/lost · /found | any | Lists |
| GET | /lost-found/matches | OFFICER, ADMIN | AI-suggested pairs |
| POST | /lost-found/matches/confirm | OFFICER, ADMIN | Confirm pair → WS notify |
| PATCH | /lost-found/found/:id/returned | OFFICER, ADMIN | Returned to owner |
| POST | /study/profile · GET /study/profile | any | Study profile |
| GET | /study/matches/suggest | any | AI Feature 3 ranking |
| POST | /study/matches/propose | any | Propose (WS notify) |
| PATCH | /study/matches/:id/respond | party | Accept/decline (both-accept gate) |
| GET | /study/matches | any | My matches (emails hidden until CONFIRMED) |
| POST | /ai/smart-search | any (authenticated) | AI Feature 1 (proxied) |
| POST | /ai/chat | any, incl. anonymous | Help chatbot - optional-JWT guard, role-aware when logged in |
| GET | /analytics/* | ADMIN | overview, utilisation, demand, turnaround, lending, anomaly-report |
| GET | /notifications · PATCH :id/read · read-all | any | In-app notifications (click deep-links to source page) |
| GET | /community/posts | any | Community feed (announcements pinned; hidden posts admin-only) |
| GET | /community/people | any | People directory for @mention autocomplete |
| POST | /community/posts | any | Create a post (optional photo); notifies @mentioned users |
| POST | /community/announce | STAFF, ADMIN | Pinned announcement + notify every student |
| DELETE | /community/posts/:id | author or ADMIN | Delete a post |
| PATCH | /community/posts/:id/hide | ADMIN | Hide/unhide from the student feed |
| POST | /community/posts/:id/like | any | Toggle like (notifies the post author) |
| GET · POST | /community/posts/:id/comments | any | List / add comments; `parentId` makes it a threaded reply |
| DELETE | /community/comments/:id | author or ADMIN | Delete a comment (and its replies) |

**WebSocket events** (Socket.io, JWT handshake; rooms `user:<id>`, `role:<role>`, `dept:<id>`):
`notification`, `booking:pending`, `inspection:pending`, `lostfound:new-report`, `anomaly-report`.
Announcements and the social events (`like`, `comment`, `reply`, `mention`) reuse the persisted
`notification` event, delivered to the target user's room in real time.

## 3. React Component Tree (role visibility)

```
App (theme, socket lifecycle)
├── Aurora (ambient background)          - all
├── NavBar (role-aware links, bell, theme, avatar → account menu) - all
├── Routes (no AnimatePresence wrapper - see note below)
│   ├── PublicOnly (redirect → /app if already signed in)
│   │   └── / Landing · /login · /register                   - public
│   ├── /about About                                         - public
│   └── Protected (redirect → /login)
│       ├── /app        RoleHome → Discover (AI search)      - STUDENT
│       ├── /app/catalogue  Catalogue (+AddAssetModal ▸ STAFF/ADMIN)
│       ├── /app/assets/:id AssetDetail (slot calendar, photo edit ▸ STAFF/ADMIN)
│       ├── /app/bookings   Bookings (+ReturnModal, AI result)
│       ├── /app/lending    Lending (tabs, Rate/Add modals)  - STUDENT
│       ├── /app/lost-found LostFound (AI-matches tab ▸ OFFICER/ADMIN)
│       ├── /app/study      StudyGroups (profile, AI suggest)- STUDENT
│       ├── /app/community  Community (feed, announce ▸ STAFF/ADMIN, moderate ▸ ADMIN) - all
│       ├── /app/profile    Profile (edit name/ID, change password)  - all
│       ├── /app/manage     Manage (approvals + InspectionModal) - STAFF/ADMIN
│       ├── /app/admin      AdminDashboard (4 chart types + anomaly) - ADMIN
│       └── /app/users      UsersAdmin (role editor)         - ADMIN
├── Chatbot (floating help widget)        - all, including logged out
└── Toasts                                - all
```

**Why route transitions aren't wrapped in `AnimatePresence`:** `mode="wait"` keeps the outgoing
page mounted (and reactive to hooks) until its exit animation fires a completion callback. In
practice that callback could hang - an interrupted spring, a backgrounded tab, React StrictMode's
double render - which left navigation looking broken: the URL and router state updated correctly,
but the DOM stayed on the old page until a manual refresh. Each page's own entrance animation
(the `Page` wrapper in `components/ui.tsx`) still plays on mount, so only the old page's exit fade
was traded away in exchange for navigation that always works.

State: **Zustand** stores (`auth` persisted, `ui` theme/toasts, `notifications` socket) + local
component state; React Context is provided by the router/theme layer. Axios interceptor performs
silent refresh-token rotation.

## 4. AI Integration Architecture

```
React UI ──(REST, JWT)──▶ NestJS AI Proxy (AiModule) ──(HTTPS, API key)──▶ Anthropic / OpenAI
                              │
                              ├── prompts.ts      (versioned templates, JSON-only outputs)
                              ├── llm.client.ts   (provider-agnostic, 30s timeout, null on failure)
                              └── ai.service.ts   (context building + validation + fallbacks)
```

- **Prompt structure:** system prompt fixes role, rules, and a strict JSON schema; user prompt
  injects compact JSON context (catalogue slice, profiles, stats). Full templates: `docs/AI_INTEGRATION_REPORT.md`.
- **Context management:** context is *narrowed server-side* (max 120 assets, trimmed descriptions,
  pre-computed typical booking durations) to bound token usage; images are base64-attached only
  for condition assessment.
- **Output handling:** first JSON block is parsed; every enum/id is validated against the database
  before use (LLM cannot invent asset ids - invalid ids are dropped).
- **Fallbacks (graceful degradation):**
  - Smart search → PostgreSQL full-text keyword search, `aiRanked:false` flag shown in UI
  - Condition assessment → no pre-fill; manager fills the form manually
  - Study matcher → deterministic module/slot-overlap scoring
  - Lost&Found matcher → token-overlap heuristic
  - Anomaly detector → run skipped, logged; UI explains
  - Help chatbot → keyword-matched canned topic answers, `aiGenerated:false` flag shown in UI
- **Security:** API keys only in backend `.env`; frontend has zero AI credentials (constraint 5.1).
  The chatbot endpoint (`POST /ai/chat`) is reachable by anonymous visitors via an
  `OptionalJwtAuthGuard` (attaches `req.user` if a valid token is present, otherwise leaves it
  undefined instead of rejecting) - it never bypasses the proxy boundary, it just makes the
  boundary optional-auth instead of required-auth for this one endpoint.
