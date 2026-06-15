# Design: Strido Landingpage v2 — Integration

## Context

`web/landing` is a static marketing site (nginx serves `public/`). v1 was materialized
yesterday from an export: a single self-contained `public/index.html` (inline design-system
CSS + German content), `assets/site.js` (reveal-on-scroll + lucide icons + current year),
vendored fonts under `assets/export/`, and Strido brand assets under `assets/brand/`. The
Dockerfile just `COPY`s `public/` into nginx; `deploy-landing.yml` `docker build`s
`web/landing/` and deploys to Cloud Run on push to `main` touching `web/landing/**`.

The design handoff `docs/design_handoff_landing_v2/` (untracked on `main`) is a **hi-fi
design reference** (its README is explicit: rebuild in the codebase's patterns, do not copy
the React/Babel/tweaks prototype). v1 already shares the handoff's `.lp-*` design language
and section structure, so this is a **v1 → v2 update of a static site**, not a rebuild.

Real, review-complete legal **texts** exist on the unmerged `docs/legal-pages` branch
(`docs/legal/{de,en,fr,nl,es}/{imprint,privacy,contact,terms}.md`), explicitly produced as
content only — page implementation was deferred to this task.

## Decisions (confirmed with user)

| Question | Decision |
|---|---|
| Scope | **Full v2**: landing restyle + i18n + legal pages |
| Background rhythm | **`ruhig`** (all-cream, no warm bands) — handoff's *verbindlich* default, overrides v1's alternating bands |
| i18n method | **Build-time per-locale static pages** (SEO best-practice): DE at `/`, plus `/en/ /fr/ /nl/ /es/`, with `hreflang` + `x-default` |
| Language switcher | **Navigation between locale URLs** (not runtime text-swap); choice persisted in `localStorage["strido_lang"]` |
| Legal pages | **Real reviewed texts**, **4 pages** incl. Nutzungsbedingungen (Terms), **5 langs** (DE/EN/FR/NL/ES) |
| Legal text source | **Squash-merge `docs/legal-pages` → `main` first**, then build reads canonical `docs/legal/` |
| ES landing copy | Handoff dictionary has **no Spanish** → author ES landing translations (DE source → ES), style-matched to EN/FR/NL; native-speaker review is a go-live task. ES legal text already exists. |
| Brand | User-facing **Strido**; technical identifiers stay **Zeta** |

## Architecture — build-time static generator

A small Node generator (`web/landing/scripts/build-site.mjs`) renders German source
templates into a per-locale static tree:

- **Text i18n**: reuse the handoff's **German-source-keyed dictionary** (extracted to JSON).
  Build-time DOM walk (`cheerio`): DE = identity; other locales look up each translatable
  text node; missing key → German fallback (matches handoff semantics). The handoff covers
  DE/EN/FR/NL; **Spanish (ES) landing strings are authored as part of this work** (DE source
  → ES) and added to the dictionary, style-matched to the existing locales.
- **Legal**: render Markdown → HTML (`markdown-it`) into the legal page shell.
- **Linking**: rewrite internal links to locale-prefixed URLs; set `<html lang>`, inject
  per-page `<link rel="alternate" hreflang=...>` for all locales + `x-default` (DE) and a
  self-referential `<link rel="canonical">`; set the switcher's current-language label and
  per-locale option hrefs (same page, other locale).
- **Per-locale head**: `<title>` and `<meta name="description">` are translated per locale
  (treated as i18n keys, not only visible body text).
- **SEO files**: generate `sitemap.xml` (all locale URLs with `hreflang` alternates) and
  `robots.txt` (allow + sitemap reference).
- **No generated files in git**: a **multi-stage Dockerfile** (`node:20-alpine` builder runs
  the generator → `nginx:1.27-alpine` serves `dist/`). `deploy-landing.yml` is unchanged
  (it already only `docker build`s).

### Output tree (`dist/`)
```
index.html                              # DE landing
imprint.html privacy.html contact.html terms.html   # DE legal
en/index.html  en/imprint.html ...      # EN mirror
fr/...  nl/...  es/...                  # FR, NL, ES mirrors
assets/                                 # css, js, brand, fonts
```

