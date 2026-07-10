# Deliverable 5 - Live Demo Script & Reflection Guide

> ⚠️ **The written reflection (1,500–2,000 words) must be written by the team themselves** -
> the course's Academic Integrity policy (spec §8) forbids using AI tools to write it.
> This file only provides the demo runbook and an outline of the three architectural decisions
> the team implemented, as raw material for your own writing.

## 15-minute Live Demo - two end-to-end flows

### Flow 1 - "Book, return, AI-inspect" (≈7 min)
1. Login as **student** (`aftab@szabist.edu.pk` / `Password123!`).
2. Discover page → type *"something to record audio for my documentary project"* → AI ranks the
   Zoom H6 with rationale + predicted return date. Show the amber fallback chip by stopping the AI
   key (optional resilience demo).
3. Open the Sony FX3 (high-value, Rs 1,050,000) → book a slot → status **pending**.
4. Second browser: login as **staff** (`sara.malik@szabist.pk`) → Manage → approve.
5. Back in the student window: the **WebSocket toast + bell notification** arrives instantly.
6. Student → My Bookings → **Return item** with a photo + note → show the AI condition
   pre-fill (rating, damage, action, confidence).
7. Staff → Manage → Returns awaiting inspection → open the AI report → **confirm/override** →
   asset condition + availability update.

### Flow 2 - "Lost, found, AI-matched" (≈5 min)
1. Student reports a lost item ("Blue Nike backpack, Library level 2").
2. Login as **officer** (`officer@szabist.pk`) → real-time "new lost report" toast → log a
   found item with a similar description.
3. Officer → AI Matches tab → confidence-scored pair → **Confirm match**.
4. Student receives the "Possible match found!" notification in real time.
5. Officer marks the item returned → statuses close out.

Reserve ≈3 min for the admin analytics dashboard (4 chart types) and the bonus anomaly scan button.

## Raw material for the three architectural decisions

1. **Double-booking prevention in two layers** - pessimistic `SELECT … FOR UPDATE` transaction in
   `BookingsService.create` *plus* a PostgreSQL `EXCLUDE USING gist (assetId WITH =, tstzrange && )`
   constraint. Tradeoff: lock contention on hot assets vs. absolute integrity; why we rejected
   optimistic retries and unique-slot tables.
2. **One polymorphic `assets` table (kind + JSONB) instead of table-per-type.** Tradeoff: no DB-level
   validation of kind-specific attributes vs. uniform search/booking/analytics code and simpler
   migrations. Discuss when we would split (e.g., rooms gaining recurring timetables).
3. **AI as a nullable dependency.** The LLM client returns `null` on every failure and each feature
   ships a deterministic fallback, so "AI down" is a designed state, not an outage. Tradeoff:
   duplicated logic (heuristic + prompt) vs. availability and testability without API keys.

"What we would change": queue booking-approval emails, S3-style object storage for photos,
refresh-token rotation with device binding, splitting the analytics module into materialized views.
