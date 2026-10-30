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
