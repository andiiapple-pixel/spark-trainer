import { useEffect, useState, useRef } from 'react';

const QUOTES = [
  "Checking your history for progressive overload...",
  "Calculating your optimal training load...",
  "Selecting exercises for maximum impact...",
  "Personalising rest periods to your fitness level...",
  "Dialling in your sets and reps...",
  "Factoring in your energy levels today...",
  "Building your warm-up sequence...",
  "Fine-tuning the cool-down...",
  "Almost ready — your trainer is finishing up...",
];

// Simulates realistic progress: fast start, slows in the middle, holds near the end
function useSimulatedProgress() {
  const [progress, setProgress] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime.current) / 1000;
      // Fast to 30% in first 3s, then slow crawl to 85% over next 20s, then stall
      let p;
      if (elapsed < 3) {
        p = (elapsed / 3) * 30;
      } else if (elapsed < 23) {
        p = 30 + ((elapsed - 3) / 20) * 55;
      } else {
        // Asymptotically approach 92% — never hits 100 until done
        p = 85 + (1 - Math.exp(-(elapsed - 23) / 15)) * 7;
      }
      setProgress(Math.min(p, 92));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return progress;
}

export default function LoadingState({ message }) {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const progress = useSimulatedProgress();

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(i => (i + 1) % QUOTES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
      padding: '64px 24px',
      flex: 1,
    }}>
      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 280 }}>
        <div style={{
          width: '100%',
          height: 4,
          background: '#1a1a1a',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: '#E8FF00',
            borderRadius: 2,
            transition: 'width 0.3s ease-out',
          }} />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 6,
        }}>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 10,
            fontWeight: 600,
            color: '#444444',
            letterSpacing: '0.05em',
          }}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>

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
    </div>
  );
}
