# Three-skin visual system — reference

The app ships **one engine** (plan/Strava/Oura/forecast/nutrition/weight math, ~lines 493–2375 of `index.html`) with **three switchable front-ends** chosen via `html[data-skin="whoop|fitbit|apple"]`. Skin is persisted on `S.skin`; `applySkin()` sets the attribute; `setSkin()` flips it. Each skin owns its own **navigation model + screens + signature components**. This doc is the fidelity contract.

---

## WHOOP — dark OLED, ring-led, "performance instrument"
Nav: **4 bottom tabs OVERVIEW · COACHING · COMMUNITY · STATS** + center teal (+) FAB. ALL-CAPS 10px labels, active teal `#00F19F`.

Tokens (mapped to app vars):
```
--bg:#0A0A0A; --card:#16171C; --raised:#1F2128; --inset:#0A0A0A;
--ink:#FFFFFF; --txt2:#7BA1BB; --sub:#5F5F65; --line:#252525; --grid:#252525;
--accent:#00F19F; --accent-ink:#0A0A0A; --track:#2A2A2A; --shadow:none;
--rec-green:#16EC06; --rec-yellow:#FFDE00; --rec-red:#FF0026;
--strain:#0093E7; --strain-2:#4FB8FF; --sleep:#7BA1BB; --rec-blue:#67AEE6;
--sleep-deep:#5A778A; --sleep-light:#7BA1BB; --sleep-rem:#67AEE6; --sleep-awake:#FFDE00;
--disp:'Barlow','Inter',-apple-system,sans-serif; --radius-card:16px; --cap-track:.12em;
```
Fidelity musts:
- **Recovery ring = hue encodes the score**: solid `#FF0026` <34%, red→yellow gradient 34–66%, yellow→green ≥67%. Open-top donut, ~6° gap, rounded caps. Reuse the traffic-light dot on EVERY screen.
- Pitch-black `#0A0A0A`, edges by **1px `#252525` borders — NO shadows ever**.
- ALL-CAPS wide-tracked labels (.12em) + **tabular numerals on every metric**; huge 76/56/48px weight-800 white heroes; white reserved for heroes, everything else `#7BA1BB`.
- Color always = meaning (strain blue, sleep blue-grey, R/Y/G); never decorative.

