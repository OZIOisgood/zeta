# Strido landing and email follow-up

## Context

Follow-up polish for the public Strido brand while preserving Zeta as the internal technical name.

## Decisions

- Reused the landing `--z-surface-warm` token for every alternating warm band and removed the Live-Coaching/Buchung gap.
- Added shared static-page CSS/JS, automatic copyright years, and placeholder Impressum, Datenschutz, and Kontakt pages.
- Replaced the legacy horse mark with a compact orange Strido `S` favicon/mark derived from the primary SVG wordmark.
- Removed `EMAIL_LOGO_URL`; email branding is now derived from `FRONTEND_URL`.
- Replaced visible email detail cards with natural localized sentences and safe inline emphasis.

## Files touched

- `web/landing/public/` landing, shared assets, and legal/contact placeholders.
- `web/dashboard-next/public/` and `src/assets/brand/strido/` favicon and brand variants.
- `internal/email/`, notification call sites, previews, and email locale files.
- `.github/workflows/`, `.env.example`, `README.md`, and Terraform env outputs for removed email logo config.

## Verification

- Browser: matching warm backgrounds, zero-pixel section gap, automatic year, working static-page links, and no visible email detail cards.
- `make test:unit`
- `make web-next:test`
- `make web-next:lint`
- `make web-next:build`
- `make api:build`
- `make email:preview`
- Terraform formatting and runtime config audit.

## Follow-ups

- Replace placeholder legal entity and privacy text before production launch.
- Local Docker landing build was stopped after the Docker daemon produced no output for several minutes; static browser verification succeeded.
