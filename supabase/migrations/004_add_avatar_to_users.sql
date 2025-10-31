-- Add avatar field to users table
-- This migration adds an avatar field to store the user's selected avatar identifier

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '🎃';

-- Update existing users to have a default avatar if they don't have one
UPDATE public.users 
SET avatar = '🎃' 
WHERE avatar IS NULL;

-- Add comment to document the avatar field
COMMENT ON COLUMN public.users.avatar IS 'Halloween-themed avatar emoji/identifier representing the user';

