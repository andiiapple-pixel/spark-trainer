import { Star, Trophy } from 'lucide-react';

export default function EndOfWorkout({
  elapsedSeconds, exercises, setLogs, feedback, rating, onRating,
  notes, onNotes, onSave, saving
}) {
  const totalSets = Object.values(setLogs).reduce((a, v) => a + v.length, 0);
  const totalVolume = Object.values(setLogs).flat().reduce((a, s) => {
    return a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
  }, 0);
  const mins = Math.round(elapsedSeconds / 60);
  const exercisesLogged = exercises.filter(ex => (setLogs[ex.name] || []).length > 0).length;

  return (
    <div
      className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-10"
      style={{ background: '#0a0a0f' }}
    >
      {/* Celebration header */}
      <div className="flex flex-col items-center pt-16 pb-8 px-5 animate-celebrate">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', boxShadow: '0 0 40px rgba(245,158,11,0.35)' }}
        >
          <Trophy size={36} style={{ color: '#fff' }} />
        </div>
        <h1 className="font-bold text-center" style={{ color: '#f8fafc', fontSize: 28, letterSpacing: '-0.02em' }}>
          Workout Complete!
        </h1>
        <p className="text-sm mt-1.5 text-center" style={{ color: '#94a3b8' }}>
          Your trainer is proud of you.
        </p>
      </div>

      <div className="px-5 flex flex-col gap-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'DURATION', value: `${mins}m`, color: '#6366f1' },
            { label: 'TOTAL SETS', value: totalSets, color: '#6366f1' },
            { label: 'EXERCISES', value: exercisesLogged, color: '#10b981' },
            { label: 'VOLUME', value: totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}t` : '—', color: '#f59e0b' },
          ].map(s => (
            <div
              key={s.label}
              className="flex flex-col items-center py-5 rounded-2xl"
              style={{ background: '#111118', border: '1px solid #1e1e2e' }}
            >
              <span className="font-bold tabular-nums" style={{ color: s.color, fontSize: 28 }}>
                {s.value}
              </span>
              <span style={{ fontSize: 10, color: '#475569', letterSpacing: '0.06em', marginTop: 4 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* AI Feedback */}
        {feedback && (
          <div
            className="p-4 rounded-2xl animate-fade-in"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid #6366f130' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                style={{ background: '#6366f1', color: '#fff' }}
              >
                ST
              </div>
              <p className="text-xs font-semibold" style={{ color: '#818cf8', letterSpacing: '0.04em' }}>
                FROM YOUR TRAINER
              </p>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#e2e8f0' }}>{feedback}</p>
          </div>
        )}

        {/* Rating */}
        <div
          className="p-4 rounded-2xl"
          style={{ background: '#111118', border: '1px solid #1e1e2e' }}
        >
          <p className="text-xs font-semibold mb-3 text-center" style={{ color: '#475569', letterSpacing: '0.06em' }}>
            HOW DID THAT FEEL?
          </p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => onRating(n)}
                className="btn-press p-1"
              >
                <Star
                  size={36}
                  fill={n <= rating ? '#f59e0b' : 'none'}
                  style={{ color: n <= rating ? '#f59e0b' : '#2d2d3d' }}
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
          className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none"
          style={{
            background: '#111118',
            border: '1px solid #2d2d3d',
            color: '#f8fafc',
            fontSize: 16,
          }}
        />

        {/* Save */}
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full py-4 rounded-full font-bold text-base btn-press"
          style={{
            background: saving ? '#3d3d50' : '#6366f1',
            color: '#fff',
            fontSize: 16,
            transition: 'background 0.2s',
          }}
        >
          {saving ? 'Saving…' : 'Save Workout'}
        </button>
      </div>
    </div>
  );
}
