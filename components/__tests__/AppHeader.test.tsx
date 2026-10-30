import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppHeader from '../AppHeader';

const mockGetUser = vi.fn();
const mockSignOut = vi.fn();
const mockFrom = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
    from: mockFrom,
  }),
}));

describe('AppHeader', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('shows Logg inn when logged out', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    render(<AppHeader />);

    expect(await screen.findByRole('link', { name: /logg inn/i })).toBeInTheDocument();
  });

  it('shows name and Logg ut when logged in', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'u1', name: 'Ada', avatar: '🎃' },
        error: null,
      }),
    });

    render(<AppHeader />);

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logg ut/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashbord/i })).toBeInTheDocument();
  });

  it('signs out and navigates home', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'u1', name: 'Ada', avatar: '🎃' },
        error: null,
      }),
    });
    mockSignOut.mockResolvedValue({ error: null });

    render(<AppHeader />);
    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: /logg ut/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
