import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Zap, MessageSquare } from 'lucide-react';

export default function BottomBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/new-workout', icon: Zap, label: 'Train' },
    { path: '/coach', icon: MessageSquare, label: 'Coach' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          background: '#0A0A0A',
          borderTop: '1px solid #222222',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '12px 16px',
          }}
        >
          {tabs.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="btn-press"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'transparent',
                  color: active ? '#E8FF00' : '#555555',
                  borderRadius: 8,
                  paddingLeft: 16,
                  paddingRight: 16,
                  paddingTop: 6,
                  paddingBottom: 6,
                  fontWeight: 500,
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontFamily: "'Inter', sans-serif",
                  gap: 4,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  );
}
