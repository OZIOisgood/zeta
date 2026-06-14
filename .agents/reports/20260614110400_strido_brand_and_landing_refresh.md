# Strido brand and landing refresh

## Context

The new landing export showed an editor-generated full-screen play thumbnail while unpacking, used a mostly uniform cream background, linked auth CTAs to production, and did not yet carry the Strido brand through the dashboard and email surfaces.

## Decision

- Keep Zeta as the technical name for packages, infrastructure, services, resources, and internal identifiers.
- Use Strido on user-facing landing, dashboard, translations, document titles, and emails.
- Materialize the landing export as static HTML/assets and remove its runtime React/Babel unpacker.
- Use alternating warm section bands and sport-neutral, equestrian-first decorative artwork.
- Keep email-compatible outer tables, but replace the visible detail table with friendly stacked cards.

## Areas touched

- `web/landing`: static export, dev auth links, section backgrounds, local assets, unpack helper.
- `web/dashboard-next`: Strido SVG/PNG/WebP assets, shell/login logo, titles, translations, Storybook.
- `internal/email`, `internal/i18n`, `cmd/email-preview`: Strido branding and redesigned notification previews.
- `.env.example`, deploy workflows, and README: new public email logo path.

## Verification

- Landing checked in Browser at desktop and 390px mobile; no bundler overlay, broken images, or horizontal overflow.
- Email previews checked in Browser at desktop and 390px mobile.
- `make web-next:lint`
- `make web-next:build`
- `make web-next:test` (105 tests)
- `make web-next:storybook:build`
- `go test ./internal/email ./internal/i18n -count=1`
- `make api:build`
- `make email:preview`
- Landing Docker image build
- Workflow YAML parse, runtime config audit, and `git diff --check`

## Follow-up

- Deploy the landing from `main` to publish the loading fix and dev auth links.
- The production dashboard/email logo path will become live with the next dev/prod dashboard and API deployments.
