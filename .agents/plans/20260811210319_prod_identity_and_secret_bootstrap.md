# Production identity and secret bootstrap

## Context

The production WorkOS environment is empty and the first production deployment needs the same authorization contract as development, plus environment-specific WorkOS, Mux, and Agora credentials in Google Secret Manager.

## Scope and decisions

- [x] Inventory repository, development, and production state before mutation.
- [x] Sync WorkOS roles and permissions additively; do not use replace-all role permission operations.
- [x] Create a production organization and configure the production default organization identifier.
- [x] Create and publish the production Google OAuth client and enable it in WorkOS.
- [x] Provision manual third-party credential secrets without exposing payloads.
- [x] Preserve Terraform ownership of generated database and Agora recording-storage secrets.
- [x] Do not run Terraform or the production deployment pipeline without explicit approval after reviewing the production Cloud SQL cost/topology.

## Verification

- Compare live WorkOS roles, permissions, and role assignments to the repository contract.
- Check Secret Manager objects and Cloud Run bindings by name/metadata only.
- Run the runtime-config audit, formatting/validation checks applicable to any repository changes, and record unresolved provider prerequisites.

## Follow-ups

- [x] Obtain explicit approval before production Terraform plan/apply.
- [x] Reduce the initial production Cloud SQL topology from regional HA to zonal availability for the pre-release cost target.
- [x] Run the production infrastructure workflow and verify the generated database URL secret and provisioned resources.
- Deploy the production application only after infrastructure completes successfully.
