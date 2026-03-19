import { useNavigate, useLocation } from 'react-router-dom';
import { Home, TrendingUp, MessageCircle } from 'lucide-react';

export default function BottomBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/progress', icon: TrendingUp, label: 'Progress' },
    { path: '/coach', icon: MessageCircle, label: 'Coach' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div
        className="w-full max-w-[430px]"
        style={{
          background: 'rgba(10,10,15,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid #1e1e2e',
        }}
      >
        <div className="flex">
          {tabs.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex-1 flex flex-col items-center gap-1 py-3 btn-press relative"
                style={{ minHeight: 56 }}
              >
                {active && (
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                    style={{ width: 20, height: 2, background: '#6366f1' }}
                  />
                )}
                <Icon
                  size={22}
                  strokeWidth={active ? 2 : 1.5}
                  style={{ color: active ? '#818cf8' : '#475569' }}
                />
                <span
                  className="font-medium"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.04em',
                    color: active ? '#818cf8' : '#475569',
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  );
}
