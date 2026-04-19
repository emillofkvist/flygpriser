import { BUS_ROUTES } from '../data/routes';

export default function InfoOverlay({ selectedRoute, onClearRoute, vehicles, gtfsStatus }) {
  const liveCount = vehicles?.length ?? 0;
  const isLive = liveCount > 0;

  return (
    <div style={s.container}>

      {/* Title */}
      <div>
        <h1 style={s.title}>Helsingborg</h1>
        <div style={s.subtitle}>BUSSTRAFIK 3D</div>
      </div>

      {/* Live status badge */}
      <div style={{ ...s.badge, background: isLive ? 'rgba(80,255,160,0.1)' : 'rgba(255,255,255,0.05)', borderColor: isLive ? 'rgba(80,255,160,0.3)' : 'rgba(255,255,255,0.1)' }}>
        <span style={{ ...s.dot2, background: isLive ? '#50ffa0' : '#888', boxShadow: isLive ? '0 0 8px #50ffa0' : 'none' }} />
        {isLive
          ? <span style={s.badgeText}>{liveCount} bussar live (Skånetrafiken)</span>
          : <span style={s.badgeText}>Demo-läge &mdash; hämtar realtidsdata…</span>
        }
      </div>

      {/* Route legend (demo routes) */}
      <div style={s.legend}>
        {BUS_ROUTES.map(route => {
          const active = selectedRoute?.id === route.id;
          return (
            <div key={route.id} style={{ ...s.row, opacity: selectedRoute && !active ? 0.35 : 1 }}>
              <span style={{ ...s.dot, background: `rgb(${route.color})`, boxShadow: `0 0 6px rgb(${route.color})` }} />
              <span style={s.lname}>{route.name}</span>
              <span style={s.ldesc}>{route.description}</span>
            </div>
          );
        })}
      </div>

      {/* Real buses legend */}
      {isLive && (
        <div style={s.row}>
          <span style={{ ...s.dot, background: '#ffe650', boxShadow: '0 0 6px #ffe650' }} />
          <span style={s.lname}>Live</span>
          <span style={s.ldesc}>Skånetrafiken realtid</span>
        </div>
      )}

      {/* Selected route */}
      {selectedRoute && (
        <div style={s.selected}>
          <div style={s.selTitle}>{selectedRoute.name}</div>
          <div style={s.selDesc}>{selectedRoute.description}</div>
          <button style={s.clearBtn} onClick={onClearRoute}>✕ Avmarkera</button>
        </div>
      )}

      <div style={s.hint}>Klicka på rutt · Drag för att rotera · Scroll för zoom</div>
    </div>
  );
}

const s = {
  container: {
    position: 'absolute', top: 24, left: 24, zIndex: 10,
    pointerEvents: 'none', display: 'flex', flexDirection: 'column',
    gap: 18, maxWidth: 250,
    fontFamily: "system-ui, 'Segoe UI', sans-serif",
  },
  title: {
    margin: 0, fontSize: 28, fontWeight: 200, letterSpacing: 4,
    color: '#7df9ff', textShadow: '0 0 20px rgba(125,249,255,0.5)',
  },
  subtitle: { fontSize: 10, letterSpacing: 5, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  badge: {
    display: 'flex', alignItems: 'center', gap: 8,
    border: '1px solid', borderRadius: 6, padding: '7px 10px',
  },
  dot2: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  badgeText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  legend: { display: 'flex', flexDirection: 'column', gap: 7 },
  row: { display: 'flex', alignItems: 'center', gap: 8, transition: 'opacity 0.3s' },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  lname: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 500, width: 56 },
  ldesc: { fontSize: 11, color: 'rgba(255,255,255,0.38)' },
  selected: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, padding: '12px 14px', pointerEvents: 'auto',
  },
  selTitle: { fontSize: 16, fontWeight: 600, color: 'white', marginBottom: 4 },
  selDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10 },
  clearBtn: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.6)', borderRadius: 4,
    padding: '4px 10px', cursor: 'pointer', fontSize: 11,
  },
  hint: { fontSize: 10, color: 'rgba(255,255,255,0.18)', lineHeight: 1.6, letterSpacing: 0.3 },
};
