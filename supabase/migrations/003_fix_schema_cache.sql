-- This script helps fix schema cache issues and verifies table creation
-- Run this if you're getting "table not found in schema cache" errors

-- First, let's verify the tables exist
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('groups', 'users', 'checkins', 'photos')
ORDER BY tablename;

-- If tables are missing, you may need to run 001_initial_schema.sql again
-- If tables exist but you still get cache errors, try refreshing the schema cache:

-- Force refresh of schema cache (this might require superuser privileges)
-- Note: In Supabase, you typically need to wait a few seconds or refresh the dashboard

-- Alternatively, try querying the tables directly to trigger cache refresh:
SELECT COUNT(*) as groups_count FROM groups;
SELECT COUNT(*) as users_count FROM users;
SELECT COUNT(*) as checkins_count FROM checkins;
SELECT COUNT(*) as photos_count FROM photos;

-- Check table permissions
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('groups', 'users', 'checkins', 'photos');

