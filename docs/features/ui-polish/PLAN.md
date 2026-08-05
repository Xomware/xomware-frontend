# Plan: UI Polish — Token Discipline + Enforcement (xomware-frontend)

**Status**: Draft
**Created**: 2026-08-05
**Last updated**: 2026-08-05
**Builds on**: `docs/features/ui-polish/RESEARCH.md`, `docs/features/ui-polish/BRAINSTORM.md`

---

## Summary

Close the polish gap identified in RESEARCH by giving `xomware-frontend` a real type/tracking/weight scale, collapsing the ad-hoc values onto it, and — the part that makes it stick — enforcing it with stylelint in CI. Along the way, fix a live touch-device bug (ungated `:hover`) and remove emoji from the UI per the standing rule.

Success = xomware.com renders with 11 type steps instead of ~30, 3 tracking values instead of 12, one glow instead of nine, zero emoji, no sticky-hover on iOS, and a CI check that rejects the next raw `font-size: 13px`.

Scope is **xomware-frontend only**. The other 8 frontends are a follow-on effort (Phase 8, stub).

---

## Settled decisions (do not re-open)

These came from the owner and are constraints, not options:

1. **No desaturated/grayscale logos.** Product logos stay full color at rest. BRAINSTORM Option 3's grayscale step is dead.
2. **"Coming Soon" stays** as the amber pill badge (`_app-cards.scss:151`). Never was in scope.
3. **Per-app brand color survives as-is** — monochrome at rest, color on hover. That is already how it works (`_app-cards.scss:74`). Only cleanup is `apps.data.ts` tokenization.
4. **Hover gated behind `@media (hover: hover)`.** Touch gets the at-rest state. No "hover on mobile" alternative.
5. **Distribution = deferred publish.** Author here, extract later via `git mv`, sync script + hash drift check. No npm publish.
6. **Sequencing = xomware.com first**, tokens authored in the same pass. Other 8 smallest-first afterward; xomify is its own effort.
7. **No motion work.** Out of scope entirely.
8. **Sharp corners (`0px` radius): skipped.** Per BRAINSTORM — identity change, not polish.
9. **Manrope: skipped.** Stay on Inter.

---

## Corrections to the inputs — read before executing

The briefing and the research docs are wrong or imprecise in six places. Each changes the work.

### C1. It is ~554 declaration sites, not ~30

RESEARCH §3.1 counts **30 distinct values**. The actual edit surface, counted directly:

| Property | Declarations | Files |
|---|---|---|
| `font-size` | 235 | 20 |
| all four (`font-size`, `letter-spacing`, `font-weight`, `border-radius`) | **554** | 21 |

This is not a one-sitting change. It is the single biggest reason the plan is phased by surface rather than done in one sweep.

### C2. The `apps.data.ts` "duplicate hex" premise is wrong

The briefing says `#9c0abf` and `#00ffab` are "each assigned to two different apps." They are not — they are the **same product on two platforms**:

- `#9c0abf` → Xomify (web) + Xomify (iOS)
- `#00ffab` → Xomper (web) + Xomper (iOS)

That is correct usage. **Do not dedupe these.** The real collision is `#4caf50` (Xom Forms) vs `#34C759` (XomFit) — two near-identical greens on the same grid. That is the only genuine dedup, and it is one value.

Separately, `colorRgb` is a hand-maintained duplicate of `color` (all 11 currently correct, verified) — a silent drift trap.

### C3. "9 glow radii" conflates focus rings with glows

RESEARCH §3.4 counts `0 0 2px`, `0 0 1px`, `0 0 3px` as glows. They are not. `box-shadow: 0 0 0 Npx` is a **spread-only focus ring** — an accessibility affordance, and the frontend rules mandate visible focus rings. Confirmed focus rings that must survive:

- `avatar-picker.component.scss:124,129` — `0 0 0 2px`, `0 0 0 1px`
- `music-ticker.component.scss:103` — `0 0 0 2px`
- `admin.component.scss:210` — `0 0 0 2px`
- `infra-dashboard.component.scss:294` — `0 0 0 2px`
- `auth-shell.scss:118` — `0 0 0 3px`

Actual decorative glows (the removal target) are 8 sites, listed in Phase 4.

