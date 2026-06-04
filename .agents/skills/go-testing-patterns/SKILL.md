---
name: go-testing-patterns
description: Use when writing or reviewing Go tests, table-driven tests, sqlc/database tests, mocks, fixtures, benchmarks, or test coverage for the Zeta backend.
---

# Go Testing Patterns

- Prefer table-driven tests with `tests := []struct{ ... }` and `t.Run(tt.name, ...)` for branching behavior.
- Name cases by behavior, not implementation: `missing group returns forbidden`, `valid booking creates reminder`.
- Keep tests close to the package under test. Use existing test helpers before adding new fixtures.
- Use generated mocks under `internal/*/mocks` when a package already uses them. Run `make mocks` after changing mock interfaces.
- For database behavior, prefer existing integration/testdb patterns. Keep SQL assertions about externally visible behavior, not incidental row order unless order is part of the contract.
- Cover permissions and visibility boundaries explicitly when handlers expose group, asset, video, review, or coaching data.
- For error paths, assert status codes and stable response behavior. Avoid overfitting to full error strings unless the API contract requires them.
- After backend test changes, run the narrow `go test` package first, then `make test:unit` when risk crosses packages.
