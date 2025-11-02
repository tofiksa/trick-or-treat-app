import { render, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CheckInButton from '../CheckInButton';
import { calculateDistance } from '@/lib/utils/distance';

const mockGetUser = vi.fn().mockResolvedValue({
  data: { user: { id: 'user-1' } },
  error: null,
});

const mockMaybeSingle = vi.fn().mockResolvedValue({
  data: {
    latitude: 0,
    longitude: 0,
  },
  error: null,
});

const mockSingle = vi.fn().mockResolvedValue({
  data: { id: 'checkin-1' },
  error: null,
});

const mockFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: mockMaybeSingle,
  insert: vi.fn().mockReturnThis(),
  single: mockSingle,
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com' } }),
      }),
    },
  }),
}));

vi.mock('@/lib/utils/distance', () => ({
  calculateDistance: vi.fn().mockReturnValue(123),
}));

describe('CheckInButton', () => {
  beforeEach(() => {
    (global.navigator as any).geolocation = {
      getCurrentPosition: (
        success: (position: GeolocationPosition) => void,
        _error: (error: GeolocationPositionError) => void,
        _options?: PositionOptions,
      ) => {
        success({
          coords: {
            latitude: 10,
            longitude: 20,
            accuracy: 5,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      },
    };

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('allows check-ins when previous coordinates are zero', async () => {
    const onSuccess = vi.fn();
    const { getByRole } = render(<CheckInButton onCheckInSuccess={onSuccess} />);

    const button = getByRole('button', { name: /sjekk inn/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    expect(calculateDistance).toHaveBeenCalledWith(0, 0, 10, 20);
  });
});
