# Berlin26 v3 — Google Calendar two-way sync, diarised walks, Apple Health steps

**This file is the build brief. Paste it into Claude Code with the App folder open**, or run
`claude` in this folder and say *"implement BERLIN26-V3-CALENDAR-HEALTH.md"*.

Before writing code, read: `README.md`, `PLAN.md`, and in `index.html` the script sections
for state (`freshState()` / `S` / `save()`), `logSession()` / `logWeight()` / `mergePayload()`
/ `sanitizePayload()`, the Strava block (`STRAVA_PROXY`, `STRAVA_KEY`, sync-on-open), the Oura
block (`OURA_KEY`, `OURA_PROXY`, `S.health`), and the day-move logic (`S.order`, `eff(i)`).
Build everything to match those patterns.

---

## Goal

Make the app the hub that ties Strava, Oura, Apple Health and **Google Calendar** together so:

1. **Google Calendar is two-way.** The app reads Luke's calendar (work meetings) and writes his
   training blocks (runs, walks, strength) into it. Moving a day in the app updates the calendar;
   a meeting appearing in the calendar makes the app re-time that day's run and walks on the next sync.
2. **Walks are diarised.** The shortfall to 10,000 steps (after crediting the run and the steps
   already walked) is placed as real calendar events in the day's free gaps, split across the day
   when it's back-to-back.
3. **Apple Health feeds steps** (and weight/sleep/HRV/RHR) in, so walk sizing uses real step counts,
   not estimates.

The runner-facing logic (plan, fuelling, recovery) already exists. v3 adds the **calendar substrate**
and a **reconciler** that keeps calendar ⇄ plan in agreement.

---

## Standing constraints (carry over from PLAN.md — do not break these)

