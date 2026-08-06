# What actually changed — verification guide

**Date:** 2026-08-05
**Scope:** 7 frontends, 16 PRs, all merged and deployed.

This lists **what you can see**, app by app, so you can check whether you like it.
Infrastructure (stylelint, CI, visual tests) is summarised at the end — it changes
nothing you can look at.

---

## The short version

| App | Visible changes | Risk of something looking wrong |
|---|---|---|
| **xomware.com** | Lots — see below | Low. 23 screenshots verify it |
| **xomcloud** | 22 emoji → SVG icons | Low. 12 screenshots verify it |
| **xomforms** | **Whole app changes typeface** | **Highest — see §4** |
| **xomper** | 6 headings slightly lighter | Low-ish. 10 screenshots, but most of the app is behind login |
| **xomify** | Type sizes shift ≤2px | Unverified — no screenshots |
| **xomtracks** | Type sizes shift ≤2px | Unverified — no screenshots |
| **xomcron** | Type sizes shift ≤2px | Unverified — no screenshots |
| **All 7** | Corners slightly tighter | Very low — measured at 1–221px per page |

---

## 1. xomware.com — the most changed

### Emoji removed
- `⚡ The Suite` eyebrow on the landing page and `/apps` → **`// THE SUITE`**
- Infra dashboard app icons 🏠 🎵 ☁️ 🏈 💪 📦 → **two-letter monogram badges**
  (XW, XY, XC, XP, XF) in a bordered pill
- Infra dashboard 🏗️ heading and ⚠️ error banners → emoji dropped, banners
  already carried the meaning
- Kept `✕` — that is a text glyph, not a colour emoji

### Headings are flat now
- `/apps`, `/music`, `/privacy` H1s were a **white→cyan gradient fade**; now flat white
- Landing hero accent word was a cyan→light-cyan fade; now **solid cyan**
- Cyan now does one job — the `//` eyebrow and one accent word — instead of
  bleeding through every heading

### Glows removed
- The 40px cyan halo behind cards on hover → replaced with elevation + a
  brighter hairline
- Cyan halo behind the Xomware "X" mark in four places (a cyan glow around an
  already-cyan logo)
- **Kept**: focus rings (accessibility), the green/amber status dots, and the
  per-app colour that appears when you hover an app card

### Type
- Privacy policy body copy **15px → 16px** (noticeably easier to read)
- `/apps` status badges and tags slightly larger (10–11px → 12px)
- Anon-gate wordmark **22px → 20px**, and its weight `900 → 800`

  *Why:* the site loads Inter at weights 400–800. There is no 900 face, so the
  browser was faking one — that wordmark was rendering smeared.

### Two real bugs fixed
1. **iOS: app cards needed two taps to open.** `:hover` was ungated, so on touch
   the first tap was consumed applying the hover state. Every card is a link, so
   this hit the whole grid.
2. **Mobile: the Shares tab scrolled sideways.** `/music?tab=xomtracks` was
   rendering 458px of content in a 390px viewport — long track names pushed past
   the screen instead of truncating. Now fits exactly.

