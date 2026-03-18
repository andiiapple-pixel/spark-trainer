import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, RefreshCw, Play, ChevronLeft, Home } from 'lucide-react';

function ExerciseCard({ exercise, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden animate-fade-in"
      style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', animationDelay: `${index * 60}ms` }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-4 flex items-start gap-3 text-left"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
          style={{ background: '#3b82f620', color: '#3b82f6' }}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold" style={{ color: '#f1f5f9' }}>{exercise.name}</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {(exercise.muscle_groups || []).map(mg => (
              <span
                key={mg}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: '#2a2a3a', color: '#94a3b8' }}
              >
                {mg}
              </span>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-sm">
            <span style={{ color: '#f97316' }}>
              <span className="font-bold">{exercise.sets}</span> × <span className="font-bold">{exercise.reps}</span>
            </span>
            <span style={{ color: '#64748b' }}>Rest: {exercise.rest_seconds}s</span>
            <span style={{ color: '#64748b' }}>{exercise.weight_guidance}</span>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: '#64748b', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: '#64748b', flexShrink: 0 }} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: '#2a2a3a' }}>
          <div className="pt-3">
            <p className="text-xs font-semibold mb-1.5" style={{ color: '#3b82f6' }}>FORM CUES</p>
            <ul className="flex flex-col gap-1">
              {(exercise.form_cues || []).map((cue, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span style={{ color: '#3b82f6' }}>→</span>
                  <span style={{ color: '#94a3b8' }}>{cue}</span>
                </li>
              ))}
            </ul>
          </div>
          {exercise.beginner_mod && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: '#1a2e28', border: '1px solid #10b98130' }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: '#10b981' }}>BEGINNER MOD</p>
              <p className="text-sm" style={{ color: '#94a3b8' }}>{exercise.beginner_mod}</p>
            </div>
          )}
          {exercise.advanced_progression && (
            <div className="mt-2 p-3 rounded-lg" style={{ background: '#2e1f0f', border: '1px solid #f9731630' }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: '#f97316' }}>LEVEL UP</p>
              <p className="text-sm" style={{ color: '#94a3b8' }}>{exercise.advanced_progression}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2a3a' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between"
        style={{ background: '#1e1e2a' }}
      >
        <span className="font-semibold text-sm" style={{ color: '#94a3b8' }}>{title}</span>
        {open ? <ChevronUp size={16} style={{ color: '#64748b' }} /> : <ChevronDown size={16} style={{ color: '#64748b' }} />}
      </button>
      {open && (
        <div className="px-4 pb-3" style={{ background: '#1a1a24' }}>
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
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-32">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onBack} className="btn-press" style={{ color: '#64748b' }}>
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-lg font-bold flex-1" style={{ color: '#f1f5f9' }}>Your Workout</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 text-xs" style={{ color: '#64748b' }}>
            <span>⏱ {workout.estimated_duration_mins} min</span>
            <span>🔥 {workout.estimated_calories_range} cal</span>
          </div>
          <button onClick={() => navigate('/')} className="btn-press" style={{ color: '#64748b' }}>
            <Home size={18} />
          </button>
        </div>
      </div>

      {/* Trainer intro */}
      {workout.trainer_intro && (
        <div
          className="mx-4 mb-3 p-4 rounded-xl animate-fade-in"
          style={{ background: '#1e2d4a', border: '1px solid #3b82f640' }}
        >
          <p className="text-xs font-bold mb-1" style={{ color: '#3b82f6' }}>FROM YOUR TRAINER</p>
          <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>{workout.trainer_intro}</p>
        </div>
      )}

      <div className="px-4 flex flex-col gap-3">
        {/* Warm-up */}
        {workout.warm_up?.length > 0 && (
          <CollapsibleSection title={`Warm-up — ${workout.warm_up.length} exercises`}>
            <div className="flex flex-col gap-2 pt-2">
              {workout.warm_up.map((ex, i) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#10b981' }} />
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{ex.name}</div>
                    <div className="text-xs" style={{ color: '#64748b' }}>{ex.duration_seconds}s — {ex.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Exercises */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: '#64748b' }}>
            MAIN WORKOUT — {workout.exercises?.length || 0} EXERCISES
          </p>
          <div className="flex flex-col gap-2.5">
            {(workout.exercises || []).map((ex, i) => (
              <ExerciseCard key={i} exercise={ex} index={i} />
            ))}
          </div>
        </div>

        {/* Cool-down */}
        {workout.cool_down?.length > 0 && (
          <CollapsibleSection title={`Cool-down — ${workout.cool_down.length} stretches`}>
            <div className="flex flex-col gap-2 pt-2">
              {workout.cool_down.map((ex, i) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#8b5cf6' }} />
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{ex.name}</div>
                    <div className="text-xs" style={{ color: '#64748b' }}>{ex.duration_seconds}s — {ex.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Trainer notes */}
        {workout.trainer_notes && (
          <div
            className="p-4 rounded-xl"
            style={{ background: '#1a1a24', border: '1px solid #2a2a3a' }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: '#64748b' }}>TRAINER NOTES</p>
            <p className="text-sm" style={{ color: '#94a3b8' }}>{workout.trainer_notes}</p>
          </div>
        )}
      </div>

      {/* CTAs */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pt-3 pb-6 flex flex-col gap-2 max-w-[430px] mx-auto"
        style={{ background: 'linear-gradient(to top, #0f0f14 80%, transparent)' }}
      >
        <button
          onClick={onStart}
          className="w-full py-4 rounded-xl font-bold text-lg btn-press flex items-center justify-center gap-2"
          style={{ background: '#3b82f6', color: '#fff' }}
        >
          <Play size={20} fill="white" />
          Start This Workout
        </button>
        {showRegenInput ? (
          <div className="flex flex-col gap-2">
            <input
              autoFocus
              placeholder="Tell your trainer what to change..."
              value={regenNote}
              onChange={e => setRegenNote(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#f1f5f9' }}
            />
            <button
              onClick={() => onRegenerate(regenNote)}
              className="w-full py-3 rounded-xl font-semibold text-sm btn-press flex items-center justify-center gap-2"
              style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#94a3b8' }}
            >
              <RefreshCw size={16} />
              Regenerate
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowRegenInput(true)}
            className="w-full py-3 rounded-xl font-semibold text-sm btn-press flex items-center justify-center gap-2"
            style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#94a3b8' }}
          >
            <RefreshCw size={16} />
            Regenerate
          </button>
        )}
      </div>
    </div>
  );
}
