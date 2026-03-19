import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, SkipForward, ChevronDown, ChevronUp, Home, Calculator } from 'lucide-react';
import { storage } from '../../../utils/storage';
import { data as dataApi } from '../../../services/api';
import { generateEndOfWorkoutFeedback } from '../../../api/anthropic';
import { useActiveWorkout } from '../../../context/ActiveWorkoutContext';
import EndOfWorkout from './EndOfWorkout';
import PlateCalculator from '../../shared/PlateCalculator';

function RestTimer({ seconds, onSkip, tip }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => { setRemaining(seconds); }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) { onSkip?.(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const isUrgent = remaining <= 5;

  return (
    <div className="flex flex-col items-center gap-5 py-8 animate-fade-in">
      <p className="text-xs font-semibold" style={{ color: '#475569', letterSpacing: '0.1em' }}>REST</p>
      <div className="relative" style={{ width: 144, height: 144 }}>
        <svg width="144" height="144" viewBox="0 0 144 144">
          <circle cx="72" cy="72" r={radius} fill="none" stroke="#1e1e2e" strokeWidth="6" />
          <circle
            cx="72" cy="72" r={radius}
            fill="none"
            stroke={isUrgent ? '#ef4444' : '#6366f1'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - remaining / seconds)}
            transform="rotate(-90 72 72)"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: isUrgent ? '#ef4444' : '#f8fafc',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {remaining}
          </span>
          <span className="text-xs mt-1" style={{ color: '#475569' }}>seconds</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setRemaining(r => r + 15)}
          className="px-3 py-2 rounded-full text-xs font-semibold btn-press"
          style={{ background: '#111118', border: '1px solid #2d2d3d', color: '#94a3b8' }}
        >
          +15s
        </button>
        <button
          onClick={() => setRemaining(r => r + 30)}
          className="px-3 py-2 rounded-full text-xs font-semibold btn-press"
          style={{ background: '#111118', border: '1px solid #2d2d3d', color: '#94a3b8' }}
        >
          +30s
        </button>
        <button
          onClick={onSkip}
          className="px-5 py-2 rounded-full text-sm font-bold btn-press"
          style={{ background: '#6366f1', color: '#fff' }}
        >
          Skip Rest
        </button>
      </div>

      {tip && (
        <div
          className="mx-4 p-3 rounded-2xl animate-fade-in"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid #6366f130' }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: '#818cf8', letterSpacing: '0.04em' }}>REST TIP</p>
          <p className="text-sm" style={{ color: '#94a3b8' }}>{tip}</p>
        </div>
      )}
    </div>
  );
}