### C4. `font-weight: 900` is not a loaded weight — it is faux bold today

`index.html:13` loads Inter at `wght@400;500;600;700;800`. `.anon-gate-wordmark` (`landing.component.scss:53`) asks for 900. The browser synthesizes or clamps to 800. This is a rendering bug, not just a taste problem.

Also: `$font-weight-regular: 400` and `$font-weight-medium: 500` **already exist** in `_variables.scss:43-44`. The briefing says they are undeclared. They are declared and unused — the exact same failure mode as the radius scale (RESEARCH §3.5). This strengthens the enforcement argument: adding tokens has already been tried and did nothing on its own.

### C5. There is no PR-time CI at all

`.github/workflows/deploy-frontend.yml` runs on push to master and on merged PRs. `add-to-board.yml` is project automation. **No workflow runs on an open PR.** Adding stylelint to CI means authoring a new workflow, not adding a step. Nothing currently gates a bad merge — including `npm test`.

### C6. `master` auto-deploys to production

Every merge ships to S3 + CloudFront immediately. There is no staging environment. Each phase merge is a live release, which is why phases must stay individually revertible.

---

## Approach

**Enforcement first, tokens second, migration third.** BRAINSTORM's key insight is that a token file you don't enforce is what already exists — and C4 proves it twice over (radius scale bypassed, 400/500 weights defined and unused). So stylelint lands in Phase 0, configured as a **ratchet**: every file starts in `.stylelintignore`, and each migration phase deletes files from that ignore list. Gains are locked as they land instead of gating on a big-bang rewrite.

**Public surfaces before gated surfaces.** `/`, `/apps`, `/privacy`, `/music`, `/auth/*` are what gets compared to the reference site. `/command`, `/admin`, `/profile` are behind auth guards and can lag.

**Compiled-CSS diff as the poor-man's visual regression.** No visual regression tooling exists (see Risks). But `ng build --output-hashing=none` produces a stable `styles.css`, and diffing it before/after a change gives an exact, free record of what actually changed. For additive-only phases the diff must be **empty**; for migration phases it must contain **only** expected value substitutions.

---

## The scales (settle these here, not at edit time)

### Type scale — 11 steps, `rem` only

Mirrors the reference ramp (12/13/14/16/18/20/24/26/32/38/48). `html` has no `font-size` override, so `1rem = 16px`. (`styles.scss:30` sets `body { font-size: 16px }` — that does not affect `rem`, which is root-relative. Leave it or convert to `$text-base`; cosmetic.)

```scss
$text-2xs:  0.75rem;    // 12px
$text-xs:   0.8125rem;  // 13px
$text-sm:   0.875rem;   // 14px
$text-base: 1rem;       // 16px
$text-md:   1.125rem;   // 18px
$text-lg:   1.25rem;    // 20px
$text-xl:   1.5rem;     // 24px
$text-2xl:  1.625rem;   // 26px
$text-3xl:  2rem;       // 32px
$text-4xl:  2.375rem;   // 38px
$text-5xl:  3rem;       // 48px
```

**Migration map** — every current value has exactly one destination:

| Current | → | Note |
|---|---|---|
| `9px`, `10px`, `0.65rem`, `0.7rem`, `11px` | `$text-2xs` | **+9% to +33% growth. See Open Question 1.** |
| `12px`, `0.75rem` | `$text-2xs` | exact |
| `13px`, `0.8rem` | `$text-xs` | `0.8rem` = 12.8px, +0.2px |
| `14px`, `0.875rem`, `0.85rem`, `0.9rem` | `$text-sm` | |
| `15px`, `0.95rem`, `16px`, `1rem` | `$text-base` | `15px` grows 1px |
| `1.05rem`, `1.1rem`, `18px` | `$text-md` | |
| `1.2rem`, `1.25rem`, `20px`, `1.3rem` | `$text-lg` | `1.3rem` = 20.8px, shrinks 0.8px |
| `22px`, `1.5rem` | `$text-xl` | `22px` grows 2px |
| `1.75rem` | `$text-2xl` | 28px → 26px |
| `2rem` | `$text-3xl` | exact |
| `36px` | `$text-4xl` | 36px → 38px |
| `3rem` | `$text-5xl` | exact |

