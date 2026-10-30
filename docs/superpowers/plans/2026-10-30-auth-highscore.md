# Auth Status + Public Highscore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a session-aware header (login/logout) and a public highscore (teams + players, km then check-ins) with a home-page top-3 teaser.

**Architecture:** Pure ranking helpers aggregate existing Supabase tables; shared `HighscoreBoard` renders full or teaser lists; `AppHeader` in the root layout shows auth state; no new DB objects or realtime.

**Tech Stack:** Next.js App Router, React 19, Supabase JS client (`@/lib/supabase/client`), Vitest + Testing Library, Tailwind (existing Halloween tokens).

## Global Constraints

- Ranking sort: `total_distance` descending, then `total_checkins` descending (verbatim from spec).
- Highscore and home teaser must work **without login**.
- Norwegian UI copy; keep existing orange/purple/black theme.
- No new Supabase tables, views, or realtime subscriptions.
- Poll `/highscore` every ~15s; home teaser loads once per visit.
- Spec: `docs/superpowers/specs/2026-10-30-auth-highscore-design.md`

## File Structure

| File | Responsibility |
|------|----------------|
| `types/database.ts` | Add `PlayerStats` type |
| `lib/utils/ranking.ts` | Pure aggregate + sort (`computeRankings`) |
| `lib/utils/__tests__/ranking.test.ts` | Unit tests for sort/aggregate |
| `lib/highscore/fetchHighscoreData.ts` | Client fetch of groups/users/checkins → `computeRankings` |
| `components/HighscoreBoard.tsx` | Presentational lists (`full` \| `teaser`) |
| `components/AppHeader.tsx` | Global nav + login/logout |
| `components/__tests__/AppHeader.test.tsx` | Header smoke tests |
| `app/layout.tsx` | Mount `AppHeader` |
| `app/highscore/page.tsx` | Public full board + polling |
| `app/page.tsx` | Top-3 teaser + CTA |
| `app/dashboard/page.tsx` | “Du er logget inn som …” + logout |
| `app/(auth)/login/page.tsx` | Redirect to dashboard if profile exists |
| `components/CompetitionView.tsx` | Use shared ranking sort (km → check-ins) |

---

### Task 1: Ranking helper (TDD)

**Files:**
- Create: `lib/utils/ranking.ts`
- Create: `lib/utils/__tests__/ranking.test.ts`
- Modify: `types/database.ts` (add `PlayerStats`)

**Interfaces:**
- Consumes: existing `GroupStats` from `types/database.ts`
- Produces:
  - `PlayerStats` type
  - `RankingInput`, `RankingResult`
  - `computeRankings(input: RankingInput): RankingResult` — teams and players both sorted by distance desc, then check-ins desc

- [ ] **Step 1: Add `PlayerStats` to types**

Append to `types/database.ts`:

```ts
export type PlayerStats = {
  user_id: string;
  name: string;
  avatar: string | null;
  group_id: string | null;
  group_name: string;
  total_checkins: number;
  total_distance: number;
};
```

- [ ] **Step 2: Write the failing tests**

