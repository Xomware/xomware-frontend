# RESEARCH — UI Polish: what "polished" actually means

**Date:** 2026-08-05
**Status:** Findings only — no solution design (that's `/brainstorm`)
**Reference site:** https://levelup-labs.ai/
**Primary subject:** `xomware-frontend` (with cross-app audit)

---

## Method & limits

- Reference site was fetched as raw HTML (815 KB) and its inline CSS mined for tokens.
  Numbers below are **counted from that CSS**, not eyeballed.
- I did **not** render the reference site in a browser. So I can characterize its
  *token system* precisely, but claims about animation feel, scroll behavior, and
  motion timing are not verified — treat those as unknown.
- Xomware numbers come from `grep` over `src/**/*.scss` (9,624 lines) and templates.

---

## 1. The reference site is a Framer template

Worth knowing up front, because it reframes the whole comparison:

- 11,025 `framer` references in the markup. It's a **Framer-built site**, not hand-coded.
- No external stylesheet, no font files, no JS bundle of its own. Everything inline.
- Only third-party script is a Smartarget popup loader.

**Implication:** you are not competing with a better engineering team. You're
competing with **a template's constraint system**. Framer makes it *hard* to add a
14th font size or a 9th glow radius. Your SCSS makes it trivial. That difference —
not talent, not taste — is most of the polish gap.

---

## 2. What the reference site's restraint actually looks like

Every number here is exact.

### Color — 5 colors, 1 accent

| Role | Value |
|---|---|
| Background | `#0a0b10`, `#0d0e14` (near-black, faintly blue) |
| Border / hairline | `#262626` (32 uses — the single most-used color) |
| Text primary | `#ffffff` (31 uses) |
| Text secondary | `#d9d9d9` (31 uses) |
| **Accent — the only one** | `#0048e3` (13 uses), hover `#003ec5`, pressed `#0037ad` |

That's it. One accent hue, three shades of it. **Zero secondary brand colors.**

### Typography — 3 families, 11 sizes, 2 letter-spacings

- **Manrope** — everything structural (30 uses)
- **DM Mono** / **Fragment Mono** — labels and eyebrows only (11 uses)
- Inter only as a Framer fallback

Type ramp, each used **exactly once** as a defined step:

```
12 · 13 · 14 · 16 · 18 · 20 · 24 · 26 · 32 · 38 · 48
```

Letter-spacing has **two values in the entire site**: `0em` and `-0.02em`.
Line-height: `160%` body, `124–142%` headings.

### Shape & depth — deliberately flat

- Border radius: **mostly `0px`** (sharp corners), plus `99px`/`100px` pills.
  There is no 8/12/16/20px midrange at all.
- **One** backdrop blur value: `blur(22px)`.
- Gradients exist only as **edge-fade masks** — e.g. `linear-gradient(#000 65%, #0000 93%)`.
  They fade content out at container edges. **None are decorative color washes.**
- No glow shadows found.

### The distinctive motif

Mono-font section labels prefixed with slashes — `//OUR PHILOSOPHY`, `//Services` —
and zero-padded numbering `01 / 02 / 03`. Cheap to implement, does a lot of work.

**The takeaway:** this site looks polished because of what it **refuses** to do.
Sharp corners, one accent, no glows, two letter-spacings.

---

## 3. Xomware audit — where the entropy is

### 3.1 Type scale: ~30 sizes, two units mixed

Counted distinct `font-size` declarations across all SCSS:

```
14px(24) 13px(24) 0.8rem(22) 0.85rem(20) 0.75rem(18) 12px(15) 15px(13)
1rem(11) 0.7rem(11) 11px(10) 10px(6) 1.1rem(6) 0.9rem(6) 0.95rem(6)
20px(5) 1.5rem(4) 16px(3) 1.3rem(3) 0.65rem(3) 9px(2) 22px(2) 1.75rem(2)
1.2rem(2) 1.25rem(2) 1.05rem(2) 0.875rem(2) 3rem 36px 2rem 18px
```

Three separate problems stacked:

1. **~30 steps** where the reference uses 11.
2. **px and rem mixed arbitrarily** — `14px` (24×) and `0.875rem` (2×) are the
   same size, both in use. Same for `16px`/`1rem`, `12px`/`0.75rem`.
3. **`$font-*` variables define weights but no sizes.** `_variables.scss` has a
   spacing scale, a radius scale, and a shadow scale — but **no type scale**.
   Every size is hand-typed at the call site. This is the root cause.

### 3.2 Letter-spacing: 12+ values vs. their 2

```
0.08em(10) 0.1em(6) 0.5px(5) 0.04em(4) -0.02em(4) 0.06em(3)
0.12em(2) 0.02em(2) 0.01em(2) -0.03em(2) 0.15em 0.14em
```

`0.5px` is the odd one — a fixed px tracking that breaks at every other font size.

### 3.3 Color: seven brand hues competing on one screen

`_variables.scss` defines the cyan system well. Then:

```scss
$xomify-purple:    #9c0abf;
$xomcloud-orange:  #ff6b35;
$xomper-emerald:   #00ffab;
$meals-coral:      #ff6b6b;
$xomfit-green:     #34C759;
$xomtracks-red:    #ff3750;
```

> **CORRECTED 2026-08-05.** An earlier revision of this doc claimed these render
> simultaneously at rest. That is wrong. Verified in `styles/_app-cards.scss`:
> `.card-glow` is `opacity: 0` at rest (line 74) and only reaches `opacity: 1`
> under `:hover, :focus-visible` (line 84). Every other per-app color use —
> logo drop-shadow, card name, arrow — is inside the same hover block. **At rest
> the grid is already monochrome glass.**

The at-rest color on the apps grid comes from **11 full-color product logo
`<img>` tags**, not from CSS. So removing `--app-color` buys almost nothing
visually — the real lever is logo treatment.

**Separately, per-app color isn't a system.** The live values are in
`app/data/apps.data.ts`, which never references `_variables.scss`:

- 9 distinct hexes, of which **4 aren't in the token file at all** —
  `#C8102E`, `#4caf50`, `#FFB800`, `#2563eb`

> **CORRECTED 2026-08-05.** An earlier revision called `#9c0abf` and `#00ffab`
> "assigned to two different apps" and flagged them for dedup. Wrong — each is
> **the same product on two platforms** (Xomify web + iOS, Xomper web + iOS).
> That is correct, intentional usage. **Do not dedupe them.**
>
> The one genuine collision is **`#4caf50` (Xom Forms) vs `#34C759` (XomFit)** —
> two near-identical greens on two unrelated products.
>
> Separately: `colorRgb` is a hand-maintained duplicate of `color` and can drift.
> It should be derived, not stored twice.

**Premise check on the comparison:** levelup-labs is a 3-service agency page.
xomware.com is a portfolio of 11 independently-branded products. Their grid is
monochrome partly because they have nothing else to show. Everything else in §5
transfers cleanly; **color on the app grid specifically has no ground truth in
the reference.**

### 3.4 Glow shadows: 9 distinct radii, no scale

```
0 0 2px(4)  0 0 8px(3)  0 0 6px(3)  0 0 40px(2)  0 0 12px(2)
0 0 3px  0 0 1px  0 0 16px  0 0 15px
```

> **CORRECTED 2026-08-05.** That count conflates two different things.
> `box-shadow: 0 0 0 Npx` is **spread-only with zero blur** — a focus ring, not
> a glow, and `.claude/rules/frontend.md` requires visible focus rings. Re-counted:
> **7 focus rings** (`0 0 0 Npx`) vs **18 true blurred glows** (`0 0 Npx`).
> Do not strip the focus rings — that's an accessibility regression, not polish.

`0 0 15px` and `0 0 16px` are indistinguishable and both exist. `$shadow-glow-cyan`
is defined in variables but most components hand-roll their own instead.

The reference site uses **zero** glows. Glow is the most common "this looks
amateur" tell in dark UIs — it's the CSS equivalent of a lens flare.

### 3.5 Radius: scale defined, then bypassed

Variables define `4 / 8 / 12 / 20 / 24 / 100px`. But `.anon-gate-card` hardcodes
`16px` and `.anon-gate-btn` hardcodes `8px` — neither uses the token. A scale
that components ignore isn't a scale.

### 3.6 Font weights: bottom half of the ramp is missing

```
600(11)  700(6)  800(1)  900(1)
```

> **CORRECTED 2026-08-05.** The counts above are only *raw numeric literals*.
> They miss every `$font-weight-*` variable usage, which is how most of the
> codebase sets weight. The original conclusion — "almost everything is semibold
> or heavier" — was wrong.

Actual usage, counting variables and literals together:

| Weight | Via variable | Raw literal |
|---|---|---|
| 400 regular | **1** | 0 |
| 500 medium | **33** — most-used weight in the codebase | 0 |
| 600 semibold | 31 | 11 |
| 700 bold | 27 | 6 |
| 800 extrabold | 6 | 1 |
| 900 | — | 1 |

So hierarchy is **not** flattened by uniform boldness — 500 is the workhorse.
Three real findings survive, all narrower:

1. **`$font-weight-regular` (400) is used exactly once.** Body copy is largely
   set at 500 rather than 400, which does read slightly heavy, but it's a much
   smaller problem than "everything is 600+".
2. **19 raw literals bypass the weight variables** — the same
   scale-exists-but-is-ignored pattern as §3.5.
3. **`font-weight: 900` is a rendering bug, not a taste call.**
   `index.html:13` loads Inter at `wght@400;500;600;700;800` — there is no 900.
   `landing.component.scss:53` (`.anon-gate-wordmark`) requests it anyway, so the
   browser synthesizes **faux bold**, which is why that wordmark looks slightly
   smeared.

### 3.7 Emoji in the UI — contradicts your own rule

You've told me you don't want emoji in product UI. Present anyway:

| File | Line | Content |
|---|---|---|
| `landing.component.html` | 141 | `&#9889;` (⚡) in `.section-eyebrow` |
| `apps.component.html` | 12 | `&#9889;` (⚡) |
| `infra-dashboard.component.html` | 5, 13, 66 | 🏗 ⚠ ⚠ |
| `infra-dashboard.component.ts` | 41–45, 98 | 🏠 🎵 ☁ 🏈 💪 📦 |

The infra-dashboard ones are per-app icons in TS — a data-level fix, not cosmetic.

Note the reference site's equivalent slot — the section eyebrow — uses `//PHILOSOPHY`
in mono type. Same job, no emoji, looks considered.

---

## 4. Cross-app finding: there is no shared design system

| App | SCSS files | Tokens file |
|---|---|---|
| xomware-frontend | — | `src/styles/_variables.scss` |
| xomify-frontend | 82 | **none** |
| xomper-front-end | 73 | `src/styles/_variables.scss` (different file) |
| xomcloud-frontend | 20 | `src/app/styles/_variables.scss` (different path) |
| xomtracks-frontend | 16 | **none** |
| xomforms-frontend | 22 | **none** |
| xomcron-frontend | 11 | **none** |
| meals-frontend | 1 | **none** |
| vest-site | 5 | **none** |

**3 of 9 have tokens, at 3 different paths, with 3 different contents.** The
largest frontend (xomify, 82 SCSS files) has none at all.

So "clean up our other UIs" currently means editing 9 codebases independently
with no shared source of truth. Any per-app polish work done now will drift again.
**This is the highest-leverage finding in this document** — and it's an
infrastructure problem, not a design one.

---

## 5. What separates the two, ranked by impact

1. **Type scale as a token** — 11 defined steps vs. ~30 ad-hoc, px/rem mixed
   *(promoted to #1 after the §3.3 correction — the color problem is smaller
   than first assessed, and it's hover-only)*
3. **No glow** — 0 glow radii vs. 9
4. **Weight range** — they use 400-weight body text; you're 600+ nearly everywhere
5. **Letter-spacing** — 2 values vs. 12+
6. **Sharp corners** — deliberate `0px` vs. a bypassed radius scale
7. **Mono-type labels** — a cheap, high-yield motif you don't have
8. **Gradients as masks, not decoration** — yours are decorative color washes

9. **Accent discipline** — per-app color, *hover-only*. Real but smaller than
   items 1–8, and partly a product decision rather than a styling one.

Items 1–8 are mechanical and low-risk.

**The item this list originally missed:** a token file you don't *enforce* is
exactly what you already have. §3.5 is the proof — the radius scale exists and
`.anon-gate-card` hardcodes `16px` anyway. Framer's real advantage is a tool that
**forbids** the 12th font size. The equivalent here is **stylelint**, not a
`.scss` file. Enforcement is a first-class deliverable, not a nice-to-have.

---

## 6. Open questions for `/brainstorm`

1. **Per-app color** — kill it, or demote it to a small accent (a dot, a tag
   border) instead of a full card glow? This is the biggest call.
2. **Shared design system** — new `xom-design-tokens` package consumed by all 9
   frontends, or copy a canonical `_variables.scss` into each? Package is correct
   long-term but adds a publish step to every frontend.
3. **Scope** — xomware.com only first (it's the front door and the one being
   compared), or a token package first so the fix lands everywhere at once?
4. **Font** — Manrope is doing real work on the reference site. Worth adopting,
   or stay on Inter and fix the scale instead? Fixing the scale is the bigger win
   either way; the font is a smaller lever than it appears.
5. **Sharp corners** — matching their `0px` is a big identity shift. Might be a
   step too far for a personal brand that currently reads soft/glassy.

---

## 6b. Motion — the surprise: they animate *less* than you

I expected motion to be a hidden part of the reference site's polish. It isn't.
Measured from their inline CSS:

| | Them | Xomware |
|---|---|---|
| Transition durations | `0.1s`, `.15s`, `0.2s` | `150ms`, `300ms`, `400ms`, `500ms`, `1s` |
| Easing curves | **none** — browser default | 2 custom `cubic-bezier` (incl. a spring) |
| Unique `@keyframes` | **1** (`spin`) | **12** (17 declarations) |
| Scroll-driven animation | none found | GSAP + ScrollTrigger, 2 files |
| Dominant transform | `scale` (47 uses) — hover only | varied |

Their entire motion vocabulary is: **fast hover scale, default easing, plus
marquees** (the `5000s` durations and `translateX` uses are infinite tickers).

Meanwhile you're running GSAP, ScrollTrigger, Lottie, a spring curve, staggered
`fadeIn` entrance delays, and 12 keyframe animations — and it still reads as less
polished.

**This inverts the usual assumption.** The gap is not "they have motion you lack."
You have substantially more motion than they do. Their restraint in motion is the
same restraint visible in their color and type: one idea, executed consistently.

Practical consequence: motion is **not** a lever to pull here, and possibly a
place to subtract. It also means the ranked list in §5 stands unchallenged —
polish is token discipline, full stop.

---

## 7. Things I could not verify

- Its **responsive behavior** at mobile breakpoints.
- Whether its `0px` radius is global or section-specific (raw CSS suggests global,
  but I found only 6 `0px` declarations, which is fewer than a full site implies —
  Framer likely omits the property entirely when it's zero).
