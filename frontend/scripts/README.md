# `scripts/` — one-off analysis tooling

Not part of the app, not part of any test suite, not wired into CI. Small, throwaway-adjacent
Node scripts for questions that came up in discussion and needed a real, numeric/visual answer
instead of a guess. Kept in the repo (rather than deleted after use) so the next time the same
question comes up, the answer is a `git log`/`README` search away, not a re-derivation.

## `contrast-report.ts` / `contrast-screenshots.ts` — WCAG 2 vs APCA

### What needed doing

Our accessibility gate (`tests/e2e/a11y.spec.ts`, via `axe-core`'s `color-contrast` rule) checks
**WCAG 2's relative-luminance contrast ratio**. Our design tokens (`shared/ui/theme/tokens.ts`)
were also tuned against that exact same ratio — see the "WCAG AA fix" / "REVERTED" comments there
and `tests/README.md` section 11's "accent/status color fix" story (three attempts, two rejected
for looking "muddy/brown"). A question came up: **APCA** (the perceptual contrast algorithm
proposed for WCAG 3) can disagree sharply with WCAG 2's ratio on saturated, mid-lightness colors —
exactly the hue range our brand orange/green/amber sit in — so is our token set actually tuned for
the algorithm that matches how these colors *look*, or just the one our test happens to check?

### What was actually done

1. `contrast-report.ts` — re-implements the exact WCAG 2 ratio formula `axe-core` uses, and calls
   the reference `apca-w3` package (Myndex/Andrew Somers' own implementation, not a re-derivation —
   getting APCA's math slightly wrong is worse than not having the check at all) for APCA's signed
   `Lc` value, for ~20 real fg/bg pairs pulled straight from `tokens.ts` — including the two
   REJECTED "muddy" colors from the README's history (reconstructed from the README's own hex
   values, since they no longer exist in the token file), so the rejected alternative and the
   shipped one are compared side by side, not just described.
2. `contrast-screenshots.ts` — drives a real headless Chromium (Playwright, already a project
   dependency) against the actual `next dev` server, seeds `localStorage` exactly the way
   `tests/e2e/utils/theme.ts` does for the real a11y/visual suites, and screenshots the
   `/storybook` page's `TechIcon` and `StatusBadge` sections (`data-component-id` selectors also
   used by `component-gallery.spec.ts`) in both themes — the one place `text-accent-solid` (the
   vibrant brand orange used as literal icon/text color, not just a fill) renders with no hover
   interaction needed.

**Wrong turn, left in on purpose:** the first screenshot run produced byte-identical PNGs for the
"dark" and "light" runs — the theme seeding silently never took effect. Root cause, confirmed live
by dumping `document.documentElement.className` and the network log, not guessed: Next.js 16 dev
server's cross-origin-request protection returns a bare `403` for `_next/static/*` chunk requests
that carry an `Origin: http://127.0.0.1:<port>` header, but allows the identical request under
`Origin: http://localhost:<port>` — Chromium sends `Origin` on these same-origin chunk fetches,
`curl` normally doesn't (reproduced the exact 403 with `curl -H "Origin: http://127.0.0.1:<port>"`
against a request that succeeds without that header). With every JS chunk 403'd, React never
hydrates, so the theme-correcting `useEffect` in `theme.context.tsx` never runs — the page silently
stays on its SSR-default dark render regardless of what `localStorage` says. Fix: point the script
at `http://localhost:<port>`, not `127.0.0.1`. Worth knowing before assuming any other Playwright
script that hits a live `next dev` server on this host will "just work" against `127.0.0.1`.

### Why this is understandable / extensible

Two separate scripts, not one: the numeric report needs no browser and runs in under a second; the
screenshot script needs a live dev server and takes several seconds per theme. Fusing them would
force every future numeric-only run to pay the browser-launch cost. Adding a new pair to compare is
one line in `contrast-report.ts`'s `pairs` array — no other file changes.

### Migration / fault-tolerance angle

