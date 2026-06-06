# Claude Agent Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the Claude-side AI-support artifacts into one consistent, self-contained set of subagents with stable domain-based names and a working skills link.

**Architecture:** Remove the duplicate skill-based reviewer pair, salvage their unique review dimensions into the self-contained reviewers, rename all dev/review agents onto a single domain axis (`backend-*` / `frontend-*`), replace stale `instructions/` references with `AGENTS.md` + explicit `.agents/skills` read-pointers, and repair the broken `.claude/skills` symlink. No backend/frontend application code changes.

**Tech Stack:** Markdown agent definitions in `.claude/agents/`, shared `SKILL.md` files in `.agents/skills/`, a POSIX symlink for skill discovery, git for renames/commits. All shell commands run inside WSL.

**Environment note:** This repo lives on WSL (`/home/heinrich/dev/projects/zeta`). From Windows, every shell command below is run as:
`wsl.exe -d ubuntu bash -lc 'cd /home/heinrich/dev/projects/zeta && <command>'`
The commands in this plan are written as the inner `<command>` (already `cd`-ed into the repo root).

**Out of scope (explicit):**
- Codex artifacts (`.codex/agents/*.toml`). The evaluation was narrowed to Claude. The Codex `dashboard-reviewer.toml` name will diverge from the new `frontend-reviewer` — see Follow-ups.
- The `explore` and `commit` agents keep their names (already domain-neutral); `commit` gets only a stale-reference fix.
- Application code under `internal/` and `web/dashboard-next/`.

**Final agent set after this plan:** `backend-dev`, `backend-reviewer`, `frontend-dev`, `frontend-reviewer`, `explore`, `commit`.

---

## File Map

| File | Action | Responsibility after change |
|---|---|---|
| `.claude/skills` (symlink) | Repair | Resolve to `../.agents/skills` so main-thread skill discovery works |
| `.claude/agents/backend-reviewer.md` (old, skill-based) | Delete | — (duplicate of `go-reviewer`) |
| `.claude/agents/dashboard-reviewer.md` (old, skill-based) | Delete | — (duplicate of `web-reviewer`) |
| `.claude/agents/go-reviewer.md` | Rename → `backend-reviewer.md` + enrich | Self-contained backend diff reviewer |
| `.claude/agents/web-reviewer.md` | Rename → `frontend-reviewer.md` + enrich | Self-contained frontend diff reviewer |
| `.claude/agents/go-dev.md` | Rename → `backend-dev.md` + fix refs | Backend feature dev agent |
| `.claude/agents/web-dev.md` | Rename → `frontend-dev.md` + fix refs | Frontend feature dev agent |
| `.claude/agents/commit.md` | Edit | Commit agent; record paths corrected |
| `.claude/agents/explore.md` | Unchanged | Read-only explorer |

---

## Task 1: Repair the `.claude/skills` symlink

The link is committed in git as a symlink (mode `120000` → `../.agents/skills`) but is materialized as a 17-byte regular file in this checkout, so skill discovery does not resolve.

**Files:**
- Modify: `.claude/skills` (replace regular file with the symlink git already expects)

- [ ] **Step 1: Confirm the broken state**

Run:
```bash
ls -l .claude/skills && git ls-files -s .claude/skills
```
Expected: `ls -l` shows a regular file (`-rw-r--r-- ... 17 ... skills`), while git shows mode `120000` for `.claude/skills`. The mismatch is the bug.

- [ ] **Step 2: Recreate the symlink and enable symlink checkout**

Run:
```bash
git config core.symlinks true
rm -f .claude/skills
ln -s ../.agents/skills .claude/skills
```

- [ ] **Step 3: Verify the link resolves and matches the committed object**

Run:
```bash
ls -l .claude/skills && test -d .claude/skills && test -f .claude/skills/dashboard-ui/SKILL.md && echo RESOLVES && git status --short .claude/skills
```
Expected: `ls -l` shows `skills -> ../.agents/skills`; prints `RESOLVES`; `git status --short` prints nothing (working tree now matches the committed symlink).

