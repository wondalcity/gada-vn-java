-- Ensure all SUPER_ADMIN accounts have every permission enabled.
-- Addresses cases where an account was created before 'sites' (or other keys)
-- were added to the default permissions object.
UPDATE ops.admin_users
SET permissions = '{
  "dashboard": true,
  "managers": true,
  "workers": true,
  "jobs": true,
  "sites": true,
  "notifications": true,
  "admin_users": true
}'::jsonb
WHERE role = 'SUPER_ADMIN';
