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
npm run test:visual         # compare against committed baselines
npm run test:visual:update  # accept current rendering as the new baseline
```

**No manual build step.** The Playwright `webServer` runs `npm run build:visual`
itself. This is deliberate: `dist/` is shared with `npm run build:prod`, so
running a production build — something you'd naturally do before committing —
silently leaves the wrong bundle in place. That bundle has `musicSurfaces:
'live'`, so every music surface hangs on the stubbed API and renders skeletons
forever. It presents as *flaky screenshots*, not as an obvious error, and it cost
real time to diagnose. The suite now owns its own input.

`reuseExistingServer` is `false` for the same reason — a leftover server from a
previous run serves the previous build.

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
- **Reduced motion is set at the context level**, in `playwright.config.ts`, not
  inside the test. Setting it after navigation left a window where the music
  ticker's infinite marquee had already started, so it could be captured at
  different offsets between runs — a ~1-in-7 single-test failure that was
  painful to pin down. Playwright's `animations: 'disabled'` only freezes CSS
  animations; GSAP and ScrollTrigger drive entrance animation from JS.
- **Loading skeletons must clear before capture.** `networkidle` is not enough:
  mock surfaces resolve with no network activity, so idle fires immediately and
  the screenshot can land on a half-rendered page (`/music` flapped between
  1386px and 900px of content). The check counts `:visible` skeletons only —
  once a music tab is activated it stays in the DOM, so inactive panels keep
  their skeleton nodes and a global count never reaches zero.
- **Page height must stabilise** for three consecutive polls before capture.
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
