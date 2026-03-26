# Plan: Frontend Redesign -- Abstract Blob Ambience

**Status**: Complete
**Created**: 2026-03-26
**Last updated**: 2026-03-26

## Summary
Redesign xomware.com around Option 2 from the brainstorm: evolve the existing blob animation system into faceless, translucent ambient blobs that free-roam the entire page as a background layer. Simultaneously remove all OpenClaw command center components (except infra-dashboard + auth-gate), merge app cards into a unified grid with status badges, add the missing Meals card, and add a mobile hamburger menu. Addresses GitHub issues #91 (redesign) and #92 (OpenClaw removal).

## Approach
Chosen approach: **Abstract Blob Ambience** (Option 2 from `docs/features/frontend-redesign/BRAINSTORM.md`).

Rationale: Reuses the existing ~390-line GSAP blob animation system in MonsterComponent rather than discarding it. Strips the mascot elements (eyes, mouth, sleep Z's, blink cycle) and repositions blobs as a full-page ambient layer with larger, more transparent shapes. If the tuning doesn't land, the blob layer can be hidden to fall back to Option 1 with zero layout impact.

Key discovery: `<app-monster>` is **not currently rendered** anywhere in the HTML templates -- the MonsterComponent exists in the module declarations but is unused in any template. The landing page has static CSS `.bg-orbs` divs for ambient background. The blob system will replace these CSS orbs with the GSAP-driven SVG blobs.

## Affected Files / Components

| File / Component | Change | Why |
|-----------------|--------|-----|
| **PHASE 1: TEARDOWN** | | |
| `src/app/components/agent-scene/` (3 components) | Delete entire directory | Agent scene removed per brainstorm |
| `src/app/components/agent-status/` | Delete entire directory | Agent status indicator removed |
| `src/app/components/coming-soon/` (3 components) | Delete entire directory | Caution tape section replaced by unified grid |
| `src/app/components/command-center/kanban/` | Delete | OpenClaw removal |
| `src/app/components/command-center/config-viewer/` | Delete | OpenClaw removal |
| `src/app/components/command-center/file-editor/` | Delete | OpenClaw removal |
| `src/app/components/command-center/activity-log/` | Delete | OpenClaw removal |
| `src/app/components/command-center/pixel-office/` | Delete | OpenClaw removal |
| `src/app/components/command-center/issue-board/` | Delete | OpenClaw removal |
| `src/app/components/command-center/ci-monitor/` | Delete | OpenClaw removal |
| `src/app/components/command-center/analytics-dashboard/` | Delete | OpenClaw removal |
| `src/app/components/command-center/ticket-detail-modal/` | Delete | OpenClaw removal |
| `src/app/components/command-center/releases/` | Delete (if exists) | OpenClaw removal |
| `src/app/components/pr-dashboard/` | Delete | Standalone PR route removed |
| `src/app/components/command-center/command-center.component.*` | Rewrite to infra-only | Keep shell but strip tabs to just infra |
| `src/app/services/agent-status.service.ts` | Delete | Only used by removed components |
| `src/app/services/board.service.ts` | Delete | Only used by kanban + analytics (both removed) |
| `src/app/services/file.service.ts` | Delete | Only used by file-editor (removed) |
| `src/app/services/inbox.service.ts` | Delete | Only used by kanban (removed) |
| `src/app/services/issues.service.ts` | Delete | Only used by issue-board (removed) |
| `src/app/services/ticket-detail.service.ts` | Delete | Only used by ticket-detail-modal (removed) |
| `src/app/services/workflow-runs.service.ts` | Delete | Only used by ci-monitor (removed) |
| `src/app/services/releases.service.ts` | Delete | Only used by releases (removed) |
| `src/app/models/coming-soon.models.ts` | Delete | Coming-soon data merged into landing |
| `src/app/app.module.ts` | Remove all deleted component/service imports | Clean up module |
| `src/app/app-routing.module.ts` | Remove `/prs` route, `/ci` redirect; simplify command routes | Clean routing |
| `src/app/app.component.ts` | Remove `<app-agent-status>` from template | Agent status widget removed |
| `src/styles/_variables.scss` | Remove caution/coming-soon variables, agent color variables | Dead code cleanup |
| **PHASE 2: BLOB EVOLUTION** | | |
| `src/app/components/monster/monster.component.ts` | Major rewrite: strip face logic, add full-page wandering, make ambient-only | Core blob evolution |
| `src/app/components/monster/monster.component.html` | Strip eyes, mouth, sleep Z's from SVG; increase blob sizes; add blur/opacity | Faceless abstract blobs |
| `src/app/components/monster/monster.component.scss` | Change from fixed 320x180 arena to `position:fixed; inset:0` full-page layer | Full-page coverage |
| `src/app/components/landing/landing.component.html` | Add `<app-monster>` as background layer; remove `.bg-orbs` divs; remove agent scene section | Blob integration |
| `src/app/components/landing/landing.component.ts` | Remove monster state management (monsterState, idle timer, mobile cycle, card hover/leave); blobs are now autonomous | Simplify to autonomous blobs |
| `src/app/components/landing/landing.component.scss` | Remove `.bg-orbs` / `.orb` CSS; blobs replace them | CSS cleanup |
| **PHASE 3: APP CARDS UNIFICATION** | | |
| `src/app/components/landing/landing.component.ts` | Add Meals card to `apps[]`; add `status` field (`'live'` / `'coming-soon'`); remove `monsterState` from AppCard interface | Unified 6-card grid |
| `src/app/components/landing/landing.component.html` | Add status badge to card template; remove `(mouseenter)`/`(mouseleave)` monster handlers | Status badges |
| `src/app/components/landing/landing.component.scss` | Add `.card-status-badge` styles (Live = green dot, Coming Soon = amber dot); remove coming-soon section reference | Badge styling |
| **PHASE 4: LANDING PAGE POLISH** | | |
| `src/app/components/landing/landing.component.html` | Add hamburger button + mobile menu overlay; remove "Agents" nav link; remove Command Center + PRs footer links | Nav + footer cleanup |
| `src/app/components/landing/landing.component.scss` | Add hamburger/mobile-menu styles; simplify footer; improve responsive breakpoints | Mobile nav + polish |
| `src/app/components/landing/landing.component.ts` | Add `menuOpen` toggle for hamburger | Mobile menu state |
| **PHASE 5: CLEANUP + TEST** | | |
| All test files (`*.spec.ts`) | Update/remove tests for deleted components | Test cleanup |
| `angular.json` | Verify no references to deleted components | Build config |
| `src/environments/environment*.ts` | Remove `boardApiUrl`/`boardAuthHash` if only used by removed components | Env cleanup |

## Implementation Steps

### Phase 1: Teardown (addresses #92)
- [x] 1.1 -- Remove `<app-agent-status>` from `app.component.ts` template string
- [x] 1.2 -- Delete component directories: `agent-scene/`, `agent-status/`, `coming-soon/`, `pr-dashboard/`
- [x] 1.3 -- Delete command center components (keep only `command-center.component.*`, `auth-gate/`, `infra-dashboard/`): delete `kanban/`, `config-viewer/`, `file-editor/`, `activity-log/`, `pixel-office/`, `issue-board/`, `ci-monitor/`, `analytics-dashboard/`, `ticket-detail-modal/`, `releases/`
- [x] 1.4 -- Delete services no longer needed: `agent-status.service.ts`, `board.service.ts`, `file.service.ts`, `inbox.service.ts`, `issues.service.ts`, `ticket-detail.service.ts`, `workflow-runs.service.ts`, `releases.service.ts`
- [x] 1.5 -- Delete `src/app/models/coming-soon.models.ts`
- [x] 1.6 -- Update `app.module.ts`: remove all imports/declarations for deleted components and services
- [x] 1.7 -- Update `app-routing.module.ts`: remove `/prs` route, `/ci` redirect; simplify command center routing to just `/command` -> infra dashboard (no tab system needed)
- [x] 1.8 -- Rewrite `command-center.component.ts/html/scss`: strip tab system, render only `<app-infra-dashboard>`. Remove kanban/files/activity/office/issues tabs. Keep header with logo, title, logout.
- [x] 1.9 -- Remove `<app-coming-soon-section>` and `<section id="agents">` from `landing.component.html`
- [x] 1.10 -- Remove "Agents" link from nav; remove "Command Center" and "PRs" links from footer
- [x] 1.11 -- Clean `_variables.scss`: remove `$caution-*`, `$xomfit-rgb`, `$float-*`, `$agent-*` variables
- [x] 1.12 -- Delete `kanban.component.ts.bak` if it exists
- [x] 1.13 -- Run `npm run build:prod` to verify no broken imports; fix any remaining references
- [x] 1.14 -- Run `npm test` and fix/remove broken tests

### Phase 2: Blob Evolution
- [x] 2.1 -- Rewrite `monster.component.html`: remove eyes (`.b-eyes`), mouth (`.b-mouth`), pupils, sleep Z's group. Keep only `<ellipse>` bodies + shine overlay per blob. Increase `viewBox` to `0 0 1920 1080` (or use `%`-based coords). Add `filter="url(#blobBlur)"` with a Gaussian blur `<filter>` in `<defs>`. Reduce opacity on each blob body to ~0.08-0.15.
- [x] 2.2 -- Rewrite `monster.component.scss`: change `.blob-arena` from fixed-size to `position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 0;`. Remove responsive width/height overrides.
- [x] 2.3 -- Rewrite `monster.component.ts`:
  - Remove all face-related code: `MOUTH_*` constants, `setMouths()`, `startBlink()`, `blinkTimer`, `buildSleep()`, sleep Z animation, `buildExcited()` target areas / `TARGET_AREAS` / `bounceAtTarget()`
  - Remove `@Input() state` and `ngOnChanges` -- blobs are now autonomous, no external state
  - Remove `COLOR_MAP` state-based colors
  - Keep `NUM_BLOBS`, `SCALES` (increase values for larger blobs), `initBlobs()`, `killAll()`
  - Rewrite `wanderBlob()`: expand coordinate range to cover full viewport (`0-100%` of container). Increase duration to 8-15s for slower, ambient movement.
  - Keep breathing animation from `buildIdle()` but slow it down (3-5s cycle)
  - Add subtle color cycling: GSAP timeline that slowly rotates through brand colors (`$brand-cyan`, `$xomify-purple`, `$xomcloud-orange`, `$xomper-emerald`) over 30-60s
  - Add `prefers-reduced-motion` check: if enabled, set blobs to static positions with no animation
- [x] 2.4 -- Add `<app-monster>` to `landing.component.html` as first child inside `.landing` div (before nav). Remove `.bg-orbs` div.
- [x] 2.5 -- Remove `.bg-orbs` / `.orb` / `@keyframes orbFloat` CSS from `landing.component.scss`
- [x] 2.6 -- Clean up `landing.component.ts`: remove `monsterState`, `idleTimer`, `mobileTimer`, `SLEEP_DELAY`, `MOBILE_CYCLE_*`, `mobileStates`, `onCardHover()`, `onCardLeave()`, `onPageInteraction()`, `resetIdleTimer()`, `startMobileCycle()`, `checkMobile()`. Remove `isMobile` property (only needed for monster state, not for responsive layout).
- [x] 2.7 -- Run `npm run build:prod` and visually verify blobs render as full-page ambient layer
- [x] 2.8 -- Tune blob opacity, size, speed, blur radius until they feel premium-ambient (iterative)

### Phase 3: App Cards Unification
- [x] 3.1 -- Update `AppCard` interface in `landing.component.ts`: remove `monsterState`, add `status: 'live' | 'coming-soon'`. Add `statusLabel` string (e.g., "Web App", "iOS - Coming Soon").
- [x] 3.2 -- Add Hornets Southeast Champs card to `apps[]` array:
  ```
  { name: 'Hornets SE Champs', description: 'Hornets SE Division Win Bet Tracker', color: '#00788C', colorRgb: '0, 120, 140', url: 'https://hornets-southeast-champs.xomware.com', logo: 'assets/img/hornets-placeholder.svg', tag: 'Web App', status: 'live' }
  ```
- [x] 3.3 -- Set `status` on existing cards: Xomify/XomCloud/Xomper/Hornets SE Champs = `'live'`, Float/XomFit = `'coming-soon'`
- [x] 3.4 -- Reorder `apps[]` array: live apps first (Xomify, XomCloud, Xomper, Hornets SE Champs), then coming-soon (XomFit, Float) -- 3x2 grid with live apps on top rows
- [x] 3.5 -- Update card template in `landing.component.html`: add status badge element. Remove `(mouseenter)` and `(mouseleave)` bindings (no more monster state).
  ```html
  <span class="card-status" [class.live]="app.status === 'live'" [class.coming-soon]="app.status === 'coming-soon'">
    <span class="status-dot"></span>
    {{ app.status === 'live' ? 'Live' : 'Coming Soon' }}
  </span>
  ```
- [x] 3.6 -- Add `.card-status` styles in `landing.component.scss`: small pill with dot indicator. Live = green dot + "Live" text. Coming Soon = amber dot + "Coming Soon" text. Position at top-right of card or inline in card-footer.
- [x] 3.7 -- Create `assets/img/hornets-placeholder.svg` (simple placeholder matching existing placeholder style, Hornets teal #00788C)
- [x] 3.8 -- Update section header copy: remove "Live products built and maintained by AI agents" subtitle (no longer just live products)

### Phase 4: Landing Page Polish
- [x] 4.1 -- Add hamburger button to nav (visible at `$breakpoint-md` and below):
  ```html
  <button class="nav-hamburger" (click)="menuOpen = !menuOpen" aria-label="Menu">
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
  </button>
  ```
- [x] 4.2 -- Add mobile menu overlay in `landing.component.html`: full-screen overlay with nav links, slide-in from right. Include Apps anchor, GitHub link. Close on link click or overlay tap.
- [x] 4.3 -- Add `menuOpen = false` to `landing.component.ts`. Add `toggleMenu()` and `closeMenu()` methods.
- [x] 4.4 -- Add hamburger + mobile menu SCSS: hamburger icon animation (3 lines -> X on open), overlay with glass-morphism background, slide-in transition.
- [x] 4.5 -- Simplify footer: keep brand + GitHub link only. Remove Command Center and PRs links (already removed in Phase 1 but verify).
- [x] 4.6 -- Refine hero section copy if needed (optional -- current copy is solid)
- [x] 4.7 -- Test responsive breakpoints: verify 3-col (desktop) -> 2-col (tablet) -> 1-col (mobile) grid transitions work with 6 cards

### Phase 5: Final Cleanup + Testing
- [x] 5.1 -- Delete or update all `*.spec.ts` files for removed components
- [x] 5.2 -- Verify `environments/environment.ts` and `environment.prod.ts` -- remove unused config keys (`boardApiUrl`, `boardAuthHash`) if they're only referenced by deleted code
- [x] 5.3 -- Run `npm run build:prod` -- zero errors, zero warnings
- [x] 5.4 -- Run `npm test` -- all tests pass
- [x] 5.5 -- Manual QA: desktop (Chrome, Safari), mobile (iOS Safari, Chrome Android), check `prefers-reduced-motion` behavior
- [x] 5.6 -- Lighthouse check: performance score should not regress from current baseline
- [x] 5.7 -- Verify CloudFront invalidation paths still work (`/`, `/index.html`, `/command`)

## Out of Scope
- App screenshots or preview images inside cards (no assets available)
- Bento/mixed-size card layout (deferred per brainstorm recommendation)
- Dark/light mode toggle
- New hero animation or 3D effects
- Backend API changes
- New routes or pages beyond what exists
- Blob color reactivity to card hover (cut to reduce scope; can be added later)
- SEO/meta tag updates

## Risks / Tradeoffs
- **Blob tuning is subjective**: Opacity, blur, speed, and size need iteration to feel "premium ambient" vs "lava lamp." Mitigation: start conservative (low opacity, heavy blur, slow movement) and increase from there. Fallback: hide blob layer entirely and keep the page clean.
- **Performance on low-end devices**: 6 GSAP-animated SVG elements with blur filters could be heavy. Mitigation: use `will-change: transform` on blob container, respect `prefers-reduced-motion`, test on throttled CPU.
- **Large deletion surface area**: Removing ~15 components and ~8 services in Phase 1 risks breaking imports we missed. Mitigation: `npm run build:prod` after each sub-step, fix errors immediately.
- **MonsterComponent rename**: The component is still called "monster" internally. Renaming to "ambient-blobs" would be cleaner but increases diff size. Accepted tradeoff: keep the name for now, rename in a future cleanup pass.
- **Missing Meals placeholder SVG**: Need to create `meals-placeholder.svg`. Mitigation: copy structure from existing `xomfit-placeholder.svg` and adjust colors.

## Open Questions
- [ ] Should the `/command` route be kept at all, or should infra-dashboard be removed too? (Current plan: keep it behind auth)
- [x] ~~Should blobs be SVG or CSS-only?~~ Resolved: SVG (more GSAP control).
- [x] ~~Do environment variables `boardApiUrl` / `boardAuthHash` power anything beyond deleted components?~~ Resolved: No, remove them.
- [x] ~~Should the Meals card link to `meals.xomware.com` or `#`?~~ Resolved: No Meals card (private). Adding Hornets SE Champs instead.

## Skills / Agents to Use
- **Code agent**: Execute each phase as a discrete task. Phase 1 first (largest, most mechanical), then Phase 2 (creative/iterative), then 3-5.
- **Test agent**: After Phase 1 and Phase 5 to verify build + tests pass.
- **Visual QA**: After Phase 2 (blob tuning) and Phase 4 (responsive) -- manual review needed, not automatable.
