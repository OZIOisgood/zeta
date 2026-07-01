DO $$
DECLARE
    analytics_role TEXT;
BEGIN
    FOREACH analytics_role IN ARRAY ARRAY['zeta_analytics_dev', 'zeta_analytics_prod']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = analytics_role) THEN
            EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM %I', analytics_role);
            EXECUTE format('REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM %I', analytics_role);
            EXECUTE format('REVOKE USAGE ON SCHEMA public FROM %I', analytics_role);
        END IF;
    END LOOP;
END $$;
