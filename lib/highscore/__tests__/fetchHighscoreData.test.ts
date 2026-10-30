import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHighscoreData } from '../fetchHighscoreData';

const checkinRangeMock = vi.fn();

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

describe('fetchHighscoreData', () => {
  beforeEach(() => {
    checkinRangeMock.mockReset();
    mockFrom.mockReset();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'groups') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'g1', name: 'Team Pumpkin' }],
            error: null,
          }),
        };
      }
      if (table === 'users') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'u1',
                name: 'Ada',
                group_id: 'g1',
                avatar: '🎃',
              },
            ],
            error: null,
          }),
        };
      }
      if (table === 'checkins') {
        return {
          select: vi.fn().mockReturnValue({
            range: checkinRangeMock,
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });
  });

  it('paginates checkins until a short page is returned', async () => {
    const row = { user_id: 'u1', distance_from_previous: 1 };

    checkinRangeMock
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }, () => ({ ...row })),
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ ...row }],
        error: null,
      });

    const result = await fetchHighscoreData();

    expect(checkinRangeMock).toHaveBeenCalledTimes(2);
    expect(checkinRangeMock).toHaveBeenNthCalledWith(1, 0, 999);
    expect(checkinRangeMock).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(result.players[0].total_checkins).toBe(1001);
  });
});
