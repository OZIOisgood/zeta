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
- Left `zeta-prod-db-url` absent because the Terraform Cloud SQL module generates its value. Preserved Terraform ownership of the Agora recording-storage credentials.
- Added `MOBILE_LOGOUT_RETURN_TO=zeta://login` to both deployment workflows so the runtime matches the configured WorkOS mobile sign-out URI.

## Verification

- WorkOS application permission count: development 30, production 30; metadata comparison matched exactly.
- WorkOS role grants: `student`, `expert`, and `admin` matched development exactly.
- Google provider shows enabled in WorkOS; Google Auth Platform shows `In production`.
- Sixteen of the seventeen production runtime secret bindings have enabled versions. Only Terraform-generated `zeta-prod-db-url` is missing.
- Production Cloud Run services and Cloud SQL do not yet exist, so live runtime binding and database connectivity checks remain pending.
- The initial production Terraform plan was read-only: 34 to add, 0 to change, 0 to destroy. No apply or deployment was run during the identity bootstrap.

## Cost and topology

- The planned database is a separate `zeta-prod` PostgreSQL 16 Cloud SQL instance with zonal availability, `db-f1-micro`, 10 GiB SSD, backups, and point-in-time recovery.
- Zonal availability was selected as the pre-release cost/reliability tradeoff after explicit approval. Its estimated floor is about USD 9–10/month before backup usage, roughly half of the earlier regional-HA design.
- The dedicated production database still preserves dev/prod data and migration isolation; automatic regional failover is intentionally deferred.

## Follow-ups

- Run the approved production Terraform apply and record its result separately.
- After apply, verify `zeta-prod-db-url`, Cloud Run secret bindings, database migration, and the production proxy/DataGrip connection.
