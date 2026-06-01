# Music Section — `/music` Listening Stats (Frontend)

**Status:** Done
**Owner:** Dominick
**Date:** 2026-06-01

## Decisions Locked (2026-06-01)
- **Nav:** per-route **lightweight header** for `/music` in v1 (option b). Shared `<app-nav>` extraction deferred to a follow-up if a third route appears.
- **Ticker placement:** **`/music` only** in v1. Promote to the landing hero later once the treatment is dialed in.
- **Endpoint host:** `api.xomware.com` family (`environment.usersApiUrl`) — confirmed to match actual `UsersService` code (the `apiBaseUrl` comment there is stale). Exact path locked in the backend plan.

## Goal
Add a public `/music` route to xomware.com that renders Dom's Xomify (Spotify) listening stats — top 5 tracks, top 5 artists, top 5 genres — plus a scrolling ticker (marquee) of those items. v1 is hardcoded to Dom's userId but architected so enabling other users' public profiles later is a config change, not a rewrite. xomware.com is a **pure renderer**: it consumes a Xomify-owned endpoint and never talks to Spotify or implements OAuth.

This is the **frontend-only** plan. The backend work (a new public snapshot endpoint, and later a now-playing endpoint) lives in a separate plan in the `xomify-backend` repo — see [Cross-Repo Dependency](#cross-repo-dependency).

## Non-goals
- **Any Spotify integration on the frontend.** No OAuth, no tokens, no scopes, no direct Spotify API calls. Xomify owns that boundary entirely.
- **Now-playing in v1.** No currently-playing/recently-played endpoint exists in `xomify-backend` (`lambdas/common/spotify.py`) — it's net-new backend work (new scope + endpoint + polling). Deferred to v2. The ticker v1 cycles top items only, with a pluggable slot reserved for now-playing.
- **Building the backend snapshot endpoint.** Tracked in the `xomify-backend` plan. The frontend builds against a mock fixture first.
- **Multi-user UI/profile browser.** v1 is Dom only. We architect the userId as config, but build no user picker or `/music/:handle` routing yet.
- **Touching the command center, agent scene, monster, or auth flows** beyond adding the nav entry.

## Scope

### 1. `/music` route + nav entry
- Add a **real, public, deep-linkable route** `{ path: 'music', component: MusicComponent }` in `src/app/app-routing.module.ts`. **No guard** — it's Dom's public stats.
- Lazy-load the route (per `frontend.md`): `loadComponent`/`loadChildren` style, or a feature module if other pages get added. Keep it out of the initial landing bundle.
- Coexistence with the existing single-page landing:
  - `/` stays the profile/landing page. The current `Apps` nav links use the in-page fragment `#apps` (see `landing.component.html` lines 32, 125, 247) — those only resolve when on `/`.
  - Add a `Music` nav entry as `routerLink="/music"` (a real route, **not** a fragment). Add it to both the desktop nav and the mobile menu in `landing.component.html`.
  - When on `/music`, the `Apps` fragment link must route home first. Use `routerLink="/" fragment="apps"` for the Apps link so it works from any route (replaces the bare `href="#apps"`). Verify GSAP scroll-to still lands on the section.
- The nav currently lives inside `LandingComponent`. `MusicComponent` is a separate route, so it will **not** inherit that nav. **Locked: option (b)** — `MusicComponent` gets its own lightweight header with a "← back to xomware.com" link + the same brand. Shared `<app-nav>` extraction (a) is a follow-up if a third route appears.

### 2. `MusicService` (HttpClient) + mock fixture
- New `src/app/services/music.service.ts`, `@Injectable({ providedIn: 'root' })`, constructor-injected `HttpClient` — mirror `UsersService` patterns.
- Base URL from `environment`. **Assumption (confirm):** endpoint lives under the `api.xomware.com` family, i.e. `environment.usersApiUrl`. Note: `UsersService.baseUrl` already uses `usersApiUrl` despite a stale comment referencing `apiBaseUrl` — match the actual code, not the comment.
- One method: `getPublicTopItems(userId: string): Observable<MusicProfile>` → `GET /music/public-top-items?userId=<id>` (exact path TBD in backend plan — treat as a contract).
- **Config the userId, not hardcode-in-component:** put Dom's userId in `environment.ts` / `environment.dev.ts` (e.g. `musicProfileUserId`). v1 reads it from there. Future multi-user = read from route param instead of env — no service rewrite.
- **Parallel-track strategy (UI before backend ships):** add a local mock fixture `src/app/services/music.mock.ts` (or `src/assets/mock/music-profile.json`) matching the contract. Gate it behind an `environment.useMockMusicData` flag (or a `?mock=1` query param) so the whole UI — including loading/empty/error states — can be built and tested before the backend exists. Remove/flip the flag when the live endpoint ships.

### 3. Models
- New `src/app/models/music.model.ts`. Mirror the proposed flattened contract:
  ```ts
  export interface TopTrack  { name: string; artist: string; albumArt: string; url: string; }
  export interface TopArtist { name: string; image: string; url: string; }
  export interface TopGenre  { genre: string; count: number; }

  export interface MusicProfile {
    topTracks: TopTrack[];        // up to 5
    topArtists: TopArtist[];      // up to 5
    topGenres: TopGenre[];        // up to 5
    windowLabel: string;          // e.g. "Last 4 weeks"
    updatedAt: string;            // ISO
    nowPlaying: NowPlaying | null; // null in v1
  }

  export interface NowPlaying { /* v2 — shape TBD with backend */ }
  ```
- **Contract decision (flag to backend plan):** the *existing* `GET /user/top-items` returns a **range-keyed** shape (`tracks.short_term[] | medium_term | long_term`, derived genres, `meta.failed_ranges`). **Recommend the new public endpoint flatten + slice top-5 server-side** and return the shape above, so the frontend stays dumb. If the backend instead returns the raw range-keyed shape, `MusicService` does the flattening (map `short_term`, slice 5) — but that's a worse boundary. Document the chosen shape in the backend plan; this frontend plan assumes the flattened shape.
- **Window label honesty:** `short_term` ≈ last ~4 weeks. Render `windowLabel` verbatim from the API ("Last 4 weeks") — do **not** relabel as "previous month."

### 4. UI sections — top tracks / artists / genres
- `MusicComponent` (`src/app/components/music/`): `.ts`, `.html`, `.scss` (component-scoped SCSS, no inline styles).
- Three card sections: **Top Tracks** (album art + name + artist, links to `url`), **Top Artists** (image + name), **Top Genres** (genre + count, e.g. a tag/bar treatment).
- All states per `frontend.md`: **loading** (skeletons/spinner), **error** (retry affordance), **empty**, plus **partial** — respect the `meta.failed_ranges` notion: an individual section can be missing/empty while others render. Don't fail the whole page if one list is empty.
- Render `windowLabel` and a "Updated <relative time>" from `updatedAt`.
- Accessibility: semantic headings per section, links open in new tab with `rel="noopener"`, visible focus rings, keyboard nav, `alt` text on album/artist art.

### 5. Scrolling ticker (marquee) component
- New `src/app/components/music-ticker/` (standalone-friendly so landing + music can both use it).
- **Pure-CSS marquee — NOT GSAP/JS.** Duplicate the row twice in the DOM and animate `transform: translateX(...)` with a CSS keyframe loop; set `will-change: transform`. This avoids JS teardown/leak risk and satisfies the CLAUDE.md perf rule (no layout thrashing, no ScrollTrigger to clean up). Honor `prefers-reduced-motion: reduce` (pause/disable the scroll).
- **Input:** takes the resolved `MusicProfile` (or a derived `string[]`/item list) so it's reusable.
- **v1 content:** cycles top tracks + top artists (+ optionally genres).
- **Now-playing pluggable slot:** reserve a leading `<ng-content>` / `@Input nowPlaying` slot rendered first when present. Null in v1, wired in v2 with no marquee rewrite.
- **Placement (v1) — locked: `/music` only.** Not on the landing hero yet, not global, not in the command center. Promote to the landing hero in a later pass once the treatment looks right (the component is built standalone-friendly so that's a drop-in, not a rewrite).

### 6. Pinned / "right now" picks — **optional v1.5**
- Spotify has no rating concept, so this is **curated by Dom**, not derived from the API.
- Store as an **editable field on Dom's profile via the existing users API** (`POST /users/edit`), e.g. add `pinnedPicks` to `EditableFields`/`UserProfile` in `user.model.ts` (string list or `{ title, note }[]`). Rendered as a "Right now" section on `/music`.
- **Defer to v1.5** — it requires touching the shared `user.model.ts` contract + a backend field, and risks bloating v1. Only build after v1 top-items ship. Flagged as a contract change to coordinate with the users backend.

### 7. GSAP / ScrollTrigger cleanup
- The ticker is pure CSS (no cleanup needed). For **any scroll-reveal animation** added to `/music` sections (fade-in cards, etc.), follow `frontend.md` + CLAUDE.md: register triggers in `ngAfterViewInit`, and in `ngOnDestroy` call `ScrollTrigger.getAll().forEach(t => t.kill())` (or kill the specific instances created by this component) and `gsap.killTweensOf(...)`. Unsubscribe the `MusicService` subscription in `ngOnDestroy` too (or use `async` pipe to avoid manual subs).
- Reuse the existing GSAP setup pattern from `LandingComponent` so behavior is consistent.

## Files Touched
| File / Component | Change | Why |
|---|---|---|
| `src/app/app-routing.module.ts` | Add public, lazy `music` route (no guard) | Deep-linkable `/music` |
| `src/app/services/music.service.ts` | **New** — HttpClient, `getPublicTopItems(userId)` | Consume backend contract |
| `src/app/services/music.mock.ts` *(or `src/assets/mock/music-profile.json`)* | **New** — mock fixture | Build/test UI before backend ships |
| `src/app/models/music.model.ts` | **New** — `MusicProfile`, `TopTrack`, `TopArtist`, `TopGenre`, `NowPlaying` | Typed contract |
| `src/app/components/music/music.component.{ts,html,scss}` | **New** — page: 3 sections + states | Render stats |
| `src/app/components/music-ticker/music-ticker.component.{ts,html,scss}` | **New** — pure-CSS marquee, pluggable now-playing slot | Scrolling ticker, reusable |
| `src/app/components/landing/landing.component.html` | Add `Music` nav entry (desktop + mobile); change `Apps` links to `routerLink="/" fragment="apps"` | Nav coexistence (ticker on landing deferred) |
| `src/environments/environment.ts` + `environment.dev.ts` | Add `musicProfileUserId`, `useMockMusicData` (+ confirm base URL family) | userId as config, mock toggle |
| `src/app/models/user.model.ts` | *(v1.5 only)* add `pinnedPicks` to `UserProfile`/`EditableFields` | Curated picks — coordinate w/ users backend |

## Cross-Repo Dependency
xomware.com renders only. Two backend deliverables in **`~/Code/xomify-backend` (separate plan)**:

1. **Public snapshot endpoint (v1 blocker).**
   - **Why it's needed:** the existing `GET /user/top-items` (`lambdas/user_top_items/handler.py`) is auth-gated to the *caller* via `get_caller_email(event)` (per-user JWT) — it returns the signed-in caller's own data, **not** an arbitrary queryable userId. It cannot serve Dom's stats to anonymous visitors as-is.
   - **What to build:** a new **unauthenticated** endpoint that serves a *specific* user's cached top-items, gated by `profileVisibility: 'public' | 'private'` (already in `user.model.ts`). Reuse the existing daily per-user cache (keyed by email) and partial-failure tolerance (`meta.failed_ranges`).
   - **Contract decision for backend:** **flatten + slice top-5 server-side** and return the proposed shape (`topTracks/topArtists/topGenres/windowLabel/updatedAt/nowPlaying`) so the frontend stays dumb. Genres already derived server-side. Use `short_term` and label `windowLabel: "Last 4 weeks"`.
   - **Path:** proposed `GET /music/public-top-items?userId=<id>` under the `api.xomware.com` family — confirm exact path + host in the backend plan.

2. **Now-playing endpoint (v2).** Net-new: a new Spotify scope (`user-read-currently-playing` / `user-read-recently-played`), a new endpoint, and client polling. None of this exists in `lambdas/common/spotify.py` today. Frontend reserves a pluggable now-playing slot in the ticker and a `nowPlaying` field in the model.

## Phasing
- **v1 — top items + ticker.** Build UI against mock fixture → flip `useMockMusicData` off when the public snapshot endpoint ships → live. Covers scope 1–5, 7.
- **v1.5 — pinned "right now" picks.** Curated field on profile via users API (scope 6). Only after v1; touches shared `user.model.ts`.
- **v2 — now-playing.** Backend scope + endpoint + polling; wire the reserved ticker slot + `nowPlaying` model field.

## Risks / Assumptions
- **Backend endpoint doesn't exist yet (v1 blocker).** Mitigation: mock-fixture parallel track; frontend ships behind a flag and goes live when the endpoint lands. Don't merge "live" until the contract is verified end-to-end.
- **Contract shape mismatch.** If backend returns the raw range-keyed shape instead of flattened, `MusicService` must adapt (map `short_term` + slice 5). Pushed the recommendation (flatten server-side) into the backend plan — confirm there.
- **Base URL assumption.** Assuming `environment.usersApiUrl` (`api.xomware.com`). Confirm with backend — flag, not fact.
- **Nav inheritance.** `MusicComponent` won't get `LandingComponent`'s nav. v1 gives `/music` its own lightweight header; a shared `<app-nav>` extraction is deferred. Open question below.
- **`Apps` fragment from `/music`.** Switching `href="#apps"` → `routerLink="/" fragment="apps"` must still scroll correctly with GSAP — verify after change.
- **Ticker perf.** Pure-CSS `translateX` marquee with `will-change` and `prefers-reduced-motion` respected. No GSAP/ScrollTrigger in the ticker = no teardown leak. Verify no layout thrash (use transform, not `left`).
- **Double fetch.** Ticker on landing + page on `/music` could both call the API. v1 placement on landing is optional; if shown, share the one `MusicProfile` (the daily-cached backend makes a duplicate call cheap, but still avoid it).
- **v1.5 contract change.** `pinnedPicks` modifies the shared `user.model.ts` consumed by other frontends — coordinate, don't ship unilaterally.

## Open Questions
- [x] ~~Shared `<app-nav>` vs per-route header?~~ **Locked: per-route lightweight header for v1.**
- [x] ~~Ticker on landing hero in v1, or `/music` only?~~ **Locked: `/music` only in v1.**
- [~] Endpoint host/path — assuming `api.xomware.com/music/public-top-items` (`usersApiUrl`); exact path locked in the backend plan.
- [x] Ticker content set for v1 — tracks + artists only (genres excluded from ticker — leaned tracks + artists per plan guidance).
- [ ] `pinnedPicks` data shape — flat `string[]` or `{ title, note }[]`? (Defer to v1.5 design.)

## Test Plan (v1)
- [x] `/music` loads as a public route, deep-linkable, no auth required.
- [x] With `useMockMusicData` on: all three sections render from the fixture; loading → loaded transition works.
- [x] Error state (force a 500 / bad URL) shows retry, doesn't white-screen.
- [x] Partial state: one empty list renders empty while others show data.
- [x] `windowLabel` renders verbatim ("Last 4 weeks"); `updatedAt` shows relative time.
- [x] Ticker scrolls smoothly (pure CSS), pauses under `prefers-reduced-motion`, no console errors on navigate-away.
- [x] `Music` nav entry works from `/` and from `/music`; `Apps` link routes home + scrolls to `#apps` from `/music`.
- [x] No GSAP/subscription leaks on `ngOnDestroy` — ticker is pure CSS (no teardown), MusicComponent unsubscribes in ngOnDestroy.
- [x] `npm run build:prod` succeeds, no new TS errors (strict, no `any`).
- [x] `npm test` passes — 1/1 SUCCESS.

## Hub Expansion (2026-06-01)

`/music` became a 3-tab hub on 2026-06-01. Key changes:

- **Tab shell:** `MusicComponent` now owns a sticky `role="tablist"` (Now / Release Radar / Wrapped) with roving-tabindex + left/right arrow-key nav and visible focus rings. Default tab = Now.
- **Deep-linkable:** active tab is reflected in `?tab=now|radar|wrapped` via `ActivatedRoute` + `Router.navigate({ queryParamsHandling: 'merge' })`. Unknown/missing param falls back to Now.
- **Lazy activation:** Radar and Wrapped panels are kept out of the DOM until first activated (`activatedTabs` Set), then kept alive to preserve state. Now panel always renders.
- **Tab 1 — Now:** existing top-items content (Top Tracks / Top Artists / Top Genres + ticker) relocated into the Now tabpanel. No behavior change.
- **Tab 2 — Release Radar (new mock):**
  - `src/app/models/release-radar.model.ts` — `RadarRelease`, `RadarProfile`
  - `src/app/services/release-radar.service.ts` — mirrors `MusicService` (`getPublicReleaseRadar(userId)`, mock-gated, placeholder path `/music/public-release-radar`)
  - `src/app/services/release-radar.mock.ts` — 6 realistic releases, `windowLabel: "This week"`
  - `src/app/components/music-release-radar/` — grid layout, `type` badge (album/single/ep), relative date, loading/error/empty states, links open in new tab
  - **Goes live when:** `GET /music/public-release-radar` ships in xomify-backend (separate plan)
- **Tab 3 — Wrapped (new mock):**
  - `src/app/models/wrapped.model.ts` — `WrappedMonth`, `WrappedArchive`; imports `TopTrack`/`TopArtist`/`TopGenre` from `music.model.ts` (no duplication)
  - `src/app/services/wrapped.service.ts` — mirrors `MusicService` (`getPublicWrapped(userId)`, mock-gated, placeholder path `/music/public-wrapped`)
  - `src/app/services/wrapped.mock.ts` — 3 months of hydrated data; May/April have fake Spotify `playlistUrl`, March has `null`
  - `src/app/components/music-wrapped/` — month-selector chips (newest first, default newest), per-month top tracks/artists/genres reusing Now's card markup, prominent "Open playlist ↗" Spotify button when `playlistUrl` is set, loading/error/empty states
  - **Goes live when:** `GET /music/public-wrapped` ships in xomify-backend (separate plan)
- **No routing change:** `/music` route is unchanged; tabs live entirely in query params.
- **Build/test:** `npm run build:prod` and `npm test` both pass after this expansion.

## Skills / Agents to Use
- **frontend-implementer** (or equivalent execution agent): build `MusicService`, models, `MusicComponent`, and `music-ticker` against the mock fixture.
- **angular/SCSS patterns**: follow existing `UsersService`/`ProfileService` HttpClient style and component-scoped SCSS conventions.
