import { WifiOff, RefreshCw } from 'lucide-react';

export default function ErrorState({ message, onRetry }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: '48px 24px',
      textAlign: 'center',
      flex: 1,
    }}>
      <WifiOff size={28} style={{ color: '#EF4444' }} />

      <div>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          fontWeight: 500,
          color: '#EF4444',
          margin: '0 0 4px 0',
        }}>
          Connection lost
        </p>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          color: '#888888',
          margin: 0,
        }}>
          {message || 'Something went wrong. Give it another go.'}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-press"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            background: 'transparent',
            border: '1px solid #222222',
            borderRadius: 0,
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#888888',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} />
          Try Again
        </button>
      )}
    </div>
  );
}