### New `web/landing` source layout
```
web/landing/
  src/
    templates/   landing.html (German v2 source) + legal-shell.html
    styles/      colors_and_type.css + landing.css + landing-v2.css  (from handoff)
    i18n/        landing.de.json / .en.json / .fr.json / .nl.json
    assets/      brand/, fonts (export woff2), site.js, switcher.js
  scripts/build-site.mjs
  package.json   (cheerio, markdown-it; build script)
  Dockerfile     (multi-stage)
  nginx.conf     (per-locale aware)
  (public/ is removed; dist/ is generated, git-ignored)
```

## Landing v2 deltas (evolve v1, do not rebuild)

v1's `index.html` already has the v2 sections and `.lp-*` classes. Transform it into the
German source template and apply only the v2 deltas, using the handoff CSS
(`colors_and_type.css` + `landing.css` + `landing-v2.css`) as the styling source of truth:

- `data-bg-rhythm="ruhig"` default — remove warm section bands; keep the `.lp-free-band`
  warm strip (always warm per handoff).
- Hero floating comment-card (`.lp-hero-float`) overlapping the hero visual.
- Header **language switcher** (globe icon + DE/EN/FR/NL/ES dropdown).
- Mockup / spacing / radius / shadow polish per `landing-v2.css`.
- Keep reveal-on-scroll + lucide icon injection (`site.js`) — orthogonal to i18n. Vendor
  lucide locally (no CDN) so pages have no external runtime dependency.
- Hero/audience photos stay as placeholder slots (real media is a go-live task).

## Legal pages

- 4 docs × 5 langs = **20 pages**, slugs `imprint|privacy|contact|terms` (consistent across
  locales, locale = folder — matches the legal branch convention), localized H1 from the MD.
- Rendered into the legal shell (own header with switcher + "back to home", footer, same
  brand). Keep the **"final legal review before go-live" banner**; `{{PLACEHOLDERS}}` remain
  for humans to fill.
- Footer (landing + legal) links: **Impressum · Datenschutz · Kontakt · Nutzungsbedingungen**
  (localized labels), per the legal plan's footer recommendation.
- Contact page renders the contact form markup (not wired to a backend — go-live task).

## Infra / deploy

- **Dockerfile** → multi-stage (builder runs generator → nginx serves `dist/`).
- **nginx.conf** → keep `try_files`; ensure `/en/` etc. resolve to their `index.html`;
  retain security headers + asset caching; add a small first-visit Accept-Language redirect
  at `/` (DE stays canonical, respects an existing `strido_lang` choice).
- **deploy-landing.yml** → unchanged.
- `.gitignore` → add `web/landing/dist/`.

## Verification

- `docker build` the landing image; run it; browser-check **each locale** at desktop +
  390px: no horizontal overflow, no FOUC, switcher navigates to the correct locale URL,
  `hreflang` tags present and correct, legal pages render with banner + footer links.
- Validate generator output: every page has the right `<html lang>`, untranslated strings
  fall back to German (not blank), all internal links resolve within `dist/`.
- Capture emulator/browser screenshots of affected screens for the PR (project rule).
- `git diff --check`; confirm no secrets/PII introduced.

## Out of scope (go-live human tasks)

Real photos / hero GIF, real testimonials, **final legal review + filling `{{PLACEHOLDERS}}`**,
contact-form backend wiring, the tweaks-panel (dropped). **Native-speaker review of all
translations** — especially the newly authored **ES landing copy** — before go-live.

## Sequencing / branch

1. Squash-merge `docs/legal-pages` → `main` (additive, review-complete docs).
2. Create `feat/landing-v2` off the updated `main` (in the `zeta-main` checkout).
3. Implement generator + templates + styles + legal, restyle to v2, infra changes.
4. Verify, screenshot, squash-merge as a single landing PR.

## Risks / follow-ups

- **German-source-keyed i18n** is whitespace/punctuation sensitive; the build must report any
  source string lacking a translation (warn, fall back to DE) so drift is visible.
- Introduces the landing's first build step + two npm deps — keep the generator small and
  dependency-light.
- ES landing copy is authored fresh (not in the handoff dict) → mark as agent-authored and
  flag for native-speaker review before go-live; DE stays the source of truth. ES legal text
  is the already-reviewed version from the legal branch.
