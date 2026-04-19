import { useState, useRef, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { PathLayer, ScatterplotLayer, ColumnLayer } from '@deck.gl/layers';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import { BUS_ROUTES } from '../data/routes';
import { BUS_STOPS } from '../data/stops';
import { useBusAnimation } from '../hooks/useBusAnimation';
import { useStaticGTFS } from '../hooks/useStaticGTFS';

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

const ROUTE_Z = 20;

export default function Map3D({ onRouteSelect, vehicles }) {
  const [viewState, setViewState] = useState(INITIAL_VIEW);
  const [autoRotate, setAutoRotate] = useState(true);
  const lastTickRef = useRef(Date.now());

  const { busPositions, trailData, stopPulse } = useBusAnimation();
  const { data: gtfsData } = useStaticGTFS();

  // Use real GTFS routes if loaded, otherwise fall back to demo routes
  const routes = gtfsData?.routes?.length ? gtfsData.routes : BUS_ROUTES;
  const stops  = gtfsData?.stops?.length
    ? gtfsData.stops.map(s => ({
        position: [parseFloat(s.stop_lon), parseFloat(s.stop_lat)],
        importance: 0.5,
        name: s.stop_name,
      }))
    : BUS_STOPS;

  const handleViewChange = useCallback(({ viewState: vs }) => {
    setViewState(vs);
    setAutoRotate(false);
  }, []);

  const onAfterRender = useCallback(() => {
    if (!autoRotate) return;
    const now = Date.now();
    const delta = (now - lastTickRef.current) / 1000;
    lastTickRef.current = now;
    setViewState(vs => ({ ...vs, bearing: (vs.bearing + delta * 2.5) % 360 }));
  }, [autoRotate]);

  const layers = [
    // ── Route tubes (real GTFS or demo) ──────────────────────────────────────
    ...routes.flatMap(route => [
      new PathLayer({
        id: `route-outer-${route.id}`,
        data: [route],
        getPath: d => d.path.map(p => [...p, ROUTE_Z]),
        getColor: d => [...d.color, 25],
        getWidth: 28,
        widthUnits: 'pixels',
        capRounded: true,
        jointRounded: true,
      }),
      new PathLayer({
        id: `route-mid-${route.id}`,
        data: [route],
        getPath: d => d.path.map(p => [...p, ROUTE_Z]),
        getColor: d => [...d.color, 80],
        getWidth: 14,
        widthUnits: 'pixels',
        capRounded: true,
        jointRounded: true,
      }),
      new PathLayer({
        id: `route-core-${route.id}`,
        data: [route],
        getPath: d => d.path.map(p => [...p, ROUTE_Z]),
        getColor: d => [...d.color, 230],
        getWidth: 4,
        widthUnits: 'pixels',
        capRounded: true,
        jointRounded: true,
        pickable: true,
        onClick: ({ object }) => onRouteSelect?.(object),
      }),
    ]),

    // ── Stop pillars ─────────────────────────────────────────────────────────
    new ColumnLayer({
      id: 'stops-glow',
      data: stops,
      getPosition: d => d.position,
      getElevation: d => (d.importance ?? 0.5) * 90 * (1 + 0.12 * stopPulse),
      getColor: () => [40, 220, 255, 55],
      radius: 24,
      diskResolution: 32,
      updateTriggers: { getElevation: stopPulse },
    }),
    new ColumnLayer({
      id: 'stops-core',
      data: stops,
      getPosition: d => d.position,
      getElevation: d => (d.importance ?? 0.5) * 90 * (1 + 0.12 * stopPulse),
      getColor: () => [100, 235, 255, 190],
      radius: 9,
      diskResolution: 32,
      updateTriggers: { getElevation: stopPulse },
    }),

    // ── Demo animated buses (always visible) ─────────────────────────────────
    new ScatterplotLayer({
      id: 'bus-trail',
      data: trailData,
      getPosition: d => d.position,
      getRadius: d => Math.max(3, 20 - d.age * 2.2),
      getColor: d => [...d.color, Math.max(0, 180 - d.age * 24)],
      radiusUnits: 'pixels',
    }),
    new ScatterplotLayer({
      id: 'bus-glow',
      data: busPositions,
      getPosition: d => d.position,
      getRadius: 36,
      getColor: d => [...d.color, 55],
      radiusUnits: 'pixels',
    }),
    new ScatterplotLayer({
      id: 'bus-core',
      data: busPositions,
      getPosition: d => d.position,
      getRadius: 14,
      getColor: () => [255, 255, 255, 240],
      radiusUnits: 'pixels',
    }),

    // ── Real GTFS-RT buses (gold, on top of demo) ─────────────────────────────
    ...(vehicles?.length ? [
      new ScatterplotLayer({
        id: 'real-glow',
        data: vehicles,
        getPosition: d => d.position,
        getRadius: 42,
        getColor: () => [255, 210, 50, 60],
        radiusUnits: 'pixels',
      }),
      new ScatterplotLayer({
        id: 'real-core',
        data: vehicles,
        getPosition: d => d.position,
        getRadius: 16,
        getColor: () => [255, 230, 80, 250],
        radiusUnits: 'pixels',
      }),
    ] : []),
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
      {MAP_STYLE && <Map mapStyle={MAP_STYLE} reuseMaps />}
    </DeckGL>
  );
}
