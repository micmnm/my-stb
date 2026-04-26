import { useState } from 'react';
import { Map } from './components/Map';
import { BottomSheet } from './components/BottomSheet';
import { SearchBar } from './components/SearchBar';
import { FavouriteChips } from './components/FavouriteChips';
import { useGeolocation } from './hooks/useGeolocation';
import { useFavourites } from './hooks/useFavourites';
import type { RouteOption, GeocodingResult } from './types';
import './App.css';

export default function App() {
  const { position } = useGeolocation();
  const { favourites } = useFavourites();
  const [_destination, setDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [_selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);

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
        <Map userPosition={position} />
      </div>
      <BottomSheet>
        <SearchBar onSelect={handleSearchSelect} />
        <FavouriteChips favourites={favourites} onSelect={handleFavouriteSelect} />
      </BottomSheet>
    </div>
  );
}
