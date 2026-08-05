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
      // Anti-aliasing differs slightly between machines and Chromium builds.
      // Small enough to still catch a font-size change; large enough not to
      // fail on subpixel noise.
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
      caret: 'hide',
    },
  },

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
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
    // Serves whatever is in dist/. Build with `npm run build:visual` first —
    // that config forces musicSurfaces to 'mock' so the music components render
    // real content instead of an empty shell.
    //
    // -s = SPA fallback, so deep routes like /apps resolve to index.html
    // instead of 404ing.
    command: `npx serve -s dist/xomware -l ${PORT} --no-clipboard`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
