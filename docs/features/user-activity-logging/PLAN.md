# Plan: Today In Sports + Admin Portal Activity Logging

**Status**: Shipped 2026-08-14 — see EXECUTION_LOG.md
**Created**: 2026-08-14
**Last updated**: 2026-08-14
**Repos**: `xomware-frontend`, `xomware-infrastructure`

---

## Summary

Three pieces of work, ordered by risk. Phases 1–2 are frontend-only and ship in an hour. Phase 3 is the real effort: turn the existing `xomware-events` audit table into a full activity feed covering anonymous visitors, navigation, outbound clicks to apps, and frontend errors — then surface all of it in the admin portal.

Success =
- Today In Sports appears on the landing page and `/apps` with its own logo and amber brand color
- `/admin` renders under the same site navbar as every other page instead of a bespoke header
- The admin portal answers: who visited, who signed in, what pages they hit, which apps they clicked through to, and what errors fired — for signed-in **and** anonymous users

---

## Findings that change the work — read before executing

Five things about the current state that the task framing didn't account for. Each one changes the plan.

### F1. Unsigned-in users already see everything. No change needed.

The original question was whether visitors must sign in before the space journey. They do not.

`app-routing.module.ts:24` — `{ path: '', component: LandingComponent }`, no `canActivate`. The comment above it is explicit: the route is public so Google OAuth verification can confirm the home page renders without login. `<app-nav>` handles `user: null` on its own (`app-nav.component.html:53` renders a "Sign in" link in place of the user menu).

Gated routes are only: `/profile` (`cognitoAuthGuard`), `/command` (`AuthGuard`), `/admin` (`adminGuard`).

**Consequence for Phase 3:** the majority of traffic worth logging is anonymous. An auth-gated ingest endpoint would capture almost none of it. This is why `/events/track` must be unauthenticated, which in turn is why F4 matters.

### F2. The activity infrastructure is ~70% built already.

`xomware-infrastructure/terraform/dynamodb_events.tf` already defines `xomware-events` with exactly the access patterns this needs:

| GSI | Hash | Range |
|---|---|---|
| `by-day` | `eventDate` | `eventTimeId` |
| `by-user` | `userId` | `eventTimeId` |
| `by-type` | `eventType` | `eventTimeId` |

Plus a 90-day TTL, KMS encryption, and PITR. `lambda/auth/auth-track/index.js` already writes `signin` rows off the Cognito PostAuthentication trigger, `lambda/admin/admin-events-list/index.js` already reads the `by-day` GSI, and the admin Events card already renders them.

**Nothing about the table schema needs to change.** The work is one new write path, one filter on the read path, and the UI.

### F3. The shared API module already supports per-endpoint auth — no version bump, no second API.

`api_users.tf:125` sets `authorization = "COGNITO_USER_POOLS"` at module level, which initially looks like it forces every route behind Cognito. It does not. The pinned `api-gateway-service` **v2.6.0** already resolves a per-endpoint override (`locals.tf:36`: `authorization = ep.authorization != null ? ep.authorization : var.authorization`, and `variables.tf:35` declares it `optional(string)`).

So the public ingest route is one endpoint entry with `authorization = "NONE"` in a new `events_endpoints` local. No Lambda Function URL, no second API Gateway, no module upgrade.

### F4. The regional WAF exists but is attached to nothing. This is a live gap.

`waf.tf:17` creates `module "waf_regional"` with `rate_limit = 2000` and publishes its ARN to SSM at `/xomware/shared/regional-waf-acl-arn`. But there is **no `aws_wafv2_web_acl_association` anywhere in the repo** — verified by grep across all of `terraform/*.tf`.

`api.xomware.com` is therefore currently unprotected. The rate limit that exists on paper is not applied to it.

This is already worth fixing. It becomes mandatory the moment an unauthenticated write endpoint goes live, because otherwise anyone can spam rows into the events table at PAY_PER_REQUEST pricing.

**Phase 3 must include the association.** It is not optional and it is not a nice-to-have.

### F5. `userId` is a GSI hash key, so anonymous events need a synthetic one.

