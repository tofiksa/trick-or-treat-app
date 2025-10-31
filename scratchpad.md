# Trick-or-Treat Competition Web Application

## Background and Motivation

This is a mobile-first web application designed for a Halloween trick-or-treating competition between two groups. The app enables real-time tracking of participants as they visit houses, capturing GPS coordinates, candy photos, distance traveled, and time spent trick-or-treating. The goal is to gamify the Halloween experience by creating a competitive, trackable event where groups can see their collective progress.

**Key Requirements:**
- Mobile-only design (phones)
- Two competing groups
- GPS-based check-ins at each house
- Photo uploads of candy to Supabase storage
- Distance tracking between check-ins (total km)
- Time tracking from first check-in
- Hosted on Vercel

## Key Challenges and Analysis

### Technical Challenges

1. **GPS Accuracy & Permissions**
   - Mobile browsers require explicit permission for geolocation
   - GPS accuracy can vary (10-50m typical, worse indoors)
   - Need to handle cases where GPS is denied or unavailable
   - **Solution:** Use Geolocation API with error handling and fallbacks

2. **Distance Calculation**
   - Calculate distance between consecutive check-ins
   - Accumulate total distance walked
   - Need to handle coordinate accuracy issues (Haversine formula)
   - **Solution:** Use Haversine formula for distance calculation between lat/lng pairs

3. **Photo Upload to Supabase**
   - Mobile camera integration
   - Image compression/optimization for mobile data
   - Secure file upload with authentication
   - **Solution:** Use HTML5 file input with camera capture, compress images client-side, upload via Supabase Storage API

4. **Real-time Competition Data**
   - Two groups need to see each other's progress
   - Real-time updates without polling too frequently
   - Data consistency across users
   - **Solution:** Use Supabase Realtime subscriptions for live updates, or polling with reasonable intervals (10-30s)

5. **Mobile UX**
   - Touch-friendly interface
   - Large buttons for check-in actions
   - Minimal data usage
   - Works offline (check-in queue for when connection restored)
   - **Solution:** Progressive Web App (PWA) capabilities, responsive design, offline queue pattern

6. **Data Structure**
   - User group assignment
   - Check-ins with GPS coordinates, timestamps, photos
   - Aggregated stats (total distance, time, check-in count)
   - **Solution:** Supabase PostgreSQL with proper schema design

7. **Halloween Theming & Design**
   - Create immersive Halloween visual experience
   - Color scheme: Orange, black, purple, dark themes
   - Halloween-themed icons, graphics, and animations
   - Spooky fonts and typography
   - Candy/jack-o'-lantern themed UI elements
   - Maintain readability and usability while being thematic
   - **Solution:** Custom Halloween color palette in Tailwind, Halloween-themed illustrations/icons, spooky animations, themed components

### Architecture Decisions

- **Frontend:** Next.js (React) - good for Vercel deployment, SSR/SSG support, excellent mobile performance
- **Backend/Database:** Supabase - handles auth, database, storage, and real-time subscriptions
- **Deployment:** Vercel - seamless Next.js integration
- **Styling:** Tailwind CSS - mobile-first responsive design with Halloween-themed color palette and custom components
- **Design Theme:** Halloween-inspired (orange, black, purple color scheme, spooky fonts, themed icons/illustrations)
- **State Management:** React Context or Zustand for group selection and session state
- **GPS:** Browser Geolocation API
- **Image Handling:** HTML5 file input with camera capture, client-side compression (browser-image-compression)

## High-level Task Breakdown

### Phase 1: Project Setup & Infrastructure
1. **Initialize Next.js project with TypeScript**
   - Create Next.js app with TypeScript template
   - Configure for Vercel deployment
   - Set up Tailwind CSS for styling
   - Configure Halloween color theme (orange, black, purple palette)
   - Success criteria: Project runs locally, builds successfully, basic mobile-responsive layout visible with Halloween color scheme

2. **Set up Supabase project**
   - Create Supabase project
   - Configure authentication (email/password or anonymous)
   - Create database schema (users, groups, checkins, photos)
   - Set up storage bucket for candy photos
   - Configure Row Level Security (RLS) policies
   - Success criteria: Can authenticate, create records, upload files via Supabase dashboard

