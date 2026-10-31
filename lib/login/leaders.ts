export const LEADERS = ['Josef', 'Esma'] as const;
export type LeaderName = (typeof LEADERS)[number];

export function isLeaderName(name: string): name is LeaderName {
  return (LEADERS as readonly string[]).includes(name);
}
