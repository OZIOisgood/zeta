---
name: backend-api
description: Use for Go API handlers, permissions, sqlc queries, migrations, logging, configuration, email, Mux, Agora, WorkOS, or backend architecture changes in Zeta.
---

# Backend API Workflow

- Read the affected handler/service/query and the matching tests before editing.
- Keep SQL in `db/queries`; run `make db:sqlc` after query or schema changes.
- Keep migrations reversible with matching `.up.sql` and `.down.sql`.
- Check authorization and visibility for every group, asset, video, review, coaching, invitation, and preferences endpoint.
- If permissions change, update `internal/permissions/permissions.go` and tests.
- For config/env changes, also use the `infra-configuration` skill. Classify the value first, then update `.env.example`, application reads/tests, dev/prod deployment bindings, Terraform, provider settings, and docs wherever applicable.
- For logging, use request-scoped loggers in handlers, stable snake_case event names, `component`, and `err` for errors. Do not log secrets or raw PII.
- For email changes, update templates/locales together and consider `make email:preview` for visual inspection.
- For Mux, Agora, WorkOS, or Resend API uncertainty, use `.agents/references/llms.md` before guessing provider behavior.
- Verify with the narrow package test first, then `make test:unit` or `make api:build` based on blast radius.
