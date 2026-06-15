# Strido Landingpage v2 — Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `web/landing` from v1 to the v2 handoff — restyled landing (ruhig background, hero float, header language switcher) plus a build-time per-locale static generator producing DE/EN/FR/NL/ES landing + 4 legal pages each (25 pages) with hreflang/canonical/sitemap.

**Architecture:** A small Node generator (`cheerio` for text i18n via the handoff's German-source dictionary, `markdown-it` for legal pages) renders German source templates into a per-locale `dist/` tree. A multi-stage Dockerfile runs the generator at image build; `deploy-landing.yml` stays unchanged. The legal markdown lives in-context at `web/landing/content/legal/`.

**Tech Stack:** Node 20 (ESM), `cheerio`, `markdown-it`, `node:test` (built-in), nginx (alpine), Docker multi-stage.

**Reference source (committed handoff):** `docs/design_handoff_landing_v2/` — CSS, dictionary, page markup. Treat as the design source of truth; do not ship its React/Babel/tweaks prototype.

**Working checkout:** `/home/heinrich/dev/projects/zeta-main` (branch `feat/landing-v2`). Run git via `git -C /home/heinrich/dev/projects/zeta-main …`; never rely on chained `cd` across `wsl.exe` calls.

---

## File Structure

```
web/landing/
  package.json                 # deps + scripts (build, test, extract-dict, sync-legal)
  package-lock.json
  .gitignore                   # dist/, node_modules/
  Dockerfile                   # multi-stage: node build -> nginx
  nginx.conf                   # unchanged (try_files already serves subdirs)
  scripts/
    build-site.mjs             # orchestrator
    extract-dict.mjs           # one-off: handoff JS -> per-locale JSON
    lib/
      config.mjs               # LOCALES, paths, SITE_ORIGIN, LEGAL_SLUGS
      config.test.mjs
      i18n.mjs                 # loadDictionary, translateDom
      i18n.test.mjs
      pages.mjs                # localePath/absoluteUrl/headLinks/rewriteLinks/applySwitcher/applyHead/buildLandingPage/buildLegalPage
      pages.test.mjs
      seo.mjs                  # buildSitemap, buildRobots
      seo.test.mjs
  src/
    templates/
      landing.html             # German v2 source (from v1 index.html + deltas)
      legal-shell.html         # legal page chrome with content slot
    styles/
      colors_and_type.css      # copied verbatim from handoff
      landing.css              # copied verbatim from handoff (landing/landing.css)
      landing-v2.css           # copied verbatim from handoff
    i18n/
      landing.{de,en,fr,nl,es}.json
      legal.{de,en,fr,nl,es}.json
      meta.{de,en,fr,nl,es}.json
    assets/
      brand/                   # strido logos/marks (from current public/assets/brand)
      fonts/                   # Inter woff2 (from current public/assets/export)
      lucide.min.js            # vendored (no CDN)
      site.js                  # reveal-on-scroll + lucide.createIcons + year
      switcher.js              # dropdown + persist + root redirect
  content/legal/{de,en,fr,nl,es}/{imprint,privacy,contact,terms}.md
  dist/                        # generated (git-ignored)
```

`public/` is removed (replaced by generated `dist/`).

---

## Task 1: Git setup & legal content relocation

**Files:**
- Merge: `docs/legal-pages` branch into `main`
- Move: `docs/legal/{de,en,fr,nl,es}` → `web/landing/content/legal/{de,en,fr,nl,es}`

- [ ] **Step 1: Confirm clean state on main**

Run: `git -C /home/heinrich/dev/projects/zeta-main status --short`
Expected: only `?? docs/design_handoff_landing_v2/` (untracked handoff).

- [ ] **Step 2: Squash-merge the legal-text branch into main**

```bash
R=/home/heinrich/dev/projects/zeta-main
git -C "$R" merge --squash docs/legal-pages
git -C "$R" commit -m "docs(legal): add reviewed Strido legal texts (DE/EN/FR/NL/ES)"
```
Expected: `docs/legal/{de,en,fr,nl,es}/{imprint,privacy,contact,terms}.md` now tracked on `main`.

- [ ] **Step 3: Create the feature branch**

```bash
git -C "$R" switch -c feat/landing-v2
```

- [ ] **Step 4: Commit the handoff reference + design spec**

```bash
git -C "$R" add docs/design_handoff_landing_v2 .agents/plans/20260615085244_landing_v2_integration_design.md .agents/plans/20260615090032_landing_v2_integration_plan.md
git -C "$R" commit -m "docs(landing): add v2 design handoff, design spec, and implementation plan"
```

- [ ] **Step 5: Relocate legal markdown into the landing build context**

```bash
mkdir -p "$R/web/landing/content/legal"
git -C "$R" mv docs/legal/de docs/legal/en docs/legal/fr docs/legal/nl docs/legal/es web/landing/content/legal/
git -C "$R" mv docs/legal/README.md web/landing/content/legal/README.md
git -C "$R" commit -m "chore(landing): relocate legal markdown into web/landing/content/legal"
```
Expected: `web/landing/content/legal/de/imprint.md` etc. exist; `docs/legal/` is gone.
Note: single source of truth for legal text is now `web/landing/content/legal/` (needed because the Docker build context is `web/landing`).

---

## Task 2: Build scaffold

**Files:**
- Create: `web/landing/package.json`, `web/landing/.gitignore`

- [ ] **Step 1: Create `.gitignore`**

`web/landing/.gitignore`:
```
node_modules/
dist/
```

- [ ] **Step 2: Create `package.json`**

`web/landing/package.json`:
```json
{
  "name": "strido-landing",
  "private": true,
  "scripts": {
    "build": "node scripts/build-site.mjs",
    "test": "node --test",
    "extract-dict": "node scripts/extract-dict.mjs"
  },
  "dependencies": {
    "cheerio": "1.0.0",
    "markdown-it": "14.1.0"
  }
}
```

- [ ] **Step 3: Install deps (generates lockfile)**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && npm install"`
Expected: `node_modules/` + `package-lock.json` created.

- [ ] **Step 4: Commit**

```bash
git -C /home/heinrich/dev/projects/zeta-main add web/landing/package.json web/landing/package-lock.json web/landing/.gitignore
git -C /home/heinrich/dev/projects/zeta-main commit -m "build(landing): scaffold node build (cheerio, markdown-it)"
```

---

## Task 3: Config module (TDD)

**Files:**
- Create: `web/landing/scripts/lib/config.mjs`
- Test: `web/landing/scripts/lib/config.test.mjs`

- [ ] **Step 1: Write the failing test**

`web/landing/scripts/lib/config.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, DEFAULT_LOCALE, LEGAL_SLUGS, SITE_ORIGIN } from './config.mjs';

test('locales: 5 entries, de is default with empty dir', () => {
  assert.equal(LOCALES.length, 5);
  assert.deepEqual(LOCALES.map(l => l.code), ['de', 'en', 'fr', 'nl', 'es']);
  assert.equal(DEFAULT_LOCALE, 'de');
  assert.equal(LOCALES.find(l => l.code === 'de').dir, '');
  assert.equal(LOCALES.find(l => l.code === 'en').dir, 'en');
});

test('legal slugs and origin', () => {
  assert.deepEqual(LEGAL_SLUGS, ['imprint', 'privacy', 'contact', 'terms']);
  assert.equal(SITE_ORIGIN, 'https://strido.net');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && node --test scripts/lib/config.test.mjs"`
Expected: FAIL (Cannot find module './config.mjs').

- [ ] **Step 3: Implement config**

`web/landing/scripts/lib/config.mjs`:
```js
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
  { code: 'de', label: 'Deutsch',    short: 'DE', dir: '' },
  { code: 'en', label: 'English',    short: 'EN', dir: 'en' },
  { code: 'fr', label: 'Français',   short: 'FR', dir: 'fr' },
  { code: 'nl', label: 'Nederlands', short: 'NL', dir: 'nl' },
  { code: 'es', label: 'Español',    short: 'ES', dir: 'es' },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && node --test scripts/lib/config.test.mjs"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git -C /home/heinrich/dev/projects/zeta-main add web/landing/scripts/lib/config.mjs web/landing/scripts/lib/config.test.mjs
git -C /home/heinrich/dev/projects/zeta-main commit -m "feat(landing): generator config (locales, paths, origin)"
```

---

## Task 4: Styles & assets

**Files:**
- Create: `web/landing/src/styles/{colors_and_type.css,landing.css,landing-v2.css}`
- Create: `web/landing/src/assets/{brand/,fonts/,lucide.min.js,site.js,switcher.js}`

- [ ] **Step 1: Copy handoff CSS verbatim**

```bash
R=/home/heinrich/dev/projects/zeta-main; H="$R/docs/design_handoff_landing_v2"
mkdir -p "$R/web/landing/src/styles"
cp "$H/colors_and_type.css" "$R/web/landing/src/styles/colors_and_type.css"
cp "$H/landing/landing.css"  "$R/web/landing/src/styles/landing.css"
cp "$H/landing-v2.css"       "$R/web/landing/src/styles/landing-v2.css"
```
These three are the v2 styling source of truth (the `ruhig` rules live in `landing-v2.css`).

- [ ] **Step 2: Copy brand + fonts from the current public assets**

```bash
mkdir -p "$R/web/landing/src/assets/brand" "$R/web/landing/src/assets/fonts"
cp "$R/web/landing/public/assets/brand/"* "$R/web/landing/src/assets/brand/"
cp "$R/web/landing/public/assets/export/"*.woff2 "$R/web/landing/src/assets/fonts/"
```
Note: the font `@font-face` `src:` URLs in `colors_and_type.css` currently point at `assets/export/<hash>.woff2`. Update them in `src/styles/colors_and_type.css` to `/assets/fonts/<same-filename>.woff2`. (Filenames are unchanged, only the directory.)

- [ ] **Step 3: Vendor lucide locally**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && npm install --no-save lucide@0.460.0 && cp node_modules/lucide/dist/umd/lucide.min.js src/assets/lucide.min.js"`
Expected: `src/assets/lucide.min.js` exists (defines `window.lucide`).

- [ ] **Step 4: Create `site.js`** (reveal-on-scroll + icons + year — same behavior as current `public/assets/site.js`)

`web/landing/src/assets/site.js`:
```js
(function () {
  document.querySelectorAll('[data-current-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
  if (window.lucide) window.lucide.createIcons();

  var mql = window.matchMedia('(prefers-reduced-motion: no-preference)');
  if (!('IntersectionObserver' in window) || !mql.matches) return;
  document.documentElement.classList.add('lp-anim');
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add('lp-in'); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.lp-reveal').forEach(function (el) { observer.observe(el); });
})();
```

- [ ] **Step 5: Create `switcher.js`** (dropdown + persist + first-visit root redirect)

`web/landing/src/assets/switcher.js`:
```js
(function () {
  var KEY = 'strido_lang';
  var LOCALES = ['de', 'en', 'fr', 'nl', 'es'];

  var sw = document.querySelector('[data-lang-switcher]');
  if (sw) {
    var btn = sw.querySelector('.lp-lang-btn');
    var menu = sw.querySelector('[data-lang-menu]');
    if (btn) btn.addEventListener('click', function (e) { e.stopPropagation(); sw.classList.toggle('is-open'); });
    document.addEventListener('click', function () { sw.classList.remove('is-open'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sw.classList.remove('is-open'); });
    if (menu) menu.querySelectorAll('a[hreflang]').forEach(function (a) {
      a.addEventListener('click', function () { try { localStorage.setItem(KEY, a.getAttribute('hreflang')); } catch (e) {} });
    });
  }

  var isRoot = location.pathname === '/' || location.pathname === '/index.html';
  if (!isRoot) return;
  var target = null;
  try { target = localStorage.getItem(KEY); } catch (e) {}
  if (!target) {
    var navs = (navigator.languages || [navigator.language || 'de']).map(function (x) { return String(x).slice(0, 2).toLowerCase(); });
    for (var i = 0; i < navs.length; i++) { if (LOCALES.indexOf(navs[i]) >= 0) { target = navs[i]; break; } }
  }
  if (target && target !== 'de') location.replace('/' + target + '/');
})();
```

- [ ] **Step 6: Commit**

```bash
git -C /home/heinrich/dev/projects/zeta-main add web/landing/src/styles web/landing/src/assets
git -C /home/heinrich/dev/projects/zeta-main commit -m "feat(landing): vendor styles, fonts, brand, lucide, site/switcher scripts"
```

---

## Task 5: Dictionary extraction (DE/EN/FR/NL)

**Files:**
- Create: `web/landing/scripts/extract-dict.mjs`
- Generates: `web/landing/src/i18n/{landing,legal}.{de,en,fr,nl}.json`, `web/landing/src/i18n/meta.{de,en,fr,nl}.json`

- [ ] **Step 1: Write the extractor**

`web/landing/scripts/extract-dict.mjs`:
```js
// Extracts the German-source-keyed dictionaries from the handoff JS files
// (landing-v2-i18n.js, pages/legal-i18n.js) into per-locale JSON.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SRC, HANDOFF } from './lib/config.mjs';

// Pull the first `{...}` object literal that follows `var DICT =` and eval it.
function extractDict(jsText) {
  const start = jsText.indexOf('var DICT');
  const brace = jsText.indexOf('{', start);
  let depth = 0, i = brace, inStr = false, q = '';
  for (; i < jsText.length; i++) {
    const c = jsText[i];
    if (inStr) { if (c === '\\') { i++; continue; } if (c === q) inStr = false; continue; }
    if (c === '"' || c === "'") { inStr = true; q = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  const obj = jsText.slice(brace, i);
  // eslint-disable-next-line no-new-func
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

console.log('Extracted landing/legal dictionaries for en/fr/nl.');
```

- [ ] **Step 2: Run the extractor**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && node scripts/extract-dict.mjs"`
Expected: prints success; `src/i18n/landing.en.json` is a non-empty object; `landing.de.json` is `{}`.

- [ ] **Step 3: Verify a known key round-trips**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && node -e \"const d=require('./src/i18n/landing.en.json'); console.log(d['Funktionen'])\""`
Expected: `Features`.

- [ ] **Step 4: Create per-locale meta (title/description) for de/en/fr/nl**

`web/landing/src/i18n/meta.de.json`:
```json
{ "index": { "title": "Strido — Video-Coaching für den Reitsport", "description": "Strido verbindet Reiter und Trainer für asynchrones Video-Feedback und Live-Coaching — direkt im Browser. Komplett kostenlos." } }
```
`web/landing/src/i18n/meta.en.json`:
```json
{ "index": { "title": "Strido — Video coaching for equestrian sport", "description": "Strido connects riders and trainers for asynchronous video feedback and live coaching — right in the browser. Completely free." } }
```
`web/landing/src/i18n/meta.fr.json`:
```json
{ "index": { "title": "Strido — Coaching vidéo pour le sport équestre", "description": "Strido met en relation cavaliers et entraîneurs pour un feedback vidéo asynchrone et du coaching en direct — directement dans le navigateur. Entièrement gratuit." } }
```
`web/landing/src/i18n/meta.nl.json`:
```json
{ "index": { "title": "Strido — Videocoaching voor de paardensport", "description": "Strido verbindt ruiters en trainers voor asynchrone videofeedback en live coaching — direct in de browser. Volledig gratis." } }
```

- [ ] **Step 5: Commit**

```bash
git -C /home/heinrich/dev/projects/zeta-main add web/landing/scripts/extract-dict.mjs web/landing/src/i18n
git -C /home/heinrich/dev/projects/zeta-main commit -m "feat(landing): extract DE/EN/FR/NL i18n dictionaries + page meta"
```

---

## Task 6: Author Spanish (ES) translations

**Files:**
- Create: `web/landing/src/i18n/landing.es.json`, `legal.es.json`, `meta.es.json`

- [ ] **Step 1: Author `landing.es.json`**

Produce a Spanish value for **every key present in `src/i18n/landing.en.json`** (same key set, German keys → Spanish values). Match the tone/register of the existing EN/FR/NL translations (warm, direct marketing copy; equestrian terms). Examples to anchor style:
```json
{
  "So funktioniert's": "Cómo funciona",
  "Funktionen": "Funciones",
  "Für wen": "Para quién",
  "Kostenlos": "Gratis",
  "Anmelden": "Iniciar sesión",
  "Kostenlos starten": "Empieza gratis",
  "Video-Coaching für den Reitsport": "Coaching en vídeo para el deporte ecuestre",
  "Komplett": "Totalmente",
  "kostenlos": "gratis",
  "Kommentar hinzufügen…": "Añadir un comentario…"
}
```
Verification helper — list any EN keys missing from the ES file:
```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && node -e \"const en=require('./src/i18n/landing.en.json'),es=require('./src/i18n/landing.es.json');const miss=Object.keys(en).filter(k=>!(k in es));console.log('missing:',miss.length);miss.slice(0,20).forEach(k=>console.log(' -',k))\""
```
Expected at completion: `missing: 0`.

- [ ] **Step 2: Author `legal.es.json`**

Same approach against `src/i18n/legal.en.json` key set (legal-page chrome: banner, "back to home", footer labels). Verify `missing: 0` with the analogous command.

- [ ] **Step 3: Author `meta.es.json`**
```json
{ "index": { "title": "Strido — Coaching en vídeo para el deporte ecuestre", "description": "Strido conecta a jinetes y entrenadores para feedback en vídeo asíncrono y coaching en directo — directamente en el navegador. Totalmente gratis." } }
```

- [ ] **Step 4: Add a review marker**

Append a top-of-file note in the PR description and `web/landing/content/legal/README.md`: ES **landing** copy is agent-authored and pending native-speaker review (ES **legal** text is the already-reviewed version).

- [ ] **Step 5: Commit**

```bash
git -C /home/heinrich/dev/projects/zeta-main add web/landing/src/i18n/landing.es.json web/landing/src/i18n/legal.es.json web/landing/src/i18n/meta.es.json
git -C /home/heinrich/dev/projects/zeta-main commit -m "feat(landing): author Spanish (ES) landing translations (pending native review)"
```

---

## Task 7: i18n module — translateDom (TDD)

**Files:**
- Create: `web/landing/scripts/lib/i18n.mjs`
- Test: `web/landing/scripts/lib/i18n.test.mjs`

- [ ] **Step 1: Write the failing tests**

`web/landing/scripts/lib/i18n.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import { translateDom } from './i18n.mjs';

test('replaces known text and preserves surrounding whitespace', () => {
  const $ = cheerio.load('<p>\n  Funktionen\n</p>');
  translateDom($, { 'Funktionen': 'Features' });
  assert.equal($('p').text(), '\n  Features\n');
});

test('unknown text falls back to German (unchanged)', () => {
  const $ = cheerio.load('<p>Unbekannt</p>');
  translateDom($, { 'Funktionen': 'Features' });
  assert.equal($('p').text(), 'Unbekannt');
});

test('does not touch script/style contents', () => {
  const $ = cheerio.load('<script>var Funktionen = 1;</script>');
  translateDom($, { 'Funktionen': 'Features' });
  assert.match($('script').html(), /Funktionen/);
});

test('translates whitelisted attributes', () => {
  const $ = cheerio.load('<input placeholder="Kommentar hinzufügen…">');
  translateDom($, { 'Kommentar hinzufügen…': 'Add a comment…' });
  assert.equal($('input').attr('placeholder'), 'Add a comment…');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && node --test scripts/lib/i18n.test.mjs"`
Expected: FAIL (Cannot find module './i18n.mjs').

- [ ] **Step 3: Implement i18n module**

`web/landing/scripts/lib/i18n.mjs`:
```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && node --test scripts/lib/i18n.test.mjs"`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git -C /home/heinrich/dev/projects/zeta-main add web/landing/scripts/lib/i18n.mjs web/landing/scripts/lib/i18n.test.mjs
git -C /home/heinrich/dev/projects/zeta-main commit -m "feat(landing): build-time DOM text/attribute translator"
```

---

## Task 8: pages module — assembly helpers (TDD)

**Files:**
- Create: `web/landing/scripts/lib/pages.mjs`
- Test: `web/landing/scripts/lib/pages.test.mjs`

- [ ] **Step 1: Write the failing tests**

`web/landing/scripts/lib/pages.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import { localePath, absoluteUrl, headLinks, rewriteLinks, applySwitcher, buildLandingPage } from './pages.mjs';

test('localePath: de at root, others prefixed; index vs slug', () => {
  assert.equal(localePath('de', 'index'), '/');
  assert.equal(localePath('en', 'index'), '/en/');
  assert.equal(localePath('de', 'imprint'), '/imprint.html');
  assert.equal(localePath('fr', 'imprint'), '/fr/imprint.html');
});

test('absoluteUrl prepends origin', () => {
  assert.equal(absoluteUrl('es', 'privacy'), 'https://strido.net/es/privacy.html');
});

test('headLinks has canonical + 5 alternates + x-default', () => {
  const html = headLinks('en', 'index');
  assert.match(html, /rel="canonical" href="https:\/\/strido\.net\/en\/"/);
  assert.equal((html.match(/hreflang=/g) || []).length, 6); // 5 locales + x-default
  assert.match(html, /hreflang="x-default" href="https:\/\/strido\.net\/"/);
});

test('rewriteLinks prefixes internal root links for non-de, skips assets', () => {
  const $ = cheerio.load('<a href="/imprint.html">x</a><a href="/#funktionen">y</a><a href="/assets/site.js">z</a>');
  rewriteLinks($, 'fr');
  assert.equal($('a').eq(0).attr('href'), '/fr/imprint.html');
  assert.equal($('a').eq(1).attr('href'), '/fr/#funktionen');
  assert.equal($('a').eq(2).attr('href'), '/assets/site.js');
});

test('applySwitcher sets current label and option links for the page', () => {
  const $ = cheerio.load('<div data-lang-switcher><span data-lang-current></span><div data-lang-menu></div></div>');
  applySwitcher($, 'en', 'imprint');
  assert.equal($('[data-lang-current]').text(), 'EN');
  assert.equal($('[data-lang-menu] a').length, 5);
  assert.equal($('[data-lang-menu] a[hreflang="de"]').attr('href'), '/imprint.html');
  assert.equal($('[data-lang-menu] a[hreflang="es"]').attr('href'), '/es/imprint.html');
});

test('buildLandingPage sets lang and translates body for non-de', () => {
  const tpl = '<!doctype html><html lang="de"><head><title>t</title><meta name="description" content="d"></head><body data-bg-rhythm="ruhig"><nav><a href="/#funktionen">Funktionen</a></nav><div data-lang-switcher><span data-lang-current></span><div data-lang-menu></div></div></body></html>';
  const out = buildLandingPage({ templateHtml: tpl, dict: { 'Funktionen': 'Features' }, locale: 'en', meta: { index: { title: 'T', description: 'D' } } });
  assert.match(out, /<html lang="en"/);
  assert.match(out, />Features</);
  assert.match(out, /rel="canonical" href="https:\/\/strido\.net\/en\/"/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && node --test scripts/lib/pages.test.mjs"`
Expected: FAIL (Cannot find module './pages.mjs').

- [ ] **Step 3: Implement pages module**

`web/landing/scripts/lib/pages.mjs`:
```js
import * as cheerio from 'cheerio';
import { LOCALES, DEFAULT_LOCALE, SITE_ORIGIN } from './config.mjs';
import { translateDom } from './i18n.mjs';

const dirOf = (locale) => LOCALES.find((l) => l.code === locale).dir;

export function localePath(locale, pageKey) {
  const d = dirOf(locale);
  const prefix = d ? `/${d}` : '';
  return pageKey === 'index' ? `${prefix}/` : `${prefix}/${pageKey}.html`;
}

export function absoluteUrl(locale, pageKey) {
  return `${SITE_ORIGIN}${localePath(locale, pageKey)}`;
}

export function headLinks(locale, pageKey) {
  const lines = [`<link rel="canonical" href="${absoluteUrl(locale, pageKey)}">`];
  for (const l of LOCALES) lines.push(`<link rel="alternate" hreflang="${l.code}" href="${absoluteUrl(l.code, pageKey)}">`);
  lines.push(`<link rel="alternate" hreflang="x-default" href="${absoluteUrl(DEFAULT_LOCALE, pageKey)}">`);
  return lines.join('\n');
}

export function rewriteLinks($, locale) {
  const d = dirOf(locale);
  if (!d) return;
  $('a[href^="/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href.startsWith('/assets/')) return;
    $(el).attr('href', `/${d}${href}`);
  });
}

export function applySwitcher($, locale, pageKey) {
  const cur = LOCALES.find((l) => l.code === locale);
  $('[data-lang-current]').text(cur.short);
  const menu = $('[data-lang-menu]');
  menu.empty();
  for (const l of LOCALES) {
    const active = l.code === locale;
    menu.append(
      `<a class="lp-lang-opt${active ? ' is-active' : ''}" href="${localePath(l.code, pageKey)}" hreflang="${l.code}"${active ? ' aria-current="true"' : ''}>` +
        `<span class="lp-lang-opt-short">${l.short}</span><span class="lp-lang-opt-label">${l.label}</span>` +
        `${active ? '<i data-lucide="check"></i>' : ''}</a>`,
    );
  }
}

export function applyHead($, { locale, pageKey, title, description }) {
  $('html').attr('lang', locale);
  $('title').text(title);
  if ($('meta[name="description"]').length) $('meta[name="description"]').attr('content', description);
  else $('head').append(`<meta name="description" content="${description}">`);
  $('head').append('\n' + headLinks(locale, pageKey));
}

export function buildLandingPage({ templateHtml, dict, locale, meta }) {
  const $ = cheerio.load(templateHtml, { decodeEntities: false });
  if (locale !== DEFAULT_LOCALE) translateDom($, dict);
  rewriteLinks($, locale);
  applySwitcher($, locale, 'index');
  applyHead($, { locale, pageKey: 'index', title: meta.index.title, description: meta.index.description });
  return $.html();
}

export function buildLegalPage({ shellHtml, contentHtml, h1, locale, slug, description, dict }) {
  const $ = cheerio.load(shellHtml, { decodeEntities: false });
  if (locale !== DEFAULT_LOCALE) translateDom($, dict);     // translate chrome only
  $('[data-legal-content]').html(contentHtml);              // inject already-localized content
  rewriteLinks($, locale);
  applySwitcher($, locale, slug);
  applyHead($, { locale, pageKey: slug, title: `${h1} — Strido`, description });
  return $.html();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && node --test scripts/lib/pages.test.mjs"`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git -C /home/heinrich/dev/projects/zeta-main add web/landing/scripts/lib/pages.mjs web/landing/scripts/lib/pages.test.mjs
git -C /home/heinrich/dev/projects/zeta-main commit -m "feat(landing): page assembly (locale urls, hreflang, switcher, head)"
```

---

## Task 9: seo module (TDD)

**Files:**
- Create: `web/landing/scripts/lib/seo.mjs`
- Test: `web/landing/scripts/lib/seo.test.mjs`

- [ ] **Step 1: Write the failing tests**

`web/landing/scripts/lib/seo.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSitemap, buildRobots } from './seo.mjs';

test('sitemap lists all 25 pages with hreflang alternates', () => {
  const xml = buildSitemap();
  assert.equal((xml.match(/<loc>/g) || []).length, 25); // (1 landing + 4 legal) x 5 locales
  assert.match(xml, /<loc>https:\/\/strido\.net\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/strido\.net\/es\/terms\.html<\/loc>/);
  assert.match(xml, /hreflang="x-default"/);
});

test('robots references the sitemap', () => {
  const txt = buildRobots();
  assert.match(txt, /Sitemap: https:\/\/strido\.net\/sitemap\.xml/);
  assert.match(txt, /Allow: \//);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && node --test scripts/lib/seo.test.mjs"`
Expected: FAIL (Cannot find module './seo.mjs').

- [ ] **Step 3: Implement seo module**

`web/landing/scripts/lib/seo.mjs`:
```js
import { LOCALES, DEFAULT_LOCALE, SITE_ORIGIN, LEGAL_SLUGS } from './config.mjs';
import { absoluteUrl } from './pages.mjs';

const pageKeys = () => ['index', ...LEGAL_SLUGS];

export function buildSitemap() {
  const blocks = [];
  for (const pageKey of pageKeys()) {
    for (const l of LOCALES) {
      const alts = LOCALES.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.code}" href="${absoluteUrl(a.code, pageKey)}"/>`);
      alts.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${absoluteUrl(DEFAULT_LOCALE, pageKey)}"/>`);
      blocks.push(`  <url>\n    <loc>${absoluteUrl(l.code, pageKey)}</loc>\n${alts.join('\n')}\n  </url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${blocks.join('\n')}\n</urlset>\n`;
}

export function buildRobots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && node --test scripts/lib/seo.test.mjs"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git -C /home/heinrich/dev/projects/zeta-main add web/landing/scripts/lib/seo.mjs web/landing/scripts/lib/seo.test.mjs
git -C /home/heinrich/dev/projects/zeta-main commit -m "feat(landing): sitemap.xml + robots.txt generation"
```

---

## Task 10: German landing template (v1 → v2)

**Files:**
- Create: `web/landing/src/templates/landing.html` (derived from `web/landing/public/index.html`)

- [ ] **Step 1: Seed the template from v1**

```bash
R=/home/heinrich/dev/projects/zeta-main
mkdir -p "$R/web/landing/src/templates"
cp "$R/web/landing/public/index.html" "$R/web/landing/src/templates/landing.html"
```

- [ ] **Step 2: Replace the inline `<style>…</style>` block with stylesheet links**

In `src/templates/landing.html`, delete the entire inline `<style>…</style>` element in `<head>` and insert:
```html
<link rel="stylesheet" href="/assets/styles/colors_and_type.css">
<link rel="stylesheet" href="/assets/styles/landing.css">
<link rel="stylesheet" href="/assets/styles/landing-v2.css">
```
Keep the existing `<title>` and add (if missing) `<meta name="description" content="">` (the generator fills it).

- [ ] **Step 3: Set the ruhig background default on `<body>`**

Ensure the body tag reads exactly:
```html
<body data-bg-rhythm="ruhig" data-hero="geteilt" data-scale="standard" data-live="dunkel" data-logo="wortmarke">
```
(These are the handoff's binding defaults; `landing-v2.css` neutralizes the warm bands when `data-bg-rhythm="ruhig"`.)

- [ ] **Step 4: Insert the header language switcher**

In `.lp-header-actions` (before the "Anmelden"/"Kostenlos starten" buttons), insert the switcher markup the generator populates:
```html
<div class="lp-lang" data-lang-switcher>
  <button class="lp-lang-btn" type="button" aria-haspopup="true" aria-label="Sprache wählen">
    <i data-lucide="globe"></i><span data-lang-current>DE</span><i data-lucide="chevron-down"></i>
  </button>
  <div class="lp-lang-menu" data-lang-menu role="menu"></div>
</div>
```
(Reference `docs/design_handoff_landing_v2/landing-v2.css` for `.lp-lang*` styles — already present in the copied CSS.)

- [ ] **Step 5: Add the hero floating comment-card**

Inside the hero visual column (the `<image-slot>`/photo container), add the overlapping card from the handoff hero (`.lp-hero-float`). Use this markup (German source text; translated at build):
```html
<figure class="lp-hero-float" role="img" aria-label="Beispiel-Feedback im Video">
  <img class="lp-hero-float-avatar" src="/assets/brand/strido-mark-128.png" alt="" width="40" height="40">
  <div class="lp-hero-float-body">
    <div class="lp-hero-float-meta"><strong>Coach Lena</strong> · 0:42</div>
    <p>Schau auf deine Schulterachse — sie kippt nach vorn. Becken mit der Bewegung mitgehen lassen.</p>
  </div>
</figure>
```
Replace the bare hero `<image-slot>` element with a real placeholder image container (`<div class="lp-hero-photo" role="img" aria-label="Reitsequenz">`) so no custom web component is needed. Hero/audience real media remains a go-live task.

- [ ] **Step 6: Normalize internal links to root-absolute**

Make all in-site links root-absolute so the generator can locale-prefix them:
- anchors: `href="#funktionen"` → `href="/#funktionen"` (etc.)
- legal links in the footer → `href="/imprint.html"`, `/privacy.html`, `/contact.html`, `/terms.html`
Leave external auth links (app domain) and `mailto:` untouched. Asset references use `/assets/...`.

- [ ] **Step 7: Replace script tags with vendored scripts**

At the end of `<body>`, ensure scripts are:
```html
<script src="/assets/lucide.min.js"></script>
<script src="/assets/site.js"></script>
<script src="/assets/switcher.js"></script>
```
Remove any `assets/export/*.js` bundle reference and any lucide CDN `<script>`.

- [ ] **Step 8: Add the footer Nutzungsbedingungen (Terms) link**

In the footer legal links, ensure all four are present (German labels; translated at build):
```html
<a href="/imprint.html">Impressum</a>
<a href="/privacy.html">Datenschutz</a>
<a href="/contact.html">Kontakt</a>
<a href="/terms.html">Nutzungsbedingungen</a>
```

- [ ] **Step 9: Smoke-check the template parses and has the hooks**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && node -e \"const c=require('cheerio'),fs=require('fs');const \$=c.load(fs.readFileSync('src/templates/landing.html','utf8'));console.log('switcher:',\$('[data-lang-switcher]').length,'float:',\$('.lp-hero-float').length,'footer-legal:',\$('a[href=\\\"/terms.html\\\"]').length)\""`
Expected: `switcher: 1 float: 1 footer-legal: 1`.

- [ ] **Step 10: Commit**

```bash
git -C /home/heinrich/dev/projects/zeta-main add web/landing/src/templates/landing.html
git -C /home/heinrich/dev/projects/zeta-main commit -m "feat(landing): German v2 landing template (ruhig, hero float, switcher)"
```

---

## Task 11: Legal shell template

**Files:**
- Create: `web/landing/src/templates/legal-shell.html`

- [ ] **Step 1: Create the legal shell**

Build a minimal legal page that reuses the brand chrome and shares the switcher. German source text (translated at build via `legal.<locale>.json`):

`web/landing/src/templates/legal-shell.html`:
```html
<!doctype html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Strido</title>
<meta name="description" content="">
<link rel="icon" type="image/svg+xml" href="/assets/brand/strido-mark.svg">
<link rel="stylesheet" href="/assets/styles/colors_and_type.css">
<link rel="stylesheet" href="/assets/styles/landing.css">
<link rel="stylesheet" href="/assets/styles/landing-v2.css">
</head>
<body data-bg-rhythm="ruhig" data-logo="wortmarke">
<header class="lp-header">
  <div class="lp-container lp-header-inner">
    <a class="lp-logo" href="/"><img src="/assets/brand/strido-logo.svg" alt="Strido" height="20"></a>
    <div class="lp-header-actions">
      <div class="lp-lang" data-lang-switcher>
        <button class="lp-lang-btn" type="button" aria-haspopup="true" aria-label="Sprache wählen">
          <i data-lucide="globe"></i><span data-lang-current>DE</span><i data-lucide="chevron-down"></i>
        </button>
        <div class="lp-lang-menu" data-lang-menu role="menu"></div>
      </div>
      <a class="lp-btn lp-btn-ghost" href="/"><i data-lucide="arrow-left"></i> Zurück zur Startseite</a>
    </div>
  </div>
</header>
<main class="legal-main lp-container">
  <div class="legal-banner" role="note">
    Diese Rechtstexte sind Muster und vor Veröffentlichung anwaltlich zu prüfen.
  </div>
  <article class="legal-body" data-legal-content></article>
</main>
<footer class="lp-footer">
  <div class="lp-container lp-footer-inner">
    <p>Video-Coaching für den Reitsport. © <span data-current-year></span> Strido</p>
    <nav class="lp-footer-links">
      <a href="/imprint.html">Impressum</a>
      <a href="/privacy.html">Datenschutz</a>
      <a href="/contact.html">Kontakt</a>
      <a href="/terms.html">Nutzungsbedingungen</a>
    </nav>
  </div>
</footer>
<script src="/assets/lucide.min.js"></script>
<script src="/assets/site.js"></script>
<script src="/assets/switcher.js"></script>
</body>
</html>
```
If `legal.css` from the handoff (`docs/design_handoff_landing_v2/pages/legal.css`) defines `.legal-main/.legal-banner/.legal-body`, copy it to `src/styles/legal.css` and add a `<link>` for it; otherwise the `landing-*` styles cover the chrome.

- [ ] **Step 2: Ensure banner/back-link/footer strings are dictionary keys**

Confirm the German strings used here ("Diese Rechtstexte sind Muster…", "Zurück zur Startseite", "Impressum", "Datenschutz", "Kontakt", "Nutzungsbedingungen") exist as keys in `legal.en.json` (and thus need ES coverage). Add any missing ones to all of `legal.{en,fr,nl,es}.json` so the chrome fully translates.

- [ ] **Step 3: Smoke-check**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && node -e \"const c=require('cheerio'),fs=require('fs');const \$=c.load(fs.readFileSync('src/templates/legal-shell.html','utf8'));console.log('slot:',\$('[data-legal-content]').length,'switcher:',\$('[data-lang-switcher]').length)\""`
Expected: `slot: 1 switcher: 1`.

- [ ] **Step 4: Commit**

```bash
git -C /home/heinrich/dev/projects/zeta-main add web/landing/src/templates/legal-shell.html web/landing/src/styles
git -C /home/heinrich/dev/projects/zeta-main commit -m "feat(landing): legal page shell (switcher, banner, footer links)"
```

---

## Task 12: Orchestrator — build the whole site

**Files:**
- Create: `web/landing/scripts/build-site.mjs`

- [ ] **Step 1: Implement the orchestrator**

`web/landing/scripts/build-site.mjs`:
```js
import { mkdirSync, writeFileSync, readFileSync, cpSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import MarkdownIt from 'markdown-it';
import { LOCALES, DEFAULT_LOCALE, LEGAL_SLUGS, SRC, DIST, LEGAL_DIR } from './lib/config.mjs';
import { loadDictionary } from './lib/i18n.mjs';
import { buildLandingPage, buildLegalPage } from './lib/pages.mjs';
import { buildSitemap, buildRobots } from './lib/seo.mjs';

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
function descriptionFrom(mdText, fallback) {
  const lines = mdText.split('\n').map((l) => l.trim());
  const p = lines.find((l) => l && !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('|'));
  return (p || fallback).slice(0, 180);
}

rmSync(DIST, { recursive: true, force: true });

const landingTpl = readFileSync(join(SRC, 'templates', 'landing.html'), 'utf8');
const legalShell = readFileSync(join(SRC, 'templates', 'legal-shell.html'), 'utf8');

for (const l of LOCALES) {
  const dict = loadDictionary(l.code, i18nDir);
  const meta = JSON.parse(readFileSync(join(i18nDir, `meta.${l.code}.json`), 'utf8'));

  // landing
  write(join(l.dir, 'index.html'), buildLandingPage({ templateHtml: landingTpl, dict, locale: l.code, meta }));

  // legal
  for (const slug of LEGAL_SLUGS) {
    const mdText = readFileSync(join(LEGAL_DIR, l.code, `${slug}.md`), 'utf8');
    const h1 = extractH1(mdText);
    const body = mdText.replace(/^#\s+.+$/m, '').trimStart(); // shell renders H1 via title; body excludes it
    const contentHtml = `<h1>${h1}</h1>\n` + md.render(body);
    const description = descriptionFrom(body, `${h1} — Strido`);
    write(join(l.dir, `${slug}.html`), buildLegalPage({ shellHtml: legalShell, contentHtml, h1, locale: l.code, slug, description, dict }));
  }
}

// assets + styles
cpSync(join(SRC, 'assets'), join(DIST, 'assets'), { recursive: true });
cpSync(join(SRC, 'styles'), join(DIST, 'assets', 'styles'), { recursive: true });

// SEO
write('sitemap.xml', buildSitemap());
write('robots.txt', buildRobots());

console.log(`Built ${LOCALES.length} locales × (1 landing + ${LEGAL_SLUGS.length} legal) into ${DIST}`);
```

- [ ] **Step 2: Run the build**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && npm run build"`
Expected: success log; `dist/index.html`, `dist/en/index.html`, `dist/es/terms.html`, `dist/sitemap.xml`, `dist/robots.txt`, `dist/assets/styles/landing-v2.css` all exist.

- [ ] **Step 3: Assert generated output is correct**

Run:
```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && node -e \"
const c=require('cheerio'),fs=require('fs');
function chk(f,lang){const \$=c.load(fs.readFileSync('dist/'+f,'utf8'));
  console.log(f,'lang='+(\$('html').attr('lang')===lang),'canonical='+(\$('link[rel=canonical]').length===1),'alts='+(\$('link[hreflang]').length===6));}
chk('index.html','de'); chk('en/index.html','en'); chk('es/imprint.html','es');
const en=c.load(fs.readFileSync('dist/en/index.html','utf8'));
console.log('en translated nav:', /Features/.test(en('nav').text()));
\""
```
Expected: each line shows `lang=true canonical=true alts=true`; `en translated nav: true`.

- [ ] **Step 4: Count pages**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && find dist -name '*.html' | wc -l"`
Expected: `25`.

- [ ] **Step 5: Commit**

```bash
git -C /home/heinrich/dev/projects/zeta-main add web/landing/scripts/build-site.mjs
git -C /home/heinrich/dev/projects/zeta-main commit -m "feat(landing): site generator (per-locale landing + legal + SEO)"
```

---

## Task 13: Multi-stage Docker + retire `public/`

**Files:**
- Modify: `web/landing/Dockerfile`
- Keep: `web/landing/nginx.conf` (unchanged — `try_files` already serves subdirs)
- Delete: `web/landing/public/`, `web/landing/scripts/unpack-export.mjs`

- [ ] **Step 1: Rewrite the Dockerfile (multi-stage)**

`web/landing/Dockerfile`:
```dockerfile
# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- serve stage ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
```

- [ ] **Step 2: Remove the obsolete static export + unpacker**

```bash
R=/home/heinrich/dev/projects/zeta-main
git -C "$R" rm -r web/landing/public web/landing/scripts/unpack-export.mjs
```
(All needed assets now live under `web/landing/src/assets`.)

- [ ] **Step 3: Add `.dockerignore`**

`web/landing/.dockerignore`:
```
node_modules
dist
```
(Ensures a clean `npm ci` inside the image.)

- [ ] **Step 4: Build the image**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && docker build -t strido-landing:test ."`
Expected: build succeeds through both stages.

- [ ] **Step 5: Run and smoke-test the container**

Run:
```bash
wsl.exe -d ubuntu bash -lc "
docker rm -f strido-landing-test 2>/dev/null; 
docker run -d --name strido-landing-test -p 8089:8080 strido-landing:test && sleep 1 &&
echo health: \$(curl -s localhost:8089/health) &&
echo root: \$(curl -s -o /dev/null -w '%{http_code}' localhost:8089/) &&
echo en: \$(curl -s -o /dev/null -w '%{http_code}' localhost:8089/en/) &&
echo es-terms: \$(curl -s -o /dev/null -w '%{http_code}' localhost:8089/es/terms.html) &&
echo sitemap: \$(curl -s -o /dev/null -w '%{http_code}' localhost:8089/sitemap.xml)
"
```
Expected: `health: {"status":"ok"}`; root/en/es-terms/sitemap all `200`.

- [ ] **Step 6: Stop the container**

Run: `wsl.exe -d ubuntu bash -lc "docker rm -f strido-landing-test"`

- [ ] **Step 7: Commit**

```bash
git -C /home/heinrich/dev/projects/zeta-main add web/landing/Dockerfile web/landing/.dockerignore
git -C /home/heinrich/dev/projects/zeta-main commit -m "build(landing): multi-stage Docker build; drop static export + unpacker"
```

---

## Task 14: Visual & i18n verification (browser)

**Files:** none (verification only); capture screenshots for the PR.

- [ ] **Step 1: Serve the built site locally**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing/dist && (python3 -m http.server 8090 &) && sleep 1 && echo serving"`

- [ ] **Step 2: Check each locale landing at desktop (1280) and mobile (390)**

Use the playwright MCP (or Claude-in-Chrome) to load `http://localhost:8090/`, `/en/`, `/fr/`, `/nl/`, `/es/`. For each, at 1280px and 390px, verify:
- no horizontal overflow; ruhig (cream) background, no warm bands except `.lp-free-band`;
- hero floating card visible; header switcher shows the correct current language;
- icons render (lucide), no console errors, no missing assets (no 404s in network).

- [ ] **Step 3: Check the switcher navigates between locale URLs**

From `/`, open the switcher, click EN → URL becomes `/en/`; the page content is English; switching back to DE → `/`. Confirm `localStorage["strido_lang"]` updates.

- [ ] **Step 4: Check legal pages**

Load `/imprint.html`, `/privacy.html`, `/contact.html`, `/terms.html` and one non-DE set (e.g. `/fr/imprint.html`). Verify: localized H1, placeholder banner present, footer has all four legal links, switcher works, content renders (markdown → HTML).

- [ ] **Step 5: Verify hreflang/canonical in served HTML**

Run: `wsl.exe -d ubuntu bash -lc "curl -s localhost:8090/en/ | grep -E 'rel=\"(canonical|alternate)\"' | head"`
Expected: one canonical to `/en/` + 6 alternates (5 locales + x-default).

- [ ] **Step 6: Capture screenshots**

Save desktop + 390px screenshots of the DE landing and one non-DE landing + one legal page for the PR description (project rule: mobile UI changes need screenshots).

- [ ] **Step 7: Stop the server**

Run: `wsl.exe -d ubuntu bash -lc "pkill -f 'http.server 8090' || true"`

- [ ] **Step 8: Run the full test + build once more (regression gate)**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main/web/landing && npm test && npm run build && find dist -name '*.html' | wc -l"`
Expected: all unit tests PASS; build OK; `25`.

---

## Task 15: Completion report & PR

**Files:**
- Create: `.agents/reports/<ts>_landing_v2_integration.md`

- [ ] **Step 1: Write the completion report**

Use `YYYYMMDDHHMMSS_landing_v2_integration.md` with: context, decisions, files touched, verification (commands + screenshots), and follow-ups (go-live human tasks: real media, real testimonials, fill legal `{{PLACEHOLDERS}}` + final legal review, contact-form backend, **ES landing native-speaker review**).

- [ ] **Step 2: Final repo hygiene check**

Run: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta-main && git diff --check && git status --short && find web/landing/dist -maxdepth 0 2>/dev/null && echo 'WARN dist tracked?' || echo 'dist not tracked: ok'"`
Expected: no whitespace errors; `dist/` not tracked (gitignored).

- [ ] **Step 3: Commit the report**

```bash
git -C /home/heinrich/dev/projects/zeta-main add .agents/reports
git -C /home/heinrich/dev/projects/zeta-main commit -m "docs(landing): v2 integration completion report"
```

- [ ] **Step 4: Push and open the PR** (only when the user asks to push)

```bash
git -C /home/heinrich/dev/projects/zeta-main push -u origin feat/landing-v2
gh --repo <owner>/<repo> pr create --base main --head feat/landing-v2 --title "feat(landing): Strido landing v2 (per-locale DE/EN/FR/NL/ES + legal pages)" --body-file <report-or-summary>
```
PR description must include: the desktop + 390px screenshots, the verification commands, and the go-live follow-up checklist. Squash-merge to keep history clean.

---

## Self-Review Notes (author)

- **Spec coverage:** ruhig background (T4 CSS + T10 body attr), hero float (T10), switcher (T4 switcher.js + T8 applySwitcher + T10/T11 markup), per-locale build (T8/T12), hreflang+canonical (T8), per-locale title/description (T5/T6 meta + T8 applyHead), sitemap/robots (T9), 5 locales incl. ES (T6), 4 legal pages × 5 langs incl. Terms (T1 content + T11 shell + T12 render), vendored lucide/no CDN (T4/T10), multi-stage Docker (T13), workflow unchanged (T13 keeps context=web/landing), verification + screenshots (T14). All covered.
- **Deviation flagged:** legal text canonical home is `web/landing/content/legal/` (not repo-root `docs/legal/`) due to Docker build context = `web/landing`. Raise with user at handoff.
- **Open value to confirm at build:** `SITE_ORIGIN=https://strido.net` (from Terraform `landing_domain`); overridable via env.
- **Known limitation:** German-source-keyed translation can't disambiguate identical source strings in different contexts (inherited from the handoff); missing keys fall back to German (visible, not blank).
