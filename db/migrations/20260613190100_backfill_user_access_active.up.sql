INSERT INTO user_access (user_id, status, activated_at, activated_via)
SELECT user_id, 'active', NOW(), 'grandfathered'
FROM user_preferences
ON CONFLICT (user_id) DO NOTHING;
