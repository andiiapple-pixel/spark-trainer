import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, SkipForward, ChevronDown, ChevronUp, Home } from 'lucide-react';
import { storage } from '../../../utils/storage';
import { data as dataApi } from '../../../services/api';
import { generateEndOfWorkoutFeedback } from '../../../api/anthropic';
import { useActiveWorkout } from '../../../context/ActiveWorkoutContext';
import EndOfWorkout from './EndOfWorkout';

function RestTimer({ seconds, onSkip }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => { setRemaining(seconds); }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) { onSkip?.(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const radius = 40;
  const circ = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center gap-4 py-6 animate-fade-in">
      <p className="text-sm font-semibold" style={{ color: '#64748b' }}>REST</p>
      <div className="relative w-28 h-28">
        <svg width="112" height="112" viewBox="0 0 112 112">
          <circle cx="56" cy="56" r={radius} fill="none" stroke="#1e1e2a" strokeWidth="8" />
          <circle
            cx="56" cy="56" r={radius}
            fill="none"
            stroke={remaining <= 5 ? '#ef4444' : '#3b82f6'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - remaining / seconds)}
            transform="rotate(-90 56 56)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold" style={{ color: remaining <= 5 ? '#ef4444' : '#f1f5f9' }}>
            {remaining}
          </span>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => setRemaining(r => r + 30)}
          className="px-4 py-2 rounded-lg text-sm btn-press"
          style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#94a3b8' }}
        >
          +30s
        </button>
        <button
          onClick={onSkip}
          className="px-4 py-2 rounded-lg text-sm font-semibold btn-press"
          style={{ background: '#3b82f6', color: '#fff' }}
        >
          Skip Rest
        </button>
      </div>
    </div>
  );
}

