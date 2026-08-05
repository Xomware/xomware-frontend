#!/usr/bin/env node
/**
 * Push the canonical design tokens out to the other Xomware frontends.
 *
 * Deliberately a sync script and not an npm package. Publishing would add a
 * version bump to every consumer for values that are still settling, and there
 * are only eight repos, all siblings on disk. Once the values stop moving this
 * becomes @xomware/design-tokens and this script goes away.
 *
 * Usage:
 *   node scripts/sync-tokens.mjs            # report drift, change nothing
 *   node scripts/sync-tokens.mjs --write    # copy tokens into every consumer
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const CODE = resolve(REPO, '..');
const SOURCE = join(REPO, 'src/styles/_tokens.scss');

/** Consumer repo -> path the tokens file should land at, relative to the repo. */
const CONSUMERS = {
  'xomify-frontend': 'src/styles/_tokens.scss',
  'xomper-front-end': 'src/styles/_tokens.scss',
  'xomcloud-frontend': 'src/app/styles/_tokens.scss',
  'xomtracks-frontend': 'src/styles/_tokens.scss',
  'xomforms-frontend': 'src/styles/_tokens.scss',
  'xomcron-frontend': 'src/styles/_tokens.scss',
  'vest-site': 'src/styles/_tokens.scss',
};

const write = process.argv.includes('--write');
const source = readFileSync(SOURCE, 'utf8');
const hash = createHash('sha256').update(source).digest('hex').slice(0, 12);

// The hash line lets a consumer's CI detect a hand-edit without needing network
// access or knowledge of this repo.
const stamped = source.replace(
  '// Sync with:        node scripts/sync-tokens.mjs   (from xomware-frontend)',
  `// Sync with:        node scripts/sync-tokens.mjs   (from xomware-frontend)\n// Source hash:      ${hash}`,
);

let drifted = 0;
let missing = 0;

for (const [repo, rel] of Object.entries(CONSUMERS)) {
  const repoDir = join(CODE, repo);
  if (!existsSync(repoDir)) {
    console.log(`  SKIP    ${repo} — not checked out`);
    continue;
  }

  const dest = join(repoDir, rel);
  const current = existsSync(dest) ? readFileSync(dest, 'utf8') : null;

  if (current === stamped) {
    console.log(`  ok      ${repo}`);
    continue;
  }

  if (current === null) {
    missing += 1;
    console.log(`  MISSING ${repo}  ${write ? '-> writing' : '(run with --write)'}`);
  } else {
    drifted += 1;
    console.log(`  DRIFT   ${repo}  ${write ? '-> overwriting' : '(run with --write)'}`);
  }

  if (write) {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, stamped);
  }
}

console.log(`\nsource hash ${hash}  •  ${drifted} drifted, ${missing} missing`);

if (!write && (drifted || missing)) {
  console.log('Nothing was changed. Re-run with --write to apply.');
  process.exit(1);
}
