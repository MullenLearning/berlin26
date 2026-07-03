# Product

## Register

product

## Users

One user: Luke, training for the Berlin Marathon (27 September 2026) across a 16-week block.
He uses the app as an installed PWA on an iPhone — one-handed at 6am before a run, mid-day
to check fuelling, and at night for the 8pm "tomorrow preview" eating decision. Strava owns
the workout record, Oura owns the body (sleep/readiness), Google Calendar owns the day's
shape; the app is the hub that ties them together and turns them into decisions.

## Product Purpose

A single-file, offline-capable training + fuelling instrument for exactly one race block:
follow the baked 16-week plan, log/import sessions, keep the carb-periodised cut honest
against the scale trend, place training around real meetings, and forecast race day.
Success = Luke opens it every day, trusts every number, and arrives on the start line
fuelled, rested, and under goal weight.

## Brand Personality

Calm coach, honest instrument, editorial warmth. The app speaks in composed sentences
(the Morning Line), stays silent until the data earns a claim, and never scolds.
It should feel like a beautifully set training diary, not a gamified dashboard.

## Anti-references

- The dark Whoop/Oura "performance instrument" clone (a previous skin — deliberately retired).
- Generic AI-SaaS dashboard slop: hero-metric cards with gradient accents, identical card
  grids, glassmorphism, decorative color.
- Consumer-fitness gamification: badges, confetti on every action, streak-shaming.
  The block has exactly one big celebration (long runs sweeping the course line).

## Design Principles

1. **One accent, ink; coral is the goal.** Ink (`--accent`) marks actions and data;
   coral is reserved for the race — countdown, forecast, goal lines, current week, links.
2. **Color is meaning, never decoration.** Zone/status hues live only in chips, dots,
   and chart marks that map to a decodable legend. Cards stay neutral.
3. **Every screen answers "what do I do next" first.** The hero of each tab is the
   decision, not a metric.
4. **Numbers earn their presentation.** Tabular numerals everywhere; derived claims stay
   silent on small samples; originals always visible next to rebalanced values.
5. **One-handed at 6am.** ≥44px targets, bottom sheets over modals, every gesture keeps a
   tap path, no keyboard unless a note is typed.
6. **Quiet, physical motion.** One motion system (snap + settle); motion conveys state;
   `prefers-reduced-motion` swaps springs for fades throughout.

## Accessibility & Inclusion

WCAG 2.2 AA contrast on all text (including hue-on-tint chips); VoiceOver state on every
control (`aria-pressed`/`aria-current`, labeled inputs); focus trapped + restored in sheets;
reduced-motion alternatives for every animation; hit targets ≥44px.
