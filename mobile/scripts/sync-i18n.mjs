// Copies the dashboard's Transloco JSON files into the app. The dashboard
// owns the translations; run `pnpm run sync:i18n` after changing them.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, '..', '..', 'web', 'dashboard-next', 'public', 'i18n');
const target = join(here, '..', 'src', 'i18n', 'locales');

mkdirSync(target, { recursive: true });
for (const lang of ['en', 'de', 'fr']) {
  copyFileSync(join(source, `${lang}.json`), join(target, `${lang}.json`));
  console.log(`synced ${lang}.json`);
}