- [ ] **Step 4: Commit**

```bash
git add .claude/skills
git commit -m "fix(agents): restore .claude/skills symlink for skill discovery"
```
Note: if `git status --short` was already empty in Step 3, the working tree matched the committed symlink and there is nothing to commit — skip this commit and continue.

---

## Task 2: Delete the duplicate skill-based reviewers

These two agents duplicate `go-reviewer` / `web-reviewer` with weaker scope (no `tools:` restriction) and a non-functional `skills:` dependency. Their unique review dimensions are salvaged in Tasks 3–4 of this plan, so deleting them loses nothing.

**Files:**
- Delete: `.claude/agents/backend-reviewer.md`
- Delete: `.claude/agents/dashboard-reviewer.md`

- [ ] **Step 1: Confirm these are the skill-based versions before deleting**

Run:
```bash
grep -l "skills:" .claude/agents/backend-reviewer.md .claude/agents/dashboard-reviewer.md
```
Expected: both file paths printed (both contain a `skills:` frontmatter block — i.e. these are the duplicates, not the detailed reviewers).

- [ ] **Step 2: Delete both files**

Run:
```bash
git rm .claude/agents/backend-reviewer.md .claude/agents/dashboard-reviewer.md
```

- [ ] **Step 3: Verify they are gone and the detailed reviewers remain**

Run:
```bash
ls .claude/agents/
```
Expected: lists `go-reviewer.md`, `web-reviewer.md`, `go-dev.md`, `web-dev.md`, `commit.md`, `explore.md` — and NO `backend-reviewer.md` / `dashboard-reviewer.md`.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(agents): remove duplicate skill-based reviewers"
```

---

## Task 3: Rename + enrich the backend reviewer

Rename `go-reviewer.md` → `backend-reviewer.md` (domain axis), add the owner framing, the email/locale-parity dimension (from the `backend-api` skill), and richer test nuance (from the `go-testing-patterns` skill).

**Files:**
- Rename: `.claude/agents/go-reviewer.md` → `.claude/agents/backend-reviewer.md`
- Modify: full contents replaced (see Step 2)

- [ ] **Step 1: Rename the file with git**

Run:
```bash
git mv .claude/agents/go-reviewer.md .claude/agents/backend-reviewer.md
```

- [ ] **Step 2: Replace the file contents**

Write `.claude/agents/backend-reviewer.md` with exactly:

```markdown
---
name: backend-reviewer
description: Code reviewer for the Zeta Go API. Reviews handlers, sqlc usage, migrations, permissions, logging, and tests. Works from the diff, read-only — no edits.
tools: Read, Bash, Glob, Grep
---

You are a backend code reviewer for Zeta — review changes like an API owner. You do not edit code; you report findings.

## Input

Always review from the diff, not full file state. Start with:

```
git diff HEAD
```

or for a branch: `git diff main...HEAD`. Read full files only when a diff hunk is ambiguous.

## What you focus on

- **Routing/wiring** — new handlers actually registered in `internal/api/server.go`; correct middleware group (public vs `auth.RequireAuth` vs scheduler-secret `/internal/coaching/*`).
- **Permissions & visibility** — access checks go through `internal/permissions`; review/finalize endpoints enforce both the permission *and* visibility of the target. Students see only their own assets/videos.
- **sqlc discipline** — no hand-edits to `internal/db`; query changes live in `db/queries/*.sql`; schema changes have a matching migration in `db/migrations/` with an up *and* down file.
- **Logging constitution** — `logger.From(ctx, ...)`; stable `snake_case` events; `err` + `component` fields on errors; validation = WARN not ERROR; no tokens/passwords/PII logged.
- **Terminology** — `asset` (parent) vs `video` (child) not conflated; DB/API fields not renamed to UI copy.
- **Config parity** — new env vars reflected in `.env.example` and `infra/terraform/`.
- **Email/locale parity** — when email templates change, the matching locale entries change with them; flag a template touched without its locales (or vice versa).
- **Tests** — table-driven with cases named by *behavior* (`missing group returns forbidden`), not implementation; assert externally visible behavior (status codes, response shape), not incidental row order or full error-string matches; mocks regenerated (`make mocks`); permission/visibility edge cases covered.
- **Security** — no hardcoded secrets, no sensitive data in logs or responses.

