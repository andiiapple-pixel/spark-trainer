import { useEffect, useState } from 'react';
import { Dumbbell } from 'lucide-react';

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
    <div className="flex flex-col items-center justify-center gap-6 px-6 py-16 animate-fade-in">
      <div className="relative">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: '#1e1e2a', border: '2px solid #3b82f6' }}
        >
          <Dumbbell size={36} style={{ color: '#3b82f6' }} className="animate-pulse-slow" />
        </div>
        <div
          className="absolute inset-0 rounded-full border-2 border-t-transparent"
          style={{
            borderColor: '#3b82f630',
            borderTopColor: '#3b82f6',
            animation: 'spin 1.2s linear infinite',
          }}
        />
      </div>
      <div className="text-center">
        <p className="font-semibold mb-2" style={{ color: '#f1f5f9' }}>
          {message || 'Your trainer is working on it...'}
        </p>
        <p
          className="text-sm transition-all duration-500"
          style={{ color: '#64748b' }}
          key={quoteIndex}
        >
          {QUOTES[quoteIndex]}
        </p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
