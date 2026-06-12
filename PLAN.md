# Berlin26 v2 — execution plan

Working plan for the v2 build, sequenced by Luke's priorities: **1) Strava auto-import,
2) Apple Health**, then the [v2 feature brief](#backlog-from-the-v2-brief) tiers.
Written 12 Jun 2026 to be picked up by a fresh session. Current app state: v1.5 live at
https://mullenlearning.github.io/berlin26/ (see README + memory).

## Standing constraints

- All writes flow through `logSession()` / `logWeight()` / `mergePayload()` with a
  `source` tag. **Manual always wins; nothing imported lands silently** (confirm step).
- Manual entry remains a full fallback when any integration is down.
- The repo is **public**: secrets never in the repo. Client secret lives in a Cloudflare
  Worker env var; tokens live in `localStorage` only and are **excluded from the backup
  export** (backups get shared via Files/AirDrop).
- Single-file `index.html` stays. The Worker is the one allowed piece of infrastructure.

---

## Night 1 — Strava auto-import (priority 1) — **LIVE 12 Jun**

Code complete and tested against a mocked Strava API (connect card, sync, confirm
sheet, day override, manual-win guard, undo, 401/network handling, token-free backups).
Worker deployed at `https://berlin26-strava.luke-mullen1.workers.dev` (smoke-tested:
token/refresh routes, CORS pinned to the Pages origin, env vars wired); `STRAVA_PROXY`
points at it. **Remaining: Luke taps Connect Strava on the Training tab once** —
first real OAuth grant + Saturday's 18 km are the live acceptance test. Note the
deployed Worker allowlists localhost:8080; the repo copy now allows any localhost
port (re-paste only if local dev ever needs it).

**CORS finding (verified live 12 Jun):** `/api/v3` GETs send `ACAO: *` — activity reads
stay browser-direct; the Worker only handles `/token` + `/refresh`.

**Decision already made (researched 12 Jun):** Strava's `/oauth/token` endpoint does not
send CORS headers, so browser-only token exchange is impossible. A free Cloudflare Worker
proxies token exchange + refresh.

### Luke's prep — DONE (12 Jun)
Strava API app created: **Client ID `257604`** (public, used in the authorize URL),
callback domain `mullenlearning.github.io`, secret held by Luke for the Worker env var.
Cloudflare account ready. Note: the token shown on Strava's settings page is scope
`read` only — ignore it; the app's OAuth flow requests `activity:read_all`.

### Worker (paste into Cloudflare dashboard, name e.g. `berlin26-strava`)
- Routes: `POST /token` (code→tokens), `POST /refresh` (refresh_token→tokens),
  optionally `GET /activities?after=...` proxy.
- Reads `STRAVA_CLIENT_ID` + `STRAVA_CLIENT_SECRET` from env (encrypted vars).
- CORS: allow origin `https://mullenlearning.github.io` only.
- No storage, no logging of tokens.

### App side
1. **Connect flow**: "Connect Strava" row (Training tab card or Edit sheet) →
   `https://www.strava.com/oauth/authorize?client_id=...&redirect_uri=https://mullenlearning.github.io/berlin26/&response_type=code&scope=activity:read_all&approval_prompt=auto`
   → app boot detects `?code=` → Worker `/token` → store `{access,refresh,expires_at}`
   in `localStorage` key `berlin2026.strava` (NOT inside `S`; excluded from export) →
   strip query from URL → "Connected as <athlete>" state.
2. **Sync**: on app open when connected (and a manual "Sync now" row): refresh token if
   `expires_at` near, GET activities `after = max(plan start, last sync − 2 days)`,
   filter `type==='Run'`.
3. **Matching**: map activity local date → day index → that date's effective session
   (`eff(i)`, perm-aware). Proposed log: `{status:'done', km: distance/1000 (1dp),
   pace: fmtPace(moving_time/ (distance/1000)), source:'strava'}`. Never touch a day
   that already has a **manual** log; strava-sourced logs may update.
4. **Confirm sheet** (reuse sheet component): list of proposed matches with
   per-row accept, "accept all", and per-row "different day…" override. On accept →
   `logSession` per row + payoff frame if today included + snack with undo (restores
   prior logs map).
5. **Sync state**: `berlin2026.strava.lastSync` ISO; status line under the Connect row
   ("Last sync: Sat 07:41 · 1 run imported").
6. **Failure handling**: 401 → one re-auth prompt; network fail → quiet "couldn't reach
   Strava" mini line, never a blocking alert (see storage-banner precedent).

### Acceptance
- Fresh connect → Saturday long run appears pre-filled ~30 s after opening the app
  post-run, one confirm tap, ring/payoff fires, undo works, manual logs untouched,
  backup export contains no tokens, disconnect row wipes `berlin2026.strava`.

### Stopgap (works tomorrow morning, before any of the above)
This Claude session has a **Strava MCP connector**: Claude can pull activities and
produce a paste-payload for the app's existing `Paste from Shortcut` bridge
(`{"sessions":{"w1d5":{...,"source":"strava"}}}`). Zero app changes. Offer it if a run
needs importing before Night 1 completes.

---

## Night 2 — Apple Health (priority 2)

Brief feature 1. No OAuth, no server: an iOS **Shortcut** reads Health and hands off via
the existing URL bridge.

1. **Payload schema v2** (extend `sanitizePayload`): optional arrays
   `sleep:[{date,hours}]`, `hrv:[{date,ms}]`, `rhr:[{date,bpm}]` → stored under
   `S.health` (new, included in backup), source `apple-health`. Weight keeps flowing
   through the existing `weights` array. Caps/validation like everything else.
2. **Build the Shortcut with Luke on his phone** (guided, ~10 min): Find Health Samples
   (body mass latest, sleep last night, HRV/RHR overnight) → Dictionary → JSON →
   Base64 → URL `https://mullenlearning.github.io/berlin26/#log=<b64>` → Open URL.
   Add to Home Screen / automation at 07:00 optional.
3. **In-app walkthrough card** (one-time, dismissible) + README iCloud link once the
   Shortcut is shareable.
4. **Display**: nothing new yet beyond weight — sleep/HRV/RHR feed the readiness score
   (brief feature 7) which becomes the natural Night 3.
5. Note: hash-ingest currently `alert()`s the import result — switch to snack.

### Acceptance
- One tap on the Shortcut each morning → weight logged + health arrays stored, idempotent
  (re-running doesn't duplicate), morning check-in card auto-satisfied when weight came in.

---

## Backlog from the v2 brief (re-sequenced)

| Order | Feature (brief #) | Depends on | Size | Notes |
|---|---|---|---|---|
| 3 | Readiness score (7) | Night 2 data | M | Fold existing RPE-drift warning into it |
| 4 | Training load ATL/CTL (4) | nothing (RPE×duration now; HR after Strava) | M | Today widget + verdict line |
| 5 | Race predictor (5) | 4, Strava pace/HR | M | Feeds race-pack splits |
| 6 | Adaptive pace zones (6) | 5 | S | Open-Meteo heat adjustment, no key |
| 7 | File drop GPX/FIT (3) | nothing | M | Covers non-Strava watches; inline parser |
| 8 | Gut training programme (12) | nothing | S | g/hr field already exists |
| 9 | Block-level rebalance (8) | nothing | L | Guardrails: 10% ramp, taper sacred |
| 10 | Carb coding per meal (9) | nothing | M | Deepens fuelling-follows-session |
| 11 | Meal logging + BYO Claude key (11) | nothing | L | Saved meals first, AI second |
| 12 | Adaptive energy targets (10) | 11 (or over/under entry) | M | 185 g floor + ±20% caps stay |
| 13 | Race day: course module, weather plan, pace band, live mode (14–17) | any time before wk 14 | L | Live mode offline-first |
| 14 | Weekly review generated, niggle log, post-race report (18–20) | data maturity | M | Rule-based first, Claude key optional |

Platform notes (from the brief, agreed): move storage to IndexedDB behind the existing
read/write layer **when meal logs/streams arrive** (not before); keep JSON backup format;
QR device-transfer later; multi-race templating is the structural bet.

---

## Luke's 10-minute prep checklist (before tonight)

1. **Strava API app** — https://www.strava.com/settings/api → create app:
   - Name: `Berlin26` · Category: Training · Website: `https://mullenlearning.github.io/berlin26/`
   - **Authorization Callback Domain: `mullenlearning.github.io`** (domain only, no path)
   - Note the **Client ID** and **Client Secret** (don't paste them into chat; you'll put
     the secret straight into Cloudflare tonight).
2. **Cloudflare account** (free) — https://dash.cloudflare.com/sign-up → just sign up;
   tonight you'll paste a Worker I write and add the two env vars in its Settings.
3. Optional: think about whether Saturday's 18 km should auto-import as a test run.
