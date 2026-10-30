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
