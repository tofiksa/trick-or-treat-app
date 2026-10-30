'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type HeaderUser = {
  name: string;
  avatar: string | null;
};

export default function AppHeader() {
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          if (!cancelled) setUser(null);
          return;
        }

        const { data: profile, error } = await supabase
          .from('users')
          .select('name, avatar')
          .eq('id', authUser.id)
          .single();

        if (error || !profile) {
          if (!cancelled) setUser(null);
          return;
        }

        if (!cancelled) {
          setUser({ name: profile.name, avatar: profile.avatar });
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [pathname, supabase]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setUser(null);
      router.push('/');
    }
  };

  const linkClass =
    'text-sm font-medium text-purple-light hover:text-orange-primary transition-colors';

  return (
    <header className="sticky top-0 z-20 border-b border-purple-primary/40 bg-black-primary/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
        <nav className="flex flex-wrap items-center gap-3">
          <Link href="/" className={linkClass}>
            Hjem
          </Link>
          <Link href="/highscore" className={linkClass}>
            Highscore
          </Link>
          <Link href="/results" className={linkClass}>
            Resultater
          </Link>
          {user && (
            <Link href="/dashboard" className={linkClass}>
              Dashbord
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {!ready ? null : user ? (
            <>
              <span className="text-sm text-orange-light flex items-center gap-1">
                <span aria-hidden>{user.avatar || '🎃'}</span>
                <span>{user.name}</span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-semibold text-purple-light hover:text-orange-primary"
              >
                Logg ut
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-semibold text-orange-primary hover:text-orange-secondary"
            >
              Logg inn
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
