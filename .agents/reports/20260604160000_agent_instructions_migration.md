# Agent Instructions Migration

## Context

The repository previously used legacy agent guidance and skill locations. The active workflow now uses root `AGENTS.md`, repo skills in `.agents/skills`, and compatibility files for Codex and Claude Code.

## Changes

- Added root `AGENTS.md` as the shared source of durable project rules.
- Added `CLAUDE.md` importing `AGENTS.md` for Claude Code.
- Added compact project skills for dashboard UI, backend API work, Go tests, and task records.
- Added `.agents/plans` and `.agents/reports` as the new record locations.
- Added Codex and Claude Code reviewer agent manifests.
- Replaced the legacy guidance flow with `.agents` records.
- Added a compact legacy task baseline instead of copying superseded task folders one-for-one.

## Verification

- Searched active guidance for stale legacy task-creation rules.

## Notes

Historical task folders were consolidated into `.agents/reports/20260604170000_legacy_task_baseline.md`.
