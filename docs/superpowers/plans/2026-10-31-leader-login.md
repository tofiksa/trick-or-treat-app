# Leader-only login (Josef & Esma) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict `/login` to Josef and Esma with a clear wizard; first leader picks a team, second sees the taken team locked.

**Architecture:** Pure helpers in `lib/login/` decide team locks and submit resolution from leader claims loaded from `users`. Login page becomes a small wizard (leader → avatar → team) on existing anonymous Supabase auth; no schema changes.

**Tech Stack:** Next.js App Router, React client components, Supabase JS client, Vitest + Testing Library, Tailwind (existing tokens).

## Global Constraints

- Only leaders: `Josef` and `Esma` (exact spelling).
- Name UI: two buttons only — no free-text name field.
- Avatar selection stays (`AvatarSelector`).
- Team claim source: `users` rows where `name` ∈ leaders and `group_id` is set.
- No new DB tables or migrations.
- Norwegian UI copy.
- Dashboard / highscore / header behavior unchanged aside from login feeding them.
- Tests via `npm test` (vitest).

---

## File structure

| File | Responsibility |
|------|----------------|
| `lib/login/leaders.ts` | `LEADERS`, `LeaderName`, `isLeaderName` |
| `lib/login/teamClaims.ts` | Build claims map; lock checks; resolve team on submit |
| `lib/login/__tests__/teamClaims.test.ts` | Unit tests for claim/lock/resolve |
| `app/(auth)/login/page.tsx` | Wizard UI + Supabase wiring |
| `components/__tests__/LoginPage.test.tsx` (optional if heavy) | Prefer testing helpers; light page test only if needed |

---

### Task 1: Leader constants + team claim helpers

**Files:**
- Create: `lib/login/leaders.ts`
- Create: `lib/login/teamClaims.ts`
- Create: `lib/login/__tests__/teamClaims.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `LEADERS = ['Josef', 'Esma'] as const`
  - `type LeaderName = (typeof LEADERS)[number]`
  - `isLeaderName(name: string): name is LeaderName`
  - `type TeamClaim = { groupId: string; leaderName: LeaderName }`
  - `buildTeamClaims(users: { name: string; group_id: string | null }[]): TeamClaim[]` — only leader names with non-null `group_id`; if duplicate leaders, keep first
  - `getClaimForGroup(claims: TeamClaim[], groupId: string): TeamClaim | undefined`
  - `isGroupLockedForLeader(claims: TeamClaim[], groupId: string, currentLeader: LeaderName): boolean` — locked if claimed by the **other** leader
  - `type ResolveTeamResult = { ok: true; groupId: string } | { ok: false; reason: 'team_taken' | 'team_required' | 'leader_already_assigned'; groupId?: string }`
  - `resolveLoginTeam(args: { leader: LeaderName; selectedGroupId: string | null; claims: TeamClaim[] }): ResolveTeamResult`
    - If `claims` already has an entry for `leader`, return `{ ok: true, groupId: that claim’s groupId }` (ignore selection; re-login).
    - Else if `!selectedGroupId` → `{ ok: false, reason: 'team_required' }`
    - Else if selected group claimed by other leader → `{ ok: false, reason: 'team_taken' }`
    - Else → `{ ok: true, groupId: selectedGroupId }`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { LEADERS, isLeaderName } from '../leaders';
import {
  buildTeamClaims,
  isGroupLockedForLeader,
  resolveLoginTeam,
} from '../teamClaims';

describe('leaders', () => {
  it('exposes Josef and Esma only', () => {
    expect([...LEADERS]).toEqual(['Josef', 'Esma']);
  });

  it('isLeaderName accepts only those', () => {
    expect(isLeaderName('Josef')).toBe(true);
    expect(isLeaderName('Esma')).toBe(true);
    expect(isLeaderName('Ada')).toBe(false);
  });
});

describe('buildTeamClaims', () => {
  it('keeps only leaders with a group', () => {
    const claims = buildTeamClaims([
      { name: 'Josef', group_id: 'g1' },
      { name: 'Ada', group_id: 'g2' },
      { name: 'Esma', group_id: null },
    ]);
    expect(claims).toEqual([{ groupId: 'g1', leaderName: 'Josef' }]);
  });
});

describe('isGroupLockedForLeader', () => {
  const claims = [{ groupId: 'g1', leaderName: 'Josef' as const }];

  it('locks claimed team for the other leader', () => {
    expect(isGroupLockedForLeader(claims, 'g1', 'Esma')).toBe(true);
  });

  it('does not lock claimed team for the same leader', () => {
    expect(isGroupLockedForLeader(claims, 'g1', 'Josef')).toBe(false);
  });

  it('does not lock unclaimed team', () => {
    expect(isGroupLockedForLeader(claims, 'g2', 'Esma')).toBe(false);
  });
});

describe('resolveLoginTeam', () => {
  it('forces existing leader assignment on re-login', () => {
    const result = resolveLoginTeam({
      leader: 'Josef',
      selectedGroupId: 'g2',
      claims: [{ groupId: 'g1', leaderName: 'Josef' }],
    });
    expect(result).toEqual({ ok: true, groupId: 'g1' });
  });

  it('rejects team taken by other leader', () => {
    const result = resolveLoginTeam({
      leader: 'Esma',
      selectedGroupId: 'g1',
      claims: [{ groupId: 'g1', leaderName: 'Josef' }],
    });
    expect(result).toEqual({ ok: false, reason: 'team_taken' });
  });

  it('accepts free pick when nothing claimed', () => {
    const result = resolveLoginTeam({
      leader: 'Esma',
      selectedGroupId: 'g2',
      claims: [],
    });
    expect(result).toEqual({ ok: true, groupId: 'g2' });
  });

  it('requires team when leader has no prior claim', () => {
    const result = resolveLoginTeam({
      leader: 'Josef',
      selectedGroupId: null,
      claims: [],
    });
    expect(result).toEqual({ ok: false, reason: 'team_required' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/login/__tests__/teamClaims.test.ts`

