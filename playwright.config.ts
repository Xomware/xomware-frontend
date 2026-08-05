import { defineConfig, devices } from '@playwright/test';

/**
 * Visual regression config.
 *
 * Exists to make the font-size migration safe: ~190 hand-typed sizes still need
 * to move onto the $text-* scale, and reflow is the failure mode. Screenshots
 * are the only check that actually catches it.
 *
 * Runs against the production build, not `ng serve` — dev-mode CSS and bundling
 * differ enough that a dev baseline would not prove anything about what ships.
 */
const PORT = 4300;

export default defineConfig({
  testDir: './tests/visual',
  // Screenshots are compared against committed baselines; running the same spec
  // twice concurrently against one server adds flake for no gain.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  expect: {
    toHaveScreenshot: {
      // ABSOLUTE pixel count, not a ratio.
      //
      // maxDiffPixelRatio: 0.01 was here originally and it was far too coarse:
      // 1% of a tall full-page screenshot is ~25,000 pixels, so a heading
      // losing its gradient, or a card glow being removed, passed silently.
      // The suite caught reflow (which shifts everything) but was blind to
      // local colour changes — exactly the kind of edit visual polish is made of.
      //
      // Two consecutive runs on the same machine produce byte-identical
      // renders, so the real noise floor is 0. 150 leaves room for
      // anti-aliasing drift across Chromium updates without hiding a change
      // to a single heading or badge.
      maxDiffPixels: 150,
      animations: 'disabled',
      caret: 'hide',
    },
  },

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    // Set at the context level so it applies BEFORE the first navigation.
    // Setting it inside the test (via page.emulateMedia) left a window where
    // the music ticker's infinite marquee had already started, so it could be
    // captured at slightly different offsets between runs — an intermittent
    // one-test failure that was hard to pin down.
    reducedMotion: 'reduce',
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'mobile',
      // Real mobile width matters here: the app has zero hover-capability
      // queries outside the app-card grid, and narrow layouts are where
      // font-size reflow shows up first.
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],

  webServer: {
    // Builds before serving, deliberately.
    //
    // dist/ is shared with `npm run build:prod`, so running a production build
    // (e.g. before a commit) silently leaves the wrong bundle in place — one
    // where musicSurfaces is 'live' and every music surface hangs on a stubbed
    // API, stuck rendering skeletons. That presented as flaky screenshots and
    // cost real time to track down. Building here makes the suite own its own
    // input instead of trusting whatever was left in dist/.
    //
    // -s = SPA fallback, so deep routes like /apps resolve to index.html
    // instead of 404ing.
    command: `npm run build:visual && npx serve -s dist/xomware -l ${PORT} --no-clipboard`,
    url: `http://127.0.0.1:${PORT}`,
    // Must not reuse: a server left over from a previous run is serving the
    // previous build, which defeats the build step above.
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