`clamp(1.5rem, 3vw, 2.2rem)` in `_app-cards.scss:24` → `clamp($text-xl, 3vw, $text-4xl)`.

### Tracking — 3 values

```scss
$tracking-tight: -0.02em;  // display + headings
$tracking-none:  0;
$tracking-wide:  0.08em;   // uppercase eyebrows, badges, micro-labels
```

Three, not two, because this codebase leans on uppercase micro-labels that genuinely need positive tracking; the reference site gets away with two because it uses mono type for that job and we are not adopting mono globally.

Map: `0.1em`/`0.12em`/`0.14em`/`0.15em`/`0.06em`/`0.04em` → `$tracking-wide`. `0.01em`/`0.02em` → `$tracking-none`. `-0.03em` → `$tracking-tight`. **`0.5px` (5 sites) → deleted, not remapped.**

### Weights — 4 values, ceiling 700

Keep `$font-weight-regular` (400), `-medium` (500), `-semibold` (600), `-bold` (700). **Delete `$font-weight-extrabold` (800)** and every literal `900`. Trim the Google Fonts request to `wght@400;500;600;700`.

Introducing 400/500 is not just "declare them" — it means actively demoting body copy and metadata that currently render at 600. Target: `.card-description`, `.section-subtitle`, `.ios-whitelist-note`, `.anon-gate-tagline` → 400. `.card-tag`, `.platform-badge`, `.card-status`, `.section-eyebrow` → 500.

### Radius — existing scale, now actually used

`$radius-sm/md/lg/xl/2xl/pill` already exist. Fix the bypasses: `.anon-gate-card` `16px` → `$radius-lg` (12px) or `$radius-xl` (20px) — **there is no 16px step, so this is a visible change either way.** Recommend `$radius-xl` to match `@mixin glass-card`. `.anon-gate-btn` `8px` → `$radius-md` (exact, zero change).

Legitimate non-token radii to allow-list: `50%` (circles), `3px` on the scrollbar thumb (`styles.scss:53`).

---

## Affected Files / Components

| File / Component | Change | Why |
|---|---|---|
| `.stylelintrc.json` *(new)* | Token allow-lists for `font-size`, `letter-spacing`, `font-weight`, `border-radius`; `color-no-hex` | Enforcement is the deliverable (BRAINSTORM) |
| `.stylelintignore` *(new)* | Starts with all 26 SCSS files; shrinks each phase | Ratchet — lock gains as they land |
| `.github/workflows/ci.yml` *(new)* | Run stylelint + build on PR | No PR-time CI exists (C5) |
| `package.json` | `stylelint`, `stylelint-config-standard-scss`, `stylelint-scss` devDeps; `lint:styles` script | |
| `src/styles/_variables.scss` | + type scale, + tracking scale, + `@mixin interactive` ; − `$font-weight-extrabold`, − `$shadow-glow-purple` | Root cause: no type scale (RESEARCH §3.1) |
| `src/styles/_app-cards.scss` | Hover gating, type/tracking/weight migration, remove logo glow + status-dot glows | Highest-traffic surface, both public routes |
| `src/styles.scss` | `a:hover` gating, `font-size` → token | Global |
| `src/app/components/landing/landing.component.scss` | 19 font-sizes, 9 hovers, `.anon-gate-*` radius + weight-900 fix, remove `0 0 0 6px` halo | Largest public file |
| `src/app/components/apps/apps.component.scss` | 4 font-sizes, 1 hover | |
| `src/app/components/nav/app-nav.component.scss` | 10 font-sizes, 7 hovers | Present on every route |
| `src/app/components/auth/_shared/auth-shell.scss` | 13 font-sizes, 5 hovers, remove `drop-shadow(0 0 12px)` | Shared by 5 auth routes |
| `src/app/components/privacy/privacy.component.scss` | 6 font-sizes, 2 hovers, 15 hex literals | |
| `src/app/components/music*/…` (5 files) | 63 font-sizes, 22 hovers | `/music` is public |
| `src/app/components/avatar-picker/…scss` | 5 font-sizes, 2 hovers, 14 hex literals | |
| `src/app/components/now-playing/…scss` | 5 font-sizes, 3 hovers | |
| `src/app/components/command-center/**` (3 files) | 44 font-sizes, 9 hovers, remove `drop-shadow(0 0 15px)` / `(0 0 8px)` | Gated — Phase 7 |
| `src/app/components/admin/admin.component.scss` | 23 font-sizes, 5 hovers, remove `drop-shadow(0 0 8px)` | Gated — Phase 7 |
| `src/app/components/auth/profile/…scss` | 12 font-sizes, 2 hovers | Gated — Phase 7 |
| `src/app/components/landing/landing.component.html:141` | `&#9889; The Suite` → emoji-free eyebrow | Owner rule |
| `src/app/components/apps/apps.component.html:12` | same | Owner rule |
| `…/infra-dashboard/infra-dashboard.component.ts:41-45,98` | 🏠🎵☁🏈💪📦 icon map → asset paths or SVG | Data-level fix |
| `…/infra-dashboard/infra-dashboard.component.html:5,13,66,147` | 🏗️ ⚠️ ⚠️ ✕ → SVG | |
| `src/app/data/apps.data.ts` | Resolve green collision; derive `colorRgb`; reference tokens | RESEARCH §3.3, corrected by C2 |
| `src/index.html:13` | Font request `wght@400;500;600;700` | Drop unused 800; 900 was never loaded (C4) |

