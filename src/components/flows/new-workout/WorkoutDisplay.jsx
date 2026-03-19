import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, RefreshCw, Play, ChevronLeft, Home, BookOpen } from 'lucide-react';

function ExerciseCard({ exercise, index }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const slug = exercise.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <div
      className="rounded-2xl overflow-hidden animate-fade-in"
      style={{
        background: '#111118',
        border: '1px solid #1e1e2e',
        animationDelay: `${index * 50}ms`,
      }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-4 flex items-start gap-3 text-left"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm" style={{ color: '#f8fafc' }}>{exercise.name}</span>
            <div
              role="button"
              tabIndex={0}
              onClick={e => { e.stopPropagation(); navigate(`/exercises/${slug}`); }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); navigate(`/exercises/${slug}`); } }}
              className="p-0.5 rounded btn-press"
              style={{ color: '#475569', cursor: 'pointer' }}
              title="View exercise guide"
            >
              <BookOpen size={12} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {(exercise.muscle_groups || []).map(mg => (
              <span
                key={mg}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: '#1a1a24', color: '#94a3b8', border: '1px solid #2d2d3d' }}
              >
                {mg}
              </span>
            ))}
          </div>
          <div className="flex gap-3 mt-2 text-sm">
            <span style={{ color: '#f97316', fontWeight: 600 }}>
              {exercise.sets} × {exercise.reps}
            </span>
            <span style={{ color: '#475569' }}>Rest: {exercise.rest_seconds}s</span>
            {exercise.weight_guidance && (
              <span style={{ color: '#475569' }}>{exercise.weight_guidance}</span>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronUp size={16} style={{ color: '#475569', flexShrink: 0, marginTop: 4 }} />
          : <ChevronDown size={16} style={{ color: '#475569', flexShrink: 0, marginTop: 4 }} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid #1e1e2e' }}>
          {(exercise.form_cues?.length > 0) && (
            <div className="pt-3">
              <p className="text-xs font-semibold mb-2" style={{ color: '#6366f1', letterSpacing: '0.05em' }}>FORM CUES</p>
              <ul className="flex flex-col gap-1.5">
                {exercise.form_cues.map((cue, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span style={{ color: '#6366f1' }}>→</span>
                    <span style={{ color: '#94a3b8' }}>{cue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {exercise.beginner_mod && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: '#0f1f18', border: '1px solid #10b98130' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#10b981', letterSpacing: '0.05em' }}>EASIER OPTION</p>
              <p className="text-sm" style={{ color: '#94a3b8' }}>{exercise.beginner_mod}</p>
            </div>
          )}
          {exercise.advanced_progression && (
            <div className="mt-2 p-3 rounded-xl" style={{ background: '#1f140a', border: '1px solid #f9731630' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#f97316', letterSpacing: '0.05em' }}>LEVEL UP</p>
              <p className="text-sm" style={{ color: '#94a3b8' }}>{exercise.advanced_progression}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ title, children, accentColor = '#6366f1' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1e1e2e' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3.5 flex items-center justify-between"
        style={{ background: '#111118' }}
      >
        <span className="font-semibold text-sm" style={{ color: '#94a3b8' }}>{title}</span>
        {open
          ? <ChevronUp size={16} style={{ color: '#475569' }} />
          : <ChevronDown size={16} style={{ color: '#475569' }} />}
      </button>
      {open && (
        <div className="px-4 pb-4" style={{ background: '#0d0d14' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function WorkoutDisplay({ workout, onStart, onRegenerate, onBack }) {
  const navigate = useNavigate();
  const [regenNote, setRegenNote] = useState('');
  const [showRegenInput, setShowRegenInput] = useState(false);

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-36" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3" style={{ background: '#0a0a0f' }}>
        <button
          onClick={onBack}
          className="btn-press flex items-center justify-center rounded-full flex-shrink-0"
          style={{ width: 36, height: 36, background: '#111118', border: '1px solid #2d2d3d', color: '#94a3b8' }}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg" style={{ color: '#f8fafc', letterSpacing: '-0.01em' }}>
            {workout.session_name || 'Your Workout'}
          </h1>
          <p className="text-xs" style={{ color: '#475569' }}>
            ⏱ {workout.estimated_duration_mins} min · 🔥 {workout.estimated_calories_range} cal
          </p>
        </div>
        <button onClick={() => navigate('/')} className="btn-press p-1" style={{ color: '#475569' }}>
          <Home size={18} />
        </button>
      </div>

      <div className="px-5 flex flex-col gap-3">
        {/* Trainer intro */}
        {workout.trainer_intro && (
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
            <p className="text-sm leading-relaxed" style={{ color: '#e2e8f0' }}>{workout.trainer_intro}</p>
          </div>
        )}

        {/* Why this workout */}
        {workout.why_this_workout?.length > 0 && (
          <CollapsibleSection title="Why this workout?">
            <ul className="pt-3 space-y-2">
              {workout.why_this_workout.map((reason, i) => (
                <li key={i} className="flex gap-2 text-sm" style={{ color: '#94a3b8' }}>
                  <span style={{ color: '#6366f1', flexShrink: 0 }}>•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* Warm-up */}
        {workout.warm_up?.length > 0 && (
          <CollapsibleSection title={`Warm-up — ${workout.warm_up.length} exercises`} accentColor="#f59e0b">
            <div className="flex flex-col gap-2 pt-3">
              {workout.warm_up.map((ex, i) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#f59e0b' }} />
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#f8fafc' }}>{ex.name}</div>
                    <div className="text-xs" style={{ color: '#475569' }}>{ex.duration_seconds}s — {ex.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Exercises */}
        <div>
          <p className="text-xs font-semibold mb-2.5" style={{ color: '#475569', letterSpacing: '0.06em' }}>
            MAIN WORKOUT — {workout.exercises?.length || 0} EXERCISES
          </p>
          <div className="flex flex-col gap-2">
            {(workout.exercises || []).map((ex, i) => (
              <ExerciseCard key={i} exercise={ex} index={i} />
            ))}
          </div>
        </div>

        {/* Cool-down */}
        {workout.cool_down?.length > 0 && (
          <CollapsibleSection title={`Cool-down — ${workout.cool_down.length} stretches`} accentColor="#10b981">
            <div className="flex flex-col gap-2 pt-3">
              {workout.cool_down.map((ex, i) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#10b981' }} />
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#f8fafc' }}>{ex.name}</div>
                    <div className="text-xs" style={{ color: '#475569' }}>{ex.duration_seconds}s — {ex.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Trainer notes */}
        {workout.trainer_notes && (
          <div className="p-4 rounded-2xl" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#475569', letterSpacing: '0.05em' }}>TRAINER NOTES</p>
            <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{workout.trainer_notes}</p>
          </div>
        )}
      </div>

      {/* Sticky CTAs */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pt-3 pb-8 flex flex-col gap-2 max-w-[430px] mx-auto"
        style={{ background: 'linear-gradient(to top, #0a0a0f 75%, transparent)' }}
      >
        <button
          onClick={onStart}
          className="w-full py-4 rounded-full font-bold text-base btn-press flex items-center justify-center gap-2"
          style={{ background: '#6366f1', color: '#fff', fontSize: 16 }}
        >
          <Play size={18} fill="white" />
          Start This Workout
        </button>
        {showRegenInput ? (
          <div className="flex flex-col gap-2">
            <input
              autoFocus
              placeholder="Tell your trainer what to change…"
              value={regenNote}
              onChange={e => setRegenNote(e.target.value)}
              className="w-full px-4 py-3 rounded-xl outline-none text-sm"
              style={{ background: '#111118', border: '1px solid #2d2d3d', color: '#f8fafc', fontSize: 14 }}
            />
            <button
              onClick={() => onRegenerate(regenNote)}
              className="w-full py-3 rounded-full font-semibold text-sm btn-press flex items-center justify-center gap-2"
              style={{ background: '#111118', border: '1px solid #2d2d3d', color: '#94a3b8' }}
            >
              <RefreshCw size={15} />
              Regenerate
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowRegenInput(true)}
            className="w-full py-3 rounded-full font-semibold text-sm btn-press flex items-center justify-center gap-2"
            style={{ background: '#111118', border: '1px solid #2d2d3d', color: '#94a3b8' }}
          >
            <RefreshCw size={15} />
            Regenerate
          </button>
        )}
      </div>
    </div>
  );
}
