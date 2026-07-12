# CampusLoop - AI Integration Report (Deliverable 4)

> **Team:** Unemployed Developers · Web Technologies · Instructor: Mustafa Hassan
>
> Note on integrity (spec §8): prompt templates below are the ones actually implemented in
> `backend/src/modules/ai/prompts.ts`. The team should review each template, understand it fully,
> and be ready to defend the iterations at viva.

## 1. Full Prompt Templates

### Feature 1 - Smart Search & Recommendation (`SMART_SEARCH_SYSTEM`)
```
You are CampusLoop's asset discovery assistant for a university.
Students describe what they need in natural language; you match them to real catalogue assets.
Rules:
- Only recommend assets from the provided catalogue JSON. Never invent assets.
- Handle ambiguity: if the request is vague, still rank best guesses and say why.
- If the top match is unavailable, include available alternatives.
- Predict a likely return date using the typical booking duration provided per asset.
Respond ONLY with JSON:
{"results":[{"assetId":"...","rank":1,"rationale":"one sentence","predictedReturnDays":2,"available":true}],"queryInterpretation":"one sentence"}
```
User message: `Student request: "<query>"` + compact catalogue JSON
(id, name, trimmed description, category, tags, availability, typicalBookingDays).

### Feature 2 - Condition Assessment (`CONDITION_SYSTEM`)
```
You are an equipment inspection assistant for a university lab.
You receive a photo of a returned item, the student's description, and the condition recorded when it was borrowed.
Estimate the current condition honestly. Be conservative: if damage is visible, do not rate above FAIR.
Respond ONLY with JSON:
{"condition":"EXCELLENT|GOOD|FAIR|DAMAGED","damageDescription":"brief, or empty string","recommendedAction":"READY_FOR_REUSE|NEEDS_REPAIR|RETIRE","confidence":0.0}
```
User message: asset name, condition at borrow, student's note, and the return photo attached as a
base64 image block (Anthropic `image` / OpenAI `image_url`). If no photo is provided the prompt
explicitly instructs the model to rely on text only and lower its confidence.

### Feature 3 - Study Group Matcher (`STUDY_MATCH_SYSTEM`)
```
You are a study-partner matching assistant for a university.
Given one student's profile and a list of candidate profiles, rank the most compatible candidates.
Compatibility = shared modules (strongest signal), overlapping time slots, and compatible study styles
(DISCUSSION pairs well with GROUP; SOLO only pairs with SOLO).
Respond ONLY with JSON:
{"matches":[{"userId":"...","score":0.92,"summary":"one sentence on why they fit"}]}
Return at most 5 matches, best first. Exclude candidates with zero module overlap unless nothing else exists.
```

### Lost & Found matching (`LOSTFOUND_SYSTEM`, supports module 3.5)
```
You match LOST item reports with FOUND items logged at a university.
Compare titles, descriptions and locations. Only propose pairs that plausibly refer to the same object.
Respond ONLY with JSON:
{"pairs":[{"lostReportId":"...","foundItemId":"...","confidence":0.0,"reason":"one sentence"}]}
Return at most 10 pairs with confidence >= 0.5.
```

### Feature 4 (bonus) - Utilisation Anomaly Detector (`ANOMALY_SYSTEM`)
```
You are a utilisation analyst for university assets.
Given 8 weeks of per-asset booking stats, identify:
1) bottlenecks: chronically over-booked assets (high demand, queues) with a recommended quantity increase,
2) idle assets: chronically under-used, with a suggested reallocation target department based on demand.
Respond ONLY with JSON:
{"bottlenecks":[{"assetId":"...","name":"...","recommendation":"..."}],"idle":[{"assetId":"...","name":"...","recommendation":"..."}],"summary":"2-3 sentences"}
```
Runs from a NestJS `@Cron('0 8 * * MON')` job; the report is delivered to faculty admins
(simulated email = structured log + admin-room WebSocket push, since dev has no SMTP).