---

## Implementation Steps

Nine phases. **One branch + one PR per phase**, per the `<type>/<issue>-<desc>` convention. Each PR merge is a production deploy (C6), so each must stand alone and be revertible as a single commit.

### Phase 0 — Enforcement scaffolding (no visual change)
Branch `chore/<issue>-stylelint-ratchet`

- [ ] `npm i -D stylelint stylelint-config-standard-scss stylelint-scss`
- [ ] Add `"lint:styles": "stylelint \"src/**/*.scss\""` to `package.json`
- [ ] Write `.stylelintrc.json`:
  - `extends: ["stylelint-config-standard-scss"]`
  - Disable `at-rule-no-deprecated` / `scss/at-import-no-partial-leading-underscore` — the codebase uses `@import 'styles/variables'`, and migrating to `@use` renames every `$var` reference. **Explicitly out of scope.**
  - `declaration-property-value-allowed-list`:
    - `font-size`: `["/^\\$text-[a-z0-9]+$/", "/^clamp\\(.+\\)$/", "inherit"]`
    - `letter-spacing`: `["/^\\$tracking-[a-z]+$/", "normal", "inherit"]`
    - `font-weight`: `["/^\\$font-weight-[a-z]+$/", "inherit"]`
    - `border-radius`: `["/^\\$radius-[a-z0-9]+$/", "50%", "inherit"]`
  - `color-no-hex: true`, with `_variables.scss` in `ignoreFiles` (it is the one place hexes are allowed)
- [ ] Write `.stylelintignore` listing **all 26** `src/**/*.scss` files with a header comment: `// RATCHET — remove a file here only when it is fully migrated. Never add.`
- [ ] Write `.github/workflows/ci.yml`: `on: pull_request` → `npm ci`, `npm run lint:styles`, `npm run build:prod`. Do not touch `deploy-frontend.yml`.
- [ ] Verify: `npm run lint:styles` exits 0 (everything ignored). Open a scratch PR and confirm the workflow runs.

**Commit**: `#N add stylelint token ratchet and PR-time CI`

### Phase 1 — Author the scales (no visual change)
Branch `feature/<issue>-type-scale-tokens`

- [ ] Add the 11-step `$text-*` scale to `_variables.scss` under a new `── Type Scale ──` heading
- [ ] Add the 3 `$tracking-*` values
- [ ] Add `@mixin interactive` (see Phase 2) to `_variables.scss`
- [ ] Do **not** remove `$font-weight-extrabold` yet — nothing has migrated off it
- [ ] Verify: `ng build --output-hashing=none` before and after; `diff` the two `styles.css`. **Must be byte-identical.** SCSS variables that are never referenced emit nothing.

**Commit**: `#N add type and tracking scales to design tokens`

### Phase 2 — Gate hover behind `@media (hover: hover)` (live bug fix)
Branch `fix/<issue>-hover-capability-gating`

Confirmed: **zero** `@media (hover:` queries exist in the repo. 73 `:hover` blocks across 20 files all fire on touch as sticky hover. On iOS Safari, an `<a>` whose `:hover` changes layout can require two taps.