Expected: FAIL (module not found / exports missing)

- [ ] **Step 3: Implement helpers**

`lib/login/leaders.ts`:

```ts
export const LEADERS = ['Josef', 'Esma'] as const;
export type LeaderName = (typeof LEADERS)[number];

export function isLeaderName(name: string): name is LeaderName {
  return (LEADERS as readonly string[]).includes(name);
}
```

`lib/login/teamClaims.ts`: implement the interfaces above exactly.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/login/__tests__/teamClaims.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/login/leaders.ts lib/login/teamClaims.ts lib/login/__tests__/teamClaims.test.ts
git commit -m "feat(login): add leader team-claim helpers"
```

---

### Task 2: Rewrite login page as leader wizard

**Files:**
- Modify: `app/(auth)/login/page.tsx`
- Consumes: `LEADERS`, `LeaderName`, `buildTeamClaims`, `getClaimForGroup`, `isGroupLockedForLeader`, `resolveLoginTeam` from Task 1
- Produces: working `/login` UI per spec

**Behavior checklist (implement all):**

1. State: `leader: LeaderName | null`, `selectedAvatar`, `selectedGroup`, `groups`, `claims`, `loading`, `loadingGroups`, `error`.
2. On mount: redirect if auth user has profile (unchanged); load groups; load users with `name` in Josef/Esma (`.in('name', [...LEADERS])`) and `buildTeamClaims`.
3. UI step 1: heading e.g. «Velg lagleder» + two buttons Josef / Esma. Selecting a leader clears error; if that leader already has a claim, pre-set `selectedGroup` to claim’s `groupId`.
4. UI step 2: `AvatarSelector` (unchanged component).
5. UI step 3: «Velg lag» — map `groups`; for each group if `isGroupLockedForLeader(claims, group.id, leader)` then disabled button showing `{emoji} {translatedName} — Valgt av {claim.leaderName}`; else selectable as today.
6. If current leader already has a claim: show teams but both non-selectable except indicating their fixed team (or only show message «Du er tildelt {team}» + continue). Simplest: disable all team buttons; highlight their assigned team; submit uses `resolveLoginTeam` forced group.
7. Remove free-text name `<input>`.
8. Submit:
   - Require `leader` and avatar; call `resolveLoginTeam` with **fresh** claims re-fetched from Supabase before write.
   - Map reasons to Norwegian errors:
     - `team_taken` → «Dette laget er allerede valgt. Velg det andre laget.»
     - `team_required` → «Vennligst velg et lag»
   - On `team_taken`, set refreshed `claims` into state.
   - Then `signInAnonymously` + insert/update `users` with `name: leader`, `group_id`, `avatar` (same pattern as current page).
9. Submit button disabled when `!leader || !selectedAvatar || loading` or when resolve would be `team_required` (no group and no prior claim).
10. Copy tone: professional, e.g. title «Logg inn som lagleder», CTA «Start Knask eller Knep».

- [ ] **Step 1: Rewrite `app/(auth)/login/page.tsx`**

Replace free-text name block with leader buttons; wire claims load/refresh; use helpers for lock + resolve. Keep existing redirect-if-logged-in and group fallback behavior unless claims cannot load — if users query fails, set error «Kunne ikke hente lagstatus» and do not allow submit until retry succeeds (safer than open pick).

Key submit fragment:

```ts
const { data: leaderUsers, error: claimsError } = await supabase
  .from('users')
  .select('name, group_id')
  .in('name', [...LEADERS]);