None — pure dev-time tooling, touches no runtime code path, no data, no request handling. Doesn't
run in CI and isn't meant to; it's a one-off analysis aid, checked in for its own documentation
value rather than as a recurring check. If APCA is ever adopted as an actual project-wide gate
(not decided — see the numbers below), it would need its own real decision about where it lives
(a new `axe-core`-style CI check doesn't exist yet for APCA), not just "keep running this script."

### SOLID angle

Not really applicable at this scale (two independent single-purpose functions/scripts, no shared
mutable state, no inheritance) — the relevant discipline here was **not** reusing `tokens.ts`'s
actual exported objects for the "rejected muddy" comparison colors, since those values were
deliberately reverted out of the real token file; hardcoding the README's historical hex values as
plain literals, with a comment saying so, is more honest than reaching for values that don't exist
in the current source of truth.

### The actual findings (run `npm run contrast:report` from `frontend/` to reproduce)

- **Where they roughly agree:** primary body text (`text.primary`/`text.secondary` on `bg.app`) —
  WCAG ratio 16–18:1, APCA |Lc| 85–100. Both call it an easy pass, for any realistic font size.
- **Where APCA is the *stricter* one:** `text.muted`/`text.faint` ("dim") tokens on both themes pass
  WCAG AA (5.1–6.0:1, comfortably above 4.5:1) but land at APCA |Lc| 38–72 — below APCA's informal
  Lc75 "body text" guidance in every case, and below even the Lc45 "large bold" floor for the dark
  theme's `text.muted` (|Lc| 38). These are used at `text-micro`/`text-caption` sizes (11–14px) in
  practice (eyebrow labels, captions) — exactly the sizes APCA's own font-size lookup table would
  flag as needing a stronger color at that Lc. A concrete, shipped example: `Eyebrow`'s
  `tone="accent"` (`accent.text`, `#be3500`, light theme) sits at APCA Lc 71.1 — its own lookup
  table wants ≥14.5px bold for that Lc, but `Eyebrow` renders at `text-micro` (11px) bold. WCAG
  ratio for the same pair is 5.21:1, a clean AA pass with no warning at all.
- **Where WCAG is the *stricter* one, dramatically:** `accent.solid` (the vibrant brand orange)
  used directly as icon/text color (`TechIcon`'s `className="text-accent-solid"`,
  `TechStack`'s hover state) on the light theme's white card: WCAG ratio 2.63:1 — an unconditional
  FAIL, no font size rescues it under WCAG's flat threshold. APCA Lc for the identical pixels: 50.7
  — a clean PASS for large/bold content (≥21px bold), which is exactly what these icons are
  (26–32px). This is the literal case behind `tokens.ts`'s "REVERTED... 6 related axe violations
  are intentionally left failing for now" comment: WCAG treats this color as unusable as text at
  any size, while APCA — closer to how a human actually perceives a 30px bold-weight glyph vs. a
  16px paragraph — says it's fine at the sizes it's actually used at. It's the on-`bg.app`
  (non-card) case that's genuinely borderline even under APCA: Lc 44.8, just under the informal
  Lc45 large-bold floor.
- **The two REJECTED "muddy" colors** (`#ab5327`/`#40724a`/`#806230`, README section 11's Attempt
  1) land at APCA Lc ≈70–72 on the light `bg.app` — closely matching the *shipped* `accent.text`
  fix's own Lc (71.1) and the "dim" muted-gray tokens' Lc (~72). In other words: APCA does not
  retroactively vindicate the rejected muddy colors either — the visual "muddy/brown" complaint
  that got them reverted was a real, separate perceptual issue (loss of hue vibrancy at that
  lightness), not something a friendlier contrast algorithm would have waved through. The
  actual disagreement worth acting on is the one above (vibrant orange on a light *card*, at icon
  sizes), not this one.

### Screenshots (run `npm run contrast:screenshots -- http://localhost:3100 /tmp/out` against a
running `next dev`, from `frontend/`)

Captures `/storybook`'s `TechIcon` and `StatusBadge` sections plus the home page, in both themes —
`text-accent-solid` (the disputed vibrant-orange-as-text case) renders with zero interaction
needed. **Use `http://localhost:<port>`, not `127.0.0.1`** — see the "wrong turn" note above for
why the latter silently 403s every JS chunk under a real browser and leaves the page stuck
rendering its SSR-default dark theme regardless of the seeded preference.

### Where this leaves the open question (not a decision made here)

Neither algorithm is "more correct" in the abstract — WCAG 2.1 AA is the actual legally-referenced,
`axe-core`-checked standard this repo's CI gate enforces today; APCA is a WCAG 3 **draft** method
(no finalized legal threshold, and its own numbers have shifted between spec revisions). The
concrete, actionable takeaway from the numbers above is narrower than "switch algorithms": the
`accent.solid`-as-icon-color case is large/bold enough in its real usages that APCA would call it
fine, while a handful of small-caption tokens (`text.muted`, `Eyebrow`'s accent tone) that
comfortably pass WCAG today are running with less real perceptual margin than that pass suggests.
Neither observation is acted on in this script or its branch — it's deliberately just the
measurement, so the next real token change can be made from data instead of another guess.
