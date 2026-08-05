# EXECUTION LOG — ui-polish

**Branch:** `chore/ui-polish-tokens` (from `master` @ `ab00851`)
**Date:** 2026-08-05
**Scope executed:** Phases 0, 1, 2 (partial), 5, and the Phase 4 weight bug.
**Not executed:** Phase 3 (mass migration), Phase 4 glow collapse, Phases 6–8.

Commits are plain conventional messages with no `#N` prefix — owner declined
creating issues, which the normal convention depends on.

---

## Verification method

`styles.css` is **742 bytes**. Angular inlines component styles into `main.js`,
so the PLAN's proposed "diff `styles.css`" check would have missed every
component change. All diffing was done against `main.js` instead.

Baseline: `main.js` md5 `57999094213b8cf829eb4365c5f7dbda` (946,168 bytes).

---

## Done

### Phase 1 — type + tracking scales (`6559116`)
Added `$text-3xs`…`$text-5xl` (12 steps) and `$tracking-tight/normal/wide` to
`_variables.scss`. Declared in `rem` so browser font-size preferences are
honored; px equivalents in comments.

**Verified additive: post-change `main.js` md5 was byte-identical to baseline.**

Q1 resolved — `$text-3xs` (11px) exists as an explicit escape hatch for dense
admin chrome. Forcing the existing 9px/10px/0.65rem text straight to a 12px
floor is a +33% jump that reflows the infra dashboard and status badges.
Public surfaces must not use it.

### Phase 0 — stylelint + ratchet + CI (`6559116`)
`.stylelintrc.json` restricts `font-size`/`letter-spacing`/`font-weight` to the
scale variables. 289 pre-existing violations across 20 files.

Used a **count ratchet** (`scripts/stylelint-ratchet.mjs` + `.stylelint-baseline`)
rather than the PLAN's `ignoreFiles` list. An ignore list would have let those
20 files keep drifting; a count covers edits to existing files too. Verified the
guard trips when a violation is added and passes at baseline.

Added `.github/workflows/ci.yml` — **the repo had no PR-time CI at all.**
`deploy-frontend.yml` only fires on push to master or a merged PR, by which
point master has already auto-deployed to S3/CloudFront.

`npm test` is deliberately **not** in CI: there is no `karma.conf.js` and no
`src/test.ts`, so `ng test` would try to launch headed Chrome and hang. Real gap.

### Phase 2 — hover gating, partial (`2ceb4dd`)
Gated `.app-card:hover` behind `@media (hover: hover)`. `:focus-visible` split
out and left **ungated** so keyboard/switch users keep the affordance on every
device — confirmed in the compiled bundle that focus rules sit outside the
media query.

**Partial by choice.** 74 `:hover` rules exist app-wide; this covers the app-card
grid only (the worst case — every card is an `<a>`, so the iOS double-tap
applied to the whole grid). The other ~70 need a real iOS device to verify;
DevTools touch emulation doesn't reproduce sticky hover reliably.

### Phase 5 — emoji removal (`8a9dc8a`)
- Section eyebrows: `&#9889;` → `// The Suite` (mono-slash label motif)
- Infra dashboard icons: 🏠🎵☁️🏈💪📦 → two-letter monograms in bordered badges,
  with a first-two-letters fallback for unmapped workspaces
- Infra dashboard headings/banners: 🏗️ ⚠️ removed

`✕` kept — text glyph, not a color emoji.

### Phase 4 (partial) — faux-bold bug (`f443292`)
`.anon-gate-wordmark` requested `font-weight: 900`, but `index.html:13` loads
Inter at `wght@400;500;600;700;800`. No 900 face existed, so the browser
synthesized faux-bold. Now `800`.

**Visual change to review:** that wordmark also moved 22px → 20px (`$text-lg`),
since 22px is off-scale. 20 chosen over 24 to avoid wrap risk.

Token baseline: 289 → **282**.

---

## Deliberately not done

**Phase 3 — mass migration (~191 font-size sites across 15 files).** This is the
one phase that can visibly reflow layouts, and there is no visual regression
tooling to catch it. Owner's constraint was "don't break my apps." The ratchet
now prevents the problem getting worse, so this can be done incrementally and
surface-by-surface rather than in one sweep.

**Phase 4 glow collapse.** RESEARCH's "9 glow radii" was corrected to 7 focus
rings + 18 true glows. The focus rings must not be touched — `.claude/rules/frontend.md`
requires visible focus. Collapsing the 18 real glows is safe but purely cosmetic,
so it was deprioritized behind the correctness fixes.

**Phase 6 — `apps.data.ts`.** Investigated; **no action needed**, and the PLAN's
premise was partly wrong:
- All 10 entries' `colorRgb` values are **correct** — zero drift. Deriving them
  is a maintainability nicety, not a bug fix, so it wasn't worth the risk.
- `#9c0abf`/`#00ffab` duplicates are the same product on two platforms. Correct.
- `#2563eb` (Xomcron) is **not on master** — it lives on the unmerged
  `feat/xomcron-admin-link` branch, which is why the planner saw 11 apps and
  master has 10.

**The one real color collision — `#4caf50` (Xom Forms) vs `#34C759` (XomFit) —
is left alone deliberately.** `xomforms-frontend` uses `#4CAF50` in its own
sign-in and landing pages and its dominant color is `#1b7a43`. Green is that
product's actual identity. Changing it here would desync from the real app.
**This is a product decision for the owner, not a styling cleanup.**

**Phases 7–8 (gated surfaces, other 8 repos).** Untouched.

---

## Open items

1. **Xom Forms vs XomFit green** — genuinely two green products. Accept, or
   re-brand one? Owner's call.
2. **~70 remaining `:hover` rules** need gating; blocked on iOS device access.
3. **No test coverage in CI** — needs `karma.conf.js` + `src/test.ts` before
   `npm test` can be wired in.
4. **No visual regression tooling.** Still the main thing standing between the
   current state and safely executing Phase 3.
5. **`$font-mono` references JetBrains Mono, which is never loaded** — it silently
   falls back to system mono. Matters if the `//` label motif expands.
6. `.anon-gate-card` still hardcodes `border-radius: 16px`; 16 is off the radius
   scale (4/8/12/20/24/100). Left alone rather than shifting it 4px on a guess.
