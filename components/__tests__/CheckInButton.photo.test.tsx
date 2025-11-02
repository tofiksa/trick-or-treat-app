import { render, fireEvent, waitFor, act, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import CheckInButton from '../CheckInButton';

const mockGetUser = vi.fn().mockResolvedValue({
  data: { user: { id: 'user-1' } },
  error: null,
});

const mockInsert = vi.fn().mockReturnThis();
const mockSingle = vi.fn().mockResolvedValue({
  data: { id: 'checkin-1' },
  error: null,
});

const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

const createClientMock = {
  auth: {
    getUser: mockGetUser,
    signInAnonymously: vi.fn(),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: mockMaybeSingle,
    insert: mockInsert,
    single: mockSingle,
  }),
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/photo.jpg' } }),
    }),
  },
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => createClientMock,
}));

vi.mock('@/lib/utils/distance', () => ({
  calculateDistance: vi.fn().mockReturnValue(0),
}));

vi.mock('browser-image-compression', () => ({
  default: vi.fn().mockImplementation(async (file: File) => file),
}));

describe('CheckInButton photo upload feedback', () => {
  const originalConfirm = window.confirm;
  const originalCreateElement = document.createElement.bind(document);
  let createElementSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(0);

    window.confirm = vi.fn().mockReturnValue(true);

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    (global.navigator as any).geolocation = {
      getCurrentPosition: (
        success: (position: GeolocationPosition) => void,
        _error: (error: GeolocationPositionError) => void,
        _options?: PositionOptions,
      ) => {
        success({
          coords: {
            latitude: 59.9,
            longitude: 10.7,
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

    const fileInputMock = {
      type: 'file',
      accept: 'image/*',
      capture: 'environment',
      files: [
        new File(['content'], 'photo.jpg', { type: 'image/jpeg' }),
      ],
      onchange: null as null | ((e: Event) => void),
      oncancel: null as null | (() => void),
      click: vi.fn().mockImplementation(function (this: any) {
        if (this.onchange) {
          this.onchange({ target: { files: this.files } } as unknown as Event);
        }
      }),
    } as unknown as HTMLInputElement;

    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'input') {
        return fileInputMock;
      }
      return originalCreateElement(tagName);
    });

    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    window.confirm = originalConfirm;
    createElementSpy.mockRestore();
    delete (navigator as { onLine?: boolean }).onLine;
    vi.clearAllMocks();
  });

  it('keeps success message visible until timeout after successful photo upload', async () => {
    const onSuccess = vi.fn();
    render(<CheckInButton onCheckInSuccess={onSuccess} />);

    const button = await screen.findByRole('button', { name: /sjekk inn/i });
    fireEvent.click(button);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    const getSuccessMessage = () =>
      screen.getByText((content) => content.includes('Bilde lastet opp vellykket!'));

    await waitFor(() => {
      expect(getSuccessMessage()).toBeInTheDocument();
    });

    expect(button).not.toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(getSuccessMessage()).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    await waitFor(() => {
      expect(
        screen.queryByText((content) => content.includes('Bilde lastet opp vellykket!')),
      ).not.toBeInTheDocument();
    });

    expect(onSuccess).toHaveBeenCalledTimes(2);
  });
});
