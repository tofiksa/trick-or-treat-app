'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { reverseGeocode } from '@/lib/utils/geocoding';

interface TimelinePost {
  id: string;
  photo_url: string;
  uploaded_at: string;
  user_name: string;
  user_avatar: string | null;
  group_name: string;
  checkin_timestamp: string;
  checkin_location: {
    latitude: number;
    longitude: number;
  } | null;
  location_name?: string | null;
}

export default function TimelineFeed() {
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadPhotos();
    const interval = setInterval(loadPhotos, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadPhotos = async () => {
    try {
      if (!navigator.onLine) {
        console.warn('No internet connection - skipping timeline update');
        return;
      }

      // Fetch all photos with check-in and user information
      const { data, error: photosError } = await supabase
        .from('photos')
        .select(`
          id,
          storage_url,
          uploaded_at,
          checkin_id,
          checkins!inner (
            timestamp,
            latitude,
            longitude,
            user_id,
            users!inner (
              name,
              avatar,
              group_id,
              groups!inner (
                name
              )
            )
          )
        `)
        .order('uploaded_at', { ascending: false })
        .limit(100);

      if (photosError) {
        console.error('Error loading photos:', photosError);
        setError('Kunne ikke laste inn bilder. Vennligst prøv igjen senere.');
        return;
      }

      if (data) {
        const timelinePosts: TimelinePost[] = data
          .filter((photo: any) => photo.checkins && photo.checkins.users) // Filter out any missing relations
          .map((photo: any) => ({
            id: photo.id,
            photo_url: photo.storage_url,
            uploaded_at: photo.uploaded_at,
            user_name: photo.checkins?.users?.name || 'Ukjent',
            user_avatar: photo.checkins?.users?.avatar || '🎃',
            group_name: photo.checkins?.users?.groups?.name || 'Ukjent lag',
            checkin_timestamp: photo.checkins?.timestamp || photo.uploaded_at,
            checkin_location: photo.checkins?.latitude && photo.checkins?.longitude
              ? {
                  latitude: Number(photo.checkins.latitude),
                  longitude: Number(photo.checkins.longitude),
                }
              : null,
            location_name: null, // Will be loaded asynchronously
          }));

        setPosts(timelinePosts);
        
        // Load location names asynchronously (don't block UI)
        loadLocationNames(timelinePosts);
      }
    } catch (err: any) {
      console.error('Error loading photos:', err);
      setError('Kunne ikke laste inn bilder. Vennligst prøv igjen senere.');
    } finally {
      setLoading(false);
    }
  };

  const loadLocationNames = async (posts: TimelinePost[]) => {
    // Only geocode posts with location data
    const postsWithLocation = posts.filter((post) => post.checkin_location);
    
    if (postsWithLocation.length === 0) return;

    // Load location names for visible posts first (limit to first 20 for performance)
    const postsToGeocode = postsWithLocation.slice(0, 20);
    
    for (const post of postsToGeocode) {
      if (!post.checkin_location) continue;
      
      try {
        const locationName = await reverseGeocode(
          post.checkin_location.latitude,
          post.checkin_location.longitude
        );
        
        // Update the specific post with location name
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === post.id ? { ...p, location_name: locationName } : p
          )
        );
      } catch (error) {
        console.error(`Error geocoding location for post ${post.id}:`, error);
      }
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'akkurat nå';
    if (diffMins < 60) return `for ${diffMins} minutter siden`;
    if (diffHours < 24) return `for ${diffHours} timer siden`;
    if (diffDays < 7) return `for ${diffDays} dager siden`;
    
    return date.toLocaleDateString('no-NO', {
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400">Laster bilder...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-center">
        {error}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">Ingen bilder å vise ennå</div>
        <div className="text-gray-500 text-sm">
          Når deltakere laster opp bilder, vil de vises her.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
        >
          {/* Post Header - User Info */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-primary flex items-center justify-center text-xl flex-shrink-0">
                {post.user_avatar || '🎃'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {post.user_name}
                  </h3>
                  <span className="text-gray-500 text-sm">·</span>
                  <span className="text-gray-500 text-sm whitespace-nowrap">
                    {formatTime(post.checkin_timestamp)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {post.group_name}
                </div>
              </div>
            </div>
          </div>

          {/* Post Image */}
          <div className="bg-gray-50">
            <img
              src={post.photo_url}
              alt={`Bilde fra ${post.user_name}`}
              className="w-full h-auto object-contain max-h-[600px] mx-auto"
              loading="lazy"
              onError={(e) => {
                // Fallback if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'p-8 text-center text-gray-400';
                  errorDiv.textContent = 'Bildet kunne ikke lastes';
                  parent.appendChild(errorDiv);
                }
              }}
            />
          </div>

          {/* Post Footer - Optional actions/info */}
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="flex flex-col gap-1 text-sm text-gray-500">
              <span>
                📍 Sjekket inn {formatTime(post.checkin_timestamp)}
              </span>
              {post.location_name ? (
                <span className="text-xs text-gray-600 font-medium">
                  {post.location_name}
                </span>
              ) : post.checkin_location ? (
                <span className="text-xs text-gray-400 italic">
                  Laster lokasjon...
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

