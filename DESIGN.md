# Design

Warm editorial, light-locked, Apple-Health-derived grammar. One engine, one skin
(`html[data-skin="berlin"]`). All values live as CSS custom properties in `:root`
(index.html, top of `<style>`); this file documents them — the tokens are the source of truth.

## Color

- **Canvas** `--bg #F6F5F2` (warm off-white) · **Card** `#FFFFFF` · **Raised/inset** `#EFEDE7`
- **Ink** `--ink #15171C` · body `--txt2 #565B63` · captions `--sub #656A72`
- **Hairlines** `--line #E9E6DF`, soft `#F0EEE7`, border `--bord #E0DCD2`, grid `#EDEAE2`
- **Accent = ink** (`--accent #15171C`): primary buttons, selected outlines, default chart series.
- **Coral = the goal** (`--coral #E5482E`, text `#C0381F`, tint `#FBE9E4`): countdown, race
  forecast, goal lines, current week, links/active tab. Never decorative elsewhere.
- **Training-state hues** (text on own 12% tint, all AA): rec `#0C6E73`, easy `#1C7D3F`,
  long/blue `#1D4ED8`, qual `#5A35B0`, rest `#52606F`, warn `#8A5E12`, hard `#C62A1F`.
  Status (hard/warn) is distinct from zone hues.
- **Apple Health category glyphs** keep native hues (`--c-activity…--c-mind`) inside glyphs only.
- Depth: 1px hairlines, `--shadow` 0 1px 2px 4%; hero cards `--shadow-hero`; sheets `--shadow-sheet`.

## Typography

- System stack: `-apple-system, SF Pro Text/Display, Inter, …` — one family, weight does the work.
- Display sizes (all `--disp`, tabular numerals): `.hero` 44/700/-1.2px · `.herottl` 30/700/-.6px
  · `.big` 26/700/-.5px · `.aTitle` 34/700 (screen titles) · `.aSec` 22/700 (section heads).
- UI: h1 24/600 · `.aName`/`.aVal` 17/400 · body 16 · `.detail` 14 · `.note`/`.sub` 13
  · labels/eyebrows (`h2`, `.seclbl`, `label.f`) 11–12/600–700 caps, ≤.08em tracking.
- `text-wrap: balance` on headings, `pretty` on notes/banners. Tabular nums on all metrics.

## Layout & spacing

- Single column, `max-width: 520px`, 14px gutters, cards 20px radius / 20px padding / 12px stack gap.
- Grouped Apple-style lists (`.aGroup`/`.aRow`, 13px radius, inset hairlines, chevron on drillable rows).
- Flat in-card stats (`.macros`, `.statrow`): dividers + type hierarchy, **no nested cards**.
- Bottom tab bar, 4 tabs, blurred `saturate(180%) blur(20px)`, active = coral text + no underline.

## Components

- Buttons: `.btn` (ink fill, 14px radius, ≥48px), `.btn2` (outlined card), `.btn3` (quiet text).
- Chips `.chip` (state hue on tint), pills `.pill`, week chips (done=filled ink ✓, now=coral, future=outline).
- Sheets: bottom `#sheet .panel`, 24px top radius, drawer curve, focus trap, Escape closes.
- Ruler tapes (weight/pace), stepper + type-in numeric fields, RPE arc, segmented `.seg`/`.aSeg`.
- Charts: inline SVG, gridlines `--grid`, 9px axis labels, zone-fill classes `.f-*`, legend chips.
- Skeletons (`.skel-bar` shimmer), empty/error `.state` blocks, snackbar `#snack` with undo.

## Motion

- One system: **snap** `cubic-bezier(.3,1.5,.45,1)` 280ms (acknowledgements) and
  **settle** `cubic-bezier(.22,1,.36,1)` 420ms (sheets/cards); press scale .96 @160ms.
- Nav entrance: staggered `navin` (12px rise + blur) on `.nav-in` children, 80ms steps.
- Sheet enter = iOS drawer curve 300ms, exit 200ms ease-in. View Transitions where supported.
- Everything has a `prefers-reduced-motion` fallback (fades or none). No decorative motion.

## Voice

Sentence case everywhere (caps only in 11px labels). Composed, connective prose
("and/but/so"); numbers with units; never exclamatory.
