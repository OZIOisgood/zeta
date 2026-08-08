# CVE Check Pipeline Implementation

## Context

Ticket #17 requested an automated CVE/SCA pipeline for the Go API, Angular dashboard, landing app, Docker images, and GitHub Actions dependencies.

## Decision

Implemented a GitHub Actions based security workflow and Dependabot configuration. The pipeline opens update PRs through Dependabot and blocks or reports vulnerabilities through `govulncheck`, OSV-Scanner, Dependency Review, and Trivy image scans. It does not push fixes directly to `main`.

The first local `govulncheck` run found reachable vulnerabilities in the current Go dependency set. Remediated them by upgrading the Go directive to `1.25.11`, `github.com/jackc/pgx/v5` to `v5.9.2`, `golang.org/x/net` to `v0.55.0`, and `golang.org/x/crypto` to `v0.52.0`.

## Files Touched

- `.github/dependabot.yml`
- `.github/workflows/security.yml`
- `go.mod`
- `go.sum`
- `docs/cicd.md`
- `.agents/plans/20260704134950_cve_check_pipeline_plan.md`
- `.agents/reports/20260704140645_cve_check_pipeline_implementation.md`

## Verification

- `ruby -e 'require "yaml"; ARGV.each { |f| YAML.load_file(f); puts "ok #{f}" }' .github/dependabot.yml .github/workflows/security.yml`
- `ruby -e 'require "yaml"; Dir[".github/**/*.yml"].sort.each { |f| YAML.load_file(f); puts "ok #{f}" }'`
- `git diff --check`
- `go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/security.yml`
- `go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/*.yml`
- `go run golang.org/x/vuln/cmd/govulncheck@latest ./...`
- `make api:build`
- `make test:unit`

## Follow-ups

- In GitHub repository settings, enable Dependency graph, Dependabot alerts, Dependabot security updates, and code scanning alerts.
- If the repository is private without GitHub Advanced Security, Dependency Review may be unavailable; OSV-Scanner still provides the dependency CVE gate.
- Consider Dependabot auto-merge only after the security workflow has run cleanly for a few weeks.
