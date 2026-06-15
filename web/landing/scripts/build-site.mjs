import { mkdirSync, writeFileSync, readFileSync, cpSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import MarkdownIt from 'markdown-it';
import { LOCALES, LEGAL_SLUGS, SRC, DIST, LEGAL_DIR } from './lib/config.mjs';
import { loadDictionary } from './lib/i18n.mjs';
import { buildLandingPage, buildLegalPage } from './lib/pages.mjs';
import { buildSitemap, buildRobots } from './lib/seo.mjs';
import { loadValues, applyValues, findPlaceholders } from './lib/values.mjs';

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
const i18nDir = join(SRC, 'i18n');

function write(rel, content) {
  const out = join(DIST, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, content, 'utf8');
}

function extractH1(mdText) {
  const m = mdText.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : 'Strido';
}
function stripFirstH1(mdText) {
  return mdText.replace(/^#\s+.+$/m, '').trimStart();
}
function descriptionFrom(mdText, fallback) {
  const line = mdText.split('\n').map((l) => l.trim())
    .find((l) => l && !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('|') && !l.startsWith('-') && !l.startsWith('*'));
  return (line || fallback).replace(/[*_`]/g, '').slice(0, 180);
}

rmSync(DIST, { recursive: true, force: true });

const landingTpl = readFileSync(join(SRC, 'templates', 'landing.html'), 'utf8');
const legalShell = readFileSync(join(SRC, 'templates', 'legal-shell.html'), 'utf8');
const legalValues = loadValues(join(LEGAL_DIR, 'values.json'));
const unfilledPlaceholders = new Set();

for (const l of LOCALES) {
  const dict = loadDictionary(l.code, i18nDir);
  const meta = JSON.parse(readFileSync(join(i18nDir, `meta.${l.code}.json`), 'utf8'));

  write(join(l.dir, 'index.html'), buildLandingPage({ templateHtml: landingTpl, dict, locale: l.code, meta }));

  for (const slug of LEGAL_SLUGS) {
    const mdText = applyValues(readFileSync(join(LEGAL_DIR, l.code, `${slug}.md`), 'utf8'), legalValues);
    findPlaceholders(mdText).forEach((p) => unfilledPlaceholders.add(p));
    const h1 = extractH1(mdText);
    const contentHtml = md.render(stripFirstH1(mdText));
    const description = descriptionFrom(stripFirstH1(mdText), `${h1} — Strido`);
    write(join(l.dir, `${slug}.html`), buildLegalPage({ shellHtml: legalShell, contentHtml, h1, locale: l.code, slug, description, dict, email: legalValues.EMAIL }));
  }
}

if (unfilledPlaceholders.size) {
  const msg = `Unfilled legal placeholders: ${[...unfilledPlaceholders].sort().join(', ')}`;
  if (process.env.STRICT_PLACEHOLDERS === '1') throw new Error(`${msg} (STRICT_PLACEHOLDERS=1)`);
  console.warn(`WARN: ${msg}\n      Fill web/landing/content/legal/values.json; build with STRICT_PLACEHOLDERS=1 to enforce.`);
}

cpSync(join(SRC, 'assets'), join(DIST, 'assets'), { recursive: true });
cpSync(join(SRC, 'styles'), join(DIST, 'assets', 'styles'), { recursive: true });

write('sitemap.xml', buildSitemap());
write('robots.txt', buildRobots());

console.log(`Built ${LOCALES.length} locales x (1 landing + ${LEGAL_SLUGS.length} legal) into ${DIST}`);
