import { Star } from 'lucide-react';

export default function EndOfWorkout({
  elapsedSeconds, exercises, setLogs, feedback, rating, onRating,
  notes, onNotes, onSave, saving
}) {
  const totalSets = Object.values(setLogs).reduce((a, v) => a + v.length, 0);
  const totalVolume = Object.values(setLogs).flat().reduce((a, s) => {
    return a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
  }, 0);
  const mins = Math.round(elapsedSeconds / 60);

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto px-4 pb-8">
      {/* Celebration */}
      <div className="flex flex-col items-center pt-16 pb-6 animate-celebrate">
        <div className="text-6xl mb-3">🎉</div>
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Workout Complete!</h1>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>Your trainer is proud of you.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Time', value: `${mins}m` },
          { label: 'Sets', value: totalSets },
          { label: 'Volume', value: totalVolume > 0 ? `${Math.round(totalVolume / 1000 * 10) / 10}t` : '—' },
        ].map(s => (
          <div
            key={s.label}
            className="flex flex-col items-center py-4 rounded-xl"
            style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}
          >
            <span className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{s.value}</span>
            <span className="text-xs mt-0.5" style={{ color: '#64748b' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* AI Feedback */}
      {feedback && (
        <div
          className="p-4 rounded-xl mb-4 animate-fade-in"
          style={{ background: '#1e2d4a', border: '1px solid #3b82f640' }}
        >
          <p className="text-xs font-bold mb-1" style={{ color: '#3b82f6' }}>FROM YOUR TRAINER</p>
          <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>{feedback}</p>
        </div>
      )}

      {/* Rating */}
      <div className="mb-4">
        <p className="text-sm font-semibold mb-2 text-center" style={{ color: '#94a3b8' }}>
          How did that feel?
        </p>
        <div className="flex justify-center gap-3">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => onRating(n)}
              className="btn-press transition-all"
            >
              <Star
                size={32}
                fill={n <= rating ? '#f97316' : 'none'}
                style={{ color: n <= rating ? '#f97316' : '#2a2a3a' }}
              />
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
        className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none mb-4"
        style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#f1f5f9' }}
      />

      {/* Save */}
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full py-4 rounded-xl font-bold text-base btn-press"
        style={{ background: '#3b82f6', color: '#fff', opacity: saving ? 0.7 : 1 }}
      >
        {saving ? 'Saving...' : 'Save Workout'}
      </button>
    </div>
  );
}