DynamoDB omits an item from a GSI entirely if the index's hash key attribute is missing. Anonymous pageviews with no `userId` would silently vanish from `by-user`.

Fix: always write `userId`, using `anon:<visitorId>` for signed-out traffic. A signed-in user's rows use the Cognito `sub`. This also gives a natural way to stitch a session: the same `visitorId` persists across sign-in, so an anonymous session that converts is traceable.

---

## Phase 1 — Add Today In Sports to the fleet

**Repo**: `xomware-frontend`. Small, self-contained, no dependencies on the other phases.

### Assets

Source is the TIS repo, not this one: `~/Code/today-in-sports-frontend/public/brand/`.

| Source | Size | Destination | Why |
|---|---|---|---|
| `logo.svg` | 628×316 | `src/assets/img/banners/today-in-sports.svg` | Stacked lockup + "5 QUESTIONS. EVERY DAY." pill. ~2:1, closest to the 3:2 banner slot. |
| `icon-512.png` | 512×512 | `src/assets/img/apps/today-in-sports.webp` | Scoreboard "TIS" tile. Square, for the landing planets and `/apps` orbitals. |

- `wordmark.svg` (639×91) is rejected — 7:1 is far too wide for the banner slot and would render as a hairline.
- Convert the icon with `cwebp` (confirmed installed) to match the `.webp` convention in `apps/`. SVG in `banners/` is acceptable precedent — `xomcron` already uses `.svg` for both slots.
- **Verify the banner viewBox.** `logo.svg` is `viewBox="0 0 628 316"` but the mark may not fill it; if the rendered card shows the logo sitting small with dead space below, tighten the viewBox rather than adding CSS hacks.
- Both marks render "TODAY IN" in `#eef2f7` (near-white), which is correct against the dark site and would be invisible on a light background. No light-theme surface exists here, so this is fine — but do not reuse these assets on a light surface later.

### Data

New entry in `src/app/data/apps.data.ts`:

```ts
{
  name: 'Today In Sports',
  description: '<one line, ~90 chars, matching the voice of the existing entries>',
  color: '#f5a524',
  colorRgb: '245, 165, 36',
  url: 'https://todayinsports.app',
  logo: 'assets/img/banners/today-in-sports.svg',
  icon: 'assets/img/apps/today-in-sports.webp',
  logoStyle: 'banner',
  tag: 'Web App',
  status: 'live',
  platform: 'web',
}
```

`#f5a524` is the TIS primary (394 uses of `#eef2f7`, 90 of `#f5a524`, 1 of `#d6212f` in `logo.svg`; `styles.scss:42` names it `--amber`). Note it sits near XomCloud's `#ff6b35` on the same grid — check the two cards side by side and shift if they read as the same color.

Placement: after Xom Forms, with the other `platform: 'web'` entries. Both the landing grid and `/apps` read from `APPS`, so both pick it up automatically.

### Also

- Add `{ label: 'Today In Sports', repo: 'Xomware/today-in-sports-frontend' }` to `reportTargets` in `app-nav.component.ts:96`.

---

## Phase 2 — Admin portal uses the site header

**Repo**: `xomware-frontend`. Small.

`admin.component.html:2-12` hand-rolls a header — a logo link, an "Admin" title, and a sign-out button — instead of using the shared navbar. Replace it.

- Swap the `<header class="admin-header">` block for `<app-nav [alwaysScrolled]="true">`. `alwaysScrolled` is the documented input for pages with no tall hero (`app-nav.component.ts:31`), which is exactly this page.
- `AppNavComponent` is already declared in `app.module.ts:63` and `AdminComponent` is in the same module, so no import wiring is needed.
- Delete the now-dead SCSS: `.admin-header`, `.admin-header-left`, `.admin-logo`, `.admin-title`, `.admin-signout` (`admin.component.scss:15-67`) and the `.admin-header` block in the media query at `:459`.
- Delete `signOut()` from `admin.component.ts` — the nav owns sign-out. Drop the now-unused `CognitoService` and `Router` constructor params if nothing else uses them.
- Adjust `.admin-content` top padding to clear the fixed navbar; check against how `/apps` or `/music` handle it rather than inventing a value.
- Keep an `<h1>Admin</h1>` somewhere in `<main>` for the document outline — removing the header must not leave the page with no h1.