- [ ] Add to `_variables.scss`:
  ```scss
  @mixin interactive {
    &:focus-visible { @content; }
    @media (hover: hover) { &:hover { @content; } }
  }
  ```
  `:focus-visible` stays **ungated** — keyboard users on hybrid devices must keep it. Content duplication is intentional and compresses away.
- [ ] Apply to `_app-cards.scss:79` (`&:hover, &:focus-visible` → `@include interactive`). This alone fixes the `.card-glow` opacity, `scale(1.08)`, and `drop-shadow` firing on touch.
- [ ] Apply to the remaining hover blocks that change `transform`, `filter`, `opacity`, or `box-shadow` — those are the ones that cause sticky state. Pure `color`-only hovers (e.g. `styles.scss:65`) are cosmetically harmless but should be gated too for consistency; do them in the same pass since the mixin is mechanical.
- [ ] Do **not** use `(hover: hover) and (pointer: fine)`. `pointer: fine` excludes hover-capable coarse pointers. `(hover: hover)` alone is the correct gate.
- [ ] Verify: **on a real iOS device.** Chrome DevTools touch emulation does not reliably reproduce sticky `:hover`. Tap an app card on iPhone Safari — it must navigate on the first tap and leave no residual glow. This is the one phase where desktop-only verification is insufficient.

**Commit**: `#N gate hover states behind hover-capable media query`

### Phase 3 — Public surface migration: type, tracking, weight
Branch `refactor/<issue>-public-type-scale-migration`

Files: `styles.scss`, `styles/_app-cards.scss`, `landing.component.scss`, `apps.component.scss`, `app-nav.component.scss`, `auth-shell.scss`, `privacy.component.scss`, `avatar-picker.component.scss`, `now-playing.component.scss`, `music-ticker.component.scss`, `music.component.scss`, `music-wrapped.component.scss`, `music-snapshot.component.scss`, `music-release-radar.component.scss`, `music-xomtracks.component.scss`.

- [ ] Apply the type migration map to every `font-size` in those files (~191 sites)
- [ ] Apply the tracking map; **delete** all `letter-spacing: 0.5px`
- [ ] Demote weights: body copy and descriptions to `$font-weight-regular`, metadata/badges to `$font-weight-medium`. This is a judgement pass, not find-and-replace — it is the step that actually restores hierarchy (RESEARCH §3.6)
- [ ] Convert `.section-title` from `$font-weight-extrabold` to `$font-weight-bold`
- [ ] Remove those 15 files from `.stylelintignore`; `npm run lint:styles` must exit 0
- [ ] Verify: compiled-CSS diff should contain **only** font-size/letter-spacing/font-weight value changes. Any other property in the diff is a mistake. Then manual pass over `/`, `/apps`, `/privacy`, `/music`, `/auth/sign-in` at 390px, 768px, 1440px.

**Commit**: `#N migrate public surfaces onto type and tracking scales`

Splitting note: if the diff review gets unwieldy, split into 3a (`styles.scss` + `_app-cards` + `landing` + `apps` + `nav`) and 3b (auth + music + misc). Prefer splitting over a 200-line review.

### Phase 4 — Glow reduction, radius tokenization, weight ceiling
Branch `refactor/<issue>-glow-and-radius-discipline`

Decorative glows to remove (focus rings at `0 0 0 Npx` are **kept** — see C3):

| File:line | Value | Action |
|---|---|---|
| `_app-cards.scss:90` | `drop-shadow(0 0 16px …)` on card logo hover | remove |
| `_app-cards.scss:146,158` | `0 0 6px` on status dots | remove — pulse animation already carries the signal |
| `landing.component.scss:160` | `0 0 0 6px rgba(cyan,.07)` halo | remove; keep `$shadow-lg` |
| `auth-gate.component.scss:29` | `drop-shadow(0 0 15px …)` | remove *(Phase 7 file — pull forward, it is the `15px`/`16px` twin)* |
| `auth-shell.scss:49` | `drop-shadow(0 0 12px …)` | remove |
| `admin.component.scss:37` | `drop-shadow(0 0 8px …)` | remove |
| `command-center.component.scss:33` | `drop-shadow(0 0 8px …)` | remove |
| `_variables.scss:72` | `$shadow-glow-purple` | delete (unreferenced after the above) |

