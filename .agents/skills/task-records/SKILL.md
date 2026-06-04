---
name: task-records
description: Use when creating project plans, completion reports, investigation notes, audit summaries, or baseline records in the .agents workspace.
---

# Task Records

- New plans go in `.agents/plans/`.
- New reports, investigations, audits, and completion notes go in `.agents/reports/`.
- Use `YYYYMMDDHHMMSS_snake_case_title.md`.
- Keep records concise and useful:
  - Context: why the work exists.
  - Decision or scope.
  - Files/areas touched.
  - Verification run or not run.
  - Follow-ups, only if real.
- Do not create parallel task folders outside `.agents`.
- Prefer a baseline report over copying superseded historical records one-for-one.