---

## Phase 3 — Activity and error logging

**Repos**: `xomware-infrastructure` (write path, read filter, WAF) + `xomware-frontend` (capture, admin UI).

### 3a. Event schema

Extend the existing table with three new `eventType` values. No schema migration — DynamoDB is schemaless past the keys, and all three GSI key attributes are already present on every row.

| Type | Written when | Answers |
|---|---|---|
| `pageview` | Router `NavigationEnd` | who is coming, where they go on the site |
| `outbound` | App card click | which apps people actually leave for |
| `error` | Global `ErrorHandler` | what's breaking, on which route, for whom |

Item shape, additive to what `auth-track` already writes:

```
eventId      uuid            (table PK)
eventType    string          (by-type hash)
eventTime    ISO-8601
eventDate    YYYY-MM-DD      (by-day hash)
eventTimeId  `${eventTime}#${eventId}`   (all three GSI ranges)
userId       cognito sub | `anon:${visitorId}`   (by-user hash — see F5)
visitorId    stable anonymous uuid
path         '/apps'
referrer     document.referrer, first hit only
target       outbound URL          (outbound only)
app          app name              (outbound only)
message      truncated             (error only)
stack        truncated to ~2KB     (error only)
userAgent
country      from the CloudFront/API Gateway header
ttl          now + 90d
```

### 3b. Ingest lambda — `POST /events/track`

New `xomware-infrastructure/lambda/events/events-track/index.js`, mirroring the style of `admin-events-list` (Node, `@aws-sdk/lib-dynamodb`, `removeUndefinedValues: true`).

Terraform: new `events_endpoints` local in `api_users.tf`, added to `module.users_api.services` under path prefix `events`, with **`authorization = "NONE"`** on the endpoint per F3. Reuse the archive/function pattern in `lambdas_admin.tf`.

Hardening — all of this is required, not optional:

- **Validate hard.** Whitelist `eventType` to the three public values. Reject anything with `signin`/`signup` in it — those come from the Cognito trigger and must not be forgeable from the browser.
- **Never trust client `userId`.** Derive it from the JWT when the `Authorization` header is present and valid; otherwise force `anon:<visitorId>`. A client-supplied `userId` field is ignored outright.
- **Cap sizes.** Truncate `stack` to ~2KB, `message` to ~500 chars, reject bodies over ~8KB.
- **Cap per request.** Accept at most 10 events in a batch.
- **Always return 200/204.** A tracking endpoint must never surface an error to the page. Log and swallow, same posture as `auth-track`.
- **Restrict CORS** to `local.users_allow_origins` rather than the `*` that `admin-events-list` uses.

### 3c. WAF association — see F4

Add `aws_wafv2_web_acl_association` binding `module.waf_regional.web_acl_arn` to the `users_api` stage ARN. This closes an existing gap on every route on `api.xomware.com`, not just the new one.

Consider a tighter rate-based rule scoped to `/events/*` — the global 2000/5min is generous for an endpoint that should see a handful of events per visitor.

### 3d. Read path — filter by type

Extend `admin-events-list/index.js` with an optional `eventType`:

- Absent → current behavior, query `by-day`
- Present → query the **`by-type`** GSI with `eventType = :t AND begins_with(eventTimeId, :date)`

`eventTimeId` is `${ISO}#${uuid}` and ISO-8601 sorts lexicographically, so `begins_with` on a `YYYY-MM-DD` prefix is an exact single-day range scan. This is a real indexed query, not a `FilterExpression` — which matters once pageviews outnumber sign-ins by orders of magnitude.

Mirror the new param in `admin.service.ts` (`EventsListRequest`) and widen `AdminEventType` to the full union.

### 3e. Frontend capture

New `src/app/services/activity.service.ts`:

- `visitorId` — uuid in `localStorage`, generated once, survives sign-in so anonymous→signed-in sessions stitch
- `track(type, payload)` — fire-and-forget POST, `navigator.sendBeacon` when available (survives page unload, which plain `fetch` does not), falling back to `HttpClient`
- **Swallows every failure.** Analytics must never break the page or surface an error toast.
- **Self-throttle**: dedupe identical consecutive pageviews, and cap `error` events at ~10 per session. Without the cap, an error inside a render loop writes unbounded rows to a PAY_PER_REQUEST table — the failure mode is a surprise AWS bill, not a crash.

Wiring:

- `AppComponent` subscribes to Router `NavigationEnd` → `pageview`. It already subscribes to `cognito.user$` (`app.component.ts:20`), so the userId handoff has a home.
- New `GlobalErrorHandler implements ErrorHandler`, provided in `app.module.ts` → `error`. Must call through to the default handler so console logging still works in dev.
- App card click handler → `outbound`. `apps.data.ts` is the single source for both surfaces, so the handler goes on the shared card component.
- **Do not touch `AnalyticsService`.** GA4 stays a no-op (`ga4MeasurementId` is `''` in `environment.ts`); this pipeline replaces it rather than running alongside it. Decided: custom `/events/track`, not GA4.

### 3f. Admin UI

- **Events card**: add an event-type filter (All / Sign-ins / Sign-ups / Pageviews / Outbound). Reuse the existing `dateForm` and pagination.
- **New Errors card**: `eventType: 'error'`, showing time, message, route, and user. Collapsed stack on click.
- Both follow the established card pattern in `admin.component.html` — `.card`, `.card-header`, error banner, loading state, empty state, `Load more` footer. All five interactive states per `.claude/rules/frontend.md`.

---

## Risks

| Risk | Mitigation |
|---|---|
| Public write endpoint gets spammed → runaway DynamoDB cost | WAF association (3c) + validation/size caps (3b) + client throttle (3e) |
| Error loop floods the table | Per-session error cap (3e) |
| Pageview volume swamps sign-in rows in the `by-day` view | Type filter via `by-type` GSI (3d), not a client-side filter |
| Client forges `signin` events | eventType whitelist rejects them (3b) |
| 90-day TTL × pageview volume raises storage cost | `events_retention_days` is already a variable; lower it if volume warrants |
| Tracking sends PII to a table not designed for it | Log `path`, never query strings or form contents. Review before shipping. |
| GDPR/consent | No cookie banner exists today. `visitorId` in localStorage is first-party analytics, but flag it — out of scope for this plan, worth a decision. |

---

## Test plan

- `npm test` after each phase
- Phase 1: landing grid and `/apps` both render the new card; banner is not squashed; icon renders round in the planet/orbital slot; color is distinguishable from XomCloud
- Phase 2: `/admin` navbar matches the rest of the site; sign-out works from the nav; page has exactly one h1; no content hidden under the fixed nav
- Phase 3: `terraform plan` reviewed before apply; `/events/track` verified unauthenticated from an incognito window; forged `signin` rejected; oversized body rejected; admin cards render real rows end to end
- Visual regression build uses `staticScene: true` (`environment.ts`) — confirm the new card doesn't break the 150px diff tolerance

---

## Out of scope

- Cookie consent banner / GDPR flow
- Backfilling historical activity — the table starts from deploy
- Retention tuning beyond leaving `events_retention_days` as-is
- Applying the WAF association to any API other than `users_api`
- GA4 — explicitly rejected in favor of the custom pipeline

---

## Sequencing

1. Phase 1 (frontend, independent)
2. Phase 2 (frontend, independent)
3. Phase 3c — WAF association first. It closes a live gap and must precede the public endpoint.
4. Phase 3a/3b — ingest lambda + Terraform, `plan` reviewed before `apply`
5. Phase 3e — frontend capture, verified against the deployed endpoint
6. Phase 3d/3f — read filter + admin UI, once real rows exist to render

Phases 1–2 can merge to `master` (auto-deploys) without waiting on Phase 3.