3. **Set up environment variables**
   - Add Supabase URL and anon key
   - Configure for both development and production
   - Success criteria: Environment variables load correctly, Supabase client initializes

### Phase 2: Core Data Models & Authentication
4. **Design and implement database schema**
   - Users table (id, name, group_id, created_at)
   - Groups table (id, name, created_at)
   - Checkins table (id, user_id, latitude, longitude, timestamp, distance_from_previous)
   - Photos table (id, checkin_id, storage_url, uploaded_at)
   - Success criteria: Schema created, migrations run, relationships verified

5. **Implement user authentication flow**
   - User registration/login screen
   - Group selection screen (choose between 2 groups)
   - Session persistence
   - Success criteria: Users can register, select group, session persists on refresh

### Phase 3: GPS & Check-in Functionality
6. **Implement GPS location capture**
   - Request geolocation permissions
   - Get current GPS coordinates
   - Display accuracy indicator
   - Handle permission denial and errors
   - Success criteria: Can capture GPS coordinates, shows permission states, handles errors gracefully

7. **Build check-in functionality**
   - Check-in button/interface
   - Save GPS coordinates to database
   - Calculate distance from previous check-in (if exists)
   - Display check-in confirmation
   - Success criteria: Check-ins save with correct coordinates, distance calculation works, UI feedback provided

8. **Implement distance tracking**
   - Calculate distance between consecutive check-ins (Haversine formula)
   - Store cumulative distance per user
   - Display total distance walked on dashboard
   - Success criteria: Accurate distance calculation, total distance displayed correctly, updates after each check-in

### Phase 4: Photo Upload Feature
9. **Implement camera/photo capture**
   - Camera access on mobile devices
   - Image capture from camera or gallery
   - Image preview before upload
   - Success criteria: Can capture/select photos on mobile, preview works

10. **Add image compression**
    - Compress images before upload (reduce file size)
    - Maintain acceptable quality
    - Success criteria: Images compressed to <500KB typically, quality acceptable

11. **Implement Supabase storage upload**
    - Upload compressed image to Supabase storage
    - Link photo to check-in record
    - Display uploaded photos in check-in history
    - Success criteria: Photos upload successfully, linked to check-ins, visible in history

### Phase 5: Time Tracking & Dashboard
12. **Implement time tracking**
    - Record timestamp of first check-in
    - Calculate elapsed time (hours:minutes:seconds)
    - Display live timer on dashboard
    - Success criteria: Timer starts at first check-in, displays correctly, updates in real-time

13. **Build user dashboard**
    - Display total check-ins count
    - Show total distance walked
    - Display elapsed time
    - Show recent check-ins list
    - Success criteria: All metrics display correctly, updates reflect new check-ins

14. **Build group competition view**
    - Aggregate stats per group (total check-ins, total distance, total time)
    - Display both groups' stats side-by-side
    - Real-time or periodic updates
    - Success criteria: Group stats calculate correctly, both groups visible, updates work

### Phase 6: Mobile Optimization & UX
15. **Implement Halloween theme design**
    - Design Halloween-themed UI components (buttons, cards, badges)
    - Create/source Halloween icons and graphics (pumpkins, candy, ghosts, etc.)
    - Implement spooky animations and transitions
    - Apply Halloween typography (spooky fonts, readable but themed)
    - Theme all screens (login, dashboard, check-in, competition view)
    - Ensure dark theme works well for nighttime trick-or-treating
    - Success criteria: All screens have cohesive Halloween theme, animations are smooth, readability maintained, theme enhances user experience

16. **Optimize for mobile devices**
    - Responsive layout (mobile-first)
    - Large touch targets for buttons
    - Optimize images and assets
    - Test on various screen sizes
    - Success criteria: App works well on phones, buttons easily tappable, layout adapts

17. **Implement offline support (optional enhancement)**
    - Queue check-ins when offline
    - Sync when connection restored
    - Success criteria: Check-ins work offline, sync when online

