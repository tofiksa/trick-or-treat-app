# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Wait for the project to be fully provisioned

## 2. Set Up Database Schema

1. In your Supabase dashboard, go to the SQL Editor
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and run the SQL in the SQL Editor
4. This will create:
   - `groups` table (with 2 default groups: Team Pumpkin, Team Ghost)
   - `users` table
   - `checkins` table
   - `photos` table
   - All necessary indexes and RLS policies

## 3. Set Up Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Click "New bucket"
3. Create a bucket named `candy-photos`
4. Set it to **Public** (so photos can be accessed via URLs)
5. In the bucket settings, go to "Policies"
6. Create a policy to allow public read access:
   - Policy name: "Public Read Access"
   - Allowed operation: SELECT
   - Target roles: anon, authenticated
   - Policy definition: `true`
7. Create a policy to allow authenticated uploads:
   - Policy name: "Authenticated Upload"
   - Allowed operation: INSERT
   - Target roles: authenticated
   - Policy definition: `true`

## 4. Configure Environment Variables

1. In your Supabase dashboard, go to Settings > API
2. Copy your:
   - Project URL
   - `anon` `public` key (not the service_role key)
3. Create a `.env.local` file in the root of this project:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

## 5. Enable Anonymous Authentication (Optional)

If you want to use anonymous authentication (recommended for quick sign-ups):

1. Go to Authentication > Providers in Supabase dashboard
2. Enable "Anonymous" provider
3. Users will be able to sign in without email/password

Alternatively, you can modify the app to use email/password authentication.

## 6. Test the Setup

1. Start your Next.js dev server: `npm run dev`
2. Visit `http://localhost:3000`
3. Click "Get Started" and try to sign in
4. If everything works, you should be able to:
   - Select a group
   - Check in at locations
   - Upload photos
   - See competition stats

## Troubleshooting

- **RLS Policy Errors**: Make sure the RLS policies were created correctly in the SQL migration
- **Storage Upload Errors**: Verify the `candy-photos` bucket exists and has the correct policies
- **Authentication Errors**: Check that your environment variables are set correctly in `.env.local`

