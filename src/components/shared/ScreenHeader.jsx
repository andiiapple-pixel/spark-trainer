import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ScreenHeader({ title, onBack, progress = null, hideBack = false, right = null }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <div style={{ background: '#0a0a0f' }}>
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        {!hideBack && (
          <button
            onClick={handleBack}
            className="btn-press flex items-center justify-center rounded-full"
            style={{
              width: 36,
              height: 36,
              background: '#111118',
              border: '1px solid #2d2d3d',
              color: '#94a3b8',
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {title && (
          <h2
            className="flex-1 font-semibold truncate"
            style={{
              color: '#f8fafc',
              fontSize: 17,
              letterSpacing: '-0.01em',
              textAlign: hideBack && !right ? 'center' : 'left',
            }}
          >
            {title}
          </h2>
        )}
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>
      {progress !== null && (
        <div style={{ height: 2, background: '#1e1e2e' }}>
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: '#6366f1',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      )}
    </div>
  );
}
