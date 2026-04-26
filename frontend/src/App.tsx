import { useState, useEffect } from 'react';
import { Map } from './components/Map';
import { BottomSheet } from './components/BottomSheet';
import { SearchBar } from './components/SearchBar';
import { FavouriteChips } from './components/FavouriteChips';
import { FavouritesManager } from './components/FavouritesManager';
import { RouteResults } from './components/RouteResults';
import { useGeolocation } from './hooks/useGeolocation';
import { useFavourites } from './hooks/useFavourites';
import { useRoutes } from './hooks/useRoutes';
import { useVehicles } from './hooks/useVehicles';
import type { RouteOption, GeocodingResult } from './types';
import './App.css';

export default function App() {
  const { position } = useGeolocation();
  const { favourites, add, update, remove } = useFavourites();
  const { routes, loading: routesLoading, search: searchRoutes } = useRoutes();
  const [destination, setDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [showFavManager, setShowFavManager] = useState(false);
  const [pendingSaveFav, setPendingSaveFav] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const vehicles = useVehicles(selectedRoute?.routeId ?? null);

  useEffect(() => {
    if (position && destination) {
      searchRoutes(position.lat, position.lng, destination.lat, destination.lng);
    }
  }, [position, destination, searchRoutes]);

  const handleSearchSelect = (result: GeocodingResult) => {
    setSelectedRoute(null);
    setDestination({ lat: result.lat, lng: result.lng, name: result.displayName.split(',')[0] });
  };

  const handleFavouriteSelect = (fav: { lat: number; lng: number; name: string }) => {
    setSelectedRoute(null);
    setDestination({ lat: fav.lat, lng: fav.lng, name: fav.name });
  };

  return (
    <div className="app">
      <div className="map-container">
        <Map
          userPosition={position}
          selectedRoute={selectedRoute}
          destination={destination}
          vehicles={vehicles}
        />
      </div>
      <BottomSheet>
        {showFavManager ? (
          <FavouritesManager
            favourites={favourites}
            onAdd={add}
            onUpdate={update}
            onRemove={remove}
            onClose={() => { setShowFavManager(false); setPendingSaveFav(null); }}
            pendingSave={pendingSaveFav}
          />
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <div style={{ flex: 1 }}><SearchBar onSelect={handleSearchSelect} /></div>
              <button onClick={() => setShowFavManager(true)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>★</button>
            </div>
            <FavouriteChips favourites={favourites} onSelect={handleFavouriteSelect} />
            <RouteResults routes={routes} loading={routesLoading} onSelect={setSelectedRoute} />
          </>
        )}
      </BottomSheet>
    </div>
  );
}