**To verify:** open xomware.com on your phone, tap an app card (should open in
one tap), then go to Music → Shares and try to scroll sideways (shouldn't move).

---

## 2. xomcloud — emoji swap

22 emoji replaced with inline SVG icons:

- Error banners (×10) ⚠️ → warning triangle
- Empty states 🎵 📦 👥 🔒 📁 📋 💔 → matching outline icons
- Profile location 📍 → pin icon
- Private-likes card 🔒 → lock icon
- **Home page feature cards** 🎵 📋 🔍 📊 → music / list / search / chart icons

The home page ones lived in `home.component.ts` as data, not in the template.

Icons inherit the existing size and colour rules, so nothing was restyled.
Kept `☰` and `✕` — text glyphs.

**To verify:** the home page "What You Can Do" row. Four monochrome icons
instead of four different emoji colour schemes.

---

## 3. xomper — faux-bold fix

Six elements used `font-weight: 900`, but this app loads Bebas Neue (one weight),
JetBrains Mono and Plus Jakarta Sans at 400–700. **No 900 face exists**, so the
browser was synthesising one. Now 700 — the heaviest real weight.

Those six headings will look very slightly lighter, and cleaner.

Five `font-weight: bold` keywords also became `$font-weight-bold` — exactly the
same value, no visual change.

---

## 4. xomforms — READ THIS ONE

**The whole app changes typeface.**

`--xf-font` declared `'Inter'` first and `--xf-font-mono` declared
`'JetBrains Mono'` — but **neither was ever loaded**. No `@font-face`, no webfont
link anywhere. The app has been silently rendering in whatever UI font the host
system provides (San Francisco on Mac, Segoe UI on Windows, Roboto on Android).

Both are now loaded. The app will finally render as designed.

**This is the change most likely to look different from what you remember**, and
Inter has different metrics from San Francisco — line lengths and wrapping will
shift slightly.

This repo has **no visual regression suite**, so I could not diff before/after.

**To verify:** open xomforms and look at anywhere text sits close to a container
edge — buttons, badges, table headers. If you preferred the old look, the fix is
one line: remove the font link from `index.html`.

---

## 5. All 7 apps — corners

Radius scale tightened: `4/8/12/20/24` → `3/6/8/12/16`. Pills unchanged.

**Honest note: this barely shows.** Measured across the three apps that have
screenshots, it moved **1–221 pixels per full page**, all of it corner arcs. The
reference site's sharp corners read strongly because its surfaces are
high-contrast; yours are low-contrast glass on dark.

If you want a bigger shift here, the scale is one edit in
`xomware-frontend/src/styles/_tokens.scss` — then `npm run tokens:sync`.

---

## 6. xomify / xomtracks / xomcron — type only

No content changed. Every hand-typed font size, letter-spacing and font-weight
now comes from the shared scale. Individual values moved by **≤2px**, mostly
≤1px.

xomify was the worst offender before this — **64 distinct font sizes**, more than
xomware.com ever had.

**These three have no visual regression suite**, so the ≤2px figure is measured
from the values, not from screenshots. Worth a look at any dense UI (tables,
badges, stat rows).

---

## 7. What I did NOT change

- **Per-app brand colours** — you decided to keep these. I built a version that
  demoted them to an accent border and reverted it.
- **The ambient background blobs** — I proposed removing them, then found they
  are `app-monster`, your mascot. Dropped.
- **The "Coming Soon" badge** — never proposed for removal; I mis-flagged a
  conflict with it early on and was wrong.
- **`#4caf50` (Xom Forms) vs `#34C759` (XomFit)** — two near-identical greens on
  unrelated products. Xom Forms genuinely uses that green in its own app, so
  changing it is a product call, not a cleanup.
- **Emoji in xomtracks (2 files), xomper (3 files), xomcloud (1 remaining)** —
  still there.

---

## Infrastructure (invisible, but it is why the above is safe)

- **Design tokens**: one shared `_tokens.scss`, synced by
  `xomware-frontend/scripts/sync-tokens.mjs`. Structure only — no colour.
- **Enforcement**: stylelint in every repo, at **zero violations**. A new raw
  font size fails CI.
- **PR-time CI**: xomware, xomper and xomcloud had **none** — deploy only ran
  *after* master had already shipped. All three now check before merge.
- **Visual regression**: xomware (23 baselines), xomcloud (12), xomper (10).

### Known gaps
1. **xomify, xomtracks, xomforms, xomcron have no visual suite.** They are the
   least-verified changes in this list.
2. **Visual tests are local-only** — baselines are macOS; Linux CI renders fonts
   differently. Steps to fix are in `tests/visual/README.md`.
3. **Most of xomper and xomcloud sit behind login** and are covered only via a
   seeded session; real authed data is unverified.

---

## How to roll something back

Each item is its own commit with a descriptive message:

```bash
git log --oneline --no-merges -20      # in any of the repos
git revert <sha>
```

The riskiest single change — xomforms' fonts — is `1ca2451`, one file.
