'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GroupStats } from '@/types/database';
import { translateTeamName } from '@/lib/utils/translations';

export default function CompetitionView() {
  const [groupStats, setGroupStats] = useState<GroupStats[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadCompetitionData();
    const interval = setInterval(loadCompetitionData, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const loadCompetitionData = async () => {
    try {
      // Check network connectivity
      if (!navigator.onLine) {
        console.warn('No internet connection - skipping competition data update');
        return;
      }

      // Get all groups
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id, name');

      if (groupsError) {
        console.error('Error loading groups:', groupsError);
        return;
      }

      if (!groups || groups.length === 0) {
        console.warn('No groups found');
        setGroupStats([]);
        return;
      }

      // Get stats for each group with error handling
      const statsPromises = groups.map(async (group) => {
        try {
          // Get all users in group
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id')
            .eq('group_id', group.id);

          if (usersError) {
            console.error(`Error loading users for group ${group.id}:`, usersError);
            return {
              group_id: group.id,
              group_name: group.name,
              total_checkins: 0,
              total_distance: 0,
              participant_count: 0,
            };
          }

          const userIds = users?.map((u) => u.id) || [];

          if (userIds.length === 0) {
            return {
              group_id: group.id,
              group_name: group.name,
              total_checkins: 0,
              total_distance: 0,
              participant_count: 0,
            };
          }

          // Get all check-ins for users in this group
          const { data: checkins, error: checkinsError } = await supabase
            .from('checkins')
            .select('distance_from_previous')
            .in('user_id', userIds);

          if (checkinsError) {
            console.error(`Error loading checkins for group ${group.id}:`, checkinsError);
            return {
              group_id: group.id,
              group_name: group.name,
              total_checkins: 0,
              total_distance: 0,
              participant_count: userIds.length,
            };
          }

          const total_checkins = checkins?.length || 0;
          const total_distance =
            checkins?.reduce((sum, c) => sum + (Number(c.distance_from_previous) || 0), 0) || 0;

          return {
            group_id: group.id,
            group_name: group.name,
            total_checkins,
            total_distance,
            participant_count: userIds.length,
          };
        } catch (err) {
          console.error(`Error processing group ${group.id}:`, err);
          // Return default stats for this group on error
          return {
            group_id: group.id,
            group_name: group.name,
            total_checkins: 0,
            total_distance: 0,
            participant_count: 0,
          };
        }
      });

      const stats = await Promise.all(statsPromises);
      setGroupStats(stats as GroupStats[]);
    } catch (error: any) {
      console.error('Error loading competition data:', error);
      // Keep existing stats on error - don't clear the UI
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-purple-primary bg-black-secondary p-6">
        <div className="text-purple-light">Laster konkurransedata...</div>
      </div>
    );
  }

  // Sort by total check-ins (descending)
  const sortedStats = [...groupStats].sort((a, b) => b.total_checkins - a.total_checkins);

  return (
    <div className="rounded-2xl border-2 border-purple-primary bg-black-secondary p-6">
      <h2 className="text-xl font-semibold text-purple-light mb-4">
        🏆 Konkurranse-tabell
      </h2>
      
      <div className="space-y-4">
        {sortedStats.map((group, index) => (
          <div
            key={group.group_id}
            className={`rounded-xl p-4 border-2 ${
              index === 0
                ? 'border-orange-primary bg-orange-primary/20'
                : 'border-purple-primary bg-purple-primary/10'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-bold text-orange-primary">
                {index === 0 ? '🥇' : '🥈'} {translateTeamName(group.group_name)}
              </div>
              {index === 0 && (
                <div className="text-sm text-purple-light">Vinner!</div>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-orange-light font-semibold">
                  {group.total_checkins}
                </div>
                <div className="text-purple-secondary">Innlogginger</div>
              </div>
              <div>
                <div className="text-orange-light font-semibold">
                  {group.total_distance.toFixed(2)}
                </div>
                <div className="text-purple-secondary">km</div>
              </div>
              <div>
                <div className="text-orange-light font-semibold">
                  {group.participant_count}
                </div>
                <div className="text-purple-secondary">Spillere</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

