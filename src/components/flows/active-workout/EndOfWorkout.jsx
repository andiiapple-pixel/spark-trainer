import { useEffect } from 'react';
import { Trophy } from 'lucide-react';

export default function EndOfWorkout({
  elapsedSeconds, exercises, setLogs, feedback, rating, onRating,
  notes, onNotes, onSave, saving
}) {
  // Prevent accidental navigation away before saving
  useEffect(() => {
    function handleBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
  const totalSets = Object.values(setLogs).reduce((a, v) => a + v.length, 0);
  const totalVolume = Object.values(setLogs).flat().reduce((a, s) => {
    return a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
  }, 0);
  const mins = Math.round(elapsedSeconds / 60);
  const exercisesLogged = exercises.filter((_, i) => (setLogs[i] || []).length > 0).length;

  return (
    <div
      className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-10"
      style={{ background: '#0A0A0A' }}
    >
      {/* Celebration header */}
      <div className="flex flex-col items-center pt-16 pb-8 px-5 animate-celebrate">
        <div
          className="flex items-center justify-center mb-4"
          style={{ width: 80, height: 80, background: '#E8FF00', borderRadius: 0 }}
        >
          <Trophy size={36} style={{ color: '#000000' }} />
        </div>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 28, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '-0.01em', textAlign: 'center' }}>
          Workout Complete
        </h1>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#888888', marginTop: 6, textAlign: 'center' }}>
          Your trainer is proud of you.
        </p>
      </div>

      <div className="px-5 flex flex-col gap-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'DURATION', value: `${mins}m`, color: '#E8FF00' },
            { label: 'TOTAL SETS', value: totalSets, color: '#E8FF00' },
            { label: 'EXERCISES', value: exercisesLogged, color: '#22C55E' },
            { label: 'VOLUME', value: totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}t` : '—', color: '#E8FF00' },
          ].map(s => (
            <div
              key={s.label}
              className="flex flex-col items-center py-5"
              style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0 }}
            >
              <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 28, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                {s.value}
              </span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, color: '#555555', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* AI Feedback */}
        {feedback && (
          <div
            className="p-4 animate-fade-in"
            style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{ width: 28, height: 28, background: '#E8FF00', fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 10, color: '#000000', borderRadius: 0 }}
              >
                ST
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, color: '#555555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                FROM YOUR TRAINER
              </p>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.6, color: '#888888' }}>{feedback}</p>
          </div>
        )}

        {/* Rating */}
        <div
          className="p-4"
          style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0 }}
        >
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, color: '#555555', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>
            HOW DID THAT FEEL?
          </p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => onRating(n)}
                className="btn-press flex items-center justify-center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 0,
                  border: n <= rating ? 'none' : '1px solid #222222',
                  background: n <= rating ? '#E8FF00' : 'transparent',
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 700,
                  fontSize: 18,
                  color: n <= rating ? '#000000' : '#555555',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <textarea
          placeholder="Any notes about today's session? (optional)"
          value={notes}
          onChange={e => onNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 outline-none resize-none"
          style={{
            background: '#111111',
            border: '1px solid #222222',
            color: '#FFFFFF',
            fontSize: 14,
            fontFamily: "'Inter', sans-serif",
            borderRadius: 0,
          }}
        />

        {/* Save */}
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full btn-press"
          style={{
            background: saving ? '#222222' : '#E8FF00',
            color: saving ? '#555555' : '#000000',
            height: 64,
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            borderRadius: 0,
            border: 'none',
            transition: 'background 0.2s',
          }}
        >
          {saving ? 'SAVING...' : 'SAVE WORKOUT'}
        </button>
      </div>
    </div>
  );
}
