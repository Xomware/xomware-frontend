# BRAINSTORM — UI Polish: design token system across Xomware frontends

**Date:** 2026-08-05
**Status:** Decision doc — input to `/plan`
**Builds on:** `docs/features/ui-polish/RESEARCH.md`

---

## 0. Two corrections to the research doc first

Both change the shape of the decision. Read these before the options.

### 0.1 The rainbow is not `--app-color`. It's the logo images.

RESEARCH §3.3 says seven brand hues "render simultaneously" on the landing page via
`--app-color` and `.card-glow`. The CSS says otherwise:

`src/styles/_app-cards.scss:74` — `.card-glow { opacity: 0; }` at rest, `opacity: 1`
only under `&:hover, &:focus-visible`. Same for `card-name`, `card-arrow`, and the
logo `drop-shadow`. **Every per-app color usage in CSS is hover-only.** At rest the
grid is already monochrome glass.

What actually produces the at-rest rainbow is `<img [src]="app.logo">` — 11
full-color product logos in a 3-column grid. Killing `--app-color` buys you almost
nothing visually. If you want a monochrome grid, the lever is the **logo treatment**,
not the CSS variable.

This means Question 2 as posed is aimed at the wrong target.

### 0.2 Per-app color isn't a system today — it's 11 loose hex values

`src/app/data/apps.data.ts` is the real source of truth, and it doesn't reference
`_variables.scss` at all:

```
#9c0abf  #ff6b35  #00ffab  #C8102E  #ff6b6b  #4caf50
#9c0abf  #00ffab  #34C759  #FFB800  #2563eb
```

- Four hexes (`#C8102E`, `#4caf50`, `#FFB800`, `#2563eb`) exist nowhere in the token file.
- `#9c0abf` and `#00ffab` are each assigned to **two different apps**.
- `#4caf50` and `#34C759` are two near-identical greens on the same page.

So "per-app brand color" already fails its own premise — it doesn't uniquely identify
apps. Defending it as meaningful identity is defending something that isn't there yet.

### 0.3 Premise challenge — the reference comparison breaks at exactly this surface

levelup-labs.ai is a 3-service agency page. xomware.com is a **portfolio of 11
independently-branded products**. Their monochrome grid is monochrome because they
have nothing to show but their own accent. You have eleven other brands' marks to
display.

There is no ground truth in the reference site for this surface. Copying its color
discipline here is an inference, not a finding. Everything else in RESEARCH §5
(type scale, glow, weight, tracking) transfers cleanly. Color on the app grid does not.

---

## Phase 1 — Explore

**Distribution**
- Published npm package, public scope `@xomware/design-tokens`
- Published npm package, private via GitHub Packages
- Git submodule pointing at a `xomware-design` repo
- Canonical `_tokens.scss` + a `sync-tokens` script that copies into each repo
- Package-shaped repo, consumed by copy now / by npm later (deferred publish)
- Single `tokens.css` of CSS custom properties served from the existing CloudFront dist
- Nothing shared — just fix each repo and accept drift
- Style Dictionary / Tokens Studio generating SCSS + TS + CSS from one JSON source
- Copy-paste once, then a CI drift check that fails if the file diverges from canonical
- Tokens as an Angular library (`ng-packagr`) shipping both SCSS and TS

**Enforcement (the thing nobody asked about)**
- Stylelint rule banning raw `font-size` / `letter-spacing` / `box-shadow` values
- Codemod to rewrite all `px` font sizes to nearest scale token
- Delete `_variables.scss` weights that aren't used, to shrink the surface
- Pre-commit hook rejecting new hex literals in SCSS

**Per-app color**
- Kill `--app-color` and all per-app hue
- Grayscale logos at rest, full color on hover
- Partial desaturation at rest (`grayscale(0.8)`) — softer version of the above
- Keep hover color, remove `.card-glow` radial only
- Constrain 11 hexes into a 5-hue ramp, assign by category not by app
- Move color into a 1px hairline / tag border, never a fill or glow
- Give each app a mono `//` label instead of a color (borrow their motif)

**Sequencing**
- xomware.com first, extract tokens after
- Tokens repo first, xomware.com as first consumer
- Both at once in xomware-frontend, extract as a `git mv`
- Migrate remaining 8 smallest-first / largest-first / users-first / not at all

---

## Phase 2 — Converge

Only two real decisions have more than one credible answer. Presented below.

