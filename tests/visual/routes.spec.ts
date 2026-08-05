import { test, expect, type Page } from '@playwright/test';

/**
 * Baseline screenshots of every publicly reachable route.
 *
 * Purpose: catch layout reflow when font sizes move onto the $text-* scale.
 * A diff here means type or spacing changed size, which is exactly the failure
 * mode the token migration risks.
 *
 * Coverage limit, stated plainly: /command, /admin and /profile sit behind auth
 * guards and are NOT covered. The infra dashboard is the single densest set of
 * small type in the codebase (43 token violations) and it is invisible to these
 * tests. Migrating those surfaces still needs manual review.
 */
const ROUTES = [
  { path: '/', name: 'landing-anon-gate' },
  { path: '/apps', name: 'apps' },
  // Requires the `visual` build config, which forces musicSurfaces to 'mock'.
  // Against a normal build these render an empty shell and cover nothing.
  { path: '/music', name: 'music' },
  { path: '/music?tab=radar', name: 'music-release-radar' },
  { path: '/music?tab=wrapped', name: 'music-wrapped' },
  // Tab names must match VALID_TABS in music.component.ts exactly — an unknown
  // value silently falls back to 'now', which would duplicate the screenshot
  // above and look like coverage without being any.
  { path: '/music?tab=xomtracks', name: 'music-xomtracks' },
  { path: '/privacy', name: 'privacy' },
  { path: '/auth/sign-in', name: 'auth-sign-in' },
  { path: '/auth/sign-up', name: 'auth-sign-up' },
  { path: '/auth/forgot-password', name: 'auth-forgot-password' },
  { path: '/command/login', name: 'command-login' },
];

/**
 * Backend calls are stubbed rather than allowed through. A real API would make
 * these screenshots depend on live data — new tracks, changed stats — and every
 * such change would read as a visual regression. Stubbing keeps a diff meaning
 * "the CSS changed".
 */
async function stubBackend(page: Page): Promise<void> {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const isLocal = url.startsWith('http://127.0.0.1:') || url.startsWith('http://localhost:');
    const isFont = url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com');

    // Local assets and the Inter webfont must load — the font in particular,
    // since these tests exist to detect type metric changes.
    if (isLocal || isFont) {
      await route.continue();
      return;
    }

    // Everything else (API Gateway, GitHub avatars, Spotify art) gets an empty
    // 200 so components render their empty state deterministically.
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

/**
 * GSAP and ScrollTrigger drive entrance animations from JS, so Playwright's
 * `animations: 'disabled'` (which only freezes CSS animations) is not enough.
 * Forcing reduced-motion plus settling the timeline avoids mid-fade captures.
 */
async function settle(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  // GSAP entrance animations on the landing hero run ~0.7s with staggered
  // delays up to 0.25s.
  await page.waitForTimeout(1200);
}

for (const route of ROUTES) {
  test(`${route.name} renders consistently`, async ({ page }) => {
    await stubBackend(page);
    await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    await settle(page);

    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      fullPage: true,
    });
  });
}

/**
 * Hover state of an app card.
 *
 * The resting screenshots above cover none of this: every per-app colour cue —
 * the glow, the logo drop-shadow, the accent-coloured title and arrow — fires
 * only on :hover. Card hover is the primary interaction on the site and was
 * completely unverified, which is how a change to the hover treatment could
 * ship without a single screenshot moving.
 *
 * Desktop only: the hover block is gated behind `@media (hover: hover)`, so on
 * a touch viewport there is deliberately nothing to capture.
 */
test('app card hover state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'hover is pointer-only by design');

  await stubBackend(page);
  await page.goto('/apps', { waitUntil: 'domcontentloaded' });
  await settle(page);

  const card = page.locator('.app-card').first();
  await card.hover();
  // Let the glow/transform transitions finish ($transition-slow is 500ms).
  await page.waitForTimeout(700);

  // Capture a padded region around the card, NOT the element itself.
  // An element screenshot clips to the border box, and box-shadow renders
  // outside it — so `expect(card).toHaveScreenshot()` silently excludes the
  // entire glow this test exists to watch.
  const box = await card.boundingBox();
  if (!box) throw new Error('app card has no bounding box');
  const PAD = 60;

  await expect(page).toHaveScreenshot('app-card-hover.png', {
    clip: {
      x: Math.max(0, box.x - PAD),
      y: Math.max(0, box.y - PAD),
      width: box.width + PAD * 2,
      height: box.height + PAD * 2,
    },
  });
});
