const API_KEY = import.meta.env.VITE_TRAFIKLAB_KEY;
const RT_URL = 'https://opendata.samtrafiken.se/gtfs-rt/skane/VehiclePositions.pb';

export async function fetchVehiclePositions() {
  if (!API_KEY) return null;

  const res = await fetch(`${RT_URL}?key=${API_KEY}`);
  if (!res.ok) throw new Error(`Trafiklab error: ${res.status}`);

  const buffer = await res.arrayBuffer();

  const { transit_realtime } = await import('gtfs-realtime-bindings');
  const feed = transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

  return feed.entity
    .filter(e => e.vehicle?.position)
    .map(e => ({
      id: e.id,
      position: [e.vehicle.position.longitude, e.vehicle.position.latitude, 25],
      routeId: e.vehicle.trip?.routeId ?? 'unknown',
      bearing: e.vehicle.position.bearing ?? 0,
    }));
}
