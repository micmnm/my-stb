import { useState, useEffect } from 'react';

interface Position {
  lat: number;
  lng: number;
}

export function useGeolocation() {
  const [position, setPosition] = useState<Position | null>(null);
  const [watchError, setError] = useState<string | null>(null);
  const supported = typeof navigator !== 'undefined' && !!navigator.geolocation;
  const error = supported ? watchError : 'Geolocation not supported';

  useEffect(() => {
    if (!supported) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [supported]);

  return { position, error };
}