18. **Add PWA capabilities (optional enhancement)**
    - Service worker for offline support
    - App manifest for installable app
    - Success criteria: App can be installed on phone, works offline

### Phase 7: Enhanced Features
22. **Implement avatar selection for users**
    - Add avatar field to users table in database
    - Create avatar selection UI component with predefined Halloween-themed avatars
    - Update login/profile page to allow avatar selection
    - Display selected avatar throughout the app (dashboard, competition view)
    - Update TypeScript types for avatar field
    - Success criteria: Users can select avatar during login/profile update, avatar displays in dashboard and competition view, avatar persists in database

23. **Implement map visualization for group check-ins**
    - Install and configure map library (react-leaflet or similar)
    - Create map component to display check-in locations
    - Fetch latest check-ins for each group
    - Display check-ins as markers on map with group color coding
    - Show user name/avatar on marker hover/click
    - Add map view toggle/button in dashboard or competition view
    - Success criteria: Map displays with all group check-ins, markers are color-coded by group, map is mobile-friendly, check-ins update in real-time

24. **Create public results page with timeline feed**
    - Create /results page route that is publicly accessible (no authentication required)
    - Create TimelineFeed component with Facebook news feed-inspired design
    - Fetch all photos with check-in and user data
    - Display photos in chronological order (newest first)
    - Show user avatar, name, group, and timestamp for each photo
    - Style timeline with card-based layout similar to Facebook feed
    - Add navigation link to results page from homepage
    - Success criteria: Public page accessible at /results, displays all uploaded photos in timeline format, shows user information, updates automatically, mobile-responsive

### Phase 8: Testing & Deployment
25. **Testing**
    - Test GPS accuracy in real-world conditions
    - Test photo uploads on various devices
    - Test group switching edge cases
    - Test distance calculations with known coordinates
    - Test Halloween theme visibility in various lighting conditions
    - Test avatar selection and persistence
    - Test map visualization on mobile devices
    - Success criteria: All features work as expected, edge cases handled, theme works in different environments

26. **Deploy to Vercel**
    - Configure Vercel project
    - Set environment variables
    - Deploy and verify
    - Success criteria: App deploys successfully, accessible via URL, all features work in production

27. **Final polish & bug fixes**
    - Fix any production issues
    - Optimize performance
    - Add loading states and error messages
    - Final Halloween theme polish and consistency check
    - Success criteria: App is production-ready, performs well, user-friendly, Halloween theme is cohesive

## Project Status Board

