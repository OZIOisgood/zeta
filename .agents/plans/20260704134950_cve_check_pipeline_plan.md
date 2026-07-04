# CVE Check Pipeline Plan

## Context

Ticket #17 asks for an automated CVE/SCA process for Zeta. The repository currently has GitHub Actions CI for PRs, deploy workflows for dev/prod/landing, Go backend dependencies in `go.mod`/`go.sum`, Angular dashboard dependencies in `web/dashboard-next/pnpm-lock.yaml`, landing dependencies in `web/landing/package-lock.json`, GitHub Actions dependencies in `.github/workflows`, and Docker base images in three Dockerfiles.

## Decision

Use GitHub-native automation as the primary remediation path:

- Dependabot alerts/security updates/version updates open PRs with dependency fixes.
- Dependency Review blocks PRs that introduce new vulnerable dependencies.
- `govulncheck` scans Go code because it reports vulnerabilities that are actually reachable from the code.
- OSV-Scanner performs scheduled whole-repo SCA checks across lockfiles/manifests.
- Trivy scans built container images for OS package and image-layer vulnerabilities.
- CodeQL is optional but recommended as a neighboring code-scanning layer; it is SAST, not a CVE dependency fixer.

Avoid direct bot commits to `main`. Let bots open PRs, run the existing CI plus security checks, and optionally enable auto-merge only for low-risk Dependabot security PRs after all required checks pass.

## Implementation Plan

1. Add `.github/dependabot.yml`.
   - Configure `gomod` at `/`.
   - Configure `npm` for `web/dashboard-next` because Dependabot uses `npm` for pnpm lockfiles.
   - Configure `npm` for `web/landing`.
   - Configure `github-actions` at `/`.
   - Configure `docker` for `/`, `/web/dashboard-next`, and `/web/landing`.
   - Use weekly version updates, grouped security updates, labels such as `security`, `dependencies`, and a low open PR limit to avoid noise.

2. Enable repository settings in GitHub.
   - Dependency graph.
   - Dependabot alerts.
   - Dependabot security updates.
   - Grouped security updates.
   - Code scanning alerts if CodeQL/OSV/Trivy SARIF upload is used.

3. Add a PR dependency guard workflow.
   - Use `actions/dependency-review-action@v4` on `pull_request`.
   - Fail on `high` or `critical` vulnerabilities for runtime dependencies.
   - Consider allowing `moderate` as warning-only at first to keep rollout manageable.

4. Add a security scan workflow.
   - Run on `pull_request`, `push` to `main`, and nightly schedule.
   - Go job: `go run golang.org/x/vuln/cmd/govulncheck@latest ./...`.
   - OSV job: scan repository manifests/lockfiles and upload SARIF if configured.
   - Container jobs: build API, dashboard, and landing images, then run Trivy with `HIGH,CRITICAL` severities.
   - Keep scans read-only except SARIF upload permissions.

5. Add optional Dependabot auto-merge workflow.
   - Trigger only for Dependabot PRs.
   - Fetch Dependabot metadata.
   - Auto-approve/enable auto-merge for patch/minor security updates after CI passes.
   - Require manual review for major updates, Docker base image changes, GitHub Actions runner/action changes, or any failed scan.

6. Update docs.
   - Add `docs/cicd.md` section explaining the security pipeline.
   - Document triage: when a scan fails, inspect advisory, check exploitability/reachability, merge/update PR if available, or add a time-bound ignore with a reason and follow-up issue.

## Future Operator Workflow

When a nightly scan finds a vulnerability:

1. Check whether Dependabot opened a PR. If yes, review the advisory, wait for CI/security checks, and merge if the fix is safe.
2. If only OSV/govulncheck/Trivy failed, identify the package/image and patched version from the workflow output.
3. Update the dependency manually only if Dependabot cannot produce a PR.
4. For Go, prefer `go get module@patched-version && go mod tidy`, then run `make test:unit`.
5. For dashboard, prefer `cd web/dashboard-next && pnpm update package --latest` only when compatible, then run `make web-next:lint` and `make web-next:build`.
6. For landing, use `npm update` or targeted install in `web/landing`, then build/test landing.
7. For Docker base image CVEs, bump pinned base image tags or rebuild if the fixed package is in the same floating tag.
8. If no patch exists or the finding is not exploitable, add a documented temporary ignore with expiry and an issue link.

## Verification

This is a research and planning record. No code changes to workflows were implemented yet, and no scanners were run.

## Follow-ups

- Decide whether to auto-merge any Dependabot PRs from day one or start with manual review for the first two weeks.
- Confirm repository visibility/license because some GitHub Advanced Security features differ between public repositories and private repositories.
