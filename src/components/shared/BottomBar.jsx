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
        className="w-full max-w-[430px] border-t"
        style={{ background: '#0f0f14', borderColor: '#2a2a3a' }}
      >
        <div className="flex">
          {tabs.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex-1 flex flex-col items-center gap-1 py-3 btn-press transition-colors"
                style={{ color: active ? '#3b82f6' : '#64748b' }}
              >
                <Icon size={22} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            );
          })}
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  );
}
