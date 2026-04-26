import { Map } from './components/Map';
import { useGeolocation } from './hooks/useGeolocation';
import './App.css';

export default function App() {
  const { position } = useGeolocation();

  return (
    <div className="app">
      <div className="map-container">
        <Map userPosition={position} />
      </div>
    </div>
  );
}
