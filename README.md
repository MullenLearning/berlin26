# Berlin 2026 — Train + Fuel

A self-contained mobile web app for the 16-week Berlin Marathon block (8 June – 27 September 2026):
training plan, carb-periodised nutrition targets, weight trend, session/weight logging, and
move/swap days with fuelling that follows the session.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app — all 16 weeks of training + 112 days of nutrition baked in |
| `manifest.webmanifest` | PWA manifest (name, icons, standalone display) |
| `sw.js` | Service worker — offline caching when hosted over HTTPS |
| `icon-*.png` | Home-screen icons (regenerate with `python3 make_icons.py`) |
| `worker/` | Cloudflare Worker for the Strava OAuth token exchange (see `worker/README.md`) |

`index.html` works entirely on its own (you can open it directly in a browser); the other
files add install/offline polish when hosted.

## Run it locally

```sh
cd App
python3 -m http.server 8080
# open http://localhost:8080
```

## Put it on your iPhone home screen

The app needs to be served over HTTPS for Add to Home Screen + offline to work properly.
Easiest options (pick one):

1. **Netlify Drop** — go to <https://app.netlify.com/drop>, drag the `App` folder in, done.
   You get a stable HTTPS URL in seconds, free, no account needed for a temporary site
   (create a free account to keep the URL permanent).
2. **GitHub Pages** — push this folder to a repo, enable Pages in repo settings.
3. **Vercel/Cloudflare Pages** — same idea, drag-and-drop or CLI deploy.

Then on the iPhone: open the URL **in Safari** → Share button → **Add to Home Screen**.
It launches full-screen like a native app and works offline after the first load.

> ⚠️ Your logs are stored in the browser's localStorage **per domain**. Pick a URL and stick
> with it — moving domains means starting logs fresh (use **Weight → Back up data** to export
> a JSON backup, then **Restore backup** on the new domain).

## Data & persistence

- Everything you log (session status/distance/pace/notes, weights, day moves) is stored
  on-device in `localStorage` under the key `berlin2026.v1` and survives refreshes,
  app/Safari restarts, and app updates. The service worker never touches it.
- **Back up / Restore** lives at the bottom of the Weight tab (plain JSON file).

## How day moves work

Moves are within-week swaps (per the spec). Each session carries its day type — and its
baked fuelling row — with it: swap the Saturday long run to Friday and Friday shows the
long-run calories/carbs while Saturday shows the rest-day numbers. Protein stays 185 g on
every day. Moved days get a `⇄ moved` tag, and each modified week has a one-tap
**Reset week to original plan**. Expected plan weight stays attached to the calendar date.

## Design notes

The UI was audited against the [ui-skills.com](https://www.ui-skills.com/) design-engineering
skills (accessibility, WCAG 2.2, motion performance, animation principles, design craft) and
then de-vibed and restyled to a dark, data-led register inspired by Oura/Whoop:

- **Dark-only system** — depth from three surface levels and hairlines, no shadows or glows.
- **One accent: the Berlin blue line** (`--accent #5b9bff`) — the painted racing line on the
  course. It marks actions, the weekly progress ring, your logged data, and the course-progress
  bar under the Today header. Zone/day-type hues survive only as semantic category colours
  (chips, dots, chart bars) that map to a decodable legend.
- **Editable home screen** — Today is a widget stack (session, catch-up, week ring, fuel,
  weight, race countdown, trend chart, race pack). The Edit sheet toggles and reorders them;
  layout persists in `S.widgets`.
- The move/edit sheets are real modal dialogs (focus trap via `inert`, Escape closes, focus
  restored). All controls expose state to VoiceOver (`aria-pressed` / `aria-current`), all
  inputs are labeled, and `prefers-reduced-motion` is respected throughout.

## Daily-use features (v1.1)

Added after a four-lens product review (runner/coach, PWA engineering, roadmap, fresh-eyes):

- **Catch-up card** on Today for the most recent unlogged day — one-tap backfill.
- **RPE (1–10)** on every session log, with a warning banner when the last three
  easy/recovery runs all felt ≥6 — the classic overreaching tell.
- **Fuelling practice** fields (carbs g + duration) on long runs with a live **g/hr**
  readout — gut training toward the 60–90 g/hr race target.
- **7-day trend weight** drives the "vs plan" verdicts and a smoothed chart line, so
  post-long-run water weight doesn't read as a failed cut.
- **Race pack** (appears race week + on Training → W16): 5 km goal splits, gel schedule
  with clock times, carb-load grams from your latest weight, race-morning timeline.
- **Streak** ignores unlogged rest days; week volume only counts logged sessions;
  "Behind plan" doesn't show before today's run is logged.
- **Data safety**: share-sheet backup (reliable in the installed app), backup-age nudge,
  rolling 7-day local snapshots, `navigator.storage.persist()`, CSV export.
- **Week rebalance** — life happens, the week adapts:
  - *Calories*: **Adjust** on any day (Today fuel widget or Nutrition day card) sets that
    day's kcal, planned or eaten. Strictly-future days of the week absorb the opposite
    delta proportionally so the week stays on plan. Protein fixed at 185 g, carbs flex at
    4 kcal/g, each day capped at ±20% (floor 1,600 kcal), race-day fuelling untouchable.
  - *Kilometres*: computed live from logs — shortfall/excess on completed days spreads
    across the week's remaining unlogged run days (+20% cap per day, +10% for long runs,
    −30% downward, never the race). "Done" prefills the rebalanced target.
  - Originals are always shown ("plan 9 km · +1.3 rebalanced"); clearing edits or
    correcting logs reverts everything — nothing is destructively rewritten.

