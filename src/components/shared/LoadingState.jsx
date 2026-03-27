import { useEffect, useState } from 'react';

const QUOTES = [
  "Calculating your optimal training load...",
  "Checking your history for progressive overload...",
  "Personalising rest periods to your fitness level...",
  "Dialling in your sets and reps...",
  "Selecting exercises for maximum impact...",
  "Factoring in your energy levels today...",
  "Building your warm-up sequence...",
  "Fine-tuning the cool-down...",
  "Almost ready — your trainer is finishing up...",
];

export default function LoadingState({ message }) {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(i => (i + 1) % QUOTES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      padding: '64px 24px',
      flex: 1,
    }}>
      {/* Spinner */}
      <div style={{
        width: 24,
        height: 24,
        border: '2px solid #222222',
        borderTopColor: '#E8FF00',
        borderRadius: 0,
        animation: 'editorial-spin 0.8s linear infinite',
      }} />

      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#555555',
          margin: '0 0 8px 0',
        }}>
          {message || 'Your trainer is working on it...'}
        </p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            color: '#555555',
            margin: 0,
            transition: 'opacity 0.3s ease',
          }}
          key={quoteIndex}
        >
          {QUOTES[quoteIndex]}
        </p>
      </div>
      <style>{`@keyframes editorial-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