Marathon mapping: OVERVIEW = three dials → **Recovery** (Oura readiness, traffic-light, dominant/center), **Strain** (today's training load mapped 0–21: easy~8 tempo~14 long~17 race~20), **Sleep** (Oura, h m). Today session card (caps day label, white title, coach takeaway w/ recovery-dot, teal START RUN). COACHING = plan calendar heat-grid tinted by recovery/session type + session cards w/ planned-strain pill. COMMUNITY = Strava runs as dark tiles (48px distance hero + 4-col metric strip PACE/AVG HR/ELEV/TIME + HR-zone bars). STATS = weekly strain bars + monthly recovery heat-grid + **Berlin forecast hero** (D-xx countdown, finish time, confidence ring in traffic-light, weather 4-col strip). Nutrition = strain-style bar (eaten vs target) + macro caps values. Weight = `#67AEE6` trend line to teal goal marker.

---

## FITBIT (Google Health era) — light, teal, rounded tiles
Nav: **3 bottom tabs Today · Coach · You**, active teal `#00B0B9` (+ `#E0F5F6` pill behind active icon). Sentence case. No FAB.

Tokens:
```
--bg:#F4F6F8; --card:#FFFFFF; --raised:#EEF1F3; --inset:#EEF1F3;
--ink:#1A1C1E; --txt2:#5F6368; --sub:#9AA0A6; --line:#E3E6E8; --grid:#E3E6E8;
--accent:#00B0B9; --accent-ink:#FFF; --accent-tint:#E0F5F6; --navy:#002A3A;
--m-steps:#FF7A3D; --m-azm:#E0218A; --m-hr:#F0354B; --m-sleep:#7B61FF; --m-ready:#34C759; --m-cal:#FFB300;
--sleep-awake:#FF8A65; --sleep-rem:#4FC3DC; --sleep-light:#4F8EF7; --sleep-deep:#3A3A8E;
--track:#EEF1F3; --shadow:0 1px 2px rgba(0,0,0,.04);
--disp:'Google Sans','Roboto Flex',Roboto,sans-serif; --radius-card:24px;
```
Fidelity musts:
- **Teal `#00B0B9` is the single identity anchor** (active nav, every CTA, steps/exercise ring).
- **M3-Expressive icon-hugging ring** (small ~52px arc around each tile's rounded icon) — NOT a full-tile ring. Per-metric accent lives ONLY on icon/ring/trend-chip; card body stays white.
- Big friendly **rounded Google-Sans numerals**, **sentence case never ALL-CAPS**, grey **AI-insight line (✦ teal)** closing each tile; 24px tile radius on `#F4F6F8`; multicolor sleep-stages bar.

Marathon mapping: TODAY = app-bar greeting + avatar; focus-metric chip strip (Today session / Readiness / Sleep / Days-to-Berlin); stacked tiles: Today Session (orange ring), Daily Readiness (green ring, Oura), Sleep (purple donut `#7B61FF` + stages bar), Last Run (teal running-figure ring + route mini-chart), Active Zone Minutes (magenta), Nutrition (amber flame ring + macro bars + weight goal line). COACH = navy hero intro + suggested-session cards w/ teal Start + plan calendar w/ colored dots + Plan Center. YOU = profile, total miles, achievement chips, device connections, weight goal, **Berlin race-day featured tile** (navy hero, finish numeral, confidence ring).

---

## APPLE HEALTH — light-locked, Activity rings, grouped list
Nav: **3 bottom tabs Summary · Plan · Browse** (Plan = renamed Sharing). Active blue `#007AFF`, inactive `#8E8E93`. Translucent blurred tab/nav bar + 0.5px hairline. Light-locked (ignore S.theme).

Tokens:
```
--bg:#F2F2F7; --card:#FFFFFF; --raised:#E5E5EA; --inset:#E5E5EA;
--ink:#000; --txt2:rgba(60,60,67,.6); --sub:rgba(60,60,67,.3);
--line:rgba(60,60,67,.29); --grid:rgba(60,60,67,.18); --chevron:#C7C7CC;
--accent:#007AFF; --accent-ink:#FFF; --track:#E5E5EA; --shadow:0 1px 2px rgba(0,0,0,.04);
--move-a:#FF0436; --move-b:#FA114F; --ex-a:#A2FF00; --ex-b:#66E300; --st-a:#00B9C8; --st-b:#1AEBFF;
--c-sleep:#5E5CE6; --c-heart:#FF2D55; --c-nutrition:#34C759; --c-energy:#FF9500;
--disp:-apple-system,'SF Pro Display','Inter',system-ui,sans-serif; --radius-card:13px;
```
Fidelity musts:
- **Oversized 34px Bold black large title** ("Summary") collapsing to 17px inline title on scroll; translucent blurred tab/nav bar + 0.5px hairline.
- **Three concentric Activity rings** w/ per-ring gradients + soft leading-cap shadow; track = ring-color @18% on the **black** Activity card (the one dark card in a light app). viewBox 200, stroke ~16, radii 84/64/44, rotate -90, rounded caps.
- **Grouped white cards (radius 13) on `#F2F2F7`** with inset 0.5px hairline rows, **grey `#C7C7CC` › chevron on every drillable row**, saturated filled category glyphs, **rounded pill-cap bar charts** (latest bar full-opacity, M-T-W-T-F-S-S labels, faint baseline, dashed AVG line).

Marathon mapping: SUMMARY = 34px "Summary" + avatar; **tri-ring dark Activity card** (outer Move=run done/planned `#FA114F`, middle=weekly volume green, inner=readiness cyan); **Favorites grouped card** (Sleep/HRV/Resting HR/Calories/Weight rows: glyph+name+value+chevron); **Highlights** mini-cards w/ pill-cap bar charts; **Berlin Forecast** highlight card (28/700 finish value + weather glyph + countdown + faint prediction trend). PLAN = training calendar grouped list (weeks=22/700 section headers, days=glyph+distance+chevron → category-detail w/ D/W/M segmented + target-pace rows). BROWSE = search field + grouped category list (Running/Sleep/Recovery/Nutrition/Body/Heart) → category-detail line/bar charts w/ dashed AVG line.

---

## Engine API (reuse unchanged in every skin)
`eff(i)` master day selector · `WEEKS`/`NUTW`/`DAYTYPE`/`ZONECLR` baked plan · `effWeekTarget`/`effLong`/`weekActualKm`/`weekStatus`/`planKmAt` · `goalSec`/`goalPaceSec`/`goalLabel`/`zoneMid`/`zoneRange` · `eaten`/`ateLogged`/`sessLog`/`doneCount`/`streak`/`macroPct` · `latestWeight`/`trendWeight`/`trendRate`/`trendNarration`/`planWtAt`/`goalWeightVal`/`dayBurn` · `berlinForecast`/`forecastMover`/`fmtFinishT`/`formNow`/`formWord`/`morningLine`/`patternScan` · Strava `stravaSync`/`stravaConnected`/`sessLog().poly|hrS|vS|splits`/`decodePoly`/`routeSVG`/`runChart` · Oura `ouraConnected`/`ouraBase(field,iso)`/`ouraFlags`/`S.health.d[iso]` (rs=readiness ss=sleepScore slp/deep/rem=sec eff hr=RHR hrv tmp spo2 rr) · formatters `fmtKm`/`fmtKcal`/`fmtLb`/`fmtPace`/`fmtSleep`/`fmtDur`/`fmtFinish`/`esc`/`p2`/`clamp`/`shortDate`/`longDate`/`isoShort` · mutations `logSession`/`logWeight`/`save`.

Interaction contract (data-* hooks a skin must emit to get the shared binders): `data-action="tab" data-tab=…`, `data-action` router (~L3995–4364), `#wchart` (chart scrub), `#nutstrip`/`[data-bar]` (nut bars), `[data-swipe]`, `[data-lp]` (long-press), ruler `[data-fmt]`.