## The feel layer (v1.5)

Built from the v1.5 UX brief — same data model, no new integrations, everything
one-handed at 6am. Highlights:

- **Swipe to log**: session and catch-up cards swipe right (done at plan, undo snackbar)
  or left (options / skipped); a backlog becomes a deck cleared in one swipe per day.
- **One-thumb log sheet**: status, distance stepper, pace tape (5 s detents, prefilled
  from your last comparable run), and a draggable **RPE arc** with zone hues, word anchors,
  and ghost marks of recent easy-day efforts. No keyboard unless you add a note.
- **The payoff frame**: after a log the week ring springs, streak rolls odometer-style,
  long runs extend the course line — weeks 10–16 long runs sweep it fully (the app's
  only big celebration). All suppressed under reduced motion.
- **Drag-and-drop week**: long-press a Training day card to lift it; the fuelling chip
  travels, targets highlight, race day stays inert, and both days preview their
  before/after kcal mid-drag. The sheet remains the accessible fallback.
- **Direct-manipulation calories**: drag a bar in the Nutrition week strip; future days
  counter-shift live with gram deltas (25 kcal detents, caps, Escape cancels).
- **Meal chips** (on plan / over / under), a **fuel tank** draining toward midnight, and
  an 8pm **tomorrow preview** for night-before eating decisions.
- **Weight**: scroll-snap ruler tape (0.1 lb detents, long-press for keyboard), inline
  logging on the Today widget, a **morning check-in card** on first open of the day,
  chart **touch scrubbing**, milestone ticks, and a one-line trend narration.
- **One motion system** (snap + settle curves), **View Transitions** between tabs and
  card-to-sheet morphs (Safari 18+, feature-detected), **long-press quick menus** on
  cards, and a Sunday-night **Week wrapped** recap with save-as-image export.

Every gesture keeps a tap path, every control keeps its aria state, and
`prefers-reduced-motion` swaps springs for fades throughout.

## Strava auto-import (v2, Night 1)

