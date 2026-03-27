import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Trophy, Clock, Zap, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { storage, formatDate } from '../../../utils/storage';
import { data as dataApi } from '../../../services/api';

const FOCUS_LABELS = {
  strength: 'STRENGTH',
  cardio: 'CARDIO',
  endurance: 'ENDURANCE',
  mobility: 'MOBILITY',
  athletic: 'ATHLETIC',
  custom: 'CUSTOM',
};

function WorkoutCard({ workout, onClick, expanded, onToggleExpand }) {
  const label = FOCUS_LABELS[workout.type] || 'WORKOUT';
  const sessionName = workout.session_name || label;
  const exerciseCount = (workout.exercises || []).length;

  return (
    <div
      style={{ borderBottom: '1px solid #222222', background: 'transparent' }}
    >
      <button
        onClick={onClick}
        className="w-full text-left py-4 px-4 btn-press"
        style={{ background: 'transparent' }}
      >
        {/* Date + Duration */}
        <div className="flex items-center gap-3 mb-1">
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '10px',
              fontWeight: 400,
              color: '#555555',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            {formatDate(workout.savedAt)}
          </span>
          {workout.duration_mins && (
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '10px',
                fontWeight: 400,
                color: '#555555',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {workout.duration_mins}MIN
            </span>
          )}
        </div>

        {/* Session name */}
        <div
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: '18px',
            fontWeight: 500,
            color: '#FFFFFF',
            textTransform: 'uppercase',
          }}
        >
          {sessionName}
        </div>

        {/* Exercise count + total volume */}
        <div className="flex items-center gap-3 mt-1">
          {exerciseCount > 0 && (
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '12px',
                fontWeight: 400,
                color: '#555555',
              }}
            >
              {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
            </span>
          )}
          {workout.total_volume > 0 && (
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '12px',
                fontWeight: 400,
                color: '#555555',
              }}
            >
              {Math.round(workout.total_volume / 100) / 10}t volume
            </span>
          )}
          {workout.rating && (
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '12px',
                color: '#E8FF00',
              }}
            >
              {'★'.repeat(workout.rating)}
            </span>
          )}
        </div>
      </button>

      {/* Expandable exercise details */}
      {expanded && (workout.exercises || []).length > 0 && (
        <div className="px-4 pb-4">
          <div style={{ borderTop: '1px solid #222222', paddingTop: '12px' }}>
            {(workout.exercises || []).map((ex, i) => (
              <div key={i} className="mb-3">
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#FFFFFF',
                  }}
                >
                  {ex.name}
                </div>
                {ex.sets_logged?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {ex.sets_logged.map((s, j) => (
                      <span
                        key={j}
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '12px',
                          color: '#555555',
                        }}
                      >
                        {s.reps}r{s.weight !== '0' ? ` @ ${s.weight}kg` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WorkoutDetail({ workout, onBack, onRepeat }) {
  const label = FOCUS_LABELS[workout.type] || 'WORKOUT';
  const sessionName = workout.session_name || label;

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-8" style={{ background: '#0A0A0A' }}>
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onBack} className="btn-press" style={{ color: '#555555' }}>
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1">
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '10px',
              fontWeight: 400,
              color: '#555555',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            {formatDate(workout.savedAt)}
          </span>
          <h1
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: '28px',
              fontWeight: 700,
              color: '#FFFFFF',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            {sessionName}
          </h1>
        </div>
      </div>

      <div className="px-4 flex flex-col">
        {/* Stats */}
        <div className="grid grid-cols-3" style={{ borderTop: '1px solid #222222', borderBottom: '1px solid #222222' }}>
          {[
            { label: 'TIME', value: `${workout.duration_mins || '—'}M` },
            { label: 'RATING', value: workout.rating ? '★'.repeat(workout.rating) : '—' },
            { label: 'VOLUME', value: workout.total_volume > 0 ? `${Math.round(workout.total_volume / 100) / 10}T` : '—' },
          ].map((s, i) => (
            <div
              key={s.label}
              className="flex flex-col items-center py-4"
              style={{ borderRight: i < 2 ? '1px solid #222222' : 'none' }}
            >
              <span
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#E8FF00',
                }}
              >
                {s.value}
              </span>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '10px',
                  fontWeight: 400,
                  color: '#555555',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Trainer note */}
        {workout.user_notes_today && (
          <div className="py-4" style={{ borderBottom: '1px solid #222222' }}>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '11px',
                fontWeight: 500,
                color: '#555555',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                marginBottom: '4px',
              }}
            >
              PRE-SESSION NOTE
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                fontStyle: 'italic',
                color: '#888888',
              }}
            >
              "{workout.user_notes_today}"
            </p>
          </div>
        )}

        {/* Feedback */}
        {workout.trainer_feedback && (
          <div className="py-4" style={{ borderBottom: '1px solid #222222' }}>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '11px',
                fontWeight: 500,
                color: '#555555',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                marginBottom: '4px',
              }}
            >
              TRAINER FEEDBACK
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#888888',
              }}
            >
              {workout.trainer_feedback}
            </p>
          </div>
        )}

        {/* Exercises */}
        <div className="py-4" style={{ borderBottom: '1px solid #222222' }}>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '11px',
              fontWeight: 500,
              color: '#555555',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '12px',
            }}
          >
            EXERCISES
          </p>
          <div className="flex flex-col">
            {(workout.exercises || []).map((ex, i) => (
              <div
                key={i}
                className="py-3"
                style={{ borderBottom: i < (workout.exercises || []).length - 1 ? '1px solid #222222' : 'none' }}
              >
                <div className="flex items-start justify-between">
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '15px',
                      fontWeight: 500,
                      color: '#FFFFFF',
                    }}
                  >
                    {ex.name}
                  </span>
                  {ex.sets_logged?.length > 0 && (
                    <Trophy size={14} style={{ color: '#E8FF00' }} />
                  )}
                </div>
                {ex.sets_logged?.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {ex.sets_logged.map((s, j) => (
                      <span
                        key={j}
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '12px',
                          color: '#555555',
                        }}
                      >
                        {s.reps}r {s.weight !== '0' ? `@ ${s.weight}kg` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {workout.notes && (
          <div className="py-4" style={{ borderBottom: '1px solid #222222' }}>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '11px',
                fontWeight: 500,
                color: '#555555',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                marginBottom: '4px',
              }}
            >
              YOUR NOTES
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                color: '#888888',
              }}
            >
              {workout.notes}
            </p>
          </div>
        )}

        <button
          onClick={() => onRepeat(workout)}
          className="w-full py-4 mt-6 font-semibold btn-press"
          style={{
            background: '#E8FF00',
            color: '#000000',
            fontFamily: "'Oswald', sans-serif",
            fontSize: '15px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            borderRadius: '0px',
            border: 'none',
          }}
        >
          REPEAT THIS WORKOUT
        </button>
      </div>
    </div>
  );
}

