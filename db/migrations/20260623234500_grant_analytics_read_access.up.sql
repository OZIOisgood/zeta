-- The BigQuery Cloud SQL connection uses a Terraform-managed read-only
-- database user. Grant it read access only when the role already exists so
-- local/test databases can run this migration without provisioning GCP users.
DO $$
DECLARE
    analytics_role TEXT;
BEGIN
    FOREACH analytics_role IN ARRAY ARRAY['zeta_analytics_dev', 'zeta_analytics_prod']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = analytics_role) THEN
            EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', analytics_role);
            EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA public TO %I', analytics_role);
            EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO %I', analytics_role);
        END IF;
    END LOOP;
END $$;
