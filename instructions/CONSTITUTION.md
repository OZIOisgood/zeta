# Project Constitution

## 1. Context & Awareness

- **Source of Truth**: Always consult `README.md` and `Makefile` requests to understand the current architecture and API capabilities.
- **Project Status**: Pre-release. Data is ephemeral.

## 2. Database & Infrastructure

- **Migrations**: Since data is not yet valuable, prefer **editing existing migrations** to refine the schema rather than creating new ones.
- **Environment**: We frequently restart the Docker environment (`make docker-restart`).

## 3. Frontend & Design (Dashboard)

- **Framework**: Angular with Taiga UI.

- **Reference**: Follow patterns from another pages `web/dashboard/src/app/pages` for example.

## 4. Quality Assurance

- **Build Check**: Always run a build (`make build` or `make dashboard-build`) before marking a task as complete.
- **Verification**: Ensure no regressions are introduced.

## 5. Task Management

- **Protocol**: Follow the guidelines in [TASK_CONSTITUTION.md](TASK_CONSTITUTION.md).
- **Issues**: Check `ISSUES.md` for the roadmap and task status.

## 6. Troubleshooting & Knowledge Base

- **Common Issues**: Before debugging complex problems, check `instructions/common_issues/` for known solutions.
- **Documentation**: If you solve a non-trivial recurring issue, document it in `instructions/common_issues/` following the existing pattern. Use the helper script to generate a new task:

```bash
./instructions/scripts/create_task.sh "my task name"
```

## 7. Cleanup & Refactoring Discipline

- **Final Review**: Before completing any task, review all changed files to identify unnecessary files, dead code, temporary artifacts, or missed refactoring opportunities, and remove or improve them where appropriate.

## 8. Documentation Resources

- **LLM Docs**: Use these `llms-full.txt` resources for comprehensive documentation:
  - **Taiga UI**: https://taiga-ui.dev/llms-full.txt
  - **Mux**: https://www.mux.com/llms-full.txt
  - **WorkOS**: https://workos.com/docs/llms-full.txt
