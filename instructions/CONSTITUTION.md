# Project Constitution

## 1. Context & Awareness

- **Source of Truth**: Always consult `README.md` and `Makefile` requests to understand the current architecture and API capabilities.
- **Project Status**: Pre-release. Data is ephemeral.

## 2. Product Terminology

- **Database/API Model**: In the relational model, an `asset` is the parent reviewable submission. One asset can contain one or more `videos` rows. These video rows are the individual uploaded or imported media parts that belong to the parent asset.
- **Code Naming**: Preserve the existing backend and database terminology in code, SQL, migrations, permissions, endpoint names, and logs. Use `asset` when referring to the parent entity and `video` when referring to a child media row or review target.
- **User-Facing Language**: In dashboard labels, empty states, emails, i18n keys, and other product copy, prefer the language users understand: a student uploads a **video**. If the parent submission contains multiple child media rows, describe them as **video parts**, **clips**, or **parts of the video** instead of exposing the database term `asset`.
- **Bridging Rule**: When implementation work crosses both layers, explicitly map the terms in comments, task documentation, or API docs where needed: product "video" equals the database/API `asset`; product "video part" or "clip" equals the database/API `video`.
- **Avoid Renaming Churn**: Do not rename established database tables, API fields, permissions, or backend types solely to match product copy. Prefer clear UI copy and localized labels over broad technical renames unless a task specifically requires a migration.

## 3. Database & Infrastructure

- **Environment**: We frequently restart the Docker environment (`make infra:restart`).
- **Configuration Parity**: When adding, removing, or renaming an environment variable or application configuration value, update every deployment surface in the same task. This includes `.env.example`, local setup docs when relevant, and Terraform files under `infra/terraform/` that declare, pass, or expose the value to Cloud Run or other managed resources.

## 4. Frontend & Design (Dashboard)

- **Framework**: Angular with Taiga UI.

- **Reference**: Follow patterns from another pages `web/dashboard/src/app/pages` for example.

- **Loading States**: Use Taiga UI skeleton placeholders for asynchronous content loading states. Do not show visible loading-status text for page sections, lists, cards, tables, or other content placeholders unless the state is a non-content operation that cannot be represented as a skeleton.

## 5. Quality Assurance

- **Build Check**: Always run a build (`make api:build` or `make web:build`) before marking a task as complete.
- **Verification**: Ensure no regressions are introduced.

## 6. Task Management

- **Protocol**: Follow the guidelines in [TASK_CONSTITUTION.md](TASK_CONSTITUTION.md).
- **Issues**: Check `ISSUES.md` for the roadmap and task status.

## 7. Commit Standards

- **Format**: Use Conventional Commits for all git commit messages.
- **Pattern**: Write commit subjects as `<type>(optional-scope): <description>`, for example `feat(coaching): align availability slots to duration grid`.
- **Types**: Prefer the standard types `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, and `style`.
- **Discipline**: Keep each commit focused on a single logical change and include the task folder in the same commit as the related code changes.

## 8. Logging Standards

- **Framework**: Structured logging using Go `log/slog` with JSON output
- **Guidelines**: Follow [LOGGING_CONSTITUTION.md](LOGGING_CONSTITUTION.md) for consistent logging practices
- **Key Points**:
  - Dependency inject `*slog.Logger` to all services
  - Use request-scoped loggers via `logger.From(ctx, h.logger)`
  - Stable event names in snake_case
  - Always log errors with `err` field
  - Never log sensitive data (tokens, passwords, full emails)
- **Reference**: Comprehensive guide in [docs/logging.md](../../docs/logging.md)

## 9. Troubleshooting & Knowledge Base

- **Common Issues**: Before debugging complex problems, check `instructions/common_issues/` for known solutions.
- **Documentation**: If you solve a non-trivial recurring issue, document it in `instructions/common_issues/` following the existing pattern. Use the helper script to generate a new task:

```bash
./instructions/scripts/create_task.sh "my task name"
```

## 10. Cleanup & Refactoring Discipline

- **Final Review**: Before completing any task, review all changed files to identify unnecessary files, dead code, temporary artifacts, or missed refactoring opportunities, and remove or improve them where appropriate.

## 11. Documentation Resources

- **LLM Docs**: Use these `llms.txt` or `llms-full.txt` (e.g. if you need to download it and do a search in the whole documentation) resources for comprehensive documentation:
  - **Angular**: `https://angular.dev/llms.txt` and `https://angular.dev/assets/context/llms-full.txt`
  - **Angular Primitives**: `https://angularprimitives.com/assets/llms/llms.txt` and `https://angularprimitives.com/assets/llms/llms-full.txt`
  - **Storybook**: `https://storybook.js.org/llms.txt` and `https://storybook.js.org/llms-full.txt`
  - **Taiga UI**: `https://taiga-ui.dev/v4/llms.txt` and `https://taiga-ui.dev/v4/llms-full.txt`
  - **Mux**: `https://www.mux.com/llms.txt` and `https://www.mux.com/llms-full.txt`
  - **Agora**: `https://docs.agora.io/en/llms.txt`
  - **WorkOS**: `https://workos.com/docs/llms.txt` and `https://workos.com/docs/llms-full.txt`
  - **Resend**: `https://resend.com/docs/llms.txt` and `https://resend.com/docs/llms-full.txt`
