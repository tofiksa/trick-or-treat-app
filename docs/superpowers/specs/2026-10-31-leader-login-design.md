# Leader-only login (Josef & Esma)

**Date:** 2026-10-31  
**Status:** Approved for planning  
**Approach:** UI wizard on existing Supabase anonymous auth + `users`/`groups` (no new tables)

## Goal

Make login professional and unambiguous:

1. Only two people can sign in: **Josef** and **Esma** (team leaders).
2. First leader to complete login chooses a team; the second sees both teams with the taken one locked.
3. Keep avatar selection; remove free-text name entry and open team picking for anyone.

## Context

- Today `/login` lets anyone type any name, pick any avatar, and pick either team — confusing for an event with exactly two leaders.
- Auth: Supabase anonymous sign-in; profile row in `users` (`name`, `group_id`, `avatar`).
- Teams: two groups (e.g. Team Pumpkin / Team Ghost), already in `groups`.

## Decisions

| Topic | Choice |
|--------|--------|
| Who can log in | Only Josef and Esma |
| Name entry | Two buttons: «Jeg er Josef» / «Jeg er Esma» (no free text) |
| Avatar | Still selectable on login |
| Team pick | First leader chooses freely; second sees both teams, taken team locked |
| Claim storage | Existing `users` rows with leader name + `group_id` (no new table) |
| Race | Re-check before insert/update; loser gets error + refreshed locked UI |
| Re-login same name | Reuse existing team assignment; avatar may update |
| Scope | Login page (+ small helpers/tests); dashboard/highscore/header unchanged |

## Login flow

1. **Hvem er du?** — Josef | Esma  
2. **Velg avatar** — existing `AvatarSelector`  
3. **Velg lag** — list both groups; if the other leader already has `group_id`, that group is visible but disabled with copy like «Valgt av Esma»  
4. **Start** — `signInAnonymously`, upsert profile with fixed name + avatar + `group_id`, go to `/dashboard`

If the selected leader name already has a profile with a `group_id`, skip team pick (show assignment as fixed) and continue with avatar; on submit, the new anonymous session still creates/updates **this** session’s `users` row but **must** use that same `group_id` (no re-picking). Merging into the other device’s auth user is out of scope (anonymous auth limitation).

## Architecture

```
/login (wizard)
  ├── LEADERS = ['Josef', 'Esma']  (client constant)
  ├── load groups
  ├── load team claims: users where name ∈ LEADERS and group_id set
  └── submit
        ├── re-fetch claims
        ├── reject if selected group already claimed by other leader
        ├── anonymous auth
        └── insert/update users row
```

No schema migration. No realtime required; claims loaded on mount and before submit.

## Components & modules

### Login page (`app/(auth)/login/page.tsx`)

- Replace free-text name with two leader buttons.
- Step-oriented UI copy: lagleder → avatar → lag.
- Team buttons: disabled + locked label when claimed by the other leader.
- Submit disabled until leader + avatar + (allowed) team selected.

### Helpers (preferred: pure functions under `lib/`)

- `LEADERS` constant and type `LeaderName`.
- `getTeamClaims(users)` / `isTeamLocked(groupId, claims, currentLeader)` for testable lock logic.
- Optional: `resolveLoginTeam({ leader, selectedGroupId, claims })` returning ok + groupId or error reason.

## Data flow

1. Fetch `groups` (same as today, with existing fallback names if needed).
2. Fetch `users` filtered to Josef/Esma (or fetch and filter client-side) with `group_id`.
3. Build map `group_id → leader name` for locked UI.
4. On submit: re-fetch claims; if selected team claimed by other → error; else write profile.

## Error handling

| Case | Behavior |
|------|----------|
| Selected team taken (race) | Error message; refresh locks; user must pick remaining team |
| Both teams claimed, new device same name | Treat as re-login: keep that name’s existing `group_id` |
| Groups load failure | Keep current fallback groups OR show clear connection error (prefer clear error if claims cannot be trusted) |
| Auth/profile write failure | Show message; stay on login |

## Out of scope

- Passwords / non-anonymous auth  
- Database unique constraints / claim table  
- Changing highscore, dashboard check-in, or header beyond what login already feeds  

## Success criteria

- No free-text name field on login.  
- Only Josef/Esma can create a session profile via the UI.  
- First completer picks any open team; second cannot select the taken team.  
- Avatar selection remains.  
- Existing logged-in redirect to dashboard still works.