- [ ] Keep exactly one glow: `$shadow-glow-cyan: 0 0 40px rgba(0,180,216,0.2)`, used only by `@mixin glass-card-hover`. **9 → 1.** Going to 0 removes the card-hover affordance entirely and is a bigger identity change than this plan is chartered for — see Open Question 3.
- [ ] `.anon-gate-card` `border-radius: 16px` → `$radius-xl` (20px, matches `glass-card`)
- [ ] `.anon-gate-btn` `border-radius: 8px` → `$radius-md` (exact)
- [ ] `.anon-gate-wordmark` `font-weight: 900` → `$font-weight-bold` (700). It was never loaded (C4)
- [ ] Delete `$font-weight-extrabold` from `_variables.scss`
- [ ] `index.html:13` → `wght@400;500;600;700`
- [ ] Verify: compiled-CSS diff shows only shadow/radius/weight removals. Manual check of focus rings — tab through `/apps`, `/auth/sign-in`, avatar picker. **If any focus ring disappeared, a focus ring was misclassified as a glow.**

**Commit**: `#N collapse glow scale to one token and enforce radius tokens`

### Phase 5 — Remove emoji from the UI
Branch `fix/<issue>-remove-emoji-from-ui`

- [ ] `landing.component.html:141` and `apps.component.html:12`: `<span class="section-eyebrow">&#9889; The Suite</span>` → drop the entity. Baseline fix is `The Suite`. The `//THE SUITE` mono motif is the flagged upgrade — see Open Question 2.
- [ ] `infra-dashboard.component.html:5` — `🏗️ Infrastructure` → plain `Infrastructure` + optional inline SVG
- [ ] `infra-dashboard.component.html:13,66` — `⚠️ {{ error }}` → inline SVG warning icon, or drop the glyph and rely on the existing error styling. The `⚠️` carries a VS16 selector so it renders as full-color emoji
- [ ] `infra-dashboard.component.html:147` — `✕` close button → inline SVG. (Technically a dingbat, not emoji, but it is a glyph standing in for an icon and inherits the same font-fallback inconsistency.) Add `aria-label="Close"` while there
- [ ] `infra-dashboard.component.ts:41-45` — `appIcons` map. Cheapest correct option: point at the logo assets already in `assets/img/` and used by the app cards. Note the keys (`xomware`, `xomify`, `xomcloud`, `xomper`, `xomfit`) do not 1:1 match `APPS[].name`, so an explicit map stays. See Open Question 5
- [ ] `infra-dashboard.component.ts:98` — `'📦'` fallback needs a generic asset that **does not exist yet**. Either add one or return `null` and have the template render nothing. No silent failure — if the icon is missing, render the app name as text
- [ ] Verify: `rg '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{FE0F}]' src/app --glob '*.html' --glob '*.ts'` returns nothing. Manual check of `/command` → Infrastructure tab.

**Commit**: `#N remove emoji from UI and infra dashboard icon map`

### Phase 6 — `apps.data.ts` color tokenization
Branch `refactor/<issue>-app-color-tokens`

- [ ] **Do not** dedupe `#9c0abf` or `#00ffab` — same product, two platforms (C2)
- [ ] Resolve the one real collision: `#4caf50` (Xom Forms) vs `#34C759` (XomFit). Pick a distinct hue for Xom Forms
- [ ] Derive `colorRgb` from `color` instead of hand-maintaining both — a small helper (`hexToRgbTriplet`) with an explicit throw on malformed input, per the no-silent-failures rule
- [ ] Add the 4 missing hexes (`#C8102E`, `#4caf50`→new, `#FFB800`, `#2563eb`) to `_variables.scss` alongside the existing 6 sub-app colors, and add a `src/styles/tokens.ts` mirror so `apps.data.ts` stops carrying loose literals. **`tokens.ts` is the file that later gets `git mv`'d into the tokens package** (BRAINSTORM Option 1) — shape it accordingly from day one
- [ ] Verify: `/apps` and `/` grids render 11 cards, each with its own hover color. Compiled-CSS diff is empty (this is TS-only). `npm test`.