// Map API DB row → component workout shape
function adaptApiWorkout(w) {
  const wData = w.workout_data
    ? (typeof w.workout_data === 'string' ? JSON.parse(w.workout_data) : w.workout_data)
    : {};
  return {
    id: w.id,
    type: w.workout_type || wData.sessionConfig?.focus || 'custom',
    duration_mins: w.duration_mins,
    total_volume: w.total_volume_kg,
    rating: w.energy_rating,
    savedAt: w.completed_at,
    exercises: wData.exercises || [],
    trainer_feedback: w.trainer_feedback,
    user_notes_today: w.user_notes_today,
    notes: wData.notes,
    session_name: wData.session_name,
  };
}

export default function WorkoutHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState(() => storage.getWorkoutHistory());
  const [loadingApi, setLoadingApi] = useState(true);
  const [selected, setSelected] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    dataApi.getWorkouts({ limit: 100 })
      .then(res => {
        const workouts = (res.workouts || []).map(adaptApiWorkout);
        if (workouts.length > 0) setHistory(workouts);
      })
      .catch(() => {}) // silently use localStorage fallback
      .finally(() => setLoadingApi(false));
  }, []);

  function handleRepeat(workout) {
    navigate('/new-workout');
  }

  if (selected) {
    return <WorkoutDetail workout={selected} onBack={() => setSelected(null)} onRepeat={handleRepeat} />;
  }

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-24" style={{ background: '#0A0A0A' }}>
      <div className="px-4 pt-12 pb-4" style={{ borderBottom: '1px solid #222222' }}>
        <h1
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: '28px',
            fontWeight: 700,
            color: '#FFFFFF',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          HISTORY
        </h1>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '12px',
            fontWeight: 400,
            color: '#555555',
            marginTop: '4px',
          }}
        >
          {loadingApi ? 'Loading...' : `${history.length} session${history.length !== 1 ? 's' : ''} logged`}
        </p>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 px-6 text-center">
          <p
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: '18px',
              fontWeight: 700,
              color: '#FFFFFF',
              textTransform: 'uppercase',
            }}
          >
            NO WORKOUTS YET
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
              color: '#555555',
            }}
          >
            Complete your first session to see it here.
          </p>
        </div>
      ) : (
        <div className="px-0">
          {history.map((w, i) => (
            <WorkoutCard
              key={w.id || i}
              workout={w}
              expanded={expandedId === (w.id || i)}
              onToggleExpand={() => setExpandedId(prev => prev === (w.id || i) ? null : (w.id || i))}
              onClick={() => setSelected(w)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
