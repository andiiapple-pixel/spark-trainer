import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, RefreshCw, ChevronLeft, Home, BookOpen } from 'lucide-react';

function ExerciseCard({ exercise, index }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const slug = exercise.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <div
      className="animate-fade-in"
      style={{
        borderBottom: '1px solid #222222',
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(e => !e)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setExpanded(v => !v); }}
        className="w-full px-0 py-4 flex items-start gap-3 text-left"
        style={{ cursor: 'pointer' }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 28,
            height: 28,
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: 13,
            color: '#555555',
          }}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 500,
                fontSize: 16,
                textTransform: 'uppercase',
                color: '#FFFFFF',
              }}
            >
              {exercise.name}
            </span>
            <div
              role="button"
              tabIndex={0}
              onClick={e => { e.stopPropagation(); navigate(`/exercises/${slug}`); }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); navigate(`/exercises/${slug}`); } }}
              className="p-0.5 btn-press"
              style={{ color: '#555555', cursor: 'pointer' }}
              title="View exercise guide"
            >
              <BookOpen size={12} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {(exercise.muscle_groups || []).map(mg => (
              <span
                key={mg}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  fontWeight: 400,
                  color: '#555555',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {mg}
              </span>
            ))}
          </div>
          <div className="flex gap-3 mt-2">
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: '#888888',
              }}
            >
              {exercise.sets} x {exercise.reps}
            </span>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: '#555555',
              }}
            >
              Rest: {exercise.rest_seconds}s
            </span>
            {exercise.weight_guidance && (
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  color: '#555555',
                }}
              >
                {exercise.weight_guidance}
              </span>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronUp size={16} style={{ color: '#555555', flexShrink: 0, marginTop: 4 }} />
          : <ChevronDown size={16} style={{ color: '#555555', flexShrink: 0, marginTop: 4 }} />}
      </div>

      {expanded && (
        <div className="px-0 pb-4 pl-10" style={{ borderTop: '1px solid #222222' }}>
          {(exercise.form_cues?.length > 0) && (
            <div className="pt-3">
              <p
                className="mb-2"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  fontWeight: 500,
                  color: '#555555',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                FORM CUES
              </p>
              <ul className="flex flex-col gap-1.5">
                {exercise.form_cues.map((cue, i) => (
                  <li key={i} className="flex gap-2">
                    <span style={{ color: '#E8FF00', fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
                      &rarr;
                    </span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#888888' }}>
                      {cue}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {exercise.beginner_mod && (
            <div className="mt-3 p-3" style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0 }}>
              <p
                className="mb-1"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  fontWeight: 500,
                  color: '#555555',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                EASIER OPTION
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#888888' }}>
                {exercise.beginner_mod}
              </p>
            </div>
          )}
          {exercise.advanced_progression && (
            <div className="mt-2 p-3" style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0 }}>
              <p
                className="mb-1"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  fontWeight: 500,
                  color: '#555555',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                LEVEL UP
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#888888' }}>
                {exercise.advanced_progression}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden" style={{ border: '1px solid #222222', borderRadius: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3.5 flex items-center justify-between"
        style={{ background: '#111111' }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: '#888888',
          }}
        >
          {title}
        </span>
        {open
          ? <ChevronUp size={16} style={{ color: '#555555' }} />
          : <ChevronDown size={16} style={{ color: '#555555' }} />}
      </button>
      {open && (
        <div className="px-4 pb-4" style={{ background: '#0A0A0A' }}>
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
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-36" style={{ background: '#0A0A0A' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3" style={{ background: '#0A0A0A' }}>
        <button
          onClick={onBack}
          className="btn-press flex items-center justify-center flex-shrink-0"
          style={{
            width: 40,
            height: 40,
            background: 'transparent',
            border: '1px solid #222222',
            borderRadius: 0,
            color: '#FFFFFF',
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <h1
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              textTransform: 'uppercase',
              color: '#FFFFFF',
              letterSpacing: '0.02em',
            }}
          >
            {workout.session_name || 'Your Workout'}
          </h1>
        </div>
        <button onClick={() => navigate('/')} className="btn-press p-1" style={{ color: '#555555' }}>
          <Home size={18} />
        </button>
      </div>

      {/* Summary stats */}
      <div className="flex gap-6 px-5 pb-4" style={{ borderBottom: '1px solid #222222' }}>
        <div>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              fontWeight: 500,
              color: '#555555',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            DURATION
          </p>
          <p
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: 24,
              color: '#FFFFFF',
            }}
          >
            {workout.estimated_duration_mins}
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#555555', marginLeft: 4 }}>
              MIN
            </span>
          </p>
        </div>
        <div>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              fontWeight: 500,
              color: '#555555',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            EXERCISES
          </p>
          <p
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: 24,
              color: '#FFFFFF',
            }}
          >
            {workout.exercises?.length || 0}
          </p>
        </div>
        {workout.estimated_calories_range && (
          <div>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: 500,
                color: '#555555',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              CALORIES
            </p>
            <p
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: 24,
                color: '#FFFFFF',
              }}
            >
              {workout.estimated_calories_range}
            </p>
          </div>
        )}
      </div>

      <div className="px-5 flex flex-col gap-3 mt-3">
        {/* Trainer intro */}
        {workout.trainer_intro && (
          <div
            className="p-4 animate-fade-in"
            style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  fontWeight: 500,
                  color: '#555555',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                FROM YOUR TRAINER
              </p>
            </div>
            <p
              className="leading-relaxed"
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#888888' }}
            >
              {workout.trainer_intro}
            </p>
          </div>
        )}

        {/* Why this workout */}
        {workout.why_this_workout?.length > 0 && (
          <CollapsibleSection title="Why this workout?">
            <ul className="pt-3 space-y-2">
              {workout.why_this_workout.map((reason, i) => (
                <li key={i} className="flex gap-2" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#888888' }}>
                  <span style={{ color: '#E8FF00', flexShrink: 0 }}>&bull;</span>
                  {reason}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* Warm-up */}
        {workout.warm_up?.length > 0 && (
          <CollapsibleSection title={`Warm-up — ${workout.warm_up.length} exercises`}>
            <div className="flex flex-col gap-2 pt-3">
              {workout.warm_up.map((ex, i) => (
                <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom: '1px solid #222222' }}>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 500,
                        fontSize: 14,
                        textTransform: 'uppercase',
                        color: '#FFFFFF',
                      }}
                    >
                      {ex.name}
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#555555' }}>
                      {ex.duration_seconds}s — {ex.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Exercises */}
        <div>
          <p
            className="mb-2.5"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              fontWeight: 500,
              color: '#555555',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            MAIN WORKOUT — {workout.exercises?.length || 0} EXERCISES
          </p>
          <div className="flex flex-col" style={{ borderTop: '1px solid #222222' }}>
            {(workout.exercises || []).map((ex, i) => (
              <ExerciseCard key={i} exercise={ex} index={i} />
            ))}
          </div>
        </div>

        {/* Cool-down */}
        {workout.cool_down?.length > 0 && (
          <CollapsibleSection title={`Cool-down — ${workout.cool_down.length} stretches`}>
            <div className="flex flex-col gap-2 pt-3">
              {workout.cool_down.map((ex, i) => (
                <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom: '1px solid #222222' }}>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 500,
                        fontSize: 14,
                        textTransform: 'uppercase',
                        color: '#FFFFFF',
                      }}
                    >
                      {ex.name}
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#555555' }}>
                      {ex.duration_seconds}s — {ex.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Trainer notes */}
        {workout.trainer_notes && (
          <div className="p-4" style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0 }}>
            <p
              className="mb-1"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: 500,
                color: '#555555',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              TRAINER NOTES
            </p>
            <p
              className="leading-relaxed"
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#888888' }}
            >
              {workout.trainer_notes}
            </p>
          </div>
        )}
      </div>

      {/* Sticky CTAs */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pt-3 pb-8 flex flex-col gap-2 max-w-[430px] mx-auto"
        style={{ background: '#0A0A0A' }}
      >
        <button
          onClick={onStart}
          className="w-full py-4 btn-press flex items-center justify-center gap-2"
          style={{
            background: '#E8FF00',
            color: '#000000',
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            textTransform: 'uppercase',
            borderRadius: 0,
            border: 'none',
          }}
        >
          START WORKOUT &rarr;
        </button>
        {showRegenInput ? (
          <div className="flex flex-col gap-2">
            <input
              autoFocus
              placeholder="Tell your trainer what to change..."
              value={regenNote}
              onChange={e => setRegenNote(e.target.value)}
              className="w-full px-4 py-3 outline-none"
              style={{
                background: '#111111',
                border: '1px solid #222222',
                borderRadius: 0,
                color: '#FFFFFF',
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
              }}
            />
            <button
              onClick={() => onRegenerate(regenNote)}
              className="w-full py-3 btn-press flex items-center justify-center gap-2"
              style={{
                background: 'transparent',
                border: '1px solid #222222',
                borderRadius: 0,
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: '#888888',
              }}
            >
              <RefreshCw size={15} />
              REGENERATE
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowRegenInput(true)}
            className="w-full py-3 btn-press flex items-center justify-center gap-2"
            style={{
              background: 'transparent',
              border: '1px solid #222222',
              borderRadius: 0,
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: '#888888',
            }}
          >
            <RefreshCw size={15} />
            REGENERATE
          </button>
        )}
      </div>
    </div>
  );
}