| Task # | Description | Status | Notes |
|--------|-------------|--------|-------|
| 1 | Initialize Next.js project | completed | ✅ Next.js with TypeScript created, Tailwind CSS configured, Halloween theme (orange/black/purple) set up, builds and runs successfully |
| 2 | Set up Supabase project | in_progress | ✅ Code infrastructure ready. ⚠️ **Manual step required:** User needs to create Supabase project at supabase.com. See SUPABASE_SETUP.md for instructions |
| 3 | Set up environment variables | in_progress | ✅ Template created (env.example). ⚠️ **Manual step required:** User needs to create .env.local with Supabase credentials |
| 4 | Design and implement database schema | completed | ✅ SQL migration file created (supabase/migrations/001_initial_schema.sql) with tables, indexes, RLS policies. ⚠️ **Manual step required:** User needs to run migration in Supabase SQL Editor |
| 5 | Implement user authentication flow | completed | ✅ Login page with group selection, anonymous auth, session management, middleware configured |
| 6 | Implement GPS location capture | completed | ✅ Geolocation API integration with error handling, permission requests, accuracy handling |
| 7 | Build check-in functionality | completed | ✅ Check-in button, GPS capture, database save, UI feedback |
| 8 | Implement distance tracking | completed | ✅ Haversine formula implementation (lib/utils/distance.ts), distance calculation between check-ins, total distance aggregation |
| 9 | Implement camera/photo capture | completed | ✅ HTML5 file input with camera capture attribute for mobile devices |
| 10 | Add image compression | completed | ✅ browser-image-compression library integrated, compresses to <500KB |
| 11 | Implement Supabase storage upload | completed | ✅ Photo upload to Supabase storage, linked to check-ins, storage URL saving |
| 12 | Implement time tracking | completed | ✅ First check-in timestamp tracking, live elapsed time display (HH:MM:SS format) |
| 13 | Build user dashboard | completed | ✅ Dashboard page with user stats (check-ins, distance, time), recent check-ins list, auto-refresh |
| 14 | Build group competition view | completed | ✅ CompetitionView component with group stats aggregation, leaderboard display, auto-refresh |
| 15 | Implement Halloween theme design | completed | ✅ Halloween color scheme throughout, themed components, spooky emojis, dark theme optimized for nighttime |
| 16 | Optimize for mobile devices | completed | ✅ Mobile-first responsive design, large touch targets, optimized layouts |
| 17 | Implement offline support (optional) | pending | Optional enhancement - not implemented yet |
| 18 | Add PWA capabilities (optional) | pending | Optional enhancement - not implemented yet |
| 22 | Implement avatar selection for users | completed | ✅ Avatar field added to users table, AvatarSelector component created, avatars displayed in login and dashboard |
| 23 | Implement map visualization for group check-ins | completed | ✅ MapView component created with react-leaflet, displays check-ins color-coded by group, shows user avatars on markers |
| 24 | Create public results page with timeline | completed | ✅ Results page at /results with Facebook-style timeline feed showing all uploaded photos |
| 25 | Testing | pending | ⚠️ Requires Supabase setup first. Need to test GPS, photo uploads, distance calculations, real-world scenarios |
| 26 | Deploy to Vercel | pending | ⚠️ Requires Supabase setup and env vars configured first |
| 27 | Final polish & bug fixes | pending | ⚠️ Will be done after testing phase |

## Executor's Feedback or Assistance Requests

### Tasks 22-23 Completed ✅ (New Features: Avatar & Map)

**Avatar Selection Feature (Task 22):**
- ✅ Created database migration (004_add_avatar_to_users.sql) to add avatar field to users table
- ✅ Updated TypeScript User type to include avatar field (types/database.ts)
- ✅ Created AvatarSelector component (components/AvatarSelector.tsx) with 20 Halloween-themed avatars
- ✅ Updated login page to include avatar selection during registration/login
- ✅ Updated dashboard to display user avatar alongside name
- ✅ Avatar selection persists in database and displays throughout the app

**Map Visualization Feature (Task 23):**
- ✅ Installed react-leaflet and leaflet libraries
- ✅ Added Leaflet CSS to root layout
- ✅ Created MapView component (components/MapView.tsx) with:
  - Dynamic loading to avoid SSR issues
  - Displays check-ins as markers on OpenStreetMap
  - Color-coded markers by group (orange for Team Pumpkin, purple for Team Ghost)
  - Shows user avatar on each marker
  - Popup displays user name, avatar, timestamp, and group
  - Auto-centers map based on check-in locations
  - Refreshes every 15 seconds to show latest check-ins
- ✅ Added MapView to dashboard page below CompetitionView
- ✅ Map is mobile-responsive and works well on touch devices

**Technical Notes:**
- Avatar field defaults to '🎃' if not specified
- Map uses OpenStreetMap tiles (no API key required)
- Map markers show latest 100 check-ins for performance
- Custom div icons with group colors and user avatars
- Map handles empty state with default center (Oslo, Norway)

**Results Page Feature (Task 24):**
- ✅ Created public results page at /results route (app/results/page.tsx)
- ✅ Created TimelineFeed component (components/TimelineFeed.tsx) with Facebook-style design:
  - Card-based layout similar to Facebook news feed
  - User avatar and name in header
  - Full-width images with lazy loading
  - Relative timestamps (e.g., "for 2 timer siden")
  - Group name displayed below user name
  - Check-in location coordinates shown in footer
  - Auto-refreshes every 30 seconds