**Commit**: `#N tokenize per-app brand colors and derive rgb triplets`

### Phase 7 — Gated surface migration, close the ratchet
Branch `refactor/<issue>-gated-surface-type-migration`

Files: `command-center.component.scss`, `auth-gate.component.scss`, `infra-dashboard.component.scss` (54 declarations — the densest single file), `admin.component.scss`, `profile.component.scss`, `monster.component.scss`, and any remainder.

- [ ] Same type/tracking/weight migration as Phase 3
- [ ] Remove the last entries from `.stylelintignore`. **The file should now contain only the header comment.** If any file cannot be cleared, say why in the PR — an ignore list that quietly persists is exactly the failure this plan exists to prevent
- [ ] Address the ~71 non-token hex literals surfaced by `color-no-hex` (biggest offenders: `privacy` 15, `avatar-picker` 14, `landing` 7, `music-xomtracks` 6, `music-wrapped` 6). See Open Question 4
- [ ] Verify: `npm run lint:styles` exits 0 with an empty ignore list. Manual pass over `/command` (all sub-tabs), `/admin`, `/profile`.

**Commit**: `#N migrate gated surfaces and close the stylelint ratchet`

### Phase 8 — Extraction prep + other repos (stub only)
Branch `docs/<issue>-token-extraction-plan`

Not executed in this plan. Recorded so the sequencing decision is not lost.

- [ ] Once xomware.com is live and the scale has not changed for ~2 weeks, `git mv src/styles/_variables.scss` + `src/styles/tokens.ts` into a package-shaped `xomware-design-tokens` repo (`package.json`, `tokens/_index.scss`, `tokens/index.ts`)
- [ ] Write `sync-tokens.sh` (~40 lines) emitting a `// GENERATED — DO NOT EDIT` header + version stamp
- [ ] Add a hash-based drift check to each consumer's CI
- [ ] Migrate the remaining 8 smallest-first: meals (1 file) → vest (5) → xomcron (11) → xomtracks (16) → xomcloud (20) → xomforms (22) → xomper (73). **xomify (82 files) is a separate effort with its own plan** — appended to the end of a list it will not happen
- [ ] Present the full multi-repo plan before touching repo #2, per the standing rule

**No commit** — this phase produces a new `/plan` doc, not code.

---

## Out of Scope

- **Grayscale/desaturated logos.** Rejected outright.
- **Removing the "Coming Soon" badge.** Never proposed.
- **Killing per-app brand color.** It is already hover-only and stays.
- **All motion work** — GSAP, ScrollTrigger, Lottie, keyframes, easing curves. RESEARCH §6b shows we already animate more than the reference. Subtracting motion is a separate call.
- **Sharp `0px` corners.** Identity change, not polish.
- **Manrope / any font-family change.** Only the weight axis of the Inter request changes.
- **`@import` → `@use` migration.** Namespacing would rename every `$var` reference across 26 files. Stylelint rules that flag `@import` are disabled instead.
- **The other 8 frontends.** Phase 8 stub only.
- **xomify-frontend** (82 SCSS files, zero tokens) — its own plan, its own effort.
- **`body { font-size: 16px }` → responsive root sizing.** Out of scope; the `rem` scale assumes a 16px root.

---

## Risks / Tradeoffs

