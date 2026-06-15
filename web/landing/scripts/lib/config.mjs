import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, '..', '..');        // web/landing
export const SRC = join(ROOT, 'src');
export const DIST = join(ROOT, 'dist');
export const LEGAL_DIR = join(ROOT, 'content', 'legal');
export const HANDOFF = resolve(ROOT, '..', '..', 'docs', 'design_handoff_landing_v2');

export const DEFAULT_LOCALE = 'de';
export const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://strido.net';
export const LEGAL_SLUGS = ['imprint', 'privacy', 'contact', 'terms'];

export const LOCALES = [
  { code: 'de', label: 'Deutsch',    short: 'DE', dir: '',   flag: 'de' },
  { code: 'en', label: 'English',    short: 'EN', dir: 'en', flag: 'gb' },
  { code: 'fr', label: 'Français',   short: 'FR', dir: 'fr', flag: 'fr' },
  { code: 'nl', label: 'Nederlands', short: 'NL', dir: 'nl', flag: 'nl' },
  { code: 'es', label: 'Español',    short: 'ES', dir: 'es', flag: 'es' },
];
