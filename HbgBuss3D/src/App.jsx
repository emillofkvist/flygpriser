import { useState } from 'react';
import Map3D from './components/Map3D';
import InfoOverlay from './components/InfoOverlay';
import { useVehiclePositions } from './hooks/useVehiclePositions';

export default function App() {
  const [selectedRoute, setSelectedRoute] = useState(null);
  const { vehicles, status } = useVehiclePositions();

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Map3D onRouteSelect={setSelectedRoute} vehicles={vehicles} />
      <InfoOverlay
        selectedRoute={selectedRoute}
        onClearRoute={() => setSelectedRoute(null)}
        vehicles={vehicles}
        gtfsStatus={status}
      />
    </div>
  );
}
