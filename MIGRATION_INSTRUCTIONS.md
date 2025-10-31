# 🚀 Quick Migration Guide

## Method 1: Run in Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard
   - Select your project: `mbsxtalpvdfddnhtzctm`

2. **Open SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy the Migration SQL:**
   - The migration file is at: `supabase/migrations/001_initial_schema.sql`
   - Or copy from below:

4. **Paste and Run:**
   - Paste the entire SQL into the editor
   - Click "Run" button (or press `Cmd+Enter` / `Ctrl+Enter`)
   - Wait for success message

5. **Verify:**
   - Wait 10-30 seconds for schema cache to refresh
   - Go to "Table Editor" - you should see 4 tables:
     - `groups` (with 2 rows: Team Pumpkin, Team Ghost)
     - `users`
     - `checkins`
     - `photos`

## Method 2: Using Supabase CLI (if linked)

If you have your project linked:

```bash
# Link your project (first time only)
supabase link --project-ref mbsxtalpvdfddnhtzctm

# Run migration
supabase db push
```

## Quick Test

After running the migration, test with:

```sql
SELECT * FROM public.groups;
```

Should return 2 rows: Team Pumpkin and Team Ghost.

---

**The migration SQL is ready in:** `supabase/migrations/001_initial_schema.sql`

