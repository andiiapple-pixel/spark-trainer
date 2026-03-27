import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ScreenHeader({ title, onBack, progress = null, hideBack = false, right = null }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <div style={{ background: '#0A0A0A' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 24px 12px',
        }}
      >
        {!hideBack && (
          <button
            onClick={handleBack}
            className="btn-press"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              background: 'transparent',
              color: '#888888',
              border: '1px solid #222222',
              borderRadius: 0,
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {title && (
          <h2
            style={{
              flex: 1,
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "'Oswald', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              textAlign: hideBack && !right ? 'center' : 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              margin: 0,
            }}
          >
            {title}
          </h2>
        )}
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>
      {progress !== null && (
        <div style={{ height: 2, background: '#222222' }}>
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: '#E8FF00',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      )}
    </div>
  );
}
