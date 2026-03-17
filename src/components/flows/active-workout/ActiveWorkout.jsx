import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, SkipForward, ChevronDown, ChevronUp, Timer } from 'lucide-react';
import { storage } from '../../../utils/storage';
import { generateEndOfWorkoutFeedback } from '../../../api/anthropic';
import EndOfWorkout from './EndOfWorkout';

function RestTimer({ seconds, onSkip, onExtend }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    setRemaining(seconds);
    setRunning(true);
  }, [seconds]);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, running]);

  useEffect(() => {
    if (remaining <= 0) onSkip?.();
  }, [remaining]);

  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const progress = remaining / seconds;

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
            strokeDashoffset={circ * (1 - progress)}
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
  const location = useLocation();
  const navigate = useNavigate();
  const workout = location.state?.workout;

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setLogs, setSetLogs] = useState({}); // { exerciseIndex: [{reps, weight}] }
  const [resting, setResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(60);
  const [showCues, setShowCues] = useState(false);
  const [skippedExercises, setSkippedExercises] = useState([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const startTime = useRef(Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  if (!workout) {
    navigate('/');
    return null;
  }

  const exercises = workout.exercises || [];
  const currentEx = exercises[exerciseIndex];
  const currentLogs = setLogs[exerciseIndex] || [];
  const totalSets = currentEx?.sets || 3;
  const completedSets = currentLogs.length;

  function logSet(entry) {
    const logs = setLogs[exerciseIndex] || [];
    const newLogs = [...logs, { ...entry, timestamp: Date.now() }];
    setSetLogs(prev => ({ ...prev, [exerciseIndex]: newLogs }));

    // Check PR for weighted exercises
    if (entry.weight && parseFloat(entry.weight) > 0) {
      storage.updatePR(currentEx.name, parseFloat(entry.weight), parseInt(entry.reps), new Date().toISOString());
    }

    if (newLogs.length >= totalSets) {
      setResting(true);
      setRestSeconds(currentEx.rest_seconds || 60);
    }
  }

  function skipExercise(reason) {
    setSkippedExercises(prev => [...prev, { index: exerciseIndex, name: currentEx.name, reason }]);
    goNext();
  }

  function goNext() {
    setResting(false);
    if (exerciseIndex < exercises.length - 1) {
      setExerciseIndex(i => i + 1);
      setShowCues(false);
    } else {
      finishWorkout();
    }
  }

  function goPrev() {
    setResting(false);
    if (exerciseIndex > 0) {
      setExerciseIndex(i => i - 1);
      setShowCues(false);
    }
  }

  async function finishWorkout(early = false) {
    clearInterval(timerRef.current);
    const profile = storage.getProfile();
    const logged = exercises.map((ex, i) => ({
      name: ex.name,
      prescribed: { sets: ex.sets, reps: ex.reps, weight: ex.weight_guidance },
      logged: setLogs[i] || [],
      skipped: skippedExercises.some(s => s.index === i),
    }));

    // Generate AI feedback
    let aiFeedback = null;
    try {
      aiFeedback = await generateEndOfWorkoutFeedback(
        profile,
        workout,
        { logged, elapsed_mins: Math.round(elapsedSeconds / 60), early },
        rating || 3,
        workout.sessionConfig?.user_notes_today
      );
    } catch {}

    setFeedback(aiFeedback);
    setDone(true);
  }

  async function saveWorkout() {
    setSaving(true);
    const totalVolume = Object.values(setLogs).flat().reduce((acc, s) => {
      return acc + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 1);
    }, 0);

    const entry = {
      type: workout.sessionConfig?.focus || 'workout',
      duration_mins: Math.round(elapsedSeconds / 60),
      exercises: exercises.map((ex, i) => ({
        name: ex.name,
        sets_logged: setLogs[i] || [],
        prescribed: ex,
      })),
      skipped: skippedExercises,
      total_volume: totalVolume,
      rating,
      notes,
      trainer_feedback: feedback,
      user_notes_today: workout.sessionConfig?.user_notes_today || null,
      estimated_calories: workout.estimated_calories_range,
    };
    storage.addWorkout(entry);

    // Update programme state if applicable
    const prog = storage.getActiveProgramme();
    if (prog && workout.programmeDay !== undefined) {
      prog.lastCompletedDayIndex = workout.programmeDay;
      prog.lastCompletedDate = new Date().toISOString();
      storage.setActiveProgramme(prog);
    }

    navigate('/');
  }

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (done) {
    return (
      <EndOfWorkout
        elapsedSeconds={elapsedSeconds}
        exercises={exercises}
        setLogs={setLogs}
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
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: '#0f0f14', borderBottom: '1px solid #1a1a24' }}
      >
        <button
          onClick={() => { if (confirm('Finish early? Your progress will be saved.')) finishWorkout(true); }}
          className="p-1 btn-press" style={{ color: '#64748b' }}
        >
          <X size={20} />
        </button>
        <div className="flex-1">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e2a' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((exerciseIndex + completedSets / totalSets) / exercises.length) * 100}%`,
                background: '#3b82f6',
              }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-xs" style={{ color: '#475569' }}>
              Exercise {exerciseIndex + 1} of {exercises.length}
            </span>
            <span className="text-xs font-mono" style={{ color: '#475569' }}>
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>
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
            {/* Exercise name */}
            <div className="mb-4 animate-fade-in">
              <div className="flex flex-wrap gap-1 mb-2">
                {(currentEx?.muscle_groups || []).map(mg => (
                  <span key={mg} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#2a2a3a', color: '#94a3b8' }}>
                    {mg}
                  </span>
                ))}
              </div>
              <h1 className="text-3xl font-bold leading-tight" style={{ color: '#f1f5f9' }}>
                {currentEx?.name}
              </h1>
              <div className="flex gap-4 mt-2 text-sm">
                <span style={{ color: '#f97316' }}>
                  {currentEx?.sets} sets × {currentEx?.reps}
                </span>
                <span style={{ color: '#64748b' }}>Rest: {currentEx?.rest_seconds}s</span>
              </div>
              <p className="text-sm mt-1" style={{ color: '#64748b' }}>{currentEx?.weight_guidance}</p>
            </div>

            {/* Set tracker */}
            <div className="flex gap-2 mb-6">
              {Array.from({ length: totalSets }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-2.5 rounded-full transition-all duration-300"
                  style={{ background: i < completedSets ? '#3b82f6' : '#2a2a3a' }}
                />
              ))}
            </div>

            {/* Log set input */}
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
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
                      style={{ background: '#1e1e2a' }}
                    >
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
            {currentEx?.form_cues?.length > 0 && (
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
      <div
        className="flex items-center gap-2 px-4 py-4"
        style={{ background: '#0f0f14', borderTop: '1px solid #1a1a24' }}
      >
        <button
          onClick={goPrev}
          disabled={exerciseIndex === 0}
          className="p-3 rounded-xl btn-press"
          style={{
            background: '#1e1e2a',
            color: exerciseIndex === 0 ? '#2a2a3a' : '#94a3b8',
          }}
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

// Detect exercise type from name + weight_guidance
function getExerciseType(exercise) {
  const name = (exercise?.name || '').toLowerCase();
  const guidance = (exercise?.weight_guidance || '').toLowerCase();
  const reps = (exercise?.reps || '').toLowerCase();

  const cardioKeywords = ['cycling', 'cycle', 'bike', 'rowing', 'row', 'run', 'sprint', 'jog', 'walk', 'elliptical', 'stair', 'ski erg', 'assault bike', 'air bike', 'treadmill', 'swim'];
  const timedKeywords = ['plank', 'hold', 'wall sit', 'dead hang', 'hollow hold', 'l-sit', 'isometric', 'farmer', 'carry'];
  const bodyweightKeywords = ['push-up', 'pushup', 'pull-up', 'pullup', 'chin-up', 'chinup', 'dip', 'burpee', 'mountain climber', 'jumping jack'];

  if (cardioKeywords.some(k => name.includes(k))) return 'cardio';
  if (timedKeywords.some(k => name.includes(k)) || reps.includes('second') || reps.includes('sec')) return 'timed';
  if (bodyweightKeywords.some(k => name.includes(k)) || guidance.includes('bodyweight')) return 'bodyweight';
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

function SetLogger({ onLog, setNumber, totalSets, exercise, previousSet }) {
  const type = getExerciseType(exercise);
  const config = EXERCISE_TYPE_CONFIG[type];
  const [vals, setVals] = useState(() => {
    const init = {};
    config.fields.forEach(f => { init[f.key] = previousSet?.[f.key] || ''; });
    return init;
  });

  function handleLog() {
    const entry = { ...vals };
    // Fill defaults for empty fields
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
    <div
      className="p-4 rounded-2xl animate-fade-in"
      style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}
    >
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
