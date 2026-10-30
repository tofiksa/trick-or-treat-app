# Auth status + public highscore

**Date:** 2026-10-30  
**Status:** Approved for planning  
**Approach:** Light UI layer on existing Supabase data (no new API/views)

## Goal

Make the app feel more professional by:

1. Making login state obvious (login / logout links, name when signed in).
2. Letting anyone follow the competition via a public highscore (no login required).

## Context

- Auth today: anonymous Supabase sign-in on `/login` (name, avatar, team).
- No logout; no shared header showing session state.
- Team standings exist in `CompetitionView` on `/dashboard`, which redirects unauthenticated users to `/login`.
- Data already available: `groups`, `users`, `checkins`.

## Decisions

| Topic | Choice |
|--------|--------|
| Ranking entity | Both **teams** and **players** |
| Sort order | Primary: total **km**; tiebreaker: **check-in count** |
| Highscore placement | Dedicated `/highscore` **and** top-3 teaser on home |
| Auth chrome | Global header **plus** explicit “logged in as …” on dashboard |
| Implementation style | Reuse existing queries/UI patterns; extract shared ranking helpers |

## Architecture

```
Root layout
  └── AppHeader (session-aware)
        ├── Nav: Hjem | Highscore | Resultater | [Dashbord if logged in]
        └── Auth: Logg inn  OR  avatar + name + Logg ut

Pages
  /              → top-3 teaser (teams + players) + link to /highscore
  /highscore     → full public lists (teams + players), no auth
  /dashboard     → existing features + “Du er logget inn som …” + logout
  /login         → unchanged join flow; if already logged in with a profile, redirect to /dashboard
```

No new database tables. No realtime. Poll every ~15s on `/highscore` only; home teaser loads once per visit.

## Components & modules

### `AppHeader`

- Client component (needs Supabase session + user profile).
- Loads `auth.getUser()`; if present, loads `users` row for name/avatar.
- **Logged out:** Logg inn → `/login`.
- **Logged in:** show avatar + name, Logg ut, and Dashbord link.
- Logg ut: `supabase.auth.signOut()`, clear local state, `router.push('/')`.
- Mounted from `app/layout.tsx` so it appears on all pages.

### Dashboard auth clarity

- Below/near the title: “Du er logget inn som {avatar} {name}” with a Logg ut control (in addition to header).

### Ranking helper

- Shared pure function(s), e.g. `lib/utils/ranking.ts`:
  - Aggregate distance + check-in counts per user and per group.
  - Sort: `total_distance` desc, then `total_checkins` desc.
- Shared aggregation/sort used by highscore page, home teaser, and `CompetitionView` so all rankings use the same km → check-ins rule.

### `HighscoreBoard`

- Props: mode `full` | `teaser` (teaser = top 3 each).
- Sections: **Lag** then **Spillere**.
- Player row: avatar, name, team name, km, check-ins.
- Team row: team name/emoji, km, check-ins, participant count.
- Empty / error: calm copy (“Ingen resultater ennå”), never redirect to login.

### Routes

- `app/highscore/page.tsx` — public full board + polling.
- `app/page.tsx` — add teaser + “Se hele highscoren”.
- Keep `/results` and `/dashboard` as today; wire them into header nav.

## Data flow

1. Client fetches groups, users (id, name, group_id, avatar), checkins (user_id, distance_from_previous).
2. Aggregate in ranking helper.
3. Render lists. Poll every ~15 seconds on `/highscore`; home teaser fetches once.

**Auth for reads:** anonymous/public SELECT must continue to work for ranking (same expectation as public results). No new write policies.

## Error handling

| Case | Behavior |
|------|----------|
| Not logged in on highscore/home | Show rankings normally |
| Fetch failure | Keep last good data if any; else empty state message |
| Logout failure | Still navigate home and clear local UI session state |
| Logged-in user without profile row | Treat as logged out for header; dashboard may still send to `/login` |

## Out of scope

- Email/password or OAuth (stay on anonymous join).
- Supabase DB views or dedicated ranking API.
- Realtime subscriptions.
- Visual redesign beyond header + highscore surfaces (keep existing Halloween theme).

## Testing

- Unit tests for ranking sort (km primary, check-ins tiebreaker; equal km cases).
- Header smoke: logged-out shows Logg inn; logged-in shows name + Logg ut (mocked Supabase).

## Success criteria

- A guest can open home and `/highscore` and see who leads without logging in.
- A participant always sees whether they are logged in and can log out in one click.
- Team and player order match the km → check-ins rule everywhere rankings appear.
