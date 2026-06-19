import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_LOCALE } from './config.mjs';

const TRANSLATABLE_ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
const SKIP_TAGS = new Set(['script', 'style']);

// Normalize curly/smart quotes to straight quotes so template text and dictionary
// keys match even when they differ only in their quote characters.
const DOUBLE_QUOTES = /[„“”«»]/g;
const SINGLE_QUOTES = /[‚‘’‹›]/g;
const normKey = (s) => s.replace(DOUBLE_QUOTES, '"').replace(SINGLE_QUOTES, "'");

export function loadDictionary(locale, i18nDir) {
  if (locale === DEFAULT_LOCALE) return {};
  const landing = JSON.parse(readFileSync(join(i18nDir, `landing.${locale}.json`), 'utf8'));
  const legal = JSON.parse(readFileSync(join(i18nDir, `legal.${locale}.json`), 'utf8'));
  return { ...landing, ...legal };
}

export function translateDom($, dict) {
  const norm = Object.create(null);
  for (const k of Object.keys(dict)) norm[normKey(k)] = dict[k];
  const lookup = (raw) => {
    const t = (raw || '').trim();
    if (!t) return undefined;
    if (Object.prototype.hasOwnProperty.call(dict, t)) return dict[t];
    const n = normKey(t);
    return Object.prototype.hasOwnProperty.call(norm, n) ? norm[n] : undefined;
  };

  $('*').contents().each((_, node) => {
    if (node.type !== 'text') return;
    const parent = node.parent && node.parent.name;
    if (parent && SKIP_TAGS.has(parent)) return;
    const key = node.data.trim();
    const val = lookup(node.data);
    if (!key || val === undefined) return;
    node.data = node.data.replace(key, () => val);
  });

  $(TRANSLATABLE_ATTRS.map((a) => `[${a}]`).join(',')).each((_, el) => {
    for (const attr of TRANSLATABLE_ATTRS) {
      const v = $(el).attr(attr);
      const val = lookup(v);
      if (v && val !== undefined) $(el).attr(attr, val);
    }
  });
}
