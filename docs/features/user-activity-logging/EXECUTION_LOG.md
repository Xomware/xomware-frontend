# Execution Log — Today In Sports + Activity Logging

**Date**: 2026-08-14
**Plan**: `PLAN.md`

---

## Phase 1 — Today In Sports ✅

- `src/assets/img/banners/today-in-sports.svg` ← TIS `public/brand/logo.svg`
- `src/assets/img/apps/today-in-sports.webp` ← TIS `public/icon-512.png`, **circle-cropped**
- `APPS` entry in `apps.data.ts` (amber `#f5a524`, `status: 'live'`, `platform: 'web'`)
- `reportTargets` entry in `app-nav.component.ts`

**Deviations from plan:**

1. **The icon needed a circle crop, not a straight convert.** `.orbit__icon` is a
   110px circle (`border-radius: 50%`) and the TIS source is an app-icon squircle
   with an opaque background and a metallic rim. Dropped in as-is it rendered as
   an octagon — the squircle's corners clipped by the circular mask. Compared four
   treatments side by side in the real slot CSS; an inscribed circle crop was the
   only one that filled the slot like the other planets, and it keeps the full
   "TIS" and all four balls. Compositing onto a dark circle was rejected: the rim
   traces the squircle, so the square outline survived.

2. **Banner viewBox left alone.** Measured content bounds at
   x 35.1–592.9, y 34.4–273.0 of a 628×316 viewBox — symmetric padding, not dead
   space. The 1.99:1 aspect sits mid-range against existing banners (1.55–4.54).

3. **`status: 'live'` despite the TIS README** saying "phase 1 ships the admin
   portal only". That README is stale — `/play` is public and unguarded in
   `app-routing.module.ts`, and the commit log shows a built play surface.

4. **Fixed a stale doc comment** on `AppCard.icon` claiming the landing planets
   use it. They use `logo` (`.planet__mark`, space-journey). `icon` is referenced
   in exactly one place, the `/apps` orbit. The comment now records the
   circle-mask constraint that caused deviation 1.

## Phase 2 — Admin under the site navbar ✅

- `admin.component.html`: bespoke `<header class="admin-header">` → `<app-nav [alwaysScrolled]="true">`
- `admin.component.scss`: deleted `.admin-header*`, `.admin-logo`, `.admin-signout`
  and the header media-query block; `.admin-title` restyled as a page heading;
  `.admin-content` padding now clears the fixed nav via `var(--nav-h)`
- `admin.component.ts`: removed `signOut()` + the now-unused `CognitoService`/`Router`

Verified: one h1, top 81px against a 57px fixed nav; nav owns sign-out.

## Phase 3 — Activity + error logging ✅ (code) / ⏸ (not applied)

### Infra — `xomware-infrastructure`, branch `feature/activity-logging`

- `terraform/waf_associations.tf` — **new**, associates the existing regional WAF
  with the users API stage
- `lambda/events/events-track/index.js` — **new** public ingest
- `terraform/lambdas_events.tf` — **new**, the function
- `terraform/api_users.tf` — `events_endpoints` local + `events` service
- `terraform/lambdas_admin.tf` — added `dynamodb:BatchWriteItem`
- `lambda/admin/admin-events-list/index.js` — optional `eventType` via the
  `by-type` GSI

### Frontend — `xomware-frontend`

- `services/activity.service.ts` — **new**
- `services/global-error-handler.ts` — **new**
- `app.component.ts` — `NavigationEnd` → pageview; delegated outbound listener
- `app.module.ts` — `ErrorHandler` provider
- `services/admin.service.ts` — widened event types
- `components/admin/*` — type filter, adaptive Who/Detail columns, Errors card

**Deviations from plan:**

1. **Two ingest routes, not one.** The plan assumed one public endpoint deriving
   identity from a JWT. With `authorization = "NONE"` API Gateway does not verify
   the token or populate claims, so decoding it in the lambda would let a client
   forge any `userId`. Rather than add JWKS verification, there are now two routes
   onto one handler: `/events/track` (NONE, anonymous) and `/events/track-user`
   (Cognito-verified). Plan-confirmed: `authorization = "NONE"` / `"COGNITO_USER_POOLS"`.

2. **`fetch(keepalive)` instead of `sendBeacon`.** `sendBeacon` cannot set an
   `Authorization` header, which would have made every signed-in outbound click
   record as anonymous. `keepalive` survives unload *and* carries headers.

