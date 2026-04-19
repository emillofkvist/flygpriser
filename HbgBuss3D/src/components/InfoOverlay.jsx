import { BUS_ROUTES } from '../data/routes';

const DOT_SIZE = 10;

export default function InfoOverlay({ selectedRoute, onClearRoute }) {
  return (
    <div style={styles.container}>
      <div>
        <h1 style={styles.title}>Helsingborg</h1>
        <div style={styles.subtitle}>BUSSTRAFIK 3D</div>
      </div>

      <div style={styles.legend}>
        {BUS_ROUTES.map(route => {
          const active = selectedRoute?.id === route.id;
          return (
            <div
              key={route.id}
              style={{ ...styles.legendRow, opacity: selectedRoute && !active ? 0.4 : 1 }}
            >
              <span
                style={{
                  ...styles.dot,
                  background: `rgb(${route.color.join(',')})`,
                  boxShadow: `0 0 6px rgb(${route.color.join(',')})`,
                }}
              />
              <span style={styles.legendName}>{route.name}</span>
              <span style={styles.legendDesc}>{route.description}</span>
            </div>
          );
        })}
      </div>

      {selectedRoute && (
        <div style={styles.selected}>
          <div style={styles.selectedTitle}>{selectedRoute.name}</div>
          <div style={styles.selectedDesc}>{selectedRoute.description}</div>
          <button style={styles.clearBtn} onClick={onClearRoute}>✕ Avmarkera</button>
        </div>
      )}

      <div style={styles.hint}>
        Klicka på en rutt för mer info
        <br />
        Dra för att rotera • Scroll för zoom
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: 24,
    left: 24,
    zIndex: 10,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    maxWidth: 240,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 200,
    letterSpacing: 4,
    color: '#7df9ff',
    textShadow: '0 0 20px rgba(125,249,255,0.6)',
  },
  subtitle: {
    fontSize: 10,
    letterSpacing: 5,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
  legend: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'opacity 0.3s',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: '50%',
    flexShrink: 0,
  },
  legendName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: 500,
    width: 56,
  },
  legendDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  selected: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: '12px 14px',
    pointerEvents: 'auto',
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'white',
    marginBottom: 4,
  },
  selectedDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 10,
  },
  clearBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.6)',
    borderRadius: 4,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 11,
  },
  hint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
    lineHeight: 1.6,
    letterSpacing: 0.5,
  },
};
