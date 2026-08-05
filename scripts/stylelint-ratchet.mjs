#!/usr/bin/env node
/**
 * Design-token ratchet.
 *
 * The codebase has pre-existing font-size / letter-spacing / font-weight
 * values that bypass the scales in src/styles/_variables.scss. Failing CI on
 * all of them would block every PR, and an ignoreFiles list would let those
 * same files keep drifting.
 *
 * So: count violations, compare against a committed baseline.
 *   - more than baseline -> fail. You added drift.
 *   - fewer than baseline -> pass, and print the new number to commit.
 *
 * The baseline only ever goes down. When it reaches 0, delete this script
 * and let stylelint fail directly.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const BASELINE_FILE = new URL('../.stylelint-baseline', import.meta.url);
const shouldUpdate = process.argv.includes('--update');

if (!existsSync(BASELINE_FILE) && !shouldUpdate) {
  console.error('No .stylelint-baseline found. Run: npm run lint:css:baseline');
  process.exit(1);
}

let raw = '';
try {
  raw = execFileSync(
    'npx',
    ['stylelint', 'src/**/*.scss', '--formatter', 'string'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
} catch (err) {
  // stylelint exits non-zero when it finds problems; that is the normal path
  // here. Only a missing/!crashed binary should abort.
  if (err.stdout === undefined) {
    console.error('stylelint failed to run:', err.message);
    process.exit(1);
  }
  raw = err.stdout + (err.stderr ?? '');
}

// Count only "line:col ✖ ..." rows. A bare /✖/ match would also catch the
// trailing "✖ N problems" summary line and inflate the number by one.
const count = (raw.match(/^\s*\d+:\d+\s+✖/gm) ?? []).length;

if (shouldUpdate) {
  writeFileSync(BASELINE_FILE, `${count}\n`);
  console.log(`Baseline written: ${count}`);
  process.exit(0);
}

const baseline = Number.parseInt(readFileSync(BASELINE_FILE, 'utf8').trim(), 10);

if (Number.isNaN(baseline)) {
  console.error('.stylelint-baseline is not a number');
  process.exit(1);
}

if (count > baseline) {
  console.error(raw);
  console.error(
    `\n✖ Token violations went UP: ${baseline} -> ${count} (+${count - baseline}).\n` +
      `  Use the scales in src/styles/_variables.scss ($text-*, $tracking-*, $font-weight-*).`,
  );
  process.exit(1);
}

if (count < baseline) {
  console.log(
    `✔ Violations went down: ${baseline} -> ${count}.\n` +
      `  Commit the new baseline: npm run lint:css:baseline`,
  );
  process.exit(0);
}

console.log(`✔ Token violations held at baseline (${count}).`);
