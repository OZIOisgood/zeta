import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_LOCALE } from './config.mjs';

const TRANSLATABLE_ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
const SKIP_TAGS = new Set(['script', 'style']);

export function loadDictionary(locale, i18nDir) {
  if (locale === DEFAULT_LOCALE) return {};
  const landing = JSON.parse(readFileSync(join(i18nDir, `landing.${locale}.json`), 'utf8'));
  const legal = JSON.parse(readFileSync(join(i18nDir, `legal.${locale}.json`), 'utf8'));
  return { ...landing, ...legal };
}

export function translateDom($, dict) {
  const has = (k) => Object.prototype.hasOwnProperty.call(dict, k);

  $('*').contents().each((_, node) => {
    if (node.type !== 'text') return;
    const parent = node.parent && node.parent.name;
    if (parent && SKIP_TAGS.has(parent)) return;
    const raw = node.data;
    const key = raw.trim();
    if (!key || !has(key)) return;
    node.data = raw.replace(key, () => dict[key]);
  });

  $(TRANSLATABLE_ATTRS.map((a) => `[${a}]`).join(',')).each((_, el) => {
    for (const attr of TRANSLATABLE_ATTRS) {
      const val = $(el).attr(attr);
      if (val && has(val.trim())) $(el).attr(attr, dict[val.trim()]);
    }
  });
}
