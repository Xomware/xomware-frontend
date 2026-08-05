# Visual regression tests

Screenshot baselines for every publicly reachable route, at desktop (1280) and
mobile (390) widths.

## Why this exists

~190 hand-typed font sizes still need to move onto the `$text-*` scale in
`src/styles/_variables.scss`. **Reflow is the failure mode** — a size change that
looks harmless in a diff can push a card, wrap a heading, or shift a grid. The
stylelint ratchet catches *whether* a raw value is used; only screenshots catch
*what it did to the layout*.

Do not run the migration without this.

## Usage

```bash
npm run build:prod          # baselines run against the production build
npm run test:visual         # compare against committed baselines
npm run test:visual:update  # accept current rendering as the new baseline
```

Always rebuild before running — the tests serve `dist/`, not `ng serve`. Dev-mode
CSS and bundling differ from what ships.

When a diff is expected (you intentionally changed type), review the diff images
in `test-results/` first, then run `test:visual:update` and commit the new PNGs
in the same commit as the CSS change.

## Verified behavior

The net was checked both directions before being committed:

- **Stability** — two consecutive runs against fresh baselines: 16/16 pass, no flake.
- **Sensitivity** — changing one `font-size` from `1.1rem` to `1.25rem` in
  `_app-cards.scss` failed `/apps` on both desktop and mobile, while the other
  14 screenshots stayed green. It catches reflow without crying wolf.

## Determinism

- **Backend calls are stubbed** (empty `200`). Live data would make every new
  track or changed stat read as a visual regression.
- **Google Fonts is allowed through.** These tests exist to detect type metric
  changes, so the real Inter face has to load.
- **Reduced motion is forced and the timeline is settled.** Playwright's
  `animations: 'disabled'` only freezes CSS animations; GSAP and ScrollTrigger
  drive entrance animation from JS and would otherwise be captured mid-fade.
- `maxDiffPixels: 150` — an **absolute** count, not a ratio.

  This started as `maxDiffPixelRatio: 0.01` and that was far too coarse: 1% of a
  tall full-page screenshot is ~25,000 pixels, so removing a card glow or
  dropping a heading's gradient passed silently. The suite caught reflow (which
  shifts everything and blows past any threshold) but was blind to local colour
  changes — exactly what visual polish consists of.

  Two consecutive runs on the same machine produce byte-identical renders, so
  the real noise floor is 0. 150 leaves room for anti-aliasing drift across
  Chromium versions without hiding a change to one heading or badge.

  **If a change looks invisible to this suite, check the pixel count before
  believing it.** A few thousand changed pixels is a real, visible edit.

## Two real limitations

**1. Local only — not in CI.**
Playwright suffixes baselines by platform (`-darwin`). These were generated on
macOS and cannot be compared on Ubuntu runners; font rasterization differs enough
to fail every screenshot. Docker was not available locally to generate Linux
baselines.

To make this a CI gate later:
1. Run the suite inside `mcr.microsoft.com/playwright:v1.62.1-noble`
2. Commit the resulting `-linux.png` baselines alongside the `-darwin` ones
3. Add a job to `.github/workflows/ci.yml` running `npm run test:visual`

Until then this is a **local pre-migration check**, and it is on you to run it.

**2. Auth-gated surfaces are not covered.**
`/command`, `/admin` and `/profile` sit behind route guards. The infra dashboard
is the densest small type in the codebase — 43 token violations, and the main
consumer of the `$text-3xs` escape hatch — and it is **invisible to these tests**.
Migrating those surfaces still needs manual review.