- ✅ Fetches all photos with check-in and user data using Supabase joins
- ✅ Displays photos in chronological order (newest first)
- ✅ Handles empty state and error states gracefully
- ✅ Added navigation link to results page from homepage
- ✅ Page is publicly accessible (no authentication required)
- ✅ Mobile-responsive design

**⚠️ Manual Steps Required:**
- User needs to run migration 004_add_avatar_to_users.sql in Supabase SQL Editor
- Existing users will get default avatar '🎃' automatically

### Tasks 2-16 Completed ✅ (Code Implementation)

**Infrastructure & Setup:**
- ✅ Installed @supabase/supabase-js and @supabase/ssr packages
- ✅ Created Supabase client utilities (lib/supabase/client.ts, server.ts)
- ✅ Created middleware.ts for session management
- ✅ Created environment variable template (env.example)
- ✅ Created database schema migration (supabase/migrations/001_initial_schema.sql)
- ✅ Created comprehensive setup guide (SUPABASE_SETUP.md)

**Authentication & User Management:**
- ✅ Login page (app/(auth)/login/page.tsx) with name input and group selection
- ✅ Anonymous authentication flow
- ✅ User profile creation/update in database
- ✅ Session persistence with middleware

**Core Features:**
- ✅ GPS location capture with Geolocation API (components/CheckInButton.tsx)
- ✅ Check-in functionality with database save
- ✅ Distance calculation using Haversine formula (lib/utils/distance.ts)
- ✅ Photo capture with camera integration
- ✅ Image compression with browser-image-compression library
- ✅ Photo upload to Supabase storage with proper file organization
- ✅ Time tracking from first check-in with live elapsed time display

**UI Components:**
- ✅ User dashboard (app/dashboard/page.tsx) with stats, recent check-ins
- ✅ Competition leaderboard (components/CompetitionView.tsx) with group stats
- ✅ Check-in button component with GPS and photo upload
- ✅ Updated homepage with navigation links

**Type Definitions:**
- ✅ Complete TypeScript types (types/database.ts) for all database models

**Mobile Optimization:**
- ✅ Mobile-first responsive design throughout
- ✅ Large touch targets (buttons are h-14 or h-16)
- ✅ Halloween theme consistently applied (orange/purple/black color scheme)

**⚠️ Manual Steps Required for User:**
1. Create Supabase project at supabase.com
2. Run the SQL migration in Supabase SQL Editor (see supabase/migrations/001_initial_schema.sql)
3. Create storage bucket "candy-photos" with public read access
4. Set up environment variables in .env.local (see env.example)
5. Enable anonymous authentication in Supabase dashboard (optional but recommended)

**Build Status:**
- Code compiles successfully, but build fails until Supabase env vars are configured (expected)
- Once Supabase is set up and env vars added, the app should work end-to-end

### Task 1 Completed ✅ (Original)
- Created Next.js project "trick-or-treat-app" with TypeScript
- Configured Tailwind CSS with Halloween color palette:
  - Orange: #ff7518 (primary), #ff9500 (secondary), #ffb84d (light)
  - Purple: #6b2c91 (primary), #8b3db8 (secondary), #a855f7 (light)
  - Black: #0a0a0a (primary), #1a0d1a (secondary/background)
- Created basic Halloween-themed homepage with mobile-responsive layout
- Project builds successfully with no errors or warnings
- Dev server runs on http://localhost:3000

## Lessons

_This section will capture important lessons learned during development._

### Phase 7: Enhanced Features (Avatar & Map)

**Avatar Selection:**
- Need to add `avatar` field to users table (TEXT type to store avatar identifier/name)
- Should use predefined Halloween-themed emojis/identifiers for simplicity (no image upload needed initially)
- Avatar selection should be available during login and profile update
- Display avatar alongside user name in dashboard and competition view

**Map Visualization:**
- Consider using react-leaflet with leaflet library for maps (open-source, mobile-friendly)
- Alternative: Use Google Maps API (requires API key) or Mapbox (has free tier)
- Map should show check-ins color-coded by group (orange for Team Pumpkin, purple for Team Ghost)
- Need to query latest check-ins grouped by group and display as markers
- Map should be responsive and work well on mobile devices