## Output

Group findings as **BLOCKER / MAJOR / MINOR / NIT**, each with a `file:line` and a concrete fix. If the diff is clean, say so plainly.
```

- [ ] **Step 3: Verify name, scope, and salvaged dimensions are present**

Run:
```bash
grep -E "^name: backend-reviewer|Email/locale parity|named by \*behavior\*|like an API owner" .claude/agents/backend-reviewer.md
```
Expected: four matching lines (the renamed `name:`, the email-parity bullet, the behavior-named tests nuance, and the owner framing).

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/backend-reviewer.md
git commit -m "refactor(agents): rename go-reviewer to backend-reviewer and fold in skill content"
```

---

## Task 4: Rename + enrich the frontend reviewer

Rename `web-reviewer.md` → `frontend-reviewer.md`, fix the stale `instructions/CONSTITUTION.md` reference, and add the dimensions only the `dashboard-ui` skill covered: shared `z-*` reuse, accessibility, loading/empty/error states, responsive, and strict-template safety.

**Files:**
- Rename: `.claude/agents/web-reviewer.md` → `.claude/agents/frontend-reviewer.md`
- Modify: full contents replaced (see Step 2)

- [ ] **Step 1: Rename the file with git**

Run:
```bash
git mv .claude/agents/web-reviewer.md .claude/agents/frontend-reviewer.md
```

- [ ] **Step 2: Replace the file contents**

Write `.claude/agents/frontend-reviewer.md` with exactly:

```markdown
---
name: frontend-reviewer
description: Code reviewer for the Zeta Angular dashboard (ng-primitives + Tailwind). Reviews components, signals, routing, i18n, accessibility, responsive layout, and SDK usage. Works from the diff, read-only — no edits.
tools: Read, Bash, Glob, Grep
---

You are a frontend code reviewer for Zeta — review changes like a frontend owner. You do not edit code; you report findings.

## Input

Review from the diff: `git diff HEAD` (or `git diff main...HEAD`). Read full files only when a hunk is ambiguous. The active frontend is `web/dashboard-next`; the legacy `web/dashboard` is being phased out, so flag new code that imitates its Taiga/ngx-translate patterns.

## What you focus on

- **Structure** — new pages/components mirror existing ones under `src/app/{pages,features,shared}`; logic lives in `core`/services, not bloated components.
- **Shared UI reuse** — existing `z-*` wrappers in `src/app/shared/ui` (buttons, dialogs, selects, tabs, skeletons, inputs, badges, toasts, …) are reused before raw `ng-primitives`; no reinventing a wrapper or a primitive that already exists.
- **Type safety & strict templates** — no `any`; inputs/outputs and signals correctly typed; code stays strict-template friendly (no template expressions that break Angular strict mode).
- **Accessibility** — keyboard interaction, focus handling, ARIA semantics, and disabled states come from primitives or established local patterns, not reimplemented ad hoc.
- **States** — loading uses `z-skeleton`/skeleton patterns (not visible loading text); empty, error, disabled, and permission-gated states are handled where the workflow needs them.
- **Responsive** — narrow-screen / small-viewport behavior is considered for new surfaces.
- **i18n (Transloco)** — every user-facing string goes through `@jsverse/transloco`; no hardcoded copy; keys added to the locale files. (Do **not** expect ngx-translate.)
- **Terminology** — UI copy says **video** / **video parts**; DB/API field names not renamed in the client to match copy (per the product-terminology rules in `AGENTS.md`).
- **UI layer** — idiomatic **ng-primitives** + **TailwindCSS v4** usage; **Lucide** icons via `@lucide/angular`; no reintroduction of Taiga UI.
- **Signals & state** — `signal()`/`computed()`/`effect()` and `@ngrx/signals` stores used correctly; no leftover unmanaged subscriptions.
- **Mux/Agora** — `@mux/mux-player` and `agora-rtc-sdk-ng` usage matches existing patterns; no leaked tokens/credentials in the client.
- **Tests** — Vitest specs present for non-trivial logic; meaningful assertions.

## Output

Group findings as **BLOCKER / MAJOR / MINOR / NIT**, each with a `file:line` and a concrete fix. If the diff is clean, say so plainly.
```

