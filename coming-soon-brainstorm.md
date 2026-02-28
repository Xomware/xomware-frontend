# 🧠 Xomware Frontend — Coming Soon & Agent Blobs Brainstorm

> **Design Vision:** The xomware.com homepage becomes a living, breathing workspace — where AI agents visibly work, joke around, and tease upcoming products. Equal parts *construction site* and *cartoon studio*.

---

## 🎨 Design Vision

### Vibe
- **Construction site meets pixel studio** — caution tape, hard hats, scaffolding energy but rendered in Xomware's midnight-cyan palette
- **Living workspace** — agents are *visible*, not abstract. They walk around, high-five, spill coffee, argue over code
- **Playful authority** — we're serious builders, but we don't take ourselves too seriously. The agents are charming mascots

### Tone
| Element | Feel |
|---------|------|
| Coming Soon cards | Mysterious + exciting. "Something big is coming." |
| Caution tape | Fun, not alarming. Yellow-black with slight glow |
| Agent blobs | Warm, quirky, recognizable. Like Slack's lovable team but weirder |
| Typography | Bold headers + mono code accents |
| Animation | GSAP-powered, buttery smooth. Never jarring |

---

## 📌 Mood Board References

### Coming Soon Section
- **Notion's "coming soon" page** — sparse, confident, single CTA with email capture
- **Linear.app unreleased features** — dark cards, gradient glows, minimal copy
- **Stripe's product teasers** — clean grid, badge overlays, subtle animation
- **Construction site aesthetic** — diagonal yellow-black stripe patterns (CSS `repeating-linear-gradient`)
- **Caution tape animation ref:** Notion-style horizontal marquee, but angled at -2deg
- **Card shimmer:** Like Apple's iCloud card glow on hover

### Agent Blobs
- **Google Doodle characters** — expressive, simple shapes, big personality
- **Slack's mascot** (retired Chaplin) — office worker energy
- **Duolingo owl** — clear idle → action → idle animation loop
- **Among Us characters** — simple blob silhouette, accessories define identity
- **VSCO's animated brand characters** — smooth morphing shapes, GSAP-worthy
- **Headspace's animated blob creatures** — meditative, fluid, cute

### Color References
- Existing Xomware palette: `$brand-cyan: #00b4d8`
- Yellow caution: `#FFD600` (Material Design Yellow 700)
- Construction black: `#1a1a1a`
- Warm agent tones: see agent color map below

---

## 🎭 Agent Character Design Bible

### Boris — iMessage Dispatcher
- **Color:** `#00b4d8` (brand cyan) — he *is* Xomware
- **Accessories:** Tiny chat bubble speech icon, phone in one nub
- **Personality:** Fast, always moving, slightly frantic energy
- **Idle:** Pacing left-right, checking "phone" nub
- **Signature animation:** Waving at camera, chat bubble pops with "👋"
- **Interaction:** Runs over to other agents, delivers messages, dashes away

### Forge — Code Builder
- **Color:** `#FF6B35` (construction orange)
- **Accessories:** Hard hat SVG on top, tiny wrench nub
- **Personality:** Head-down focused, occasionally celebrates with fist pump
- **Idle:** Hammering motion (blob bounces rhythmically), code fragments floating
- **Signature animation:** PR badge floats up and disappears (shipping code)
- **Interaction:** Builds scaffolding around coming-soon cards, high-fives Winston

### Rocco — Research Analyst
- **Color:** `#9C0ABF` (xomify purple)
- **Accessories:** Tiny magnifying glass, data chart floating beside
- **Personality:** Methodical, curious, head tilts when analyzing
- **Idle:** Blob leans toward screen, magnifying glass moves back/forth
- **Signature animation:** Data points float around blob in orbit
- **Interaction:** Points at coming-soon cards with magnifying glass, nods approval

### Winston — CI/CD Watchdog
- **Color:** `#00FFAB` (xomper emerald)
- **Accessories:** Hard hat + coffee cup (half-full), tiny badge "CI ✓"
- **Personality:** Vigilant but sleepy at night, perks up when builds fail
- **Idle:** Slow patrol walk left-right, coffee cup steaming
- **Signature animation:** Green checkmark floats up (build passing)
- **Interaction:** Gives thumbs up to Forge after PR, occasionally face-palms

### Stormy — Memory Curator
- **Color:** `#4A90D9` (deep sky blue)
- **Accessories:** Tiny quill pen / feather, notebook floating beside blob
- **Personality:** Methodical organizer, writes things down constantly
- **Idle:** Quill writes in notebook (oscillating motion)
- **Signature animation:** Notebook pages flutter, memories filed away
- **Interaction:** Follows other agents, documents everything, occasional "*sigh*"

### Debo — Infrastructure Agent
- **Color:** `#E74C3C` (server red)
- **Accessories:** Tiny server rack icon, Terraform logo chip
- **Personality:** Powerful but cautious ("Ask me before deploying!")
- **Idle:** Arms crossed, slowly nodding head
- **Signature animation:** Server rack glows green, uptime counter ticks up
- **Interaction:** Blocks path of other agents if they approach the "infra zone"

---

