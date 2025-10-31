'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { reverseGeocode } from '@/lib/utils/geocoding';
import dynamic from 'next/dynamic';

// Dynamically import MapContainer to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface CheckinMarker {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  user_name: string;
  user_avatar: string | null;
  group_name: string;
  location_name?: string | null;
}

export default function MapView() {
  const [checkins, setCheckins] = useState<CheckinMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadCheckins();
    const interval = setInterval(loadCheckins, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const loadCheckins = async () => {
    try {
      if (!navigator.onLine) {
        console.warn('No internet connection - skipping map data update');
        return;
      }

      // Get all check-ins with user and group info
      const { data, error: checkinsError } = await supabase
        .from('checkins')
        .select(`
          id,
          latitude,
          longitude,
          timestamp,
          user_id,
          users!inner (
            name,
            avatar,
            group_id,
            groups!inner (
              name
            )
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(100); // Limit to latest 100 check-ins for performance

      if (checkinsError) {
        console.error('Error loading check-ins:', checkinsError);
        setError('Kunne ikke laste inn kartdata');
        return;
      }

      if (data) {
        const markers: CheckinMarker[] = data.map((checkin: any) => ({
          id: checkin.id,
          latitude: Number(checkin.latitude),
          longitude: Number(checkin.longitude),
          timestamp: checkin.timestamp,
          user_name: checkin.users?.name || 'Ukjent',
          user_avatar: checkin.users?.avatar || '🎃',
          group_name: checkin.users?.groups?.name || 'Ukjent lag',
          location_name: null, // Will be loaded asynchronously
        }));

        setCheckins(markers);
        
        // Load location names asynchronously (don't block UI)
        loadLocationNames(markers);
      }
    } catch (err: any) {
      console.error('Error loading check-ins:', err);
      setError('Kunne ikke laste inn kartdata');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-purple-primary bg-black-secondary p-6">
        <div className="text-purple-light">Laster kart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border-2 border-red-500 bg-red-500/20 p-6">
        <div className="text-red-200">{error}</div>
      </div>
    );
  }

  // Calculate center point from check-ins (or use default)
  let centerLat = 59.9139; // Default to Oslo, Norway
  let centerLng = 10.7522;

  if (checkins.length > 0) {
    const sumLat = checkins.reduce((sum, c) => sum + c.latitude, 0);
    const sumLng = checkins.reduce((sum, c) => sum + c.longitude, 0);
    centerLat = sumLat / checkins.length;
    centerLng = sumLng / checkins.length;
  }

  const loadLocationNames = async (markers: CheckinMarker[]) => {
    // Only geocode visible markers (limit to first 50 for performance)
    const markersToGeocode = markers.slice(0, 50);
    
    for (const marker of markersToGeocode) {
      try {
        const locationName = await reverseGeocode(marker.latitude, marker.longitude);
        
        // Update the specific marker with location name
        setCheckins((prevCheckins) =>
          prevCheckins.map((c) =>
            c.id === marker.id ? { ...c, location_name: locationName } : c
          )
        );
      } catch (error) {
        console.error(`Error geocoding location for marker ${marker.id}:`, error);
      }
    }
  };

  // Get group colors
  const getGroupColor = (groupName: string): string => {
    if (groupName.toLowerCase().includes('pumpkin') || groupName.toLowerCase().includes('gresskar')) {
      return '#ff7518'; // Orange for Team Pumpkin
    }
    return '#8b3db8'; // Purple for Team Ghost
  };

  // Create icon factory (only works on client-side)
  const createIcon = (avatar: string, groupColor: string) => {
    if (typeof window === 'undefined') return undefined;
    const L = require('leaflet');
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${groupColor}; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${avatar}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  return (
    <div className="rounded-2xl border-2 border-purple-primary bg-black-secondary p-6">
      <h2 className="text-xl font-semibold text-purple-light mb-4">
        🗺️ Kart over innlogginger
      </h2>
      
      <div className="h-96 w-full rounded-xl overflow-hidden border border-purple-primary/30">
        {typeof window !== 'undefined' && (
          <MapContainer
            center={[centerLat, centerLng]}
            zoom={checkins.length > 0 ? 13 : 10}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {checkins.map((checkin) => {
              const groupColor = getGroupColor(checkin.group_name);
              const icon = createIcon(checkin.user_avatar || '🎃', groupColor);

              return (
                <Marker
                  key={checkin.id}
                  position={[checkin.latitude, checkin.longitude]}
                  icon={icon}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold text-black-primary mb-1">
                        <span className="text-lg">{checkin.user_avatar || '🎃'}</span> {checkin.user_name}
                      </div>
                      <div className="text-gray-600 text-xs">
                        {new Date(checkin.timestamp).toLocaleString('no-NO')}
                      </div>
                      <div className="text-gray-600 text-xs mt-1">
                        {checkin.group_name}
                      </div>
                      {checkin.location_name ? (
                        <div className="text-gray-700 text-xs mt-2 pt-2 border-t border-gray-200 font-medium">
                          📍 {checkin.location_name}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs mt-2 pt-2 border-t border-gray-200 italic">
                          Laster lokasjon...
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>
      
      <div className="mt-4 flex gap-4 justify-center text-xs text-purple-secondary">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-orange-primary border border-white"></div>
          <span>Lag Gresskar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-purple-secondary border border-white"></div>
          <span>Lag Spøkelse</span>
        </div>
      </div>
    </div>
  );
}

