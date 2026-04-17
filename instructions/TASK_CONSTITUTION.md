# Task Constitution

## 1. Philosophy

Every significant change or feature implementation must be tracked as a discrete task. This ensures traceability, context preservation, and a clear history of decisions.

## 2. Task Structure

All tasks are stored in the `instructions/tasks/` directory at the project root.

### Naming Convention

Folder name: `YYYYMMDDHHMMSS_snake_case_description`
Example: `20251214210000_fix_dialog_icon`

### Directory Contents

Each task folder must contain:

1.  **`README.md`**: The problem statement, requirements, and context. (Renamed from `task.md` for better tool support).
2.  **`RESOLUTION.md`**: A summary of the changes made, technical decisions, and verification steps.

### Content Guidelines

- **Professional Tone**: Write all documentation in a distinct, formal, and professional manner. Avoid casual language (e.g., "cos", "I want", "maybe").
- **Clarity**: Use clear, concise statements for requirements and descriptions.
- **Structure**: Properly use headers, lists, and bold text to improve readability.

### Diagrams

- **Use Mermaid exclusively** for all diagrams (no ASCII art). Mermaid renders natively in GitHub and most Markdown viewers.
- Choose the appropriate diagram type for the content:
  - `sequenceDiagram` — API call flows, multi-participant interactions.
  - `graph LR` / `graph TD` — User journeys, workflows, architecture overviews.
  - `erDiagram` — Database schema and entity relationships.
- Keep diagrams focused. Prefer multiple small diagrams over one overloaded diagram.
- Place diagrams in the **Architecture** section of `README.md`.

## 3. Workflow

### 1. Creation

Use the helper script to generate a new task:

```bash
./instructions/scripts/create_task.sh "my task name"
```

This creates the folder and template files.

### 2. Definition

Fill out `README.md` with:

- **User Story/Requirement**: As a <role>, I want <feature>...
- **Permissions**: Explicitly state whether the feature requires new permissions or reuses existing ones. Reference `internal/permissions/permissions.go` for the current permission set. If new permissions are needed, specify the permission name, which roles should have it, and where it will be enforced (handler/middleware).
- **Context**: Links to relevant files, existing issues, or design docs.
- **Acceptance Criteria**: What defines "done".

### 3. Execution

- Implement the changes.
- Follow the **Project Constitution** for coding standards and QA.

### 4. Resolution

Fill out `RESOLUTION.md` with:

- **Summary**: What was changed.
- **Verification**: How it was tested (e.g., "Ran `make web:build`", "Checked UI").
- **Next Steps**: Any follow-up tasks.

### 5. Completion

- **Update root `README.md`**: If the task introduces or modifies database tables, API flows, system architecture, or user journeys, update the corresponding Mermaid diagrams and documentation in the root `README.md`. This is the single source of truth for the project's architecture.
  - Add new entities to the `erDiagram` block.
  - Add or update `sequenceDiagram` / `graph` blocks for new flows.
  - Update feature descriptions and setup instructions as needed.
- Mark the item as done in `ISSUES.md` if applicable.
- Commit the task folder along with the code changes.