Create `lib/utils/__tests__/ranking.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeRankings } from '../ranking';

describe('computeRankings', () => {
  const groups = [
    { id: 'g1', name: 'Team Pumpkin' },
    { id: 'g2', name: 'Team Ghost' },
  ];
  const users = [
    { id: 'u1', name: 'Ada', group_id: 'g1', avatar: '🎃' },
    { id: 'u2', name: 'Bo', group_id: 'g1', avatar: '👻' },
    { id: 'u3', name: 'Cara', group_id: 'g2', avatar: '🦇' },
  ];

  it('sorts players by distance then check-ins', () => {
    const checkins = [
      { user_id: 'u1', distance_from_previous: 1 },
      { user_id: 'u1', distance_from_previous: 1 }, // 2 km, 2 checkins
      { user_id: 'u2', distance_from_previous: 3 }, // 3 km, 1 checkin
      { user_id: 'u3', distance_from_previous: 3 },
      { user_id: 'u3', distance_from_previous: 0 }, // 3 km, 2 checkins — beats u2 on tiebreaker
    ];

    const { players } = computeRankings({ groups, users, checkins });

    expect(players.map((p) => p.user_id)).toEqual(['u3', 'u2', 'u1']);
    expect(players[0].total_distance).toBe(3);
    expect(players[0].total_checkins).toBe(2);
  });

  it('sorts teams by distance then check-ins', () => {
    const checkins = [
      { user_id: 'u1', distance_from_previous: 5 },
      { user_id: 'u3', distance_from_previous: 4 },
      { user_id: 'u3', distance_from_previous: 1 }, // g2: 5 km, 2 checkins — beats g1 on tiebreaker
    ];

    const { teams } = computeRankings({ groups, users, checkins });

    expect(teams.map((t) => t.group_id)).toEqual(['g2', 'g1']);
    expect(teams[0].total_distance).toBe(5);
    expect(teams[0].total_checkins).toBe(2);
    expect(teams[0].participant_count).toBe(1);
    expect(teams[1].participant_count).toBe(2);
  });

  it('includes players and teams with zero activity', () => {
    const { players, teams } = computeRankings({
      groups,
      users,
      checkins: [],
    });

    expect(players).toHaveLength(3);
    expect(teams).toHaveLength(2);
    expect(players.every((p) => p.total_distance === 0)).toBe(true);
  });

  it('treats null distance as 0', () => {
    const { players } = computeRankings({
      groups,
      users,
      checkins: [{ user_id: 'u1', distance_from_previous: null }],
    });

    expect(players.find((p) => p.user_id === 'u1')?.total_distance).toBe(0);
    expect(players.find((p) => p.user_id === 'u1')?.total_checkins).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- lib/utils/__tests__/ranking.test.ts`

Expected: FAIL — cannot find module `../ranking` (or `computeRankings` undefined).

- [ ] **Step 4: Implement `computeRankings`**

Create `lib/utils/ranking.ts`:

```ts
import type { GroupStats, PlayerStats } from '@/types/database';

export type RankingInput = {
  groups: { id: string; name: string }[];
  users: {
    id: string;
    name: string;
    group_id: string | null;
    avatar: string | null;
  }[];
  checkins: {
    user_id: string;
    distance_from_previous: number | null;
  }[];
};

export type RankingResult = {
  teams: GroupStats[];
  players: PlayerStats[];
};

function compareByDistanceThenCheckins(
  a: { total_distance: number; total_checkins: number },
  b: { total_distance: number; total_checkins: number },
): number {
  if (b.total_distance !== a.total_distance) {
    return b.total_distance - a.total_distance;
  }
  return b.total_checkins - a.total_checkins;
}

export function computeRankings(input: RankingInput): RankingResult {
  const groupNameById = new Map(input.groups.map((g) => [g.id, g.name]));

  const checkinsByUser = new Map<
    string,
    { total_distance: number; total_checkins: number }
  >();

  for (const user of input.users) {
    checkinsByUser.set(user.id, { total_distance: 0, total_checkins: 0 });
  }

  for (const checkin of input.checkins) {
    const current = checkinsByUser.get(checkin.user_id) ?? {
      total_distance: 0,
      total_checkins: 0,
    };
    current.total_checkins += 1;
    current.total_distance += Number(checkin.distance_from_previous) || 0;
    checkinsByUser.set(checkin.user_id, current);
  }

  const players: PlayerStats[] = input.users.map((user) => {
    const stats = checkinsByUser.get(user.id) ?? {
      total_distance: 0,
      total_checkins: 0,
    };
    return {
      user_id: user.id,
      name: user.name,
      avatar: user.avatar,
      group_id: user.group_id,
      group_name: user.group_id
        ? groupNameById.get(user.group_id) ?? ''
        : '',
      total_checkins: stats.total_checkins,
      total_distance: stats.total_distance,
    };
  });

  players.sort(compareByDistanceThenCheckins);

  const teams: GroupStats[] = input.groups.map((group) => {
    const members = input.users.filter((u) => u.group_id === group.id);
    let total_checkins = 0;
    let total_distance = 0;
    for (const member of members) {
      const stats = checkinsByUser.get(member.id);
      if (!stats) continue;
      total_checkins += stats.total_checkins;
      total_distance += stats.total_distance;
    }
    return {
      group_id: group.id,
      group_name: group.name,
      total_checkins,
      total_distance,
      participant_count: members.length,
    };
  });

  teams.sort(compareByDistanceThenCheckins);

  return { teams, players };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- lib/utils/__tests__/ranking.test.ts`

Expected: PASS (all 4 tests).

- [ ] **Step 6: Commit**

