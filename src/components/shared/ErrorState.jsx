import { WifiOff, RefreshCw } from 'lucide-react';

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center animate-fade-in">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: '#2a1a1a', border: '2px solid #ef4444' }}
      >
        <WifiOff size={28} style={{ color: '#ef4444' }} />
      </div>
      <div>
        <p className="font-semibold mb-1" style={{ color: '#f1f5f9' }}>
          Your trainer lost connection.
        </p>
        <p className="text-sm" style={{ color: '#64748b' }}>
          {message || 'Something went wrong. Give it another go.'}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm btn-press"
          style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#f1f5f9' }}
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      )}
    </div>
  );
}
