'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, GroupStats, CheckinWithPhotos } from '@/types/database';
import CheckInButton from '@/components/CheckInButton';
import CompetitionView from '@/components/CompetitionView';
import MapView from '@/components/MapView';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState({
    checkin_count: 0,
    total_distance: 0,
    first_checkin_time: null as string | null,
  });
  const [recentCheckins, setRecentCheckins] = useState<CheckinWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadUserData();
    const interval = setInterval(loadUserData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadUserData = async () => {
    try {
      // Check network connectivity
      if (!navigator.onLine) {
        console.warn('No internet connection - using cached data');
        // Could implement offline cache here
        return;
      }

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.error('Auth error:', authError);
        router.push('/login');
        return;
      }

      // Get user profile with error handling
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userError) {
        if (userError.code === 'PGRST116') {
          // User profile doesn't exist - redirect to login
          router.push('/login');
          return;
        }
        console.error('Error loading user profile:', userError);
        throw userError;
      }

      if (!userData) {
        router.push('/login');
        return;
      }

      setUser(userData);

      // Get user check-ins with photos
      const { data: checkins, error: checkinsError } = await supabase
        .from('checkins')
        .select(`
          *,
          photos (*)
        `)
        .eq('user_id', authUser.id)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (checkinsError) {
        console.error('Error loading check-ins:', checkinsError);
        // Set empty array on error - don't crash the UI
        setRecentCheckins([]);
      } else if (checkins) {
        setRecentCheckins(checkins as CheckinWithPhotos[]);
        
        // Calculate stats
        const checkin_count = checkins.length;
        const total_distance = checkins.reduce(
          (sum, c) => sum + (Number(c.distance_from_previous) || 0),
          0
        );
        const first_checkin_time = checkins.length > 0
          ? checkins[checkins.length - 1].timestamp
          : null;

        setUserStats({
          checkin_count,
          total_distance,
          first_checkin_time,
        });
      } else {
        // No check-ins yet - reset to defaults
        setRecentCheckins([]);
        setUserStats({
          checkin_count: 0,
          total_distance: 0,
          first_checkin_time: null,
        });
      }
    } catch (error: any) {
      console.error('Error loading user data:', error);
      // Don't crash - show empty state
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        console.warn('Network error - may be offline');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '00:00:00';
    const start = new Date(timestamp).getTime();
    const now = Date.now();
    const diff = Math.floor((now - start) / 1000);
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black-primary">
        <div className="text-orange-primary text-xl">Laster...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black-primary p-4">
      <main className="mx-auto max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-orange-primary">
            🎃 Dashbord
          </h1>
          <div className="flex items-center gap-2 text-purple-light text-sm">
            <span className="text-2xl">{user?.avatar || '🎃'}</span>
            <span>{user?.name}</span>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-purple-primary bg-black-secondary p-6 space-y-4">
          <h2 className="text-xl font-semibold text-purple-light">Dine statistikk</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-purple-primary/20 p-4 text-center">
              <div className="text-3xl font-bold text-orange-primary">
                {userStats.checkin_count}
              </div>
              <div className="text-sm text-purple-light">Innlogginger</div>
            </div>
            
            <div className="rounded-xl bg-purple-primary/20 p-4 text-center">
              <div className="text-3xl font-bold text-orange-primary">
                {userStats.total_distance.toFixed(2)}
              </div>
              <div className="text-sm text-purple-light">km gått</div>
            </div>
          </div>

          {userStats.first_checkin_time && (
            <div className="rounded-xl bg-purple-primary/20 p-4 text-center">
              <div className="text-2xl font-bold text-orange-primary">
                {formatTime(userStats.first_checkin_time)}
              </div>
              <div className="text-sm text-purple-light">Tid forløpt</div>
            </div>
          )}
        </div>

        <CheckInButton onCheckInSuccess={loadUserData} />

        <CompetitionView />

        <MapView />

        {recentCheckins.length > 0 && (
          <div className="rounded-2xl border-2 border-purple-primary bg-black-secondary p-6">
            <h2 className="text-xl font-semibold text-purple-light mb-4">
              Nylige innlogginger
            </h2>
            <div className="space-y-3">
              {recentCheckins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="rounded-xl bg-purple-primary/10 p-4 border border-purple-primary/30"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-orange-light">
                      {new Date(checkin.timestamp).toLocaleTimeString()}
                    </div>
                    {checkin.distance_from_previous > 0 && (
                      <div className="text-purple-light text-sm">
                        +{checkin.distance_from_previous.toFixed(2)} km
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-purple-secondary">
                    {checkin.latitude.toFixed(6)}, {checkin.longitude.toFixed(6)}
                  </div>
                  {checkin.photos && checkin.photos.length > 0 && (
                    <div className="mt-2 text-sm text-orange-light">
                      📷 {checkin.photos.length} bilde{checkin.photos.length !== 1 ? 'r' : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

