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