Connect once from the **Training tab** and finished runs land as proposed logs —
nothing is written without a confirm tap. Strava is the record for distance and pace:
accepting a proposal overwrites those (and the day's status) even on manually logged
days, while RPE, notes, and fuelling entries are always kept. Every import is undoable.

- **OAuth**: the in-app Connect button opens Strava's authorize page
  (`activity:read_all`); the redirect lands back on the app with `?code=`, which a
  small Cloudflare Worker (`worker/`) exchanges for tokens — Strava's `/oauth/token`
  sends no CORS headers, so the browser can't do this alone. Activity reads are
  CORS-open and go browser → Strava directly; the Worker never sees them.
- **Tokens** live in localStorage key `berlin2026.strava` — deliberately *outside* the
  app state `S`, so backup exports never contain them. Disconnect deletes the key.
- **Sync** runs on app open and resume (15-min throttle) plus a manual **Sync now**
  row. Same-day runs merge into one proposal; the confirm sheet offers per-row accept,
  accept-all, and a "different day" override. Accepted rows flow through `logSession()`
  with `source:'strava'`, fire the payoff frame, and arrive with an undo snackbar.
- **Failures stay quiet**: an expired grant shows one reconnect prompt and a Reconnect
  state on the card; network failures are a mini status line, never an alert.
- **Rich imports, display-first cards** (v2, 12 Jun): each accepted run carries
  duration, start time, HR avg/max, cadence, elevation, and the route polyline from
  the summary call; a best-effort follow-up fetch adds calories, per-km splits, and
  the shoe used, plus low-res HR/pace streams. Day cards show the plan and the result
  (chips + meta line + route shape and sparkline; tap for the run sheet with splits) —
  no inline entry. "Missed?" appears only on past unlogged run days; **rest days are
  untracked**. The log sheet (long-press, or "Edit manually" in the run sheet) remains
  the manual fallback; RPE is retired.

## Oura recovery (v2, Night 3)

Strava owns the work; Oura owns the body. Connect from the **Training tab** with a
personal access token (cloud.ouraring.com → Personal Access Tokens) — it lives in
localStorage key `berlin2026.oura`, outside backups, and reads go through the Worker's
`/oura` pass-through because Oura's API sends no CORS headers. Data lands in `S.health`
(in backups, bounded per field) as ambient measurement — no confirm sheet, and it never
touches sessions or weights.

- **Recovery widget**: readiness + sleep scores, sleep stages/efficiency/bedtime, HRV
  and resting HR against 7-day baselines, temperature deviation, stress/SpO₂/VO₂max —
  plus a plan-aware verdict (low readiness or 2-of-3 amber signals before a hard day
  offers a one-tap Move).
- **Energy balance widget**: eaten (the day's plan kcal, edits included, live) vs
  **Total burned** — a blend of Oura's day total and Mifflin-St Jeor BMR ×1.2 from the
  latest weight log plus the day's actual Strava run calories, because either estimate
  alone drifts. Oura's running figure joins the blend only once mature.
- **HRV · RHR trend**: both lines across the block — adaptation made visible.
- **Amber banner**: ≥2 of {RHR +5, HRV −15%, temp +0.3°} vs baseline → "back off today".
- **Bedtime nudge**: the 8pm tomorrow preview gains Oura's lights-out window, with
  extra weight before long runs.
- First sync backfills from a week before the block so baselines exist on day one;
  syncs run on open/resume (throttled) plus Sync now on the Training tab.

## Nutrition tab v2 (12 Jun, late)

The tab turned from plan-display into deficit-tracking, powered by the same burn
blend as the Energy balance widget: **"The cut"** (today / this week / block-total
deficits banked, ≈ lb converted at 3,500 kcal, cross-checked against the scale
trend), per-day deficit ticks under the week strip with a weekly roll-up, an
actual burn/deficit row on the day card, and a cumulative **Deficit banked** chart
(actual vs plan). Macros left every surface except the full 112-day table — Luke
tracks them elsewhere — and that table moved off the tab into a **Full plan**
sheet (week filter + jump-to-today intact).

## Phase 2–4 (future data sources)

Phase 1 is manual-only by design. The code is structured for later importers:
all writes flow through `logSession()` / `logWeight()` in `index.html` (§3 of the script),
each entry carries a `source` tag, and sources register in `DATA_SOURCES`
(`manual`, `strava`, `shortcut` today). Apple Health (via iOS Shortcuts) is next; each
source lands its data through the same two functions, with manual entry remaining the
fallback.

**The Phase 2 bridge already exists.** Two zero-backend ingestion paths accept a JSON
payload and merge it additively (existing entries on the phone always win):

1. **Paste from Shortcut** (Weight tab) — reads the clipboard.
2. **URL hand-off** — open `<app-url>#log=<base64-encoded JSON>`.

Payload shape (any subset):

```json
{
  "weights":  [{ "date": "2026-06-12", "lb": 208.6 }],
  "sessions": { "w1d4": { "status": "done", "km": 9, "rpe": 4 } }
}
```

An iOS Shortcut can read Apple Health (body mass / workouts), build this JSON, Base64-encode
it, and open the URL — that's Phase 2 without a server.

## Deploy checklist

- `index.html` changes ship automatically (navigations are network-first).
- **If icons or the manifest change, bump `CACHE` in `sw.js`** or installed clients keep
  stale copies forever.
- Install the app (Add to Home Screen) **before** logging — iOS gives the Safari tab and
  the installed app separate storage. The app shows a one-time reminder about this.
