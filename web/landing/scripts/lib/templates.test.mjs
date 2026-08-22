import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SRC } from './config.mjs';

// The landing site only ever deploys to prod (deploy-landing.yml), so a *.dev.strido.net
// link in a template would ship a dev URL to visitors.
test('templates link to prod hosts only', () => {
  const dir = join(SRC, 'templates');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(join(dir, file), 'utf8');
    assert.equal(/\bdev\.strido\.net/.test(html), false, );
  }
});
