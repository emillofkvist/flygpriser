import { useState } from 'react';
import Map3D from './components/Map3D';
import InfoOverlay from './components/InfoOverlay';

export default function App() {
  const [selectedRoute, setSelectedRoute] = useState(null);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Map3D onRouteSelect={setSelectedRoute} />
      <InfoOverlay selectedRoute={selectedRoute} onClearRoute={() => setSelectedRoute(null)} />
    </div>
  );
}
