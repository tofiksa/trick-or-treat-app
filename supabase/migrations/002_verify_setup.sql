-- Verification script to check if all tables and policies are set up correctly
-- Run this after 001_initial_schema.sql to verify everything is working

-- Check if tables exist
SELECT 
  'Tables Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') THEN '✓ groups table exists'
    ELSE '✗ groups table missing'
  END as status
UNION ALL
SELECT 
  'Tables Check',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN '✓ users table exists'
    ELSE '✗ users table missing'
  END
UNION ALL
SELECT 
  'Tables Check',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checkins') THEN '✓ checkins table exists'
    ELSE '✗ checkins table missing'
  END
UNION ALL
SELECT 
  'Tables Check',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'photos') THEN '✓ photos table exists'
    ELSE '✗ photos table missing'
  END;

-- Check if groups have data
SELECT 
  'Data Check' as check_type,
  CASE 
    WHEN COUNT(*) >= 2 THEN '✓ Groups have data (' || COUNT(*) || ' groups)'
    ELSE '✗ Groups missing data (' || COUNT(*) || ' groups found)'
  END as status
FROM groups;

-- Check RLS policies
SELECT 
  'RLS Check' as check_type,
  tablename || ': ' || CASE WHEN rowsecurity THEN '✓ Enabled' ELSE '✗ Disabled' END as status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('groups', 'users', 'checkins', 'photos');

-- List all policies
SELECT 
  'Policy Check' as check_type,
  schemaname || '.' || tablename || ': ' || policyname as status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

