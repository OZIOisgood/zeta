# Resolution

## Summary
- Added an embedded email rendering package using Go `html/template`, `go:embed`, a shared notification layout, and CSS inlining through `go-premailer`.
- Migrated invitation, group membership, video, booking, cancellation, and reminder notifications to templated HTML emails with generated text fallbacks.
- Added `cmd/email-preview` and `make email:preview` to render fake local notification previews into `build/email-previews/`.

## Technical Details
- Email styling uses static, email-safe values that mirror the dashboard's Taiga-style neutral surfaces, borders, typography, and `#526ed3` action color.
- The shared email layout renders the hosted Zeta app icon. `EMAIL_LOGO_URL` can override it; otherwise the renderer uses `FRONTEND_URL + /app-full-icon.png` or the hosted dev icon.
- Follow-up styling alignment centered CTA buttons and sized the full logo proportionally to avoid horizontal squeezing.
- Deployment configuration now exposes the logo URL through Terraform outputs and passes `EMAIL_LOGO_URL` to Cloud Run API deployments for both dev and prod.
- The `email.Sender` interface now includes `SendTemplate` while preserving `Send` for plain-text fallback or future narrow use cases.
- Local preview output is ignored through `.gitignore` because previews are generated artifacts.
- `ISSUES.md` was referenced by the constitution but was not present at the repository root.

## Verification
- [x] Build passed with `make api:build`.
- [x] Rendered local previews with `go run ./cmd/email-preview`.
- [x] Unit tests passed with `make test:unit`.

## Tests
- Added renderer tests for CSS inlining, text fallback generation, and unknown template errors.
- Updated coaching email mock expectations for templated delivery.

## Next Steps
- None.
