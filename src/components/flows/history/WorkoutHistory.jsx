import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Trophy, Clock, Zap, ChevronLeft } from 'lucide-react';
import { storage, formatDate } from '../../../utils/storage';
import { data as dataApi } from '../../../services/api';

const FOCUS_LABELS = {
  strength: '💪 Strength',
  cardio: '🔥 Cardio',
  endurance: '🏃 Endurance',
  mobility: '🧘 Mobility',
  athletic: '⚡ Athletic',
  custom: '🎯 Custom',
};

function WorkoutCard({ workout, onClick }) {
  const label = FOCUS_LABELS[workout.type] || '🏋️ Workout';
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left btn-press transition-all"
      style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
        style={{ background: '#2a2a3a' }}
      >
        {label.split(' ')[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ color: '#f1f5f9' }}>{label.split(' ').slice(1).join(' ')}</span>
          {workout.rating && (
            <span className="text-xs" style={{ color: '#f97316' }}>{'★'.repeat(workout.rating)}</span>
          )}
        </div>
        <div className="flex gap-3 mt-0.5">
          <span className="text-xs flex items-center gap-1" style={{ color: '#64748b' }}>
            <Clock size={11} /> {workout.duration_mins || '—'}m
          </span>
          {workout.total_volume > 0 && (
            <span className="text-xs flex items-center gap-1" style={{ color: '#64748b' }}>
              <Zap size={11} /> {Math.round(workout.total_volume / 100) / 10}t
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: '#475569' }}>{formatDate(workout.savedAt)}</span>
      </div>
      <ChevronRight size={16} style={{ color: '#2a2a3a' }} />
    </button>
  );
}

function WorkoutDetail({ workout, onBack, onRepeat }) {
  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-8">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onBack} className="btn-press" style={{ color: '#64748b' }}>
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-base font-bold flex-1" style={{ color: '#f1f5f9' }}>
          {FOCUS_LABELS[workout.type] || 'Workout'} — {formatDate(workout.savedAt)}
        </h1>
      </div>

      <div className="px-4 flex flex-col gap-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Time', value: `${workout.duration_mins || '—'}m` },
            { label: 'Rating', value: workout.rating ? '★'.repeat(workout.rating) : '—' },
            { label: 'Volume', value: workout.total_volume > 0 ? `${Math.round(workout.total_volume / 100) / 10}t` : '—' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-3 rounded-xl" style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}>
              <span className="font-bold" style={{ color: '#3b82f6' }}>{s.value}</span>
              <span className="text-xs" style={{ color: '#64748b' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Trainer note */}
        {workout.user_notes_today && (
          <div className="p-3 rounded-xl" style={{ background: '#1a1a24', border: '1px solid #2a2a3a' }}>
            <p className="text-xs font-semibold mb-0.5" style={{ color: '#64748b' }}>PRE-SESSION NOTE</p>
            <p className="text-sm italic" style={{ color: '#94a3b8' }}>"{workout.user_notes_today}"</p>
          </div>
        )}

        {/* Feedback */}
        {workout.trainer_feedback && (
          <div className="p-4 rounded-xl" style={{ background: '#1e2d4a', border: '1px solid #3b82f640' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#3b82f6' }}>TRAINER FEEDBACK</p>
            <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>{workout.trainer_feedback}</p>
          </div>
        )}

        {/* Exercises */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: '#64748b' }}>EXERCISES</p>
          <div className="flex flex-col gap-2">
            {(workout.exercises || []).map((ex, i) => (
              <div key={i} className="px-4 py-3 rounded-xl" style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}>
                <div className="flex items-start justify-between">
                  <span className="font-medium" style={{ color: '#f1f5f9' }}>{ex.name}</span>
                  {ex.sets_logged?.length > 0 && (
                    <Trophy size={14} style={{ color: '#f97316' }} />
                  )}
                </div>
                {ex.sets_logged?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {ex.sets_logged.map((s, j) => (
                      <span key={j} className="text-xs px-2 py-1 rounded-lg" style={{ background: '#2a2a3a', color: '#94a3b8' }}>
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
          <div className="p-3 rounded-xl" style={{ background: '#1a1a24', border: '1px solid #2a2a3a' }}>
            <p className="text-xs font-semibold mb-0.5" style={{ color: '#64748b' }}>YOUR NOTES</p>
            <p className="text-sm" style={{ color: '#94a3b8' }}>{workout.notes}</p>
          </div>
        )}

        <button
          onClick={() => onRepeat(workout)}
          className="w-full py-3.5 rounded-xl font-semibold btn-press"
          style={{ background: '#1e2d4a', border: '1px solid #3b82f6', color: '#93c5fd' }}
        >
          Repeat This Workout
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
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-24">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Past Workouts</h1>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>
          {loadingApi ? 'Loading...' : `${history.length} session${history.length !== 1 ? 's' : ''} logged`}
        </p>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 px-6 text-center">
          <p className="text-4xl">🏋️</p>
          <p className="font-semibold" style={{ color: '#f1f5f9' }}>No workouts yet</p>
          <p className="text-sm" style={{ color: '#64748b' }}>Complete your first session to see it here.</p>
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-2">
          {history.map((w, i) => (
            <WorkoutCard key={w.id || i} workout={w} onClick={() => setSelected(w)} />
          ))}
        </div>
      )}
    </div>
  );
}
