'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Group } from '@/types/database';
import { translateTeamName, getTeamEmoji } from '@/lib/utils/translations';
import AvatarSelector from '@/components/AvatarSelector';
import { LEADERS, type LeaderName } from '@/lib/login/leaders';
import {
  buildTeamClaims,
  getClaimForGroup,
  isGroupLockedForLeader,
  resolveLoginTeam,
  type TeamClaim,
} from '@/lib/login/teamClaims';

const CLAIMS_STATUS_ERROR = 'Kunne ikke hente lagstatus';
const CLAIMS_STATUS_ERROR_ON_SUBMIT = `${CLAIMS_STATUS_ERROR}. Prøv igjen.`;

function isClaimsLoadError(message: string | null): boolean {
  return (
    message === CLAIMS_STATUS_ERROR || message === CLAIMS_STATUS_ERROR_ON_SUBMIT
  );
}

export default function LoginPage() {
  const [leader, setLeader] = useState<LeaderName | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('🎃');
  const [groups, setGroups] = useState<Group[]>([]);
  const [claims, setClaims] = useState<TeamClaim[]>([]);
  const [claimsLoaded, setClaimsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

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
    loadClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchClaims = async (): Promise<TeamClaim[] | null> => {
    const { data, error: claimsError } = await supabase
      .from('users')
      .select('name, group_id')
      .in('name', [...LEADERS]);

    if (claimsError) {
      console.error('Error loading claims:', claimsError);
      return null;
    }
    return buildTeamClaims(data ?? []);
  };

  const loadClaims = async () => {
    const fresh = await fetchClaims();
    if (fresh === null) {
      setClaimsLoaded(false);
      setError(CLAIMS_STATUS_ERROR);
      return;
    }
    setClaims(fresh);
    setClaimsLoaded(true);
    setError((prev) => (isClaimsLoadError(prev) ? null : prev));
  };

  const loadGroups = async () => {
    try {
      setLoadingGroups(true);
      const { data, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .order('name');

      if (groupsError) {
        console.error('Error loading groups:', groupsError);
        // Fallback to default groups if query fails
        const fallbackGroups = [
          { id: 'team-pumpkin', name: 'Lag Gresskar', created_at: new Date().toISOString() },
          { id: 'team-ghost', name: 'Lag Spøkelse', created_at: new Date().toISOString() },
        ];
        setGroups(fallbackGroups);
      } else if (data && data.length > 0) {
        setGroups(data);
      } else {
        // If no groups exist, use fallback
        const fallbackGroups = [
          { id: 'team-pumpkin', name: 'Team Pumpkin', created_at: new Date().toISOString() },
          { id: 'team-ghost', name: 'Team Ghost', created_at: new Date().toISOString() },
        ];
        setGroups(fallbackGroups);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
      // Fallback groups
      const fallbackGroups = [
        { id: 'team-pumpkin', name: 'Team Pumpkin', created_at: new Date().toISOString() },
        { id: 'team-ghost', name: 'Team Ghost', created_at: new Date().toISOString() },
      ];
      setGroups(fallbackGroups);
    } finally {
      setLoadingGroups(false);
    }
  };

  const myClaim = leader
    ? claims.find((c) => c.leaderName === leader)
    : undefined;

  const wouldRequireTeam = leader
    ? !resolveLoginTeam({
        leader,
        selectedGroupId: selectedGroup || null,
        claims,
      }).ok
    : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leader || !selectedAvatar) {
      setError('Vennligst velg lagleder og avatar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Re-fetch claims right before writing
      const freshClaims = await fetchClaims();
      if (freshClaims === null) {
        setClaimsLoaded(false);
        setError(CLAIMS_STATUS_ERROR_ON_SUBMIT);
        setLoading(false);
        return;
      }
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

      // Get or create user
      const { data: { user } } = await supabase.auth.signInAnonymously();

      if (!user) {
        throw new Error('Kunne ikke opprette anonym bruker');
      }

      // Get or create user profile
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingUser) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('users')
          .update({ name: leader, group_id: groupId, avatar: selectedAvatar })
          .eq('id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new user
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            name: leader,
            group_id: groupId,
            avatar: selectedAvatar,
          });

        if (insertError) throw insertError;
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Kunne ikke logge inn');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black-primary p-4">
      <main className="w-full max-w-md">
        <div className="flex flex-col items-center gap-8">
          <h1 className="text-4xl font-bold text-orange-primary md:text-5xl">
            🎃 Logg inn som lagleder
          </h1>

          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div>
              <label className="block text-lg font-semibold text-purple-light mb-2">
                Velg lagleder
              </label>
              <div className="grid grid-cols-2 gap-3">
                {LEADERS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setLeader(name);
                      setError((prev) => (isClaimsLoadError(prev) ? prev : null));
                      const mine = claims.find((c) => c.leaderName === name);
                      setSelectedGroup(mine?.groupId ?? '');
                    }}
                    className={`w-full rounded-xl border-2 px-4 py-4 text-center transition-all cursor-pointer touch-manipulation ${
                      leader === name
                        ? 'border-orange-primary bg-orange-primary/20 text-orange-primary font-semibold'
                        : 'border-purple-primary bg-black-secondary text-purple-light hover:bg-purple-primary/10 active:bg-purple-primary/20'
                    }`}
                    disabled={loading}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {leader === name && '✓ '}
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <AvatarSelector
              selectedAvatar={selectedAvatar}
              onAvatarSelect={setSelectedAvatar}
            />

            <div>
              <label className="block text-lg font-semibold text-purple-light mb-2">
                Velg lag
              </label>
              {myClaim && (
                <p className="mb-2 text-sm text-purple-light">
                  Du er tildelt{' '}
                  {(() => {
                    const g = groups.find((x) => x.id === myClaim.groupId);
                    return g
                      ? `${getTeamEmoji(g.name)} ${translateTeamName(g.name)}`
                      : 'laget ditt';
                  })()}
                </p>
              )}
              {loadingGroups ? (
                <div className="rounded-xl border-2 border-purple-primary bg-black-secondary px-4 py-8 text-center text-purple-light">
                  Laster lag...
                </div>
              ) : groups.length === 0 ? (
                <div className="rounded-xl border-2 border-red-500 bg-red-500/20 px-4 py-3 text-red-200 text-sm">
                  Ingen lag tilgjengelig. Vennligst sjekk Supabase-tilkoblingen din.
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.map((group) => {
                    const claim = getClaimForGroup(claims, group.id);
                    const locked = leader
                      ? isGroupLockedForLeader(claims, group.id, leader)
                      : Boolean(claim);
                    const isSelected = selectedGroup === group.id;
                    const disabled = loading || locked || Boolean(myClaim);

                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedGroup(group.id);
                          setError(null);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        className={`w-full rounded-xl border-2 px-4 py-4 text-left transition-all touch-manipulation ${
                          locked
                            ? 'border-purple-primary/40 bg-black-secondary text-purple-secondary opacity-60 cursor-not-allowed'
                            : isSelected
                              ? 'border-orange-primary bg-orange-primary/20 text-orange-primary font-semibold'
                              : 'border-purple-primary bg-black-secondary text-purple-light hover:bg-purple-primary/10 active:bg-purple-primary/20'
                        } ${!locked && myClaim ? 'cursor-default' : ''} ${
                          !locked && !myClaim ? 'cursor-pointer' : ''
                        }`}
                        disabled={disabled}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        <span className="flex items-center gap-2">
                          {isSelected && !locked && '✓ '}
                          {getTeamEmoji(group.name)} {translateTeamName(group.name)}
                          {claim && locked && ` — Valgt av ${claim.leaderName}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {!claimsLoaded && (
              <div className="rounded-xl bg-red-500/20 border border-red-500 px-4 py-3 text-red-200">
                <p>
                  {isClaimsLoadError(error) ? error : CLAIMS_STATUS_ERROR}
                </p>
                <button
                  type="button"
                  onClick={loadClaims}
                  className="mt-2 text-sm underline"
                >
                  Prøv igjen
                </button>
              </div>
            )}

            {error && claimsLoaded && (
              <div className="rounded-xl bg-red-500/20 border border-red-500 px-4 py-3 text-red-200">
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !leader ||
                !selectedAvatar ||
                !claimsLoaded ||
                wouldRequireTeam
              }
              className="h-14 w-full rounded-xl bg-orange-primary text-lg font-semibold text-black-primary transition-all hover:bg-orange-secondary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Bli med...' : 'Start Knask eller Knep'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