- [ ] **Step 3: Verify rename, salvaged dimensions, and no stale reference**

Run:
```bash
grep -E "^name: frontend-reviewer|Accessibility|z-skeleton|strict-template|narrow-screen" .claude/agents/frontend-reviewer.md && echo "---stale check---" && grep -c "instructions/" .claude/agents/frontend-reviewer.md
```
Expected: the five dimension lines print, then `---stale check---`, then `0` (no `instructions/` references remain).

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/frontend-reviewer.md
git commit -m "refactor(agents): rename web-reviewer to frontend-reviewer and fold in skill content"
```

---

## Task 5: Rename + fix the backend dev agent

Rename `go-dev.md` → `backend-dev.md`, replace the dead `instructions/*` reads with `AGENTS.md` plus explicit `.agents/skills` read-pointers, and update the closing cross-reference to `backend-reviewer`.

**Files:**
- Rename: `.claude/agents/go-dev.md` → `.claude/agents/backend-dev.md`
- Modify: frontmatter `name`, the "Read first" section, and the closing line

- [ ] **Step 1: Rename the file with git**

Run:
```bash
git mv .claude/agents/go-dev.md .claude/agents/backend-dev.md
```

- [ ] **Step 2: Update the frontmatter name**

In `.claude/agents/backend-dev.md`, replace:
```
name: go-dev
```
with:
```
name: backend-dev
```

- [ ] **Step 3: Replace the "Read first" section**

In `.claude/agents/backend-dev.md`, replace this block:
```
## Read first

Before non-trivial work, read:
- `CLAUDE.md` (repo map: commands, backend architecture, terminology)
- `instructions/CONSTITUTION.md` (overarching rules + product terminology)
- `instructions/LOGGING_CONSTITUTION.md` (structured logging is mandatory)
- `instructions/TASK_CONSTITUTION.md` (significant changes get a task folder)
```
with:
```
## Read first

Before non-trivial work, read:
- `AGENTS.md` (repo map: commands, backend rules, product terminology, durable workflow)
- `.agents/skills/backend-api/SKILL.md` (backend workflow: handlers, sqlc, migrations, logging, email, provider docs)
- `.agents/skills/go-testing-patterns/SKILL.md` (before writing or changing tests)
```

- [ ] **Step 4: Update the closing cross-reference**

In `.claude/agents/backend-dev.md`, replace:
```
After non-trivial work, suggest the caller run the `go-reviewer` subagent.
```
with:
```
After non-trivial work, suggest the caller run the `backend-reviewer` subagent.
```

- [ ] **Step 5: Verify name, pointers, cross-ref, and no stale references**

Run:
```bash
grep -E "^name: backend-dev|backend-api/SKILL.md|subagent" .claude/agents/backend-dev.md && echo "---stale check---" && grep -c "instructions/\|go-reviewer\|CLAUDE.md" .claude/agents/backend-dev.md
```
Expected: three positive matches print (the `name:` line, the skill pointer, and the closing `backend-reviewer` subagent line), then `---stale check---`, then `0`.

- [ ] **Step 6: Commit**

```bash
git add .claude/agents/backend-dev.md
git commit -m "refactor(agents): rename go-dev to backend-dev and point at AGENTS.md + skills"
```

---

## Task 6: Rename + fix the frontend dev agent

Rename `web-dev.md` → `frontend-dev.md`, replace the dead `instructions/CONSTITUTION.md` read with `AGENTS.md` plus a `dashboard-ui` read-pointer, and update the closing cross-reference to `frontend-reviewer`.

**Files:**
- Rename: `.claude/agents/web-dev.md` → `.claude/agents/frontend-dev.md`
- Modify: frontmatter `name`, the "Read first" section, and the closing line

- [ ] **Step 1: Rename the file with git**

Run:
```bash
git mv .claude/agents/web-dev.md .claude/agents/frontend-dev.md
```

- [ ] **Step 2: Update the frontmatter name**

In `.claude/agents/frontend-dev.md`, replace:
```
name: web-dev
```
with:
```
name: frontend-dev
```

- [ ] **Step 3: Replace the "Read first" section**

In `.claude/agents/frontend-dev.md`, replace this block:
```
## Read first

- `CLAUDE.md` (repo map: commands, frontend architecture, terminology)
- `instructions/CONSTITUTION.md` — especially the **product terminology** section (asset vs. video)
- Mirror an existing page/component under `src/app/pages`, `src/app/features`, or `src/app/shared` rather than inventing structure.
```
with:
```
## Read first

Before non-trivial work, read:
- `AGENTS.md` — repo map plus the **product terminology** section (asset vs. video)
- `.agents/skills/dashboard-ui/SKILL.md` — discovery-first workflow: inspect nearby components, reuse `z-*` wrappers, and check installed `ng-primitives` types/READMEs before guessing APIs
- Mirror an existing page/component under `src/app/pages`, `src/app/features`, or `src/app/shared` rather than inventing structure.
```

- [ ] **Step 4: Update the closing cross-reference**

In `.claude/agents/frontend-dev.md`, replace:
```
After non-trivial work, suggest the caller run the `web-reviewer` subagent.
```
with:
```
After non-trivial work, suggest the caller run the `frontend-reviewer` subagent.
```

- [ ] **Step 5: Verify name, pointer, cross-ref, and no stale references**

Run:
```bash
grep -E "^name: frontend-dev|dashboard-ui/SKILL.md|subagent" .claude/agents/frontend-dev.md && echo "---stale check---" && grep -c "instructions/\|web-reviewer\|CLAUDE.md" .claude/agents/frontend-dev.md
```
Expected: three positive matches print (the `name:` line, the skill pointer, and the closing `frontend-reviewer` subagent line), then `---stale check---`, then `0`.

- [ ] **Step 6: Commit**

```bash
git add .claude/agents/frontend-dev.md
git commit -m "refactor(agents): rename web-dev to frontend-dev and point at AGENTS.md + skills"
```

---

## Task 7: Fix the stale record path in the commit agent

`commit.md` keeps its name but references the pre-migration `instructions/tasks/` + `instructions/TASK_CONSTITUTION.md`. Point it at the current record locations.

**Files:**
- Modify: `.claude/agents/commit.md` (one step in the Process section)

- [ ] **Step 1: Replace the stale task-folder step**

In `.claude/agents/commit.md`, replace:
```
2. If the change is significant and a task folder exists under `instructions/tasks/`, stage it **together with** the code (per `instructions/TASK_CONSTITUTION.md`). If a significant change has no task folder, flag that to the caller rather than inventing one.
```
with:
```
2. If the change is significant and has a matching record under `.agents/plans/` or `.agents/reports/`, stage it **together with** the code (per the Durable Workflow in `AGENTS.md`). If a significant change has no record, flag that to the caller rather than inventing one.
```

- [ ] **Step 2: Verify the new path is present and no stale reference remains**

Run:
```bash
grep -E "\.agents/plans/|Durable Workflow" .claude/agents/commit.md && echo "---stale check---" && grep -c "instructions/" .claude/agents/commit.md
```
Expected: the positive matches print, then `---stale check---`, then `0`.

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/commit.md
git commit -m "fix(agents): point commit agent at .agents records instead of instructions/"
```

---

## Task 8: Repo-wide verification sweep

Confirm no dangling references to the old agent names or the old `instructions/` constitution files remain anywhere in the active agent + docs surface, and that the final agent set is exactly as intended.

**Files:**
- No edits expected. If a grep below finds a hit, fix that file with the same name/path substitutions used above, then re-run.

- [ ] **Step 1: No old agent names remain in active surfaces**

Run:
```bash
grep -rn "go-reviewer\|web-reviewer\|go-dev\|web-dev" .claude/agents AGENTS.md CLAUDE.md .agents/README.md
```
Expected: no output (exit 1). Historical files under `.agents/reports/` and `.agents/plans/` are immutable records — do not edit them even if they mention old names.

- [ ] **Step 2: No stale constitution references remain in active agents**

Run:
```bash
grep -rn "instructions/CONSTITUTION\|instructions/LOGGING_CONSTITUTION\|instructions/TASK_CONSTITUTION\|instructions/tasks" .claude/agents
```
Expected: no output (exit 1).

- [ ] **Step 3: The final agent set is exactly the six expected files**

Run:
```bash
ls .claude/agents/
```
Expected: `backend-dev.md`, `backend-reviewer.md`, `frontend-dev.md`, `frontend-reviewer.md`, `commit.md`, `explore.md` — and nothing else.

- [ ] **Step 4: Every agent frontmatter `name` matches its filename**

Run:
```bash
for f in .claude/agents/*.md; do printf '%s => ' "$f"; grep -m1 "^name:" "$f"; done
```
Expected: each line pairs the filename with a matching `name:` (e.g. `backend-dev.md => name: backend-dev`). No mismatches.

- [ ] **Step 5: Skill read-pointers resolve to real files**

Run:
```bash
test -f .agents/skills/backend-api/SKILL.md && test -f .agents/skills/go-testing-patterns/SKILL.md && test -f .agents/skills/dashboard-ui/SKILL.md && echo "POINTERS OK"
```
Expected: `POINTERS OK`.

- [ ] **Step 6: Final commit (only if Step 1–2 required a fix)**

```bash
git add -u .claude/agents
git commit -m "chore(agents): clean up remaining old agent-name references"
```
If Steps 1–2 produced no output and nothing was changed, there is nothing to commit — skip.

---

## Self-Review

- **Spec coverage** — Decisions from the evaluation map to tasks: dedup of the skill-based pair (Task 2); salvage of frontend dimensions (Task 4) and backend email/test nuance (Task 3); skills→agents via inline checklists (Tasks 3–4) and read-pointers (Tasks 5–6); stale `instructions/` cleanup (Tasks 4–7); domain-axis renaming `backend-*`/`frontend-*` (Tasks 3–6); broken symlink repair (Task 1). Codex parity and Codex naming are intentionally deferred (see Follow-ups).
- **Name consistency** — Old → new names are applied identically across the file rename, the frontmatter `name:`, and every cross-reference: `go-reviewer`→`backend-reviewer`, `web-reviewer`→`frontend-reviewer`, `go-dev`→`backend-dev`, `web-dev`→`frontend-dev`. `backend-dev` points at `backend-reviewer`; `frontend-dev` points at `frontend-reviewer`. Task 8 Step 4 enforces filename/`name:` agreement.
- **No placeholders** — Every edit step shows the exact before/after text or the full target file; every verify step is a concrete command with expected output.

## Follow-ups (not in this plan)

- **Codex parity decision** — decide whether Codex gets `backend-dev`/`frontend-dev`/`explore`/`commit` equivalents, or document Codex as review-only.
- **Codex naming alignment** — `.codex/agents/dashboard-reviewer.toml` still uses the surface name `dashboard`; rename to `frontend-reviewer.toml` to match the Claude axis chosen here (or consciously keep `dashboard`).
- **Decide whether `go-dev`/`web-dev` should be subagents at all** — per AGENTS.md, write-heavy work usually belongs in the main thread; consider demoting them to main-thread personas/skills in a later pass.

---

## Execution Handoff

Plan complete. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks.
2. **Inline Execution** — execute tasks in this session with checkpoints.

Which approach?
