import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetGeocodingTestState,
  reverseGeocode,
  reverseGeocodeBatch,
} from '../geocoding';

const mockResponse = (displayName: string) => ({
  ok: true,
  json: async () => ({
    display_name: displayName,
    address: {
      city: displayName,
    },
  }),
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  __resetGeocodingTestState();
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('reverseGeocode', () => {
  it('returns cached result without additional rate-limit delay', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(mockResponse('Oslo'));

    const firstCall = reverseGeocode(59.9139, 10.7522);
    await vi.advanceTimersByTimeAsync(1100);
    const firstResult = await firstCall;

    expect(firstResult).toBe('Oslo');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const timeBeforeCacheHit = Date.now();
    const cachedResult = await reverseGeocode(59.9139, 10.7522);

    expect(cachedResult).toBe('Oslo');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(Date.now()).toBe(timeBeforeCacheHit);
  });
});

describe('reverseGeocodeBatch', () => {
  it('only waits once per lookup while respecting the API rate limit', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(mockResponse('Oslo'))
      .mockResolvedValueOnce(mockResponse('Bergen'));

    const batchPromise = reverseGeocodeBatch([
      { latitude: 59.9139, longitude: 10.7522 },
      { latitude: 60.39299, longitude: 5.32415 },
    ]);

    await vi.advanceTimersByTimeAsync(1100);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1100);

    const results = await batchPromise;

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(Date.now()).toBe(2200);
    expect(results.get('59.9139,10.7522')).toBe('Oslo');
    expect(results.get('60.39299,5.32415')).toBe('Bergen');
  });
});