- **Single-file `index.html`.** The Cloudflare Worker is the only allowed backend. No build step, no npm.
- **Public repo → no secrets in code.** The Google **client secret** lives only in the Worker env
  (already wired: `GCAL_CLIENT_ID` / `GCAL_CLIENT_SECRET`). The Google **client ID** is public and may
  sit in `index.html` (same as Strava's client id in the authorize URL).
- **Tokens live on the phone, never in backups.** New key `localStorage['berlin2026.gcal']`, handled
  exactly like `berlin2026.strava` (outside `S`, stripped from the export/restore path).
- **Source-tagged writes.** Anything that changes a session/weight still flows through
  `logSession()` / `logWeight()` / `mergePayload()` with a `source`. Calendar writes are the app
  *pushing out*, not a data import, so they don't need the confirm sheet — but they must be idempotent
  and reversible.
- **Offline-safe, a11y, reduced-motion** to the standard already set. If there's no network or no
  calendar connection, the reconciler no-ops and the app behaves exactly as today.

---

## Worker — already done

`worker/berlin26-strava.js` now has `/gcal/token` and `/gcal/refresh` (mirror of the Strava routes,
hitting `https://oauth2.googleapis.com/token`). **Do not modify the Worker.** Luke will: re-paste it
to Cloudflare, add `GCAL_CLIENT_ID` + `GCAL_CLIENT_SECRET`, and create the Google OAuth client
(see `worker/README.md` → "Google Calendar (v3)"). Build the app side to match these exact routes:

- `POST {STRAVA_PROXY}/gcal/token`  body `{code, redirect_uri}` → `{access_token, refresh_token, expires_at, scope}`
- `POST {STRAVA_PROXY}/gcal/refresh` body `{refresh_token}` → `{access_token, expires_at, ...}` (no new refresh_token)

Calendar **reads and writes are CORS-open** — call `https://www.googleapis.com/calendar/v3/...`
straight from the browser with the Bearer token. Only token exchange/refresh uses the Worker.

---

## Part 1 — Connect Google Calendar

Mirror the Strava connect flow.

- **Const** (top of script, near `STRAVA_PROXY`): `GCAL_CLIENT_ID = '<public client id>'`,
  `GCAL_KEY = 'berlin2026.gcal'`, `GCAL_PROXY = STRAVA_PROXY` (same Worker),
  `GCAL_REDIRECT = location.origin + location.pathname` (resolves to the GitHub Pages URL),
  `GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events'`.
- **Authorize** (button on the Training tab): open
  `https://accounts.google.com/o/oauth2/v2/auth?client_id=…&redirect_uri=${GCAL_REDIRECT}&response_type=code&scope=${GCAL_SCOPE}&access_type=offline&prompt=consent&include_granted_scopes=true&state=gcal`
- **Callback disambiguation (important):** Strava and Google both redirect back to the same app URL
  with `?code=`. Use the `state` param to tell them apart — set `state=strava` on the Strava authorize
  URL too (if it isn't already) and branch on `state` at boot. On `state=gcal`: POST the code to
  `/gcal/token` with `redirect_uri=GCAL_REDIRECT`, store `{access, refresh, expires_at, scope}` in
  `GCAL_KEY`, strip the query, show "Connected · primary".
- **Refresh** when `expires_at` is within ~2 min: POST `/gcal/refresh`. If refresh fails (401),
  show a one-tap reconnect state (same pattern as Strava's expired grant).
- **Disconnect** wipes `GCAL_KEY`; offer "also remove my calendar blocks" (delete all berlin26-tagged
  events in the window — see Part 2).
- **Export/restore + sanitizePayload:** ensure `GCAL_KEY` is never included in the backup JSON
  (same exclusion as `berlin2026.strava`).

---

## Part 2 — The reconciler (the core of v3)

A pure function `reconcile(window)` that converges the calendar to the plan. Runs:
on connect, on app open/resume (throttle ~15 min like Strava), on **Sync now**, and after any
in-app edit that changes a day (move/skip/adjust).

**Window:** today … today+13 (rolling 2 weeks).

**Inputs**
- The effective plan per day: `eff(dayIndex)` (already perm-aware via `S.order` — respect user moves).
- Calendar events in the window: `GET …/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=…&timeMax=…`.
  Split into **meetings** (events *without* the berlin26 tag, treated as fixed when marked busy) and
  **our blocks** (events *with* the tag — see below).
- Apple Health steps for today (`S.health.d[today].steps`) and Oura readiness (`S.health`).

**Tagging (idempotency).** Every event the app writes carries
`extendedProperties.private = { berlin26:'1', kind:'run|walk|strength|learning', dayId:'<wNdM>' }`
and `transparency:'transparent'` (FREE, never blocks real availability). Find our own events with
`…/events?privateExtendedProperty=berlin26%3D1`. Converge by **patch if it exists, insert if not,
delete if no longer wanted** — so re-running never duplicates. **Never touch an untagged event.**

**Per day in the window:**

1. **Run placement.** If it's a run day, pick a start time inside the lunch window
   (`S.settings.fit.lunchStart`–`lunchEnd`, default 11:00–14:00) that doesn't overlap a busy meeting
   and fits the run's estimated duration (km × goal pace + ~10 min). If nothing fits in lunch, take the
   first free gap ≥ duration in 06:30–21:00. Long runs default to the weekend morning slot (09:00).
   Write/patch the `run` event (title e.g. `🏃 8 km easy + strides`, description = the session steps + paces).
2. **Walks to 10k.** `remaining = max(0, stepGoal − stepsSoFar − runCredit)` where `stepGoal`
   defaults 10,000, `stepsSoFar` is today's actual Apple Health steps (0 for future days), `runCredit`
   ≈ planned km × 1000 if the run isn't done yet (once Health reports actual steps that already include
   the run, compute from actual only — don't double-count). For future days with no actual steps, use
   `S.settings.fit.ambientSteps` (default ~3,000 desk-day) + runCredit as the forecast. Convert
   `remaining` to minutes at ~110 steps/min, place in the largest free gaps; **split into 2–3 walks**
   if > 35 min. Only diarise the next `walkDaysAhead` days (default 2) and regenerate each sync so old
   walk blocks don't pile up. Title `🚶 Walk — ~{N} steps (~{M} min)`.
3. **Strength.** Rest-day circuit (Wed = B, Sun = A) into a free gap; Thursday's C-light immediately
   after the run. Never the day before the long run. Write/patch a `strength` event (off by default if
   `diariseStrength` is false — but always show it in-app).
4. **Learning** (optional, `diariseLearning`, default off): 2h on Mon/Wed/Sun evenings.
5. **Foot/calf** stays an in-app reminder (AM on waking + PM), not a calendar event unless `diariseFoot` is on.

**Colours (Google colorId):** easy run `2`, recovery run `7`, long run `5`, hard/threshold `11`,
strength `8`, learning `3`, walk `10`.

**Conflict rules / invariants (enforce, or automation will wreck the block):**
- Meetings are fixed; **training yields** around them.
- A **user move** (`S.order` swap) is pinned — treat the user's placement as truth; only re-time
  *within the day* around meetings, never undo the swap. If a pinned run is fully blocked by a new
  meeting, **propose** a move (notification), don't silently relocate.
- When the reconciler itself must move a session, preserve the plan's invariants: weekly volume,
  ≥ 48 h between hard days (Tue quality / Sat long), no two hard days adjacent, no strength the day
  before the long run, and don't add load when Oura readiness is low or the day after a long run.
- Reuse the existing **Oura "low readiness before a hard day → one-tap Move"** hook: let the reconciler
  surface that proposal rather than auto-downgrading.

**Edit propagation**
- In-app edit → `reconcile(window)` → patch calendar; show a one-line summary
  (e.g. *"Re-timed Tue run around the new 12:00 call · 2 walks diarised"*).
- External calendar change → caught on the next sync; reconciler re-times that day's run + walks.
  Use Google's `nextSyncToken` for cheap incremental reads (store in `S.gcal.syncToken`; on `410 GONE`
  do a full window re-read).

---

## Part 3 — Apple Health (steps + recovery) via Shortcut

A PWA can't read HealthKit directly, so use the **URL bridge** already documented in PLAN.md (Night 2).

- **Payload schema v2** — extend `sanitizePayload()` / `mergePayload()` with an optional
  `steps:[{date,count}]` array (bound 0–100,000) landing in `S.health.d[date].steps`, source
  `apple-health`. Keep the planned `sleep` / `hrv` / `rhr` arrays and the existing `weights` path.
  Additive merge, existing entries win, idempotent (re-running the Shortcut doesn't duplicate).
- **Shortcut** (build with Luke, ~10 min): Find Health Samples — Steps **today** (sum), Body Mass
  latest, Sleep last night, HRV, RHR → Dictionary → JSON → Base64 → open
  `https://mullenlearning.github.io/berlin26/#log=<b64>`. Add a personal automation to run it at 07:00
  and a couple more times through the day (steps climb), plus a Home-Screen tap. Switch the hash-ingest
  result from `alert()` to the snackbar.
- **Use the steps:** Today widget shows steps vs 10k; the reconciler sizes walks from the *actual*
  remaining; "covered ✓" once a run (or the day's walking) clears 10k.

---

## Data model additions

- `localStorage['berlin2026.gcal']` = `{access, refresh, expires_at, scope}` — outside `S`, excluded from backup.
- `S.gcal` = `{ lastSync, syncToken, calendarId:'primary' }` — sync metadata (no tokens; safe to back up).
- `S.settings.fit` = `{ lunchStart:'11:00', lunchEnd:'14:00', stepGoal:10000, ambientSteps:3000,
  diariseWalks:true, walkDaysAhead:2, diariseStrength:true, diariseLearning:false, diariseFoot:false }`.
- `S.health.d[date].steps` (from Apple Health).
- Add `gcal` and `apple-health` to `DATA_SOURCES`. Bump `freshState().v` and add a tiny migration so
  existing logs survive (set defaults for the new fields).

---

## UI additions (match the Strava/Oura cards on the Training tab)

- **Connect Google Calendar** row → connected state ("Connected · primary"), **Sync now**, last-sync
  line, **Disconnect** (with "remove my calendar blocks?").
- **Calendar & walks** settings card: lunch window, step goal, toggles (diarise walks / strength /
  learning), days-ahead stepper.
- **Today**: a steps ring/readout vs 10k (from Health) and the **fit-it-in** list (run time, walk
  windows, foot/calf, circuit) with the times the reconciler chose.
- A quiet **sync summary** line after each reconcile (what got re-timed / written). Failures stay quiet
  (mini status line, never an alert), per the existing precedent.

---

## Acceptance tests

1. Connect Google Calendar → the app reads this week's meetings; berlin26 run/walk/strength events
   appear for the next 14 days, all FREE, colour-coded, tagged. Re-sync creates **no duplicates**.
2. Move Saturday's long run to Friday in the app → the long-run event (and its walks) move to Friday on
   the calendar; Saturday clears; invariants hold; undo reverts both app and calendar.
3. Add a 12:00 meeting in Google Calendar → next sync re-times that day's run out of the clash and
   re-places the walks; a one-line summary says what changed.
4. Run the Apple Health Shortcut → today's steps land in `S.health`; the walk plan shrinks to the real
   remaining; hitting 10k shows "covered ✓". Re-running doesn't duplicate.
5. Backup export contains **no** `berlin2026.gcal` (or strava/oura) tokens. Disconnect wipes the key and
   (if chosen) removes the berlin26 calendar events.
6. Airplane mode → reconciler no-ops, no errors, manual logging still works.

---

## Phase B (optional, later) — true background / event-driven

Phase A above reconciles **when the app is open** (sync-on-open + Sync now), which covers most of the
"it just updates" feel with zero new infra. To react while the phone is idle:

- Give the Worker a **Cron Trigger** (e.g. every 30 min) and/or a Google Calendar **watch** channel
  (push) + Strava/Oura webhooks; the Worker runs the reconciler server-side and fires a notification.
- **Trade-off to decide consciously:** this requires the Worker to **hold a refresh token** (in Workers
  KV, encrypted) — a departure from the current "tokens only ever on the phone" stance. Calendar push
  channels also expire (~7 days) and need renewal, so cron-polling with the stored `syncToken` is the
  simpler first step.
- iOS PWA **push notifications** need the app installed (iOS 16.4+) and a push service with VAPID keys.

Recommend shipping Phase A first, living with it for a week, then deciding if Phase B is worth the
token-storage change.

---

## Suggested order for Claude Code

1. Google Calendar connect (OAuth + token storage + `state` disambiguation + refresh).  
2. Calendar read + tagged event read/write helpers (insert/patch/delete, `privateExtendedProperty` query).  
3. `reconcile(window)` — placement, walks, strength, invariants, idempotent convergence.  
4. Apple Health steps (payload schema + Shortcut + Today readout) and wire steps into walk sizing.  
5. UI (connect row, settings card, sync summary, steps widget) + edit→reconcile hooks.  
6. Run the acceptance tests; keep everything single-file, token-safe, offline-safe.