export default function ActiveWorkout() {
  const navigate = useNavigate();
  const ctx = useActiveWorkout();

  const [resting, setResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(60);
  const [showCues, setShowCues] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    if (done) return;
    timerRef.current = setInterval(ctx.tickTimer, 1000);
    return () => clearInterval(timerRef.current);
  }, [done, ctx.tickTimer]);

  useEffect(() => {
    if (!ctx.status || !ctx.workout) {
      navigate('/');
    }
  }, [ctx.status, ctx.workout, navigate]);

  if (!ctx.status || !ctx.workout) {
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
    if (entry.weight && parseFloat(entry.weight) > 0 && currentEx?.name) {
      storage.updatePR(currentEx.name, parseFloat(entry.weight), parseInt(entry.reps), new Date().toISOString());
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

  function goHome() { navigate('/'); }

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
        profile, workout,
        { logged, elapsed_mins: Math.round(ctx.elapsedSeconds / 60), early },
        rating || 3,
        workout.sessionConfig?.user_notes_today
      );
    } catch { /* non-fatal */ }
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
      rating, notes,
      trainer_feedback: feedback,
      user_notes_today: workout.sessionConfig?.user_notes_today || null,
      estimated_calories: workout.estimated_calories_range,
      savedAt: new Date().toISOString(),
    };
    storage.addWorkout(entry);
    ctx.clearActiveWorkout();
    dataApi.saveWorkout(entry).catch(err =>
      console.warn('[ActiveWorkout] API save failed:', err)
    );
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

  const progressPct = ((exerciseIndex + completedSets / Math.max(totalSets, 1)) / Math.max(exercises.length, 1)) * 100;

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto" style={{ background: '#0a0a0f' }}>
      {/* Plate calc modal */}
      {showCalc && <PlateCalculator onClose={() => setShowCalc(false)} />}

      {/* Exit modal */}
      {showExitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.85)' }}
        >
          <div
            className="w-full rounded-2xl p-6"
            style={{ background: '#111118', border: '1px solid #2d2d3d', maxWidth: 360 }}
          >
            <h3 className="font-bold text-lg mb-2" style={{ color: '#f8fafc' }}>Leave workout?</h3>
            <p className="text-sm mb-5 leading-relaxed" style={{ color: '#94a3b8' }}>
              Choose what to do with your current session.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setShowExitModal(false); finishWorkout(true); }}
                className="py-3 rounded-xl font-semibold text-sm btn-press text-left px-4"
                style={{ background: '#6366f1', color: '#fff' }}
              >
                Finish early &amp; save results
              </button>
              <button
                onClick={cancelWorkout}
                className="py-3 rounded-xl font-semibold text-sm btn-press text-left px-4"
                style={{ background: 'transparent', border: '1px solid #ef444450', color: '#ef4444' }}
              >
                Cancel workout — discard progress
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className="py-3 rounded-xl font-semibold text-sm btn-press"
                style={{ background: '#1a1a24', border: '1px solid #2d2d3d', color: '#94a3b8' }}
              >
                Keep going
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{ background: '#0a0a0f', borderBottom: '1px solid #1e1e2e' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={goHome} className="btn-press p-1" style={{ color: '#475569' }} title="Go home">
            <Home size={20} />
          </button>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold" style={{ color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                {exerciseIndex + 1} / {exercises.length}
              </span>
              <div className="flex gap-3 items-center">
                {(() => {
                  const vol = Object.values(ctx.completedSets).flat()
                    .filter(s => s.set_type !== 'warmup')
                    .reduce((acc, s) => acc + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 1), 0);
                  return vol > 0 ? (
                    <span className="text-xs font-semibold" style={{ color: '#6366f1', fontVariantNumeric: 'tabular-nums' }}>
                      {vol.toFixed(0)}kg
                    </span>
                  ) : null;
                })()}
                <span className="text-xs font-mono" style={{ color: '#475569' }}>
                  {formatTime(ctx.elapsedSeconds)}
                </span>
              </div>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1e1e2e' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progressPct}%`,
                  background: '#6366f1',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
          <button onClick={() => setShowExitModal(true)} className="btn-press p-1" style={{ color: '#475569' }}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 px-5 py-5 flex flex-col">
        {resting ? (
          <RestTimer
            seconds={restSeconds}
            tip={currentEx?.between_set_tip}
            onSkip={() => {
              setResting(false);
              if (completedSets >= totalSets) goNext();
            }}
          />
        ) : (
          <>
            {/* Exercise header */}
            <div className="mb-5 animate-fade-in">
              <div className="flex flex-wrap gap-1 mb-2">
                {(currentEx?.muscle_groups || []).map(mg => (
                  <span
                    key={mg}
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: '#1a1a24', color: '#94a3b8', border: '1px solid #2d2d3d' }}
                  >
                    {mg}
                  </span>
                ))}
              </div>
              <div className="flex items-start gap-2">
                <h1 className="font-bold flex-1 leading-tight" style={{ color: '#f8fafc', fontSize: 26, letterSpacing: '-0.02em' }}>
                  {currentEx?.name || '—'}
                </h1>
                <button
                  onClick={() => setShowCalc(true)}
                  className="btn-press flex items-center justify-center rounded-xl mt-1"
                  style={{ width: 36, height: 36, background: '#111118', border: '1px solid #2d2d3d', color: '#475569', flexShrink: 0 }}
                  title="Plate / warm-up calculator"
                >
                  <Calculator size={15} />
                </button>
              </div>
              <div className="flex gap-3 mt-1.5">
                <span className="text-sm font-semibold" style={{ color: '#f97316' }}>
                  {currentEx?.sets} sets × {currentEx?.reps}
                </span>
                <span className="text-sm" style={{ color: '#475569' }}>Rest: {currentEx?.rest_seconds}s</span>
              </div>
              {currentEx?.weight_guidance && (
                <p className="text-sm mt-0.5" style={{ color: '#475569' }}>{currentEx.weight_guidance}</p>
              )}
            </div>

            {/* Set progress dots */}
            <div className="flex gap-1.5 mb-5">
              {Array.from({ length: totalSets }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full"
                  style={{
                    height: 4,
                    background: i < completedSets ? '#6366f1' : '#1e1e2e',
                    transition: 'background 0.3s',
                  }}
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
              lastPerformance={(() => {
                if (!currentEx?.name) return null;
                const history = storage.getWorkoutHistory();
                for (const w of history) {
                  const ex = (w.exercises || []).find(e => e.name?.toLowerCase() === currentEx.name.toLowerCase());
                  if (ex?.sets_logged?.length > 0) {
                    return ex.sets_logged[ex.sets_logged.length - 1];
                  }
                }
                return null;
              })()}
            />

            {/* Logged sets */}
            {currentLogs.length > 0 && (
              <div className="mt-4 flex flex-col gap-1.5">
                <p className="text-xs font-semibold" style={{ color: '#475569', letterSpacing: '0.06em' }}>COMPLETED SETS</p>
                {currentLogs.map((s, i) => {
                  const type = getExerciseType(currentEx);
                  const summary = EXERCISE_TYPE_CONFIG[type]?.summary(s) || '';
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm"
                      style={{ background: '#111118', border: '1px solid #1e1e2e' }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: '#6366f115' }}
                      >
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1.5" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className="font-medium" style={{ color: '#818cf8' }}>
                        {type === 'cardio' ? `Round ${i + 1}` : `Set ${i + 1}`}
                      </span>
                      <span style={{ color: '#f8fafc' }}>{summary}</span>
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
                  style={{ color: '#475569' }}
                >
                  {showCues ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>Form cues</span>
                </button>
                {showCues && (
                  <div className="mt-2 p-3 rounded-xl animate-fade-in" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
                    {currentEx.form_cues.map((cue, i) => (
                      <p key={i} className="text-sm py-1" style={{ color: '#94a3b8' }}>
                        <span style={{ color: '#6366f1' }}>→</span> {cue}
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
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: '#0a0a0f', borderTop: '1px solid #1e1e2e' }}
      >
        <button
          onClick={goPrev}
          disabled={exerciseIndex === 0}
          className="btn-press flex items-center justify-center rounded-xl"
          style={{
            width: 44,
            height: 44,
            background: '#111118',
            border: '1px solid #2d2d3d',
            color: exerciseIndex === 0 ? '#2d2d3d' : '#94a3b8',
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
          style={{ background: '#111118', color: '#475569', border: '1px solid #2d2d3d' }}
        >
          <SkipForward size={15} />
          Skip
        </button>
        <button
          onClick={goNext}
          className="btn-press flex items-center justify-center rounded-xl"
          style={{ width: 44, height: 44, background: '#6366f1', color: '#fff' }}
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
    label: (n) => `SET ${n}`,
    fields: [
      { key: 'reps', label: 'REPS', placeholder: (ex) => (typeof ex?.reps === 'string' ? ex.reps.split('-')[0] : ex?.reps) || '10', type: 'number' },
      { key: 'weight', label: 'WEIGHT (kg)', placeholder: () => '0', type: 'number' },
    ],
    summary: (s) => `${s.reps} reps @ ${s.weight}kg`,
  },
  bodyweight: {
    label: (n) => `SET ${n}`,
    fields: [
      { key: 'reps', label: 'REPS', placeholder: (ex) => (typeof ex?.reps === 'string' ? ex.reps.split('-')[0] : ex?.reps) || '10', type: 'number' },
    ],
    summary: (s) => `${s.reps} reps`,
  },
  timed: {
    label: (n) => `SET ${n}`,
    fields: [
      { key: 'duration', label: 'DURATION (sec)', placeholder: (ex) => (typeof ex?.reps === 'string' ? ex.reps.replace(/\D/g, '') : '') || '30', type: 'number' },
    ],
    summary: (s) => `${s.duration}s`,
  },
  cardio: {
    label: (n) => `ROUND ${n}`,
    fields: [
      { key: 'duration', label: 'DURATION (min)', placeholder: () => '10', type: 'number' },
      { key: 'resistance', label: 'LEVEL', placeholder: () => '—', type: 'text' },
    ],
    summary: (s) => `${s.duration}min @ ${s.resistance || '—'}`,
  },
};

const SET_TYPES = [
  { id: 'working', label: 'Working', color: '#6366f1' },
  { id: 'warmup',  label: 'Warm-up', color: '#10b981' },
  { id: 'drop',    label: 'Drop',    color: '#8b5cf6' },
  { id: 'failure', label: 'Failure', color: '#ef4444' },
];

function SetLogger({ onLog, setNumber, totalSets, exercise, previousSet, lastPerformance }) {
  const type = getExerciseType(exercise);
  const config = EXERCISE_TYPE_CONFIG[type];
  const [vals, setVals] = useState(() => {
    const init = {};
    config.fields.forEach(f => { init[f.key] = previousSet?.[f.key] || ''; });
    return init;
  });
  const [setType, setSetType] = useState('working');
  const [rpe, setRpe] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const init = {};
    config.fields.forEach(f => { init[f.key] = previousSet?.[f.key] || ''; });
    setVals(init);
    setSetType('working');
    setRpe('');
  }, [exercise?.name]);

  function handleLog() {
    const entry = { ...vals, set_type: setType };
    config.fields.forEach(f => {
      if (!entry[f.key]) entry[f.key] = f.placeholder(exercise);
    });
    if (rpe) entry.rpe = parseInt(rpe);
    onLog(entry);
    setVals(() => {
      const reset = {};
      config.fields.forEach(f => { reset[f.key] = ''; });
      return reset;
    });
    setRpe('');
  }

  const activeSetType = SET_TYPES.find(s => s.id === setType);

  const lastLabel = (() => {
    if (!lastPerformance) return null;
    if (lastPerformance.weight && lastPerformance.reps) return `${lastPerformance.weight}kg × ${lastPerformance.reps}`;
    if (lastPerformance.reps) return `${lastPerformance.reps} reps`;
    if (lastPerformance.duration) return `${lastPerformance.duration}s`;
    return null;
  })();

  const logBtnColor = setType === 'failure' ? '#ef4444' : setType === 'warmup' ? '#10b981' : '#6366f1';

  return (
    <div
      className="p-4 rounded-2xl animate-fade-in"
      style={{ background: '#111118', border: '1px solid #1e1e2e' }}
    >
      {/* Last performance banner */}
      {lastLabel && (
        <div
          className="mb-3 px-3 py-2 rounded-xl flex items-center gap-2"
          style={{ background: '#0f1f18', border: '1px solid #10b98130' }}
        >
          <span className="text-xs" style={{ color: '#475569' }}>Last time:</span>
          <span className="text-xs font-bold" style={{ color: '#10b981' }}>{lastLabel}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold" style={{ color: '#475569', letterSpacing: '0.06em' }}>
          {config.label(setNumber)} OF {totalSets}
        </p>
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="px-2.5 py-1 rounded-full text-xs font-semibold btn-press"
          style={{
            background: `${activeSetType?.color}20`,
            color: activeSetType?.color,
            border: `1px solid ${activeSetType?.color}40`,
          }}
        >
          {activeSetType?.label}
        </button>
      </div>

      {/* Advanced options */}
      {showAdvanced && (
        <div className="mb-4 p-3 rounded-xl" style={{ background: '#0d0d14', border: '1px solid #1e1e2e' }}>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {SET_TYPES.map(st => (
              <button
                key={st.id}
                onClick={() => setSetType(st.id)}
                className="px-2.5 py-1 rounded-full text-xs font-semibold btn-press"
                style={{
                  background: setType === st.id ? `${st.color}20` : 'transparent',
                  color: setType === st.id ? st.color : '#475569',
                  border: `1px solid ${setType === st.id ? st.color : '#2d2d3d'}`,
                  transition: 'all 0.15s',
                }}
              >
                {st.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold" style={{ color: '#475569', letterSpacing: '0.04em' }}>RPE</label>
            <input
              type="number" min="1" max="10"
              value={rpe}
              onChange={e => setRpe(e.target.value)}
              placeholder="1–10"
              className="w-16 px-2 py-1.5 rounded-lg text-sm text-center outline-none"
              style={{ background: '#111118', border: '1px solid #2d2d3d', color: '#f8fafc', fontSize: 14 }}
            />
          </div>
        </div>
      )}

      {/* Inputs */}
      <div className="flex gap-3 mb-4">
        {config.fields.map(f => (
          <div key={f.key} className="flex-1">
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#475569', letterSpacing: '0.05em' }}>
              {f.label}
            </label>
            <input
              type={f.type}
              inputMode={f.type === 'number' ? 'decimal' : 'text'}
              placeholder={f.placeholder(exercise)}
              value={vals[f.key]}
              onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
              className="w-full px-3 rounded-xl text-center outline-none"
              style={{
                background: '#0d0d14',
                border: '1px solid #2d2d3d',
                color: '#f8fafc',
                fontSize: 28,
                fontWeight: 800,
                height: 64,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleLog}
        className="w-full rounded-full font-bold text-base btn-press flex items-center justify-center gap-2"
        style={{ background: logBtnColor, color: '#fff', height: 52, fontSize: 15 }}
      >
        ✓ Log {setType === 'warmup' ? 'Warm-up' : setType === 'failure' ? 'Failure Set' : type === 'cardio' ? 'Round' : 'Set'}
      </button>
    </div>
  );
}
