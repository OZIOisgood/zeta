# Production identity and secret bootstrap

## Context

Production needed the development authorization contract, its initial WorkOS organization and authentication settings, Google OAuth, and the manually supplied runtime credentials. Terraform and deployment were intentionally kept out of scope pending explicit cost approval.

## Decisions and changes

- Copied all 30 application permissions from WorkOS development to production, including their names, descriptions, and resource-type associations.
- Reconciled the `student`, `expert`, and `admin` permission grants additively. Kept WorkOS's seeded `member` role as a non-default extra role.
- Created the `Zeta` production organization with a stable external identifier and selected `student` as the production default role.
- Configured production application, web/mobile redirect URIs, sign-out URIs, homepage, and email/password authentication to match the development behavior.
- Created a Google web OAuth client in project `zeta-491012`, configured the WorkOS callback, enabled Google in WorkOS, and published the external OAuth consent app.
- Created and versioned the missing WorkOS, default-organization, Mux, and OpenRouter production secrets. Added new versions for the supplied Agora app ID and certificate.
- Left the Google client secret in Google/WorkOS because the Zeta runtime does not consume it.
- Preserved Terraform ownership of `zeta-prod-db-url` and the Agora recording-storage credentials. The production apply generated the database credential and stored it as Secret Manager version 1.
- Added `MOBILE_LOGOUT_RETURN_TO=zeta://login` to both deployment workflows so the runtime matches the configured WorkOS mobile sign-out URI.
- Granted `zeta-deploy-prod@zeta-491012.iam.gserviceaccount.com` verified-owner access to `strido.net` in Search Console so Terraform can administer the production Cloud Run domain mappings.

## Verification

- WorkOS application permission count: development 30, production 30; metadata comparison matched exactly.
- WorkOS role grants: `student`, `expert`, and `admin` matched development exactly.
- Google provider shows enabled in WorkOS; Google Auth Platform shows `In production`.
- All seventeen production runtime secret bindings now have enabled versions, including Terraform-generated `zeta-prod-db-url` version 1.
- `zeta-prod` is runnable in `europe-west1` with PostgreSQL 16, zonal availability, `db-f1-micro`, 10 GiB SSD, backups, and point-in-time recovery.
- Production Cloud Run service shells, scheduler jobs, recording storage, IAM, and database resources were provisioned.
- The first apply created the production resources but failed on domain ownership. After granting the deployment service account verified ownership, GitHub Actions run `32260642660` completed successfully.
- `api.strido.net` and `app.strido.net` are mapped to their production services and DNS already resolves to `ghs.googlehosted.com`; Google-managed certificates are provisioning.
- A final production Terraform plan reported no changes.
- The initial production Terraform plan was read-only: 34 to add, 0 to change, 0 to destroy. No apply or deployment was run during the identity bootstrap.

## Cost and topology

- The planned database is a separate `zeta-prod` PostgreSQL 16 Cloud SQL instance with zonal availability, `db-f1-micro`, 10 GiB SSD, backups, and point-in-time recovery.
- Zonal availability was selected as the pre-release cost/reliability tradeoff after explicit approval. Its estimated floor is about USD 9–10/month before backup usage, roughly half of the earlier regional-HA design.
- The dedicated production database still preserves dev/prod data and migration isolation; automatic regional failover is intentionally deferred.

## Follow-ups

- Merge `codex/prod-zonal-bootstrap` before a future production infrastructure run so `main` retains the zonal topology.
- Run the production application deployment/migrations from the release workflow; infrastructure provisioning alone does not deploy the current application images.
- Verify the managed certificates and production health endpoints after certificate issuance and application deployment.