```bash
git add types/database.ts lib/utils/ranking.ts lib/utils/__tests__/ranking.test.ts
git commit -m "feat(ranking): add km-first ranking helper"
```

---

### Task 2: Fetch highscore data helper

**Files:**
- Create: `lib/highscore/fetchHighscoreData.ts`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/client`, `computeRankings` from `@/lib/utils/ranking`
- Produces: `fetchHighscoreData(): Promise<RankingResult>` — on fetch error throws; caller keeps previous state

- [ ] **Step 1: Implement fetch helper**

Create `lib/highscore/fetchHighscoreData.ts`:

```ts
import { createClient } from '@/lib/supabase/client';
import { computeRankings, type RankingResult } from '@/lib/utils/ranking';

export async function fetchHighscoreData(): Promise<RankingResult> {
  const supabase = createClient();

  const [groupsRes, usersRes, checkinsRes] = await Promise.all([
    supabase.from('groups').select('id, name'),
    supabase.from('users').select('id, name, group_id, avatar'),
    supabase.from('checkins').select('user_id, distance_from_previous'),
  ]);

  if (groupsRes.error) throw groupsRes.error;
  if (usersRes.error) throw usersRes.error;
  if (checkinsRes.error) throw checkinsRes.error;

  return computeRankings({
    groups: groupsRes.data ?? [],
    users: usersRes.data ?? [],
    checkins: checkinsRes.data ?? [],
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/highscore/fetchHighscoreData.ts
git commit -m "feat(highscore): add client data loader"
```

---

### Task 3: `HighscoreBoard` + public `/highscore` page

**Files:**
- Create: `components/HighscoreBoard.tsx`
- Create: `app/highscore/page.tsx`

**Interfaces:**
- Consumes: `RankingResult`, `translateTeamName`, `getTeamEmoji`, `fetchHighscoreData`
- Produces: `<HighscoreBoard mode="full" | "teaser" teams={...} players={...} />`

- [ ] **Step 1: Create `HighscoreBoard`**

Create `components/HighscoreBoard.tsx`:

```tsx
'use client';

import type { GroupStats, PlayerStats } from '@/types/database';
import { getTeamEmoji, translateTeamName } from '@/lib/utils/translations';

type Props = {
  mode: 'full' | 'teaser';
  teams: GroupStats[];
  players: PlayerStats[];
};

export default function HighscoreBoard({ mode, teams, players }: Props) {
  const teamList = mode === 'teaser' ? teams.slice(0, 3) : teams;
  const playerList = mode === 'teaser' ? players.slice(0, 3) : players;

  if (teamList.length === 0 && playerList.length === 0) {
    return (
      <p className="text-purple-light text-center py-6">
        Ingen resultater ennå
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold text-purple-light mb-4">
          🏆 Lag
        </h2>
        <div className="space-y-3">
          {teamList.map((team, index) => (
            <div
              key={team.group_id}
              className={`rounded-xl p-4 border-2 ${
                index === 0
                  ? 'border-orange-primary bg-orange-primary/20'
                  : 'border-purple-primary bg-purple-primary/10'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-orange-primary">
                  {index + 1}. {getTeamEmoji(team.group_name)}{' '}
                  {translateTeamName(team.group_name)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-orange-light font-semibold">
                    {team.total_distance.toFixed(2)}
                  </div>
                  <div className="text-purple-secondary">km</div>
                </div>
                <div>
                  <div className="text-orange-light font-semibold">
                    {team.total_checkins}
                  </div>
                  <div className="text-purple-secondary">Innlogginger</div>
                </div>
                <div>
                  <div className="text-orange-light font-semibold">
                    {team.participant_count}
                  </div>
                  <div className="text-purple-secondary">Spillere</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-purple-light mb-4">
          👤 Spillere
        </h2>
        <div className="space-y-3">
          {playerList.map((player, index) => (
            <div
              key={player.user_id}
              className={`rounded-xl p-4 border-2 ${
                index === 0
                  ? 'border-orange-primary bg-orange-primary/20'
                  : 'border-purple-primary bg-purple-primary/10'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-orange-primary">
                  {index + 1}. {player.avatar || '🎃'} {player.name}
                </span>
                <span className="text-sm text-purple-light">
                  {player.group_name
                    ? translateTeamName(player.group_name)
                    : 'Uten lag'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-orange-light font-semibold">
                    {player.total_distance.toFixed(2)}
                  </div>
                  <div className="text-purple-secondary">km</div>
                </div>
                <div>
                  <div className="text-orange-light font-semibold">
                    {player.total_checkins}
                  </div>
                  <div className="text-purple-secondary">Innlogginger</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create `/highscore` page**

Create `app/highscore/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import HighscoreBoard from '@/components/HighscoreBoard';
import { fetchHighscoreData } from '@/lib/highscore/fetchHighscoreData';
import type { GroupStats, PlayerStats } from '@/types/database';

export default function HighscorePage() {
  const [teams, setTeams] = useState<GroupStats[]>([]);
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!navigator.onLine) return;
        const data = await fetchHighscoreData();
        if (cancelled) return;
        setTeams(data.teams);
        setPlayers(data.players);
        setError(false);
      } catch (err) {
        console.error('Highscore load failed:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black-primary p-4">
      <main className="mx-auto max-w-md space-y-6">
        <h1 className="text-3xl font-bold text-orange-primary">
          🏆 Highscore
        </h1>
        <p className="text-purple-light text-sm">
          Rangert etter km, deretter antall innlogginger. Oppdateres automatisk.
        </p>

        {loading ? (
          <div className="text-purple-light">Laster highscore...</div>
        ) : error && teams.length === 0 && players.length === 0 ? (
          <p className="text-purple-light text-center py-6">
            Ingen resultater ennå
          </p>
        ) : (
          <HighscoreBoard mode="full" teams={teams} players={players} />
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke**

Run: `npm run dev`  
Open `http://localhost:3000/highscore` while logged out.  
Expected: page loads without redirect to `/login`; shows empty state or rankings.

- [ ] **Step 4: Commit**

```bash
git add components/HighscoreBoard.tsx app/highscore/page.tsx
git commit -m "feat(highscore): add public highscore page"
```

---

### Task 4: Home page top-3 teaser

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `HighscoreBoard` (`mode="teaser"`), `fetchHighscoreData`
- Produces: home CTA «Se hele highscoren» → `/highscore`

- [ ] **Step 1: Convert home to client teaser + keep existing CTAs**

Replace `app/page.tsx` with:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import HighscoreBoard from '@/components/HighscoreBoard';
import { fetchHighscoreData } from '@/lib/highscore/fetchHighscoreData';
import type { GroupStats, PlayerStats } from '@/types/database';

export default function Home() {
  const [teams, setTeams] = useState<GroupStats[]>([]);
  const [players, setPlayers] = useState<PlayerStats[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchHighscoreData();
        if (!cancelled) {
          setTeams(data.teams);
          setPlayers(data.players);
        }
      } catch (err) {
        console.error('Home highscore teaser failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black-primary p-4">
      <main className="w-full max-w-md">
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-4xl font-bold leading-tight text-orange-primary md:text-5xl">
              🎃 Knask eller Knep
            </h1>
            <h2 className="text-2xl font-semibold text-purple-light md:text-3xl">
              Konkurranseoversikt
            </h2>
          </div>

          <div className="w-full rounded-2xl border-2 border-purple-primary bg-black-secondary p-6 shadow-lg shadow-purple-primary/20">
            <p className="text-lg leading-relaxed text-orange-light">
              Velkommen til Halloween Knask eller Knep-konkurransen! Spor
              reisen din, sjekk inn ved hus, og konkurrer med andre grupper.
            </p>
          </div>

          <div className="flex w-full flex-col gap-4">
            <Link
              href="/login"
              className="h-14 w-full rounded-xl bg-orange-primary text-lg font-semibold text-black-primary transition-all hover:bg-orange-secondary active:scale-95 flex items-center justify-center"
            >
              Kom i gang
            </Link>
            <Link
              href="/results"
              className="h-14 w-full rounded-xl border-2 border-purple-primary bg-transparent text-lg font-semibold text-purple-light transition-all hover:bg-purple-primary/20 active:scale-95 flex items-center justify-center"
            >
              📸 Se resultater
            </Link>
            <Link
              href="/dashboard"
              className="h-14 w-full rounded-xl border-2 border-purple-primary bg-transparent text-lg font-semibold text-purple-light transition-all hover:bg-purple-primary/20 active:scale-95 flex items-center justify-center"
            >
              Se konkurranse
            </Link>
          </div>

          <div className="w-full rounded-2xl border-2 border-purple-primary bg-black-secondary p-6 text-left">
            <h3 className="text-xl font-semibold text-purple-light mb-4 text-center">
              Topp 3
            </h3>
            <HighscoreBoard mode="teaser" teams={teams} players={players} />
            <Link
              href="/highscore"
              className="mt-4 h-12 w-full rounded-xl border-2 border-orange-primary bg-transparent text-base font-semibold text-orange-primary transition-all hover:bg-orange-primary/10 active:scale-95 flex items-center justify-center"
            >
              Se hele highscoren
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke**

Open `http://localhost:3000/` logged out.  
Expected: Topp 3 section + link to full highscore; no auth redirect.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(home): add highscore top-3 teaser"
```

---

### Task 5: `AppHeader` (TDD) + root layout

**Files:**
- Create: `components/AppHeader.tsx`
- Create: `components/__tests__/AppHeader.test.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `createClient`, Next `Link` / `useRouter` / `usePathname`
- Produces: header showing Logg inn when logged out; avatar, name, Dashbord, Logg ut when logged in

- [ ] **Step 1: Write failing header tests**

Create `components/__tests__/AppHeader.test.tsx`:

```tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppHeader from '../AppHeader';

const mockGetUser = vi.fn();
const mockSignOut = vi.fn();
const mockFrom = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
    from: mockFrom,
  }),
}));

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Logg inn when logged out', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    render(<AppHeader />);

    expect(await screen.findByRole('link', { name: /logg inn/i })).toBeInTheDocument();
  });

  it('shows name and Logg ut when logged in', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'u1', name: 'Ada', avatar: '🎃' },
        error: null,
      }),
    });

    render(<AppHeader />);

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logg ut/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashbord/i })).toBeInTheDocument();
  });

  it('signs out and navigates home', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'u1', name: 'Ada', avatar: '🎃' },
        error: null,
      }),
    });
    mockSignOut.mockResolvedValue({ error: null });

    render(<AppHeader />);
    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: /logg ut/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `npm test -- components/__tests__/AppHeader.test.tsx`

Expected: FAIL — module not found / component missing.

- [ ] **Step 3: Implement `AppHeader`**

Create `components/AppHeader.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type HeaderUser = {
  name: string;
  avatar: string | null;
};

export default function AppHeader() {
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          if (!cancelled) setUser(null);
          return;
        }

        const { data: profile, error } = await supabase
          .from('users')
          .select('name, avatar')
          .eq('id', authUser.id)
          .single();

        if (error || !profile) {
          if (!cancelled) setUser(null);
          return;
        }

        if (!cancelled) {
          setUser({ name: profile.name, avatar: profile.avatar });
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [pathname, supabase]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setUser(null);
      router.push('/');
    }
  };

  const linkClass =
    'text-sm font-medium text-purple-light hover:text-orange-primary transition-colors';

  return (
    <header className="sticky top-0 z-20 border-b border-purple-primary/40 bg-black-primary/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
        <nav className="flex flex-wrap items-center gap-3">
          <Link href="/" className={linkClass}>
            Hjem
          </Link>
          <Link href="/highscore" className={linkClass}>
            Highscore
          </Link>
          <Link href="/results" className={linkClass}>
            Resultater
          </Link>
          {user && (
            <Link href="/dashboard" className={linkClass}>
              Dashbord
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {!ready ? null : user ? (
            <>
              <span className="text-sm text-orange-light flex items-center gap-1">
                <span aria-hidden>{user.avatar || '🎃'}</span>
                <span>{user.name}</span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-semibold text-purple-light hover:text-orange-primary"
              >
                Logg ut
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-semibold text-orange-primary hover:text-orange-secondary"
            >
              Logg inn
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Mount in layout**

In `app/layout.tsx`, import and render `AppHeader` inside `<body>` before `{children}`:

```tsx
import AppHeader from "@/components/AppHeader";
// ...
<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
  <AppHeader />
  {children}
</body>
```

- [ ] **Step 5: Run tests — expect pass**

Run: `npm test -- components/__tests__/AppHeader.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/AppHeader.tsx components/__tests__/AppHeader.test.tsx app/layout.tsx
git commit -m "feat(nav): add session-aware AppHeader"
```

---

### Task 6: Dashboard login clarity + login redirect

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: same `signOut` pattern as header
- Produces: dashboard banner «Du er logget inn som …» + Logg ut; login redirects when profile already exists

- [ ] **Step 1: Update dashboard header area**

In `app/dashboard/page.tsx`, add logout handler near other hooks:

```ts
const handleLogout = async () => {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Logout failed:', err);
  } finally {
    router.push('/');
  }
};
```

Replace the title row (the `flex items-center justify-between` with Dashbord + avatar) with:

```tsx
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <h1 className="text-3xl font-bold text-orange-primary">🎃 Dashbord</h1>
  </div>
  <div className="rounded-xl border border-purple-primary/40 bg-black-secondary px-4 py-3 flex items-center justify-between gap-3">
    <p className="text-purple-light text-sm">
      Du er logget inn som{' '}
      <span className="text-orange-primary font-semibold">
        {user?.avatar || '🎃'} {user?.name}
      </span>
    </p>
    <button
      type="button"
      onClick={handleLogout}
      className="text-sm font-semibold text-purple-light hover:text-orange-primary shrink-0"
    >
      Logg ut
    </button>
  </div>
</div>
```

- [ ] **Step 2: Redirect logged-in users away from login**

At the top of `LoginPage`’s existing `useEffect` (or a new one), after `loadGroups` setup, add session check:

```ts
useEffect(() => {
  const redirectIfLoggedIn = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .single();

    if (profile) {
      router.replace('/dashboard');
    }
  };

  redirectIfLoggedIn();
  loadGroups();
}, []);
```

Remove the separate `useEffect(() => { loadGroups(); }, []);` so groups still load once (merge into this effect). Keep `loadGroups` function as-is.

- [ ] **Step 3: Manual smoke**

1. Log in → dashboard shows «Du er logget inn som …» and Logg ut.  
2. Logg ut → home; header shows Logg inn.  
3. Visit `/login` while logged in with profile → redirected to `/dashboard`.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx app/(auth)/login/page.tsx
git commit -m "feat(auth): clarify session on dashboard and login"
```

---

### Task 7: Align `CompetitionView` with shared ranking

**Files:**
- Modify: `components/CompetitionView.tsx`

**Interfaces:**
- Consumes: `computeRankings` (teams only for display, or full result)
- Produces: same UI, sorted by km then check-ins (not check-ins alone)

- [ ] **Step 1: Refactor data load to use `computeRankings`**

Replace the per-group nested query loop + sort with:

```ts
const loadCompetitionData = async () => {
  try {
    if (!navigator.onLine) {
      console.warn('No internet connection - skipping competition data update');
      return;
    }

    const { teams } = await fetchHighscoreData();
    setGroupStats(teams);
  } catch (error: unknown) {
    console.error('Error loading competition data:', error);
  } finally {
    setLoading(false);
  }
};
```

Import `fetchHighscoreData` from `@/lib/highscore/fetchHighscoreData`.

Remove the local sort that uses `b.total_checkins - a.total_checkins`. Render `groupStats` directly (already sorted by `computeRankings`).

Keep the existing card UI (emoji medals, km, check-ins, participants). Prefer showing **km** first in the grid to match the new ranking rule (swap the first two metric cells so km is leftmost).

- [ ] **Step 2: Manual smoke on dashboard**

Expected: team order matches `/highscore` lag-liste.

- [ ] **Step 3: Commit**

```bash
git add components/CompetitionView.tsx
git commit -m "refactor(competition): rank teams by km then check-ins"
```

---

### Task 8: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: all tests PASS (including ranking + AppHeader + existing suites).

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: no new errors in touched files.

- [ ] **Step 3: Final manual checklist**

- [ ] Guest: home teaser + `/highscore` without login  
- [ ] Guest: header shows Logg inn  
- [ ] Participant: header shows name + Logg ut + Dashbord  
- [ ] Dashboard banner + logout  
- [ ] Logout → home, Logg inn visible  
- [ ] Team and player order: higher km wins; equal km → more check-ins wins  

- [ ] **Step 4: Commit only if verification fixed stray files**; otherwise done.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Global header login/logout + nav | Task 5 |
| Dashboard «Du er logget inn som …» + logout | Task 6 |
| Public `/highscore` teams + players | Task 3 |
| Sort km then check-ins | Task 1, 7 |
| Home top-3 + CTA | Task 4 |
| Login redirect if already joined | Task 6 |
| Empty/error without login redirect | Task 3 |
| Poll 15s on highscore; home once | Task 3, 4 |
| Ranking unit tests + header smoke | Task 1, 5 |
| No new DB / realtime | All tasks (none add DB) |
