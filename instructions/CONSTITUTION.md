# Project Constitution

## 1. Context & Awareness

- **Source of Truth**: Always consult `README.md` and `Makefile` requests to understand the current architecture and API capabilities.
- **Project Status**: Pre-release. Data is ephemeral.

## 2. Database & Infrastructure

- **Environment**: We frequently restart the Docker environment (`make infra:restart`).

## 3. Frontend & Design (Dashboard)

- **Framework**: Angular with Taiga UI.

- **Reference**: Follow patterns from another pages `web/dashboard/src/app/pages` for example.

- **Loading States**: Use Taiga UI skeleton placeholders for asynchronous content loading states. Do not show visible loading-status text for page sections, lists, cards, tables, or other content placeholders unless the state is a non-content operation that cannot be represented as a skeleton.

## 4. Quality Assurance

- **Build Check**: Always run a build (`make api:build` or `make web:build`) before marking a task as complete.
- **Verification**: Ensure no regressions are introduced.

## 5. Task Management

- **Protocol**: Follow the guidelines in [TASK_CONSTITUTION.md](TASK_CONSTITUTION.md).
- **Issues**: Check `ISSUES.md` for the roadmap and task status.

## 6. Commit Standards

- **Format**: Use Conventional Commits for all git commit messages.
- **Pattern**: Write commit subjects as `<type>(optional-scope): <description>`, for example `feat(coaching): align availability slots to duration grid`.
- **Types**: Prefer the standard types `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, and `style`.
- **Discipline**: Keep each commit focused on a single logical change and include the task folder in the same commit as the related code changes.

## 7. Logging Standards

- **Framework**: Structured logging using Go `log/slog` with JSON output
- **Guidelines**: Follow [LOGGING_CONSTITUTION.md](LOGGING_CONSTITUTION.md) for consistent logging practices
- **Key Points**:
  - Dependency inject `*slog.Logger` to all services
  - Use request-scoped loggers via `logger.From(ctx, h.logger)`
  - Stable event names in snake_case
  - Always log errors with `err` field
  - Never log sensitive data (tokens, passwords, full emails)
- **Reference**: Comprehensive guide in [docs/logging.md](../../docs/logging.md)

## 8. Troubleshooting & Knowledge Base

- **Common Issues**: Before debugging complex problems, check `instructions/common_issues/` for known solutions.
- **Documentation**: If you solve a non-trivial recurring issue, document it in `instructions/common_issues/` following the existing pattern. Use the helper script to generate a new task:

```bash
./instructions/scripts/create_task.sh "my task name"
```

## 9. Cleanup & Refactoring Discipline

- **Final Review**: Before completing any task, review all changed files to identify unnecessary files, dead code, temporary artifacts, or missed refactoring opportunities, and remove or improve them where appropriate.

## 10. Documentation Resources

- **LLM Docs**: Use these `llms.txt` or `llms-full.txt` resources for comprehensive documentation:
  - **Taiga UI**: `https://taiga-ui.dev/v4/llms.txt` and `https://taiga-ui.dev/v4/llms-full.txt`
  - **Mux**: `https://www.mux.com/llms.txt` and `https://www.mux.com/llms-full.txt`
  - **Agora**: `https://docs.agora.io/en/llms.txt`
  - **WorkOS**: `https://workos.com/docs/llms.txt` and `https://workos.com/docs/llms-full.txt`
  - **Resend**: `https://resend.com/docs/llms.txt` and `https://resend.com/docs/llms-full.txt`
