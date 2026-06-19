// Extracts the German-source-keyed dictionaries from the handoff JS files
// (landing-v2-i18n.js, pages/legal-i18n.js) into per-locale JSON.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SRC, HANDOFF } from './lib/config.mjs';

// Find `var DICT = { ... }` and eval the object literal. Whole-line `//` comments
// are stripped first so they can't interfere with brace/string scanning or eval.
function extractDict(jsText) {
  const clean = jsText.replace(/^\s*\/\/.*$/gm, '');
  const start = clean.indexOf('var DICT');
  if (start < 0) throw new Error('var DICT not found');
  const brace = clean.indexOf('{', start);
  let depth = 0, i = brace, inStr = false, q = '';
  for (; i < clean.length; i++) {
    const c = clean[i];
    if (inStr) { if (c === '\\') { i++; continue; } if (c === q) inStr = false; continue; }
    if (c === '"' || c === "'") { inStr = true; q = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  const obj = clean.slice(brace, i);
  return Function('return (' + obj + ')')();
}

const outDir = join(SRC, 'i18n');
mkdirSync(outDir, { recursive: true });

const landing = extractDict(readFileSync(join(HANDOFF, 'landing-v2-i18n.js'), 'utf8'));
const legal = extractDict(readFileSync(join(HANDOFF, 'pages', 'legal-i18n.js'), 'utf8'));

for (const lang of ['en', 'fr', 'nl']) {
  writeFileSync(join(outDir, `landing.${lang}.json`), JSON.stringify(landing[lang] || {}, null, 2) + '\n');
  writeFileSync(join(outDir, `legal.${lang}.json`), JSON.stringify(legal[lang] || {}, null, 2) + '\n');
}
// German is identity (no translation needed)
writeFileSync(join(outDir, 'landing.de.json'), '{}\n');
writeFileSync(join(outDir, 'legal.de.json'), '{}\n');

console.log('landing en/fr/nl key counts:',
  Object.keys(landing.en || {}).length, Object.keys(landing.fr || {}).length, Object.keys(landing.nl || {}).length);
console.log('legal en/fr/nl key counts:',
  Object.keys(legal.en || {}).length, Object.keys(legal.fr || {}).length, Object.keys(legal.nl || {}).length);
