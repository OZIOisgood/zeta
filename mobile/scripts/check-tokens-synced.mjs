// Runs the token generator and fails if the committed generated files differ
// from freshly generated output (i.e. a hand-edit that bypassed sync:tokens).
import { execSync } from 'node:child_process';

execSync('node scripts/sync-tokens.mjs', { stdio: 'inherit' });
const watched = 'global.css src/theme/colors.ts src/theme/roles.ts';
const dirty = execSync(`git status --porcelain ${watched}`).toString().trim();
if (dirty) {
  console.error('Design tokens out of sync — run `pnpm run sync:tokens` and commit:\n' + dirty);
  process.exit(1);
}
console.log('tokens in sync');
