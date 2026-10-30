import { createClient } from '@/lib/supabase/client';
import { computeRankings, type RankingResult } from '@/lib/utils/ranking';
import type { SupabaseClient } from '@supabase/supabase-js';

const CHECKINS_PAGE_SIZE = 1000;

type CheckinRow = {
  user_id: string;
  distance_from_previous: number | null;
};

export async function fetchAllCheckins(
  supabase: SupabaseClient,
): Promise<CheckinRow[]> {
  const all: CheckinRow[] = [];
  let from = 0;

  while (true) {
    const to = from + CHECKINS_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('checkins')
      .select('user_id, distance_from_previous')
      .range(from, to);

    if (error) throw error;

    const page = data ?? [];
    all.push(...page);

    if (page.length < CHECKINS_PAGE_SIZE) break;
    from += CHECKINS_PAGE_SIZE;
  }

  return all;
}

export async function fetchHighscoreData(): Promise<RankingResult> {
  const supabase = createClient();

  const [groupsRes, usersRes] = await Promise.all([
    supabase.from('groups').select('id, name'),
    supabase.from('users').select('id, name, group_id, avatar'),
  ]);

  if (groupsRes.error) throw groupsRes.error;
  if (usersRes.error) throw usersRes.error;

  const checkins = await fetchAllCheckins(supabase);

  return computeRankings({
    groups: groupsRes.data ?? [],
    users: usersRes.data ?? [],
    checkins,
  });
}
