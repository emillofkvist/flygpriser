import { useState, useRef, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { PathLayer, ScatterplotLayer, ColumnLayer } from '@deck.gl/layers';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import { BUS_ROUTES } from '../data/routes';
import { BUS_STOPS } from '../data/stops';
import { useBusAnimation } from '../hooks/useBusAnimation';

const INITIAL_VIEW = {
  longitude: 12.700,
  latitude: 56.047,
  zoom: 12.8,
  pitch: 52,
  bearing: -18,
};

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
const MAP_STYLE = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`
  : null;

const ROUTE_ELEVATION = 20;

export default function Map3D({ onRouteSelect }) {
  const [viewState, setViewState] = useState(INITIAL_VIEW);
  const [autoRotate, setAutoRotate] = useState(true);
  const rotateRef = useRef(null);
  const lastTickRef = useRef(Date.now());

  const { busPositions, trailData, stopPulse } = useBusAnimation();

  const handleViewChange = useCallback(({ viewState: vs }) => {
    setViewState(vs);
    setAutoRotate(false);
  }, []);

  // Slow camera rotation when user hasn't interacted
  const onAfterRender = useCallback(() => {
    if (!autoRotate) return;
    const now = Date.now();
    const delta = (now - lastTickRef.current) / 1000;
    lastTickRef.current = now;
    setViewState(vs => ({ ...vs, bearing: (vs.bearing + delta * 2.5) % 360 }));
  }, [autoRotate]);

  const layers = [
    // Glowing route tubes — 3 layers per route (outer glow → inner glow → core)
    ...BUS_ROUTES.flatMap(route => [
      new PathLayer({
        id: `route-outer-${route.id}`,
        data: [route],
        getPath: d => d.path.map(p => [...p, ROUTE_ELEVATION]),
        getColor: d => [...d.color, 25],
        getWidth: 28,
        widthUnits: 'pixels',
        capRounded: true,
        jointRounded: true,
      }),
      new PathLayer({
        id: `route-mid-${route.id}`,
        data: [route],
        getPath: d => d.path.map(p => [...p, ROUTE_ELEVATION]),
        getColor: d => [...d.color, 80],
        getWidth: 14,
        widthUnits: 'pixels',
        capRounded: true,
        jointRounded: true,
      }),
      new PathLayer({
        id: `route-core-${route.id}`,
        data: [route],
        getPath: d => d.path.map(p => [...p, ROUTE_ELEVATION]),
        getColor: d => [...d.color, 230],
        getWidth: 4,
        widthUnits: 'pixels',
        capRounded: true,
        jointRounded: true,
        pickable: true,
        onClick: ({ object }) => onRouteSelect?.(object),
      }),
    ]),

    // Stop light pillars — outer glow + core
    new ColumnLayer({
      id: 'stops-glow',
      data: BUS_STOPS,
      getPosition: d => d.position,
      getElevation: d => d.importance * 90 * (1 + 0.12 * stopPulse),
      getColor: () => [40, 220, 255, 55],
      radius: 24,
      diskResolution: 32,
      updateTriggers: { getElevation: stopPulse },
    }),
    new ColumnLayer({
      id: 'stops-core',
      data: BUS_STOPS,
      getPosition: d => d.position,
      getElevation: d => d.importance * 90 * (1 + 0.12 * stopPulse),
      getColor: () => [100, 235, 255, 190],
      radius: 9,
      diskResolution: 32,
      updateTriggers: { getElevation: stopPulse },
    }),

    // Bus particle trails
    new ScatterplotLayer({
      id: 'bus-trail',
      data: trailData,
      getPosition: d => d.position,
      getRadius: d => Math.max(3, 20 - d.age * 2.2),
      getColor: d => [...d.color, Math.max(0, 190 - d.age * 26)],
      radiusUnits: 'pixels',
    }),

    // Bus outer glow
    new ScatterplotLayer({
      id: 'bus-glow',
      data: busPositions,
      getPosition: d => d.position,
      getRadius: 36,
      getColor: d => [...d.color, 55],
      radiusUnits: 'pixels',
    }),

    // Bus core dot
    new ScatterplotLayer({
      id: 'bus-core',
      data: busPositions,
      getPosition: d => d.position,
      getRadius: 15,
      getColor: () => [255, 255, 255, 245],
      radiusUnits: 'pixels',
    }),
  ];

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={handleViewChange}
      controller={{ doubleClickZoom: false }}
      layers={layers}
      onAfterRender={onAfterRender}
      style={{ background: '#050a15' }}
    >
      {MAP_STYLE && (
        <Map
          mapStyle={MAP_STYLE}
          reuseMaps
        />
      )}
    </DeckGL>
  );
}