## Option 1: Deferred-publish token package (author in xomware, extract, publish later)

**What**: Author the canonical token file inside `xomware-frontend`, prove it on
xomware.com, extract it verbatim into a package-shaped `xomware-design-tokens` repo,
distribute by sync script now and by `npm` only once the tokens stop changing.

**How it works**: New `src/styles/_tokens.scss` (type scale, tracking, weights, radius,
shadow) plus `src/styles/tokens.ts` for the values TS needs (`apps.data.ts` colors).
Ship xomware.com against it. Then `git mv` both files into a new repo laid out exactly
as a publishable package (`package.json`, `tokens/_index.scss`, `tokens/index.ts`), and
add a `sync-tokens.sh` that copies them into consumer repos with a
`// GENERATED — DO NOT EDIT` header and a version stamp. A CI check in each consumer
fails the build if the local copy's hash differs from the pinned version. When the
scale stabilizes, `npm publish` and swap the copy for a dependency, one repo at a time.

**Pros**:
- Zero registry, zero auth, zero publish loop during the phase when tokens change daily
- The token file is written against a real surface, so the scale is validated before it's canon
- Extraction is mechanical — the file doesn't change shape when it moves
- Migration to npm later is per-repo and reversible; nothing is stranded
- Version stamp + hash check gives you drift *detection* without needing a registry

**Cons / Risks**:
- Two-step where one might do; you build a sync script you'll eventually delete
- No changelog, no semver — "which app has which tokens" is a stamp, not a lockfile
- Sync script is bespoke code you now maintain (~40 lines, but still yours)
- The "publish later" step is the kind of thing that never happens; be honest that
  sync-forever is a plausible end state (and mostly fine)

**Best if**: The token values are still being tuned — which they are. Nothing has
been designed yet; the type scale is a proposal, not a decision.

---

## Option 2: Publish `@xomware/design-tokens` to public npm now

**What**: Create the package first, publish v0.1.0, consume it in all 9 frontends as a
normal dependency.

