import { TIERS } from '../components/ui/tiers';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const UI_DIR = path.join(__dirname, '..', 'components', 'ui');

test('every ui primitive is tier-classified', () => {
  const files = readdirSync(UI_DIR)
    .filter((f) => f.endsWith('.tsx') && !/\.(test|stories|shared|ios|android)\.tsx$/.test(f))
    .map((f) => f.replace(/\.tsx$/, ''));
  const missing = files.filter((name) => !(name in TIERS));
  expect(missing).toEqual([]);
});

test('no TIERS entry references a non-existent primitive', () => {
  const files = new Set(
    readdirSync(UI_DIR)
      .filter((f) => f.endsWith('.tsx') && !/\.(test|stories|shared|ios|android)\.tsx$/.test(f))
      .map((f) => f.replace(/\.tsx$/, '')),
  );
  const stale = Object.keys(TIERS).filter((name) => !files.has(name));
  expect(stale).toEqual([]);
});
