-- QUICK SETUP SCRIPT - Run this first if you're getting "table not found" errors
-- This is a minimal script that creates tables in the correct order

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 1: Create groups table first (no dependencies)
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create users table (depends on groups)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create checkins table (depends on users)
CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  distance_from_previous DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create photos table (depends on checkins)
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checkin_id UUID REFERENCES public.checkins(id) ON DELETE CASCADE NOT NULL,
  storage_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_users_group_id ON public.users(group_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON public.checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON public.checkins(timestamp);
CREATE INDEX IF NOT EXISTS idx_photos_checkin_id ON public.photos(checkin_id);

-- Step 6: Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Step 7: Create basic RLS policies
-- Drop existing policies first
DO $$
BEGIN
  DROP POLICY IF EXISTS "Groups are viewable by everyone" ON public.groups;
  DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
  DROP POLICY IF EXISTS "Checkins are viewable by everyone" ON public.checkins;
  DROP POLICY IF EXISTS "Users can insert their own checkins" ON public.checkins;
  DROP POLICY IF EXISTS "Photos are viewable by everyone" ON public.photos;
  DROP POLICY IF EXISTS "Users can insert their own photos" ON public.photos;
END $$;

-- Create policies
CREATE POLICY "Groups are viewable by everyone"
  ON public.groups FOR SELECT
  USING (true);

CREATE POLICY "Users are viewable by everyone"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (true);

CREATE POLICY "Checkins are viewable by everyone"
  ON public.checkins FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own checkins"
  ON public.checkins FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Photos are viewable by everyone"
  ON public.photos FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own photos"
  ON public.photos FOR INSERT
  WITH CHECK (true);

-- Step 8: Insert initial groups
INSERT INTO public.groups (name)
SELECT 'Team Pumpkin'
WHERE NOT EXISTS (SELECT 1 FROM public.groups WHERE name = 'Team Pumpkin');

INSERT INTO public.groups (name)
SELECT 'Team Ghost'
WHERE NOT EXISTS (SELECT 1 FROM public.groups WHERE name = 'Team Ghost');

-- Step 9: Verify tables exist
SELECT 
  'Tables created successfully!' as status,
  (SELECT COUNT(*) FROM public.groups) as groups_count,
  (SELECT COUNT(*) FROM public.users) as users_count,
  (SELECT COUNT(*) FROM public.checkins) as checkins_count,
  (SELECT COUNT(*) FROM public.photos) as photos_count;

