# Comment Composer Redesign

## Context

Ticket #41 reports that the fixed bottom comment input on video detail is difficult to find. The supplied archive (`tmp/Comments input field redesign.zip`, SHA-256 `3e0c431e8d56f6bdfc3a7016e979306dd6f9ff28b0d655f88d1716a481405b52`) contains HTML design prototypes, before screenshots, and a self-contained implementation handoff.

## Decision and scope

- Removed the fixed, sidebar-offset bottom composer and its spacer.
- Placed the top-level composer directly below the Comments header on desktop and mobile.
- Kept the existing review API, permission gates, replies, thread ordering, and edit/delete/report behavior.
- Implemented the signed-off collapsed default with avatar, placeholder, and current timestamp.
- On activation, autofocuses a three-row textarea and reveals timestamp, AI enhancement, Cancel, and Comment controls.
- Supports Control/Command+Enter submission, success/error toasts, draft retention on failure, and reduced-motion-compatible entrance animation.
- The archive mentions future image attachments as motivation, but its confirmed scope does not add attachment behavior or an attachment button.

## Files touched

- `web/dashboard-next/src/app/pages/video-details/video-details-page.component.ts`
- `web/dashboard-next/src/app/pages/video-details/video-details-page.component.spec.ts`
- `web/dashboard-next/src/styles.scss`
- `web/dashboard-next/public/i18n/{en,de,fr}.json`

## Verification

- Focused Angular suite: 7 passed.
- Full frontend suite: 46 files, 158 tests passed.
- `make web-next:lint`: passed.
- `make web-next:build`: passed with existing bundle-size and CommonJS warnings.
- Browser smoke test reached the Angular app, but local `/auth/me` and `/auth/login` proxy requests failed because the API was not running, so authenticated visual comparison was not available.

## Follow-up

- Run authenticated desktop and narrow-viewport visual QA with the local API available.

## Follow-up adjustments

- Enlarged both root-comment and nested-reply Reply actions to a 36px-high padded target with hover and keyboard-focus surfaces.
- Strengthened the enhancement prompt to prohibit introductory labels.
- Normalized OpenRouter enhancement output centrally in `internal/llm` so a leading `Here is the enhanced feedback:` label is removed case-insensitively without altering the same phrase later in genuine feedback.
- Added helper and simulated-provider regression coverage.
- Verified with the focused Angular suite, `go test ./internal/llm`, the complete Go unit suite, frontend lint, and the production frontend build.
