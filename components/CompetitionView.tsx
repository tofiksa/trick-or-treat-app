'use client';

import { useEffect, useState } from 'react';
import { fetchHighscoreData } from '@/lib/highscore/fetchHighscoreData';
import { GroupStats } from '@/types/database';
import { translateTeamName } from '@/lib/utils/translations';

export default function CompetitionView() {
  const [groupStats, setGroupStats] = useState<GroupStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    loadCompetitionData();
    const interval = setInterval(loadCompetitionData, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-purple-primary bg-black-secondary p-6">
        <div className="text-purple-light">Laster konkurransedata...</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-purple-primary bg-black-secondary p-6">
      <h2 className="text-xl font-semibold text-purple-light mb-4">
        🏆 Konkurranse-tabell
      </h2>
      
      <div className="space-y-4">
        {groupStats.map((group, index) => (
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
                  {group.total_distance.toFixed(2)}
                </div>
                <div className="text-purple-secondary">km</div>
              </div>
              <div>
                <div className="text-orange-light font-semibold">
                  {group.total_checkins}
                </div>
                <div className="text-purple-secondary">Innlogginger</div>
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
