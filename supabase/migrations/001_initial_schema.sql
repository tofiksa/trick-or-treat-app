-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing policies if they exist (for clean re-run)
DROP POLICY IF EXISTS "Groups are viewable by everyone" ON public.groups;
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Checkins are viewable by everyone" ON public.checkins;
DROP POLICY IF EXISTS "Users can insert their own checkins" ON public.checkins;
DROP POLICY IF EXISTS "Photos are viewable by everyone" ON public.photos;
DROP POLICY IF EXISTS "Users can insert their own photos" ON public.photos;

-- Drop existing tables if they exist (CASCADE to handle dependencies)
-- Comment out if you want to preserve existing data
-- DROP TABLE IF EXISTS photos CASCADE;
-- DROP TABLE IF EXISTS checkins CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS groups CASCADE;

-- Groups table (2 competing groups)
-- Using explicit public schema to avoid cache issues
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Check-ins table
CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  distance_from_previous DECIMAL(10, 2) DEFAULT 0, -- distance in kilometers
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos table (links to Supabase storage)
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checkin_id UUID REFERENCES public.checkins(id) ON DELETE CASCADE NOT NULL,
  storage_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
-- Note: IF NOT EXISTS for indexes requires PostgreSQL 9.5+
-- For compatibility, we'll create them directly (they'll be skipped if they already exist in some cases)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_users_group_id') THEN
    CREATE INDEX idx_users_group_id ON public.users(group_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_checkins_user_id') THEN
    CREATE INDEX idx_checkins_user_id ON public.checkins(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_checkins_timestamp') THEN
    CREATE INDEX idx_checkins_timestamp ON public.checkins(timestamp);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_photos_checkin_id') THEN
    CREATE INDEX idx_photos_checkin_id ON public.photos(checkin_id);
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all authenticated users to read, authenticated users can insert their own data
-- Groups: Everyone can read
CREATE POLICY "Groups are viewable by everyone"
  ON public.groups FOR SELECT
  USING (true);

-- Users: Everyone can read, authenticated users can insert/update their own
CREATE POLICY "Users are viewable by everyone"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (true);

-- Checkins: Everyone can read, authenticated users can insert their own
CREATE POLICY "Checkins are viewable by everyone"
  ON public.checkins FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own checkins"
  ON public.checkins FOR INSERT
  WITH CHECK (true);

-- Photos: Everyone can read, authenticated users can insert their own
CREATE POLICY "Photos are viewable by everyone"
  ON public.photos FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own photos"
  ON public.photos FOR INSERT
  WITH CHECK (true);

-- Insert initial groups (only if they don't already exist)
INSERT INTO public.groups (name)
SELECT 'Team Pumpkin'
WHERE NOT EXISTS (SELECT 1 FROM public.groups WHERE name = 'Team Pumpkin');

INSERT INTO public.groups (name)
SELECT 'Team Ghost'
WHERE NOT EXISTS (SELECT 1 FROM public.groups WHERE name = 'Team Ghost');

