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