**How it works**: Public scope on npmjs (not GitHub Packages — public means consumers
need no auth token in CI, which removes npm's single worst ongoing cost). Each repo adds
`stylePreprocessorOptions.includePaths: ["node_modules", "src"]` to `angular.json`
(note: only `xomware-frontend` and `xomper-front-end` have `includePaths` today, so this
is a one-time edit in 7 repos either way) and `@use '@xomware/design-tokens' as *;`.

**Pros**:
- Real versioning — apps upgrade independently, lockfiles record exactly what shipped
- Renovate/Dependabot can open the upgrade PRs for you across all 9
- Ships SCSS and TS from one artifact, natively
- Standard, boring, no bespoke tooling
- Public npm under `@xomware` also squats the scope name, which has minor brand value

**Cons / Risks**:
- Every tweak during the volatile design phase becomes: bump → publish → 9 installs
- Publishing design tokens for personal apps to public npm is a permanent public artifact
- Independent versioning *is* drift with better paperwork; with 9 apps on 9 versions
  the "one design system" goal is nominal
- Adds a release step to a solo workflow that currently has none

**Best if**: The tokens are settled and the value is in controlled propagation. That's
a later-state condition, not today's.

---

## Option 3 (per-app color): Monochrome at rest, brand color as hover reward

**What**: Grid reads monochrome at rest; each app's identity appears on hover.

**How it works**: Delete `.card-glow` (the radial wash) and the logo
`drop-shadow` glow — both are RESEARCH §5's "glow is the amateur tell." Apply
`filter: grayscale(0.85) opacity(0.75)` to `.card-logo img` at rest, `grayscale(0)
opacity(1)` on hover. Keep `--app-color` but restrict it to the arrow, the card name,
and a 1px top hairline. Deduplicate `apps.data.ts` so no two apps share a hex, and
move those 11 values into the token file so they stop being loose literals.

**Pros**:
- Fixes the actual at-rest entropy (the logos), which the CSS-only options don't
- Preserves per-app identity as an interaction, not as permanent noise
- Removes 2 of the 9 glow radii on the highest-traffic surface
- Cheap: one filter rule, one deleted div, one data cleanup

**Cons / Risks**:
- Grayscale logo walls are their own cliche ("as featured in")
- Desaturated logos can read as *disabled* or *coming soon* — and you already have a
  real "Coming Soon" state on these cards, so the signals collide. This is the
  strongest argument against, and it needs a visual check before committing
- Hover-only identity is invisible on touch devices; mobile gets a permanently gray grid
- Some marks (wordmark-style, `logoStyle: 'banner'`) survive grayscale worse than icons

**Best if**: You accept that a product directory legitimately shows product brands, and
you want restraint without erasing them. The mobile-gray-grid problem is the thing to
verify.

---

## Phase 3 — Recommendation

**Distribution: Option 1 (deferred-publish).** Not because npm is wrong — because it's
premature. You have not yet decided a single token value. Publishing a package to
propagate values you're still inventing means the first three weeks are version bumps.
Sync while volatile, publish when stable, and build the file package-shaped from day one
so the switch costs an afternoon. If the tokens are still stable in three months, publish
then; if they aren't, you dodged 40 releases.

Depends on: whether you actually intend to migrate all 9. If the honest answer is
"xomware, xomify, xomper and that's it," Option 1 is obviously right and Option 2 is
overhead for three consumers.

**Per-app color: Option 3, with one gate.** Ship the glow deletion and the
`apps.data.ts` cleanup unconditionally — those are pure wins. Treat the grayscale-logo
step as a gated experiment: build it, look at it on mobile, and revert if the grid reads
as disabled. Do not kill per-app color outright; you'd be deleting the only thing that
distinguishes a portfolio page from an agency page, on the strength of a comparison that
doesn't apply to this surface (§0.3).

**Sequencing: xomware.com first, but author the tokens there, not on top of it.** Both
in one pass — write `_tokens.scss`, migrate xomware-frontend's ~30 font sizes onto it,
deploy, look at it. Then extract. Don't open a second repo until xomware.com is live and
right. Order the remaining 8 smallest-first (meals 1 → vest 5 → xomcron 11 → xomtracks 16
→ xomcloud 20 → xomforms 22 → xomper 73 → xomify 82) so the sharp edges surface on cheap
repos — and budget xomify (82 files) as its own separate effort, because appended to the
end of a list it will not happen. Per your own rule: present the full 9-repo plan before
touching repo #2.

### The part neither question asked about, and the one that decides this

**A token file you don't enforce is what you already have.** RESEARCH §3.5 is the proof:
`_variables.scss` defines a radius scale, and `.anon-gate-card` hardcodes `16px` anyway.
The scale existed. It didn't help.

The reference site isn't disciplined because someone chose restraint — it's disciplined
because Framer makes the 12th font size hard to add (RESEARCH §1). Your equivalent of
that constraint is **stylelint**, not a `.scss` file:

- `declaration-property-value-allowed-list` on `font-size`, `letter-spacing`,
  `font-weight`, `border-radius` — only token vars pass
- `color-no-hex` in component SCSS
- Run it in CI on every frontend

Without this, all of the above regenerates within two quarters. **This belongs in the
plan as a first-class deliverable, not a follow-up.** If you only do one thing from this
doc, do the lint rule on xomware-frontend — it's higher leverage than the package.

### Also settle in `/plan`, cheaply

- **Type scale**: 11 steps, rem only, `0.75 · 0.8125 · 0.875 · 1 · 1.125 · 1.25 · 1.5 ·
  1.625 · 2 · 2.375 · 3rem`. Mirrors the reference ramp; every current px value maps to
  one of these.
- **Letter-spacing**: two values, `0` and `-0.02em`. Delete `0.5px` on sight.
- **Weights**: introduce 400/500 as real body/label weights. Nothing above 700.
- **Emoji**: `landing.component.html:141` and `apps.component.html:12` → `//THE SUITE`
  in mono, borrowing their motif and fixing your own rule violation in the same edit.
  `infra-dashboard.component.ts:41-45,98` is a data fix — swap to inline SVG.
- **Sharp corners**: skip. `0px` radius is an identity change, not polish, and it's the
  one reference trait with real downside for a soft/glassy personal brand.
- **Manrope**: skip for now. RESEARCH §6 already calls the font a smaller lever than it
  looks. Revisit after the scale lands.

---

## Open questions for `/plan`

1. Do all 9 frontends actually get migrated, or only the ones with users? This decides
   whether Option 1 vs 2 is even a live debate.
2. Does the mobile app grid stay gray, or does touch get full-color logos via
   `@media (hover: none)`?
3. Is a stylelint config a 10th shared artifact (same distribution problem) or copied
   per repo and left alone?