- **No visual regression tooling exists, and this plan does not add it.** This is the biggest gap. `npm test` is Karma unit tests; there are no screenshot baselines and nothing renders a page in CI. Mitigation is the compiled-CSS diff (exact but not visual) plus manual passes. Even if Playwright baselines were added now, they would only protect phases *after* the baseline — the Phase 3 migration, which is where the risk actually is, would be unprotected either way. See Open Question 6.
- **Every merge is a production deploy** (C6). No staging. Mitigation: one revertible commit per phase; verify on `npm start` before merge; keep PRs small enough that `git revert` is a real option.
- **Sub-12px text grows by up to 33%.** `9px`/`10px`/`0.65rem` collapsing to `0.75rem` will reflow dense chrome — infra-dashboard tables, card status pills, platform badges. Highest-risk single change in the plan. See Open Question 1.
- **`.anon-gate-card` radius changes visibly** — 16px maps to no token. Accepted: 20px matching `glass-card` is more consistent than the orphan value.
- **Demoting weights to 400/500 is a taste pass, not a mechanical one.** It is where the plan can actually make things look *worse* if applied indiscriminately. Do it deliberately, on body copy and metadata only, and look at each surface.
- **`color-no-hex` has ~71 violations.** Enabling it as an error on day one would either block Phase 0 or force a mass rewrite. The ratchet defers this to Phase 7. Risk: the ignore list becomes permanent. Mitigation: Phase 7 explicitly requires the list to be empty, and a non-empty list must be justified in the PR.
- **Stylelint allow-lists reject valid CSS.** `clamp()`, `50%`, `inherit`, `normal`, and the `3px` scrollbar radius are all legitimate. Every escape hatch widens the loophole. Expect one or two follow-up commits tuning the regexes — that is normal, not a failure.
- **The ratchet has an obvious defeat**: adding a file back to `.stylelintignore`. Nothing prevents it. It is a solo repo, so this is a discipline control, not a technical one. The `Never add` header comment is the whole enforcement mechanism.
- **The mono motif needs a font that is not loaded.** `$font-mono` names JetBrains Mono, but `index.html` loads only Inter. `//THE SUITE` would render in Consolas / system mono today — inconsistent across platforms. See Open Question 2.

---

## Open Questions

- [ ] **1. Sub-12px floor.** Collapse `9px`/`10px`/`0.65rem`/`0.7rem`/`11px` up to `$text-2xs` (12px) and accept the reflow in dense chrome? Or add a 12th step `$text-3xs: 0.6875rem` (11px) as an explicit dense-UI escape hatch? The reference site's floor is 12px, but it has no data tables and we have an infra dashboard. **Blocks Phase 3.**
- [ ] **2. Mono section labels (`//THE SUITE`).** Flagged optional in the briefing. If yes, it needs JetBrains Mono added to the Google Fonts request (+1 request, ~15KB subset) or acceptance of system-mono fallback. If no, the eyebrow is just `The Suite`. **Blocks Phase 5's final form, not its emoji removal.**
- [ ] **3. Glow floor — 1 or 0?** Plan takes 9 → 1 (`$shadow-glow-cyan` on `glass-card-hover`). The reference site uses zero. Cutting to 0 means app cards lose their hover glow entirely and rely on `translateY(-8px)` + border-color alone. Cheap to try, easy to revert.
- [ ] **4. `color-no-hex` end state.** Fix all ~71 non-token hexes in Phase 7 (real work — most are one-off greys and status colors that arguably deserve tokens), or leave `color-no-hex` at `warning` severity permanently? A permanent warning is a rule nobody reads.
- [ ] **5. infra-dashboard icons.** Reuse existing `assets/img/*-logo.*` assets (cheap, consistent, but they are full-color product logos inside a dense mono dashboard), or author a small inline SVG icon set (better fit, more work)? Also: what does the `📦` fallback become when there is no asset?
- [ ] **6. Playwright visual baselines.** ~half a day to stand up, and it cannot retroactively protect Phase 3. Worth it as insurance for Phase 7 and the 8 follow-on repos, or accept manual verification and skip?
- [ ] **7. Issue numbers.** This repo's `CLAUDE.md` says `pm_tool: none`, but `add-to-board.yml` exists and the org convention requires `#N` in commits and `Closes #N` in PRs. Need 8 issues created (one per executable phase) before branching, or the commit convention cannot be followed.

---

## Skills / Agents to Use

- **`/execute ui-polish`** — run per phase, not for the whole plan. Each phase is a separate branch/PR.
- **Code review agent** — mandatory on Phase 3 and Phase 7 (the large mechanical migrations). The failure mode is an unintended property change buried in a 200-line diff; a reviewer plus the compiled-CSS diff catches it.
- **`/fix`** — for the stylelint regex tuning follow-ups. They are small, well-understood, and do not need a plan.
- **`/plan`** — required again for Phase 8 (token extraction + multi-repo rollout) and separately for xomify-frontend.
- **`/compound`** — after Phase 7. The ratchet pattern (lint rule + shrinking ignore list) is reusable across all 9 frontends and is worth preserving as an org pattern.
- **`/end-session`** — after each phase merge, so the migration map and any judgement calls on weight demotion survive into the next session.