if (claimsError) {
  setError('Kunne ikke hente lagstatus. Prøv igjen.');
  setLoading(false);
  return;
}

const freshClaims = buildTeamClaims(leaderUsers ?? []);
setClaims(freshClaims);

const resolved = resolveLoginTeam({
  leader,
  selectedGroupId: selectedGroup || null,
  claims: freshClaims,
});

if (!resolved.ok) {
  if (resolved.reason === 'team_taken') {
    setError('Dette laget er allerede valgt. Velg det andre laget.');
  } else {
    setError('Vennligst velg et lag');
  }
  setLoading(false);
  return;
}

const groupId = resolved.groupId;
// ... existing anonymous auth + insert/update with name: leader, group_id: groupId, avatar: selectedAvatar
```

Leader buttons example:

```tsx
<div className="grid grid-cols-2 gap-3">
  {LEADERS.map((name) => (
    <button
      key={name}
      type="button"
      onClick={() => {
        setLeader(name);
        setError(null);
        const mine = claims.find((c) => c.leaderName === name);
        setSelectedGroup(mine?.groupId ?? '');
      }}
      className={/* selected vs default, same token style as team buttons */}
      disabled={loading}
    >
      {name}
    </button>
  ))}
</div>
```

Locked team button label:

```tsx
const claim = getClaimForGroup(claims, group.id);
const locked = leader
  ? isGroupLockedForLeader(claims, group.id, leader)
  : Boolean(claim);

// disabled={loading || locked || Boolean(claims.find(c => c.leaderName === leader))}
// children include claim && locked ? ` — Valgt av ${claim.leaderName}` : ...
```

- [ ] **Step 2: Manual sanity check**

Run: `npm run build` (or `npx tsc --noEmit` if faster) and fix type errors.

Expected: build/typecheck succeeds.

- [ ] **Step 3: Run unit tests**

Run: `npm test -- lib/login`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/(auth)/login/page.tsx
git commit -m "feat(login): Josef/Esma wizard with locked teams"
```

---

### Task 3: Verification pass

**Files:** none new (verify only)

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: all PASS

- [ ] **Step 2: Quick checklist against spec**

- [ ] No free-text name on login  
- [ ] Only Josef/Esma selectable  
- [ ] First leader can pick either team  
- [ ] Second sees locked label «Valgt av {name}»  
- [ ] Avatar still present  
- [ ] Race: re-fetch claims before write  

- [ ] **Step 3: Commit only if verification fixed anything**; otherwise done

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Only Josef/Esma | 1 + 2 |
| Two buttons, no free text | 2 |
| Avatar kept | 2 |
| First picks / second locked | 1 + 2 |
| Claims from `users`, no new table | 2 |
| Race re-check | 2 |
| Re-login same name keeps group | 1 `resolveLoginTeam` + 2 |
| Dashboard etc. unchanged | (no tasks touch them) |