export default function ActiveWorkout() {
  const navigate = useNavigate();
  const ctx = useActiveWorkout();

  // All workout progress state lives in context.
  // We only keep UI-only state local.
  const [resting, setResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(60);
  const [showCues, setShowCues] = useState(false);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const timerRef = useRef(null);

  // Timer: tick every second via context (so elapsed time is always current in context)
  useEffect(() => {
    if (done) return;
    timerRef.current = setInterval(ctx.tickTimer, 1000);
    return () => clearInterval(timerRef.current);
  }, [done, ctx.tickTimer]);

  // Guard: no active workout in context → go home
  if (!ctx.status || !ctx.workout) {
    navigate('/');
    return null;
  }

  const workout = ctx.workout;
  const exercises = workout.exercises || [];
  const exerciseIndex = ctx.currentExerciseIndex;
  const currentEx = exercises[exerciseIndex];
  const currentLogs = ctx.completedSets[exerciseIndex] || [];
  const totalSets = currentEx?.sets || 3;
  const completedSets = currentLogs.length;

  function logSet(entry) {
    const newCount = currentLogs.length + 1;
    ctx.logSet(exerciseIndex, entry);

    // Check personal record for weighted exercises
    if (entry.weight && parseFloat(entry.weight) > 0 && currentEx?.name) {
      storage.updatePR(
        currentEx.name,
        parseFloat(entry.weight),
        parseInt(entry.reps),
        new Date().toISOString()
      );
    }

    if (newCount >= totalSets) {
      setResting(true);
      setRestSeconds(currentEx?.rest_seconds || 60);
    }
  }

  function skipExercise(reason) {
    ctx.skipExercise({ index: exerciseIndex, name: currentEx?.name, reason });
    goNext();
  }

  function goNext() {
    setResting(false);
    if (exerciseIndex < exercises.length - 1) {
      ctx.setExerciseIndex(exerciseIndex + 1);
      setShowCues(false);
    } else {
      finishWorkout();
    }
  }

  function goPrev() {
    setResting(false);
    if (exerciseIndex > 0) {
      ctx.setExerciseIndex(exerciseIndex - 1);
      setShowCues(false);
    }
  }

  // Home button: context is already up to date, just navigate
  function goHome() {
    navigate('/');
  }

  function cancelWorkout() {
    clearInterval(timerRef.current);
    ctx.clearActiveWorkout();
    navigate('/');
  }

  async function finishWorkout(early = false) {
    clearInterval(timerRef.current);
    const profile = storage.getProfile();

    const logged = exercises.map((ex, i) => ({
      name: ex.name,
      prescribed: { sets: ex.sets, reps: ex.reps, weight: ex.weight_guidance },
      logged: ctx.completedSets[i] || [],
      skipped: ctx.skippedExercises.some(s => s.index === i),
    }));

    let aiFeedback = null;
    try {
      aiFeedback = await generateEndOfWorkoutFeedback(
        profile,
        workout,
        { logged, elapsed_mins: Math.round(ctx.elapsedSeconds / 60), early },
        rating || 3,
        workout.sessionConfig?.user_notes_today
      );
    } catch {
      // Non-fatal: workout can be saved without AI feedback
    }

    setFeedback(aiFeedback);
    setDone(true);
  }

  async function saveWorkout() {
    setSaving(true);

    const totalVolume = Object.values(ctx.completedSets).flat().reduce((acc, s) => {
      return acc + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 1);
    }, 0);

    const entry = {
      type: workout.sessionConfig?.focus || 'workout',
      duration_mins: Math.round(ctx.elapsedSeconds / 60),
      exercises: exercises.map((ex, i) => ({
        name: ex.name,
        sets_logged: ctx.completedSets[i] || [],
        prescribed: ex,
      })),
      skipped: ctx.skippedExercises,
      total_volume: totalVolume,
      rating,
      notes,
      trainer_feedback: feedback,
      user_notes_today: workout.sessionConfig?.user_notes_today || null,
      estimated_calories: workout.estimated_calories_range,
      savedAt: new Date().toISOString(),
    };

    // Save to localStorage immediately
    storage.addWorkout(entry);

    // Clear active workout from context + localStorage
    ctx.clearActiveWorkout();

    // Save to API in background (non-blocking)
    dataApi.saveWorkout(entry).catch(err =>
      console.warn('[ActiveWorkout] API save failed (data still in localStorage):', err)
    );

    // Update programme state if applicable
    const prog = storage.getActiveProgramme();
    if (prog && workout.programmeDay !== undefined) {
      prog.lastCompletedDayIndex = workout.programmeDay;
      prog.lastCompletedDate = new Date().toISOString();
      storage.setActiveProgramme(prog);
    }

    navigate('/');
  }

  const formatTime = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (done) {
    return (
      <EndOfWorkout
        elapsedSeconds={ctx.elapsedSeconds}
        exercises={exercises}
        setLogs={ctx.completedSets}
        feedback={feedback}
        rating={rating}
        onRating={setRating}
        notes={notes}
        onNotes={setNotes}
        onSave={saveWorkout}
        saving={saving}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto">
      {/* Exit modal */}
      {showExitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }}>
          <div style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 }}>
            <h3 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Leave workout?</h3>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
              Choose what to do with your current session.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setShowExitModal(false); finishWorkout(true); }}
                style={{ padding: 12, background: '#3b82f6', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
              >
                Finish early &amp; save results
              </button>
              <button
                onClick={cancelWorkout}
                style={{ padding: 12, background: '#0f0f14', border: '1px solid #ef444450', borderRadius: 10, color: '#ef4444', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
              >
                Cancel workout — discard progress
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                style={{ padding: 12, background: 'none', border: '1px solid #2a2a3a', borderRadius: 10, color: '#64748b', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Keep going
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: '#0f0f14', borderBottom: '1px solid #1a1a24' }}
      >
        <button onClick={goHome} className="p-1 btn-press" style={{ color: '#64748b' }} title="Go home (workout saved)">
          <Home size={20} />
        </button>
        <div className="flex-1">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e2a' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((exerciseIndex + completedSets / totalSets) / Math.max(exercises.length, 1)) * 100}%`,
                background: '#3b82f6',
              }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-xs" style={{ color: '#475569' }}>
              Exercise {exerciseIndex + 1} of {exercises.length}
            </span>
            <span className="text-xs font-mono" style={{ color: '#475569' }}>
              {formatTime(ctx.elapsedSeconds)}
            </span>
          </div>
        </div>
        <button onClick={() => setShowExitModal(true)} className="p-1 btn-press" style={{ color: '#64748b' }}>
          <X size={20} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 px-4 py-6 flex flex-col">
        {resting ? (
          <RestTimer
            seconds={restSeconds}
            onSkip={() => {
              setResting(false);
              if (completedSets >= totalSets) goNext();
            }}
          />
        ) : (
          <>
            {/* Exercise name + meta */}
            <div className="mb-4 animate-fade-in">
              <div className="flex flex-wrap gap-1 mb-2">
                {(currentEx?.muscle_groups || []).map(mg => (
                  <span key={mg} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#2a2a3a', color: '#94a3b8' }}>
                    {mg}
                  </span>
                ))}
              </div>
              <h1 className="text-3xl font-bold leading-tight" style={{ color: '#f1f5f9' }}>
                {currentEx?.name || '—'}
              </h1>
              <div className="flex gap-4 mt-2 text-sm">
                <span style={{ color: '#f97316' }}>
                  {currentEx?.sets} sets × {currentEx?.reps}
                </span>
                <span style={{ color: '#64748b' }}>Rest: {currentEx?.rest_seconds}s</span>
              </div>
              <p className="text-sm mt-1" style={{ color: '#64748b' }}>{currentEx?.weight_guidance}</p>
            </div>

            {/* Set progress dots */}
            <div className="flex gap-2 mb-6">
              {Array.from({ length: totalSets }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-2.5 rounded-full transition-all duration-300"
                  style={{ background: i < completedSets ? '#3b82f6' : '#2a2a3a' }}
                />
              ))}
            </div>

            {/* Set logger */}
            <SetLogger
              onLog={logSet}
              setNumber={completedSets + 1}
              totalSets={totalSets}
              exercise={currentEx}
              previousSet={currentLogs[currentLogs.length - 1]}
            />

            {/* Logged sets */}
            {currentLogs.length > 0 && (
              <div className="mt-4 flex flex-col gap-1.5">
                <p className="text-xs font-semibold" style={{ color: '#64748b' }}>COMPLETED</p>
                {currentLogs.map((s, i) => {
                  const type = getExerciseType(currentEx);
                  const summary = EXERCISE_TYPE_CONFIG[type]?.summary(s) || '';
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm" style={{ background: '#1e1e2a' }}>
                      <span style={{ color: '#3b82f6' }}>
                        {type === 'cardio' ? `Round ${i + 1}` : `Set ${i + 1}`}
                      </span>
                      <span style={{ color: '#f1f5f9' }}>{summary}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Form cues toggle */}
            {(currentEx?.form_cues?.length ?? 0) > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowCues(c => !c)}
                  className="flex items-center gap-2 text-sm btn-press"
                  style={{ color: '#64748b' }}
                >
                  {showCues ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  Form cues
                </button>
                {showCues && (
                  <div className="mt-2 p-3 rounded-xl" style={{ background: '#1e1e2a' }}>
                    {currentEx.form_cues.map((cue, i) => (
                      <p key={i} className="text-sm py-1" style={{ color: '#94a3b8' }}>
                        <span style={{ color: '#3b82f6' }}>→</span> {cue}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center gap-2 px-4 py-4" style={{ background: '#0f0f14', borderTop: '1px solid #1a1a24' }}>
        <button
          onClick={goPrev}
          disabled={exerciseIndex === 0}
          className="p-3 rounded-xl btn-press"
          style={{ background: '#1e1e2a', color: exerciseIndex === 0 ? '#2a2a3a' : '#94a3b8' }}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => {
            const reason = prompt('Why skipping? (Equipment busy / Pain / Too easy/hard)') || 'skipped';
            skipExercise(reason);
          }}
          className="flex-1 py-3 rounded-xl text-sm font-medium btn-press flex items-center justify-center gap-2"
          style={{ background: '#1e1e2a', color: '#64748b', border: '1px solid #2a2a3a' }}
        >
          <SkipForward size={16} />
          Skip Exercise
        </button>
        <button
          onClick={goNext}
          className="p-3 rounded-xl btn-press"
          style={{ background: '#3b82f6', color: '#fff' }}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

// ─── Exercise type detection ───────────────────────────────────────────────────

function getExerciseType(exercise) {
  const name = (exercise?.name || '').toLowerCase();
  const guidance = (exercise?.weight_guidance || '').toLowerCase();
  const reps = (exercise?.reps || '').toString().toLowerCase();

  const cardioKw = ['cycling', 'cycle', 'bike', 'rowing', 'row', 'run', 'sprint', 'jog', 'walk', 'elliptical', 'stair', 'ski erg', 'assault bike', 'air bike', 'treadmill'];
  const timedKw = ['plank', 'hold', 'wall sit', 'dead hang', 'hollow hold', 'l-sit', 'isometric', 'farmer', 'carry'];
  const bwKw = ['push-up', 'pushup', 'pull-up', 'pullup', 'chin-up', 'chinup', 'dip', 'burpee', 'mountain climber', 'jumping jack'];

  if (cardioKw.some(k => name.includes(k))) return 'cardio';
  if (timedKw.some(k => name.includes(k)) || reps.includes('second') || reps.includes('sec')) return 'timed';
  if (bwKw.some(k => name.includes(k)) || guidance.includes('bodyweight')) return 'bodyweight';
  return 'weighted';
}

const EXERCISE_TYPE_CONFIG = {
  weighted: {
    label: (n) => `LOG SET ${n}`,
    fields: [
      { key: 'reps', label: 'Reps', placeholder: (ex) => (typeof ex?.reps === 'string' ? ex.reps.split('-')[0] : ex?.reps) || '10', type: 'number' },
      { key: 'weight', label: 'Weight (kg)', placeholder: () => '0', type: 'number' },
    ],
    summary: (s) => `${s.reps} reps @ ${s.weight}kg`,
  },
  bodyweight: {
    label: (n) => `LOG SET ${n}`,
    fields: [
      { key: 'reps', label: 'Reps', placeholder: (ex) => (typeof ex?.reps === 'string' ? ex.reps.split('-')[0] : ex?.reps) || '10', type: 'number' },
    ],
    summary: (s) => `${s.reps} reps`,
  },
  timed: {
    label: (n) => `LOG SET ${n}`,
    fields: [
      { key: 'duration', label: 'Duration (sec)', placeholder: (ex) => (typeof ex?.reps === 'string' ? ex.reps.replace(/\D/g, '') : '') || '30', type: 'number' },
    ],
    summary: (s) => `${s.duration}s`,
  },
  cardio: {
    label: (n) => `LOG ROUND ${n}`,
    fields: [
      { key: 'duration', label: 'Duration (min)', placeholder: () => '10', type: 'number' },
      { key: 'resistance', label: 'Resistance / Level', placeholder: () => '—', type: 'text' },
    ],
    summary: (s) => `${s.duration}min @ ${s.resistance || '—'}`,
  },
};

// ─── Set logger ────────────────────────────────────────────────────────────────

function SetLogger({ onLog, setNumber, totalSets, exercise, previousSet }) {
  const type = getExerciseType(exercise);
  const config = EXERCISE_TYPE_CONFIG[type];
  const [vals, setVals] = useState(() => {
    const init = {};
    config.fields.forEach(f => { init[f.key] = previousSet?.[f.key] || ''; });
    return init;
  });

  // Reset vals when exercise changes (previousSet changes)
  useEffect(() => {
    const init = {};
    config.fields.forEach(f => { init[f.key] = previousSet?.[f.key] || ''; });
    setVals(init);
  }, [exercise?.name]);

  function handleLog() {
    const entry = { ...vals };
    config.fields.forEach(f => {
      if (!entry[f.key]) entry[f.key] = f.placeholder(exercise);
    });
    onLog(entry);
    setVals(() => {
      const reset = {};
      config.fields.forEach(f => { reset[f.key] = ''; });
      return reset;
    });
  }

  return (
    <div className="p-4 rounded-2xl animate-fade-in" style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}>
      <p className="text-sm font-semibold mb-3" style={{ color: '#94a3b8' }}>
        {config.label(setNumber)} of {totalSets}
      </p>
      <div className="flex gap-3 mb-4">
        {config.fields.map(f => (
          <div key={f.key} className="flex-1">
            <label className="text-xs mb-1 block" style={{ color: '#64748b' }}>{f.label}</label>
            <input
              type={f.type}
              placeholder={f.placeholder(exercise)}
              value={vals[f.key]}
              onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
              className="w-full px-3 py-3 rounded-xl text-xl font-bold text-center outline-none"
              style={{ background: '#0f0f14', border: '1px solid #2a2a3a', color: '#f1f5f9' }}
            />
          </div>
        ))}
      </div>
      <button
        onClick={handleLog}
        className="w-full py-3.5 rounded-xl font-bold text-base btn-press"
        style={{ background: '#3b82f6', color: '#fff' }}
      >
        ✓ Log {type === 'cardio' ? 'Round' : 'Set'}
      </button>
    </div>
  );
}