3. **Delegated outbound listener instead of per-link handlers.** App URLs appear
   in at least four templates; one document-level listener matching against `APPS`
   covers all of them and any future surface.

4. **`loadMoreEvents` had to repeat the filter.** The cursor is a
   `LastEvaluatedKey` from whichever index page 1 used, so omitting `eventType`
   on page 2 would hand a by-type cursor to a by-day query.

---

## Post-review pass

Reviewing the above turned up three defects in my own work.

### 1. First pageview of every session was filed as anonymous — fixed

`CognitoService.userSubject` is a `BehaviorSubject(null)` whose `bootstrap()`
resolves asynchronously. Subscribing to `user$` alone means the first
`NavigationEnd` fires while `signedIn` is still `false`, so every signed-in
visitor's first pageview went to the public endpoint and was recorded as
`anon:`. This is the same "stale null on first paint" problem `isReady$` was
added to solve for route guards.

`AppComponent` now gates on `combineLatest([isReady$, user$])`, and
`ActivityService` buffers events raised before auth settles (capped at 20) and
flushes them once it does.

### 2. The 8KB body cap dropped whole error reports — fixed

Caught by a test. Per-field truncation lives *behind* the body-size check, but
`MAX_EVENTS` (10) at the field limits comes to roughly 41KB, so the 8KB cap
rejected legitimate payloads outright. A deep framework stack lost the entire
error rather than being trimmed — losing exactly the reports worth having.

Cap raised to 64KB, so per-field truncation is what governs. `ActivityService`
now also trims message/stack client-side rather than shipping 40KB for the
backend to cut down.

### 3. `GlobalErrorHandler` did not do what its comment claimed — fixed

It said it deferred to Angular's default handler; it actually just called
`console.error`. Now `extends ErrorHandler` and calls `super.handleError`.

### Refactor

`events-track` validation moved to `validate.js`, leaving `index.js` as
transport. The security-relevant logic — the type whitelist, never trusting a
client `userId`, the size caps — is now testable without the AWS SDK.

## Tests added

| Suite | Count | Command |
|---|---|---|
| `ActivityService` | 16 | `npm test` |
| `events-track` validation | 16 | `node --test lambda/events/events-track/validate.test.js` |

Both were mutation-checked rather than trusted for going green: deleting the
auth buffer failed 2 tests, deleting the error cap failed 1, confirming they
fail on the regressions they exist to catch.

The lambda tests use Node's built-in runner deliberately — the infra repo has
no package.json, and adding a framework for 16 assertions is not worth the
footprint. Documented in that repo's README.

## Scaling note (not a defect)

The `by-type` GSI hashes on `eventType`, so every `pageview` row for all time
shares one partition key. Fine at hobby scale, but it is the first thing that
will hurt if traffic grows — a composite key like `eventType#eventDate` would
spread it. Not worth doing now; worth knowing before it bites.

## Verification

| Check | Result |
|---|---|
| `npm run build:prod` | ✅ clean |
| `npm test` | ✅ 16/16 |
| `node --test` (lambda) | ✅ 16/16 |
| `terraform validate` | ✅ (2 pre-existing warnings in the `web` module) |
| `terraform plan` | ✅ 20 add / 4 change / 1 destroy (the destroy is the API GW deployment replacement) |
| Per-route auth in plan | ✅ `track` = NONE, `track-user` = COGNITO_USER_POOLS |
| Ingest fires end to end | ✅ pageview `/` → `/apps`, outbound "Today In Sports", stable visitorId, no client userId |
| TIS card + planet + orbit | ✅ screenshotted |
| Admin layout + Errors card | ✅ screenshotted with stubbed data |

---

## Shipped

| | |
|---|---|
| Infra | Xomware/xomware-infrastructure#51 → `856207f`, applied ✅ |
| Frontend | Xomware/xomware-frontend#178 → `250b85c`, deployed ✅ |

CI plan against live state matched local: **20 add / 3 change / 1 destroy**, the
destroy being the API Gateway deployment replacement.

### Verified against production, not assumed from the apply