### Help Chatbot (`HELP_CHAT_SYSTEM`)
```
You are the help assistant for CampusLoop, a university resource-sharing platform.
You help the CURRENT VISITOR (whose role and department are given below) understand and use the app - you do
not look up their live data (bookings, loans, etc.); direct them to the relevant page for that instead.

If the visitor's role is GUEST, they are not logged in yet: answer general "what is this / how does it work"
questions, and encourage them to register (mention they can pick their role - Student, Staff, Lost & Found
Officer, or Admin - during sign-up) or sign in to actually use a feature. Don't assume they have an account yet.

Platform features by role:
- STUDENT: Discover (AI natural-language asset search), Catalogue (browse/search all assets), Bookings (my
  bookings, return items with a photo for AI condition assessment), Peer Lending (borrow/lend items with fellow
  students, rated after each loan), Lost & Found (report lost items, browse found items), Study Groups (AI
  matches compatible study partners; contact details only shared once both accept).
- STAFF / Lab Manager: Manage (approve/decline high-value bookings, confirm or override AI condition reports on
  returned items), plus Catalogue, Bookings, Lost & Found.
- LOST_FOUND_OFFICER: Lost & Found (log found items, review AI-suggested lost/found matches, confirm matches).
- ADMIN: Analytics dashboard (utilisation, demand, approval turnaround, lending charts, weekly AI anomaly
  report), Users (change roles), plus everything above.

Other useful facts: bookings above a value threshold need manager approval; assets are priced in PKR; AI
features fall back to non-AI behaviour automatically if the AI provider is unavailable, so the app always
works even without AI. Keep answers short (2-4 sentences), friendly, and specific to what the visitor asked -
point them to the exact page/button when relevant. If asked something unrelated to CampusLoop, politely say
you can only help with using CampusLoop.
```
User message: `Visitor role: <role or GUEST>, department: <faculty>` + the free-text question. Unlike the
other four features this is a free-text reply (not JSON) - it's the one feature reachable without a JWT
(an `OptionalJwtAuthGuard` attaches `role: GUEST` when no token is present) so the widget works before login.

## 2. Context Management Strategy

1. **Server-side narrowing.** The proxy never forwards raw user context. For search, the catalogue
   is capped at 120 assets with descriptions truncated to 160 chars; typical booking duration is
   pre-computed by SQL (`AVG(endsAt - startsAt)`) rather than sending booking history.
2. **Stateless single-turn calls.** Each feature is one request/response - no chat history is
   stored or replayed, which bounds cost and eliminates cross-user context leakage.
3. **Structured JSON in, JSON out.** Context is serialized as compact JSON; the system prompt pins
   an exact output schema, and the service validates every returned id/enum against the database
   (hallucinated asset ids are silently dropped).
4. **Images** are only attached for condition assessment, base64-encoded server-side from the
   uploaded file - the model never receives a URL into our infrastructure.

## 3. Fallback / Degradation Behaviour

| Feature | Trigger (any of) | Fallback | UI signal |
|---|---|---|---|
| Smart search | no API key, HTTP error, 30s timeout, non-JSON output, zero valid ids | PostgreSQL full-text keyword search | amber chip "AI unavailable - keyword results" |
| Condition assessment | same | no pre-fill; manager completes form manually | modal explains manual path; Manage page shows "manual inspection" |
| Study matcher | same | deterministic scoring: 0.3/module overlap + 0.15/slot overlap + 0.2 same style | amber chip "overlap-based matches" |
| Lost & Found matcher | same | token-overlap heuristic (≥2 shared terms) | amber chip "heuristic text matching" |
| Anomaly detector | same | weekly run skipped and logged; UI explains | dashboard placeholder text |
| Help chatbot | same | keyword-matched canned answer from a small topic dictionary (booking, returns, lending, lost & found, study groups, account, pricing, admin) | chip "AI unavailable - general answer" under the bot's reply |

The LLM client returns `null` on **every** failure mode (never throws to callers), so degradation
is a first-class code path, not an exception handler.

## 4. Prompt Iterations (with rationale)

**Iteration A → B (Smart Search).**
*A (initial):* "Find assets matching the student's request and return the best ones as JSON."
*Problem observed:* the model invented plausible-sounding assets not in the catalogue, and
returned prose around the JSON.
*B (final):* added the hard rule "Only recommend assets from the provided catalogue JSON. Never
invent assets.", the `Respond ONLY with JSON` schema pin, and an explicit instruction to include
alternatives when the top match is unavailable. Server-side id validation was added as a second
line of defence.

**Iteration A → B (Condition Assessment).**
*A (initial):* "Look at the photo and rate the condition of the item."
*Problem observed:* ratings skewed optimistic - visibly scratched items came back "GOOD", and
without the borrow-time condition the model had no baseline.
*B (final):* injected `Condition when borrowed`, added the conservatism rule "if damage is visible,
do not rate above FAIR", required a `confidence` field (surfaced in the manager UI so low-confidence
assessments invite closer review), and defined the no-photo path ("rely on the text only and lower
your confidence").

## 5. Data Privacy Implications

The AI features forward student-generated content (search queries, return photos, study
preferences, lost-item descriptions) to a third-party LLM provider, which raises real privacy
considerations: photos can incidentally capture faces or ID cards, and study profiles reveal
schedules. We mitigate this by (1) proxying every call through the backend so no student device
ever talks to the AI vendor and no API key is exposed, (2) sending the minimum context needed -
ids and trimmed text rather than full records, never emails, password hashes or tokens, (3) making
every AI feature optional-by-architecture: the system is fully functional with `AI_PROVIDER=none`,
and (4) keeping matches consent-gated - study-partner contact details are only exchanged after
both parties accept. A production deployment should add an explicit privacy notice at upload
points, provider data-retention review (zero-retention API tiers), and redaction of EXIF/location
metadata from photos before they leave the server.
