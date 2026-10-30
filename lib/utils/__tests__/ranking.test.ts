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