| Check | Result |
|---|---|
| `POST /events/track` anonymous | 204, row written as `anon:<visitorId>` |
| Forged `signin` | **absent from the table** — rejected |
| Spoofed body `userId` | ignored; written as `anon:smoke-spoof` |
| Unknown origin | no CORS echo |
| WAF on stage | `xomware-regional-waf-regional` attached |
| Live site | TIS card + both assets load; 2 pageviews → 204 → rows in DynamoDB with a shared visitorId; no page errors |

Smoke-test rows were deleted afterwards so the admin feed starts clean.

**Gotcha for next time:** the first smoke test returned 403 on *every* route,
which read as "the WAF association just broke the API". It had not — the custom
domain had not finished propagating the new deployment. The execute-api URL
returned 204 while `api.xomware.com` still 403'd, which isolated it. Note that
`"Missing Authentication Token"` is API Gateway's response both for an unmatched
route and for an auth-required one, so it does not distinguish the two.

## Correction: the "Reese's would be destroyed" blocker was not real

An earlier `terraform plan` showed `aws_cognito_user_pool_client.reeses will be
destroyed`, and this log previously recorded that as a live drift between
`master` and applied state, with a warning that #49 had to merge first.

That was wrong. Remote `master` already contained the Reese's client — merged
2026-08-05 as #50 (`84ce75f`). The **local** `master` was stale: `git fetch`
updates `origin/master`, not the local branch, and the plan ran against the
local one.

The rebranch onto `feature/49-cognito-reeses-client` was harmless and the final
plan was clean, but the hazard did not exist. **Pull before planning from a
long-lived branch** — a stale local base makes Terraform propose deletions of
things that are perfectly fine in production.

---

## Phase 4 — Visitors view + the gating question ✅

Added after the fact, from the question "should the landing page be gated so we
can see who is coming?"

### The landing page stayed public — deliberately

Gating it would have worked against the stated goal. The activity log already
identifies every visitor, and `visitorId` upgrades to a real Cognito identity on
sign-in. A login wall means drive-by visitors bounce instead of signing up, so
you would see *fewer* people, not more — trading a record of everyone for a
record of only those motivated enough to make an account for a landing page.

Two further costs: the `''` route is public specifically so Google can verify
the home page renders without login for OAuth (see the comment above it), and
xomware.com is the discovery surface for the whole app suite — gated, it is
invisible to search.

Confirmed against production with a clean browser context: no redirect, space
journey renders, 18 planets, nav shows "Sign in". The pageview rows landing as
`anon:` is independent proof, since the backend only writes that prefix when
there are no verified claims.

### Email confirmation was already built and enforced

Checked rather than assumed:

- `auto_verified_attributes = ["email"]` + `CONFIRM_WITH_CODE` — Cognito emails
  a code on sign-up
- sign-up routes to `/auth/verify`; verify calls `confirmSignUp` and can resend
- `sign-in.component.ts:64` catches `CONFIRM_SIGN_UP` and redirects an
  unconfirmed user to verify, preserving their `next` target

Enforced server-side: Cognito will not issue tokens to an `UNCONFIRMED` user, so
this is not merely a UI convention. **No work needed.**

### Visitors card — Xomware/xomware-frontend#180 → `3749248`

One row per visitor per day: identity, pageviews, click-throughs, errors, dwell
time, and an expandable journey.

Grouped by `visitorId`, **not** `userId` — the reason visitorId persists across
sign-in. Someone who browses anonymously then signs up is one visitor whose
identity resolves partway through, instead of an anonymous row and a signed-in
row nothing connects. A test fails if the grouping key changes.

Walks the pagination cursor across the whole day and reports truncation at the
3,000-event cap rather than presenting a partial day as complete.

### Test setup was structurally broken

The `test` target in `angular.json` had no `stylePreprocessorOptions`, so any
component spec importing `styles/variables` — every component — failed to
compile under karma. That is why the suite held one trivial spec: component
testing was blocked, not neglected. Now matches `build`.

Suite: **27 tests** (16 ActivityService, 11 visitors) plus 16 on the lambda.

## Follow-ups (still open)

- **Cookie/consent decision.** `visitorId` in localStorage with no banner. Framed
  as first-party analytics; flagged, not decided.
- Consider a composite `by-type` key if pageview volume ever grows (above).
- Two pageview rows from the post-deploy verification remain in the table
  (HeadlessChrome user agent, `/` and `/apps`). Genuine requests, left in place
  rather than deleted; trivial to remove if they bother you.
