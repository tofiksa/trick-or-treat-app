# Database Setup Guide

This guide will help you set up the database correctly in Supabase.

## Step 1: Open SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

## Step 2: Run the Migration

1. Open the file `supabase/migrations/001_initial_schema.sql`
2. Copy **ALL** the contents
3. Paste it into the SQL Editor in Supabase
4. Click "Run" (or press Cmd/Ctrl + Enter)

**Expected result:** You should see a success message saying the query executed successfully.

## Step 3: Verify Setup (Optional)

1. Run the verification script `supabase/migrations/002_verify_setup.sql` to check if everything was created correctly
2. You should see:
   - ✓ All 4 tables exist
   - ✓ Groups have data (2 groups)
   - ✓ RLS is enabled on all tables
   - ✓ All policies are created

## Step 4: Verify Tables in Table Editor

1. Go to "Table Editor" in Supabase dashboard
2. You should see 4 tables:
   - `groups` (should have 2 rows: "Team Pumpkin" and "Team Ghost")
   - `users` (empty initially)
   - `checkins` (empty initially)
   - `photos` (empty initially)

## Troubleshooting

### Error: "Could not find the table 'public.users' in the schema cache"

**This is the most common error!** It means Supabase hasn't refreshed its schema cache yet.

**Solution:**
1. First, verify the table exists by running this in SQL Editor:
   ```sql
   SELECT * FROM public.users LIMIT 1;
   ```
   If this works, the table exists but the cache needs refreshing.

2. **Refresh the schema cache:**
   - Go to "Table Editor" in Supabase dashboard
   - Wait 10-30 seconds (Supabase auto-refreshes)
   - Or click "Refresh" button if available
   - Close and reopen the dashboard

3. **If table doesn't exist**, run the migration script again:
   - Use `supabase/migrations/000_quick_setup.sql` for a fresh start
   - Or use `supabase/migrations/001_initial_schema.sql` (updated with explicit schema references)

4. **Verify tables exist:**
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
     AND tablename IN ('groups', 'users', 'checkins', 'photos');
   ```
   You should see all 4 tables listed.

5. **If still not working**, try this quick test query:
   ```sql
   -- This should return 2 groups
   SELECT COUNT(*) as group_count FROM public.groups;
   ```

### Error: "relation already exists"
- This means the tables already exist. The migration uses `CREATE TABLE IF NOT EXISTS` so it should be safe to run again.
- If you want to start fresh, you can drop the tables first (uncomment the DROP TABLE statements in the migration file)

### Error: "policy already exists"
- The migration now includes `DROP POLICY IF EXISTS` statements, so this shouldn't happen.
- If it does, you can manually delete the policies from the Supabase dashboard and re-run the migration.

### Error: "permission denied"
- Make sure you're running the SQL as a user with proper permissions (typically the default postgres user in Supabase)

### Groups table is empty
- Check if the INSERT statements ran successfully
- You can manually insert groups:
  ```sql
  INSERT INTO public.groups (name) VALUES ('Team Pumpkin'), ('Team Ghost');
  ```

### RLS Policies not working
- Make sure RLS is enabled: `ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;`
- Check that policies exist in the "Authentication > Policies" section of Supabase dashboard

## Quick Fix: Recreate Everything

If you want to start completely fresh:

1. In SQL Editor, run:
```sql
-- Drop all tables (this will delete all data!)
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS checkins CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
```

2. Then run the full migration `001_initial_schema.sql` again

## Test the Setup

After setup, you can test by running:

```sql
-- Should return 2 groups
SELECT * FROM groups;

-- Should return empty (or your test data)
SELECT * FROM users;
```

## Need Help?

If you're still having issues:
1. Check the Supabase logs in the "Logs" section
2. Verify your environment variables are set correctly
3. Make sure you're connected to the correct Supabase project

