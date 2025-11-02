// Reverse geocoding utility using OpenStreetMap Nominatim API
// Note: Nominatim has usage limits (1 request per second), so we cache results

interface GeocodingResult {
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

// In-memory cache to avoid repeated API calls
const locationCache = new Map<string, string>();

const RATE_LIMIT_DELAY_MS = 1100;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

let lastRequestTime = 0;
let rateLimitPromise: Promise<void> = Promise.resolve();

const acquireRateLimitSlot = async () => {
  rateLimitPromise = rateLimitPromise.then(async () => {
    const elapsed = Date.now() - lastRequestTime;
    if (elapsed < RATE_LIMIT_DELAY_MS) {
      await delay(RATE_LIMIT_DELAY_MS - elapsed);
    }
    lastRequestTime = Date.now();
  });

  return rateLimitPromise;
};

// Generate cache key from coordinates
const getCacheKey = (lat: number, lng: number, precision: number = 4): string => {
  // Round coordinates to reduce cache misses for nearby locations
  const roundedLat = Math.round(lat * Math.pow(10, precision)) / Math.pow(10, precision);
  const roundedLng = Math.round(lng * Math.pow(10, precision)) / Math.pow(10, precision);
  return `${roundedLat},${roundedLng}`;
};

// Extract a readable location name from Nominatim response
const extractLocationName = (result: GeocodingResult): string => {
  const addr = result.address;
  if (!addr) return result.display_name.split(',')[0] || 'Ukjent lokasjon';

  // Build location name from most specific to general
  const parts: string[] = [];
  
  if (addr.road) {
    const roadName = addr.house_number ? `${addr.road} ${addr.house_number}` : addr.road;
    parts.push(roadName);
  }
  
  if (addr.suburb && !parts.includes(addr.suburb)) {
    parts.push(addr.suburb);
  }
  
  if (addr.city && !parts.includes(addr.city)) {
    parts.push(addr.city);
  } else if (addr.county && !parts.includes(addr.county)) {
    parts.push(addr.county);
  }

  // If we have a meaningful location, return it; otherwise use display_name
  if (parts.length > 0) {
    return parts.join(', ');
  }

  // Fallback to first part of display_name
  return result.display_name.split(',').slice(0, 2).join(', ').trim();
};

/**
 * Reverse geocode coordinates to a location name
 * Uses OpenStreetMap Nominatim API (free, but rate limited to 1 req/sec)
 * Results are cached to avoid repeated API calls
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  // Check cache first
  const cacheKey = getCacheKey(latitude, longitude);
  const cached = locationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Respect Nominatim rate limit: 1 request per second
    await acquireRateLimitSlot();

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Trick-or-Treat App', // Required by Nominatim
        'Accept-Language': 'no,nb,en', // Prefer Norwegian names
      },
    });

    if (!response.ok) {
      console.warn(`Geocoding failed: ${response.status}`);
      return null;
    }

    const data: GeocodingResult = await response.json();
    const locationName = extractLocationName(data);

    // Cache the result
    locationCache.set(cacheKey, locationName);
    
    // Limit cache size to prevent memory issues (keep last 1000 entries)
    if (locationCache.size > 1000) {
      const firstKey = locationCache.keys().next().value;
      if (firstKey !== undefined) {
        locationCache.delete(firstKey);
      }
    }

    return locationName;
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return null;
  }
}

/**
 * Batch reverse geocode multiple coordinates
 * Includes delays to respect rate limits
 */
export async function reverseGeocodeBatch(
  coordinates: Array<{ latitude: number; longitude: number }>
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  
  for (const coord of coordinates) {
    const key = `${coord.latitude},${coord.longitude}`;
    const locationName = await reverseGeocode(coord.latitude, coord.longitude);
    results.set(key, locationName);
    
  }
  
  return results;
}

// Test-only helper to reset caches and timers between runs
export function __resetGeocodingTestState() {
  locationCache.clear();
  lastRequestTime = 0;
  rateLimitPromise = Promise.resolve();
}

