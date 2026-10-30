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
