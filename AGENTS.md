# Zeta Agent Guide

## Project Shape

- Zeta is a pre-release digital video coaching platform. Data can be ephemeral, but do not discard user work or local changes.
- Backend: Go API, PostgreSQL, sqlc, WorkOS auth, Mux video, Agora live coaching, Resend email.
- Frontend: Angular dashboard in `web/dashboard-next` using Tailwind CSS, Angular Primitives (`ng-primitives`), Transloco, NgRx Signal Store, Storybook, and lucide-angular.
- Mobile app: Expo/React Native in `mobile/` using expo-router, NativeWind (Zeta design tokens), i18next (synced Transloco JSONs), and a typed openapi-fetch client generated from `docs/openapi.yaml`.
- Start with `README.md`, `Makefile`, and nearby code before changing behavior.

## Commands

- Backend build: `make api:build`
- Backend tests: `make test:unit`; integration tests: `make test:integration`
- SQL generation after query/schema changes: `make db:sqlc`
- Frontend lint: `make web-next:lint`
- Frontend build: `make web-next:build`
- Frontend tests: `make web-next:test`
- Storybook build when shared UI changes: `make web-next:storybook:build`
- Mobile lint: `make mobile:lint`; tests: `make mobile:test`; typecheck: `make mobile:typecheck`
- Local infra is commonly restarted with `make infra:restart`.

## Durable Workflow

- Use `.agents/plans/` for new implementation plans and `.agents/reports/` for completion reports, audits, and investigation notes.
- Name new records `YYYYMMDDHHMMSS_snake_case_title.md`.
- Keep records short: context, decision, files touched, verification, and follow-ups.
- Historical task context is summarized in `.agents/reports/20260604170000_legacy_task_baseline.md`.
- External LLM-friendly docs are listed in `.agents/references/llms.md`.
- Use skills in `.agents/skills/` for repeatable workflows. Claude Code discovers them through the `.claude/skills` compatibility link; Codex discovers them directly.

## Product Terms

- Backend/database/API: an `asset` is the parent reviewable submission; `videos` rows are uploaded or imported media parts.
- UI/copy/emails/i18n: users upload and review a `video`. If needed, call child media rows `video parts`, `clips`, or `parts`.
- Do not rename stable tables, API fields, permissions, logs, or backend types just to match product copy.

## Backend Rules

- Preserve existing handler/service/query boundaries under `internal/`.
- Use structured `log/slog` JSON logging. Inject `*slog.Logger`; in handlers use `logger.From(ctx, h.logger)`.
- Log stable snake_case event names, include `component`, and log errors with the `err` field.
- Never log tokens, cookies, passwords, API keys, full email bodies, or raw PII such as full email addresses.
- When env/config changes, update `.env.example`, docs if relevant, and Terraform wiring under `infra/terraform/` in the same task.
- Update README diagrams when database tables, API flows, architecture, or user journeys change.

## Frontend Rules

- Reuse `web/dashboard-next/src/app/shared/ui` components before creating new primitives.
- Before planning UI with Angular Primitives, inspect both existing `z-*` wrappers and available `ng-primitives` modules.
- Prefer skeleton placeholders for async content loading. Avoid visible loading text for page sections, lists, cards, tables, and content placeholders.
- Keep Angular code strict-template friendly. Prefer signals/store patterns already used in nearby files.
- Use Transloco for user-facing text when the existing area is localized.
- Use lucide-angular icons where an icon control is expected.

## Review Guidelines

- Prioritize correctness, authorization/visibility regressions, data leaks, config drift, missing tests, and broken build paths.
- Check permission changes against `internal/permissions/permissions.go`.
- For UI reviews, check responsive layout, accessible primitives, keyboard behavior, loading/empty/error states, and copy terminology.
- For logging reviews, treat sensitive data in logs as high severity.

## Subagents

- Use subagents for read-heavy parallel work: code exploration, review passes, test-gap scans, or migration impact analysis.
- Keep write-heavy work in the main thread unless the user explicitly asks for parallel implementation.
- Useful project agents are defined in `.codex/agents/` for Codex and `.claude/agents/` for Claude Code.
