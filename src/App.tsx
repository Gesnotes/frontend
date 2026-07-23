import { color, gradient, shadow } from './theme';

export default function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 56, height: 56, borderRadius: 16, background: gradient.brand,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 26, color: '#fff', boxShadow: shadow.brand,
        }}
      >
        G
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>Gesnotes</div>
      <div style={{ color: color.inkSoft, fontSize: 14 }}>Le suivi scolaire, en toute confiance</div>
    </div>
  );
}
