# Strido Landingpage v2 — Integration (completion)

## Context

Integrated the `docs/design_handoff_landing_v2` hi-fi handoff into `web/landing`, upgrading
the static marketing site from v1 to v2 and adding full multilingual support. Work done in
the `zeta-main` checkout on branch `feat/landing-v2`. Plan: `.agents/plans/20260615090032_landing_v2_integration_plan.md`;
design: `.agents/plans/20260615085244_landing_v2_integration_design.md`.

## Decisions

- **Full v2 scope**: landing restyle (`ruhig` all-cream background, hero floating comment
  card, header language switcher) + DE/EN/FR/NL/**ES** i18n + 4 legal pages × 5 langs.
- **Build-time per-locale static generation** (SEO best-practice): German source templates +
  a small Node generator (`cheerio` text translation via the handoff's German-source
  dictionary, `markdown-it` for legal pages) emit a per-locale `dist/` tree (de at `/`, others
  under `/en/ /fr/ /nl/ /es/`) with `hreflang` + `x-default` + self-canonical, plus
  `sitemap.xml` and `robots.txt`. 25 pages total (5 locales × (1 landing + 4 legal)).
- **Language switcher = navigation between locale URLs** (not runtime text-swap); choice
  persisted in `localStorage["strido_lang"]`; first-visit `/` redirect by `navigator.language`.
- **Spanish landing copy authored here** (handoff had no ES) — agent-authored, pending
  native-speaker review. ES legal text is the already-reviewed version from the legal branch.
- **Legal texts**: squash-merged `docs/legal-pages` → `main`, then relocated into
  `web/landing/content/legal/` (single source of truth, inside the Docker build context).
- **Self-hosted everything** (no CDN): vendored Inter `@font-face` + lucide locally (the
  handoff's Google-Fonts `@import` was stripped — important for a GDPR-facing EU site).
- **Multi-stage Dockerfile** runs the generator at image build; `deploy-landing.yml`
  unchanged; `nginx.conf` extended to also emit the security headers on static-asset
  responses (build context stays `web/landing`).

## Files touched

- `web/landing/` — new build: `package.json`, `.gitignore`, `.dockerignore`, `Dockerfile`
  (multi-stage), `scripts/build-site.mjs` + `scripts/extract-dict.mjs` + `scripts/lib/{config,i18n,pages,seo}.mjs`
  (+ `*.test.mjs`), `src/templates/{landing,legal-shell}.html`, `src/styles/{fonts,colors_and_type,landing,landing-v2,legal}.css`,
  `src/assets/{brand,fonts,lucide.min.js,site.js,switcher.js}`, `src/i18n/{landing,legal,meta}.<locale>.json`,
  `content/legal/{de,en,fr,nl,es}/{imprint,privacy,contact,terms}.md`. Removed obsolete
  `public/` + `scripts/unpack-export.mjs`.
- `main`: `web/landing/content/legal/**` (reviewed legal texts, via squash-merge + relocate).
- `docs/design_handoff_landing_v2/**` committed as the design reference.

## Verification

- **Unit**: `node --test` — 15/15 pass (config, i18n incl. quote-tolerance, pages, seo).
- **Build**: `npm run build` → 25 HTML pages; per-locale `lang`, canonical + 6 hreflang,
  switcher 5 options, 0 relative-asset leaks, 25 sitemap `<loc>`.
- **i18n completeness**: leak scan (quote-normalized) → only intentional non-translatables
  remain (person names, "Strido", sports, "Feedback"); built ES page shows 0 German tells.
- **Docker**: multi-stage image builds (generator runs in-image); container serves
  health + `/`, `/en/`, `/es/terms.html`, `/fr/privacy.html`, `/sitemap.xml` → all 200.
- **Browser** (nginx/dist, desktop 1280 + mobile 390): EN landing renders all sections
  translated with correct `ruhig`/dark/free-band backgrounds; switcher dropdown styled with
  all 5 languages; legal page header/eyebrow/title/banner/markdown content correct; mobile
  has no horizontal overflow (scrollWidth == clientWidth); **0 console errors**.
- Screenshots captured (EN full landing, switcher open, EN imprint, EN mobile) — see
  `/home/heinrich/landing-v2-screenshots/` for PR attachment.
- **Final adversarial code review** (whole branch): APPROVE WITH NITS; the two important
  findings (security headers missing on static-asset responses; a latent unsafe
  meta-description fallback) were fixed and re-verified (headers present on `/assets/*`,
  15/15 tests still pass).

## Follow-ups (go-live human tasks — not code)

- Replace hero/audience placeholders with real photos + a hero riding GIF.
- Replace placeholder testimonials with real quotes.
- Fill the 9 operator values in `web/landing/content/legal/values.json` (GbR name, both
  names, address, email, authority, date) — substituted into the legal pages at build time;
  unfilled ones stay visible as `{{KEY}}` and the build warns. Build the prod image with
  `STRICT_PLACEHOLDERS=1` to fail if any remain. Plus final lawyer review.
- Wire the contact form to a backend (currently markup only).
- **Native-speaker review of the ES landing copy** (legal ES already reviewed).
- Footer copyright year is static `2026` (so the tagline matches one dictionary key); update
  yearly or revisit if a dynamic + translated tagline is wanted.

## Notes / deviations

- Legal canonical home is `web/landing/content/legal/` (not repo-root `docs/legal/`), required
  because the Docker build context is `web/landing`. Flagged and accepted during planning.
- `SITE_ORIGIN` defaults to `https://strido.net` (Terraform `landing_domain`), env-overridable.
