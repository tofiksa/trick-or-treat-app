import { isLeaderName, type LeaderName } from './leaders';

export type TeamClaim = { groupId: string; leaderName: LeaderName };

export function buildTeamClaims(
  users: { name: string; group_id: string | null }[],
): TeamClaim[] {
  const seen = new Set<LeaderName>();
  const claims: TeamClaim[] = [];

  for (const user of users) {
    if (!isLeaderName(user.name) || user.group_id === null) {
      continue;
    }
    if (seen.has(user.name)) {
      continue;
    }
    seen.add(user.name);
    claims.push({ groupId: user.group_id, leaderName: user.name });
  }

  return claims;
}

export function getClaimForGroup(
  claims: TeamClaim[],
  groupId: string,
): TeamClaim | undefined {
  return claims.find((claim) => claim.groupId === groupId);
}

export function isGroupLockedForLeader(
  claims: TeamClaim[],
  groupId: string,
  currentLeader: LeaderName,
): boolean {
  const claim = getClaimForGroup(claims, groupId);
  if (!claim) {
    return false;
  }
  return claim.leaderName !== currentLeader;
}

export type ResolveTeamResult =
  | { ok: true; groupId: string }
  | {
      ok: false;
      reason: 'team_taken' | 'team_required' | 'leader_already_assigned';
      groupId?: string;
    };

export function resolveLoginTeam(args: {
  leader: LeaderName;
  selectedGroupId: string | null;
  claims: TeamClaim[];
}): ResolveTeamResult {
  const existing = args.claims.find((claim) => claim.leaderName === args.leader);
  if (existing) {
    return { ok: true, groupId: existing.groupId };
  }

  if (!args.selectedGroupId) {
    return { ok: false, reason: 'team_required' };
  }

  const groupClaim = getClaimForGroup(args.claims, args.selectedGroupId);
  if (groupClaim && groupClaim.leaderName !== args.leader) {
    return { ok: false, reason: 'team_taken' };
  }

  return { ok: true, groupId: args.selectedGroupId };
}