## 🚧 Coming Soon Section — Design Concept

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  ⚡⚡⚡  SCROLLING CAUTION TAPE MARQUEE  ⚡⚡⚡          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   🚧  Coming Soon  🚧                                   │
│   Subtitle: "Forge is building. Stand back."            │
│                                                         │
│  ┌──────────────────┐   ┌──────────────────┐           │
│  │  [XOMFIT LOGO]   │   │  [FLOAT LOGO]    │           │
│  │  ░░░░░░░░░░░░░░  │   │  ░░░░░░░░░░░░░░  │           │
│  │  XomFit          │   │  Float           │           │
│  │  Social fitness  │   │  Real-time bar   │           │
│  │  & lifting app   │   │  & restaurant    │           │
│  │  [iOS Soon]  🍎   │   │  deals           │           │
│  │  [🔔 Notify Me]  │   │  [iOS Soon]  🍎   │           │
│  └──────────────────┘   │  [🔔 Notify Me]  │           │
│                         └──────────────────┘           │
│                                                         │
│         [Forge blob hammering on the cards]             │
└─────────────────────────────────────────────────────────┘
```

### Caution Tape Design
- CSS `repeating-linear-gradient(45deg, #FFD600 0px, #FFD600 20px, #1a1a1a 20px, #1a1a1a 40px)`
- Horizontal scrolling marquee via CSS animation (infinite, 12s)
- Slight drop shadow + opacity 0.85 for subtlety
- Text in tape: "🚧 UNDER CONSTRUCTION · 🔧 COMING SOON · ⚡ XOMWARE LABS · "

### Card Design (xomfit / Float)
- Dark base: `rgba(26, 26, 46, 0.95)` — matches existing `$bg-card`
- App color accent border: 2px solid with 0.4 opacity glow
- Blurred/grayscale placeholder logo (transitions to color on hover)
- "COMING SOON" pill badge — caution yellow with black text
- iOS badge: small Apple icon + "iOS"
- Notify Me CTA: ghost button that captures email (future feature)
- Hover state: card lifts 4px, color intensifies, logo snaps to color
- Subtle shimmer animation on card surface (diagonal sweep)

---

## 🎬 Animation Scene Breakdown

### Homepage Agent Scene (between hero and app cards)
The existing `MonsterComponent` blob swarm gets *upgraded* — individual blobs get named identities and the scene becomes an office:

**Zone Map:**
```
[Left zone: Boris pacing]  [Center: Forge building]  [Right: Rocco researching]
                [Bottom: Winston patrolling]
           [Stormy drifting, writing notes]
```

**Scene Events (looping, random):**
1. Boris runs to Forge, message bubble pops, Forge fist-pumps → PR ships
2. Winston walks left-right, stops, green checkmark floats up
3. Rocco leans toward a coming-soon card, nods
4. Stormy slowly writes in notebook, looks up, writes again
5. Debo sits arms-crossed watching everyone
6. Two random agents "collide" → bounce off each other → emoji pops (😂)

**Interaction Triggers:**
- Mouse hover on agent blob → tooltip with name + current task
- Click on agent → shows agent "status card" (modal: name, role, last action)
- Scroll into view → agents notice and wave at user

---

## 🖋️ Copy Concepts

### Coming Soon Section Header
- Option A: "🚧 Xomware Labs — Under Construction"
- Option B: "What We're Building Next"  
- Option C: "🔧 The Build Queue" (most on-brand)

### Card Subtitles
- xomfit: "Social fitness meets AI coaching. Track lifts, challenge friends, crush PRs." 
- Float: "Real-time happy hour deals. Bars & restaurants, live pricing, right now."

### Caution Tape Text Loop
`🚧 UNDER CONSTRUCTION · 🔧 COMING SOON · ⚡ XOMWARE LABS · 🤖 AGENTS BUILDING · `

---

## 🛠️ Technical Approach Summary

### Stack
- **Angular 18** (existing) — no framework change
- **GSAP 3.14** (already installed) — all animations
- **Pure CSS/SCSS** — caution tape, shimmer, marquee (no extra deps)
- **SVG** — agent blob characters (extends existing MonsterComponent pattern)
- **CSS Custom Properties** — per-agent color theming

### Key Design Tokens to Add
```scss
// Coming Soon
$caution-yellow: #FFD600;
$caution-stripe: repeating-linear-gradient(45deg, #FFD600 0, #FFD600 20px, #1a1a1a 20px, #1a1a1a 40px);

// Agent colors
$agent-boris: #00b4d8;
$agent-forge: #FF6B35;
$agent-rocco: #9C0ABF;
$agent-winston: #00FFAB;
$agent-stormy: #4A90D9;
$agent-debo: #E74C3C;

// App colors (coming soon)
$xomfit-green: #34C759;
$float-gold: #FFB800;
```

---

## 📎 Reference Links (Mood Board)

- Linear.app dark cards: https://linear.app
- GSAP morphSVG: https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/
- CSS caution tape codepen inspiration: https://css-tricks.com/striped-background-gradients/
- Among Us character breakdown: simple ellipse + visor circle
- Duolingo blob animation breakdown: opacity + scale keyframes, 0.3s ease
- Headspace's animated blobs: SVG path morphing, fluid easing
- Notion's "coming soon" page aesthetic: sparse, dark, single focus
