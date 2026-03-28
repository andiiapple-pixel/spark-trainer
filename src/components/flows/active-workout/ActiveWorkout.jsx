import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, SkipForward, ChevronDown, ChevronUp, Home, Calculator } from 'lucide-react';
import { storage } from '../../../utils/storage';
import { useAuth } from '../../../auth/AuthContext';
import { data as dataApi } from '../../../services/api';
import { generateEndOfWorkoutFeedback } from '../../../api/anthropic';
import { useActiveWorkout } from '../../../context/ActiveWorkoutContext';
import EndOfWorkout from './EndOfWorkout';
import PlateCalculator from '../../shared/PlateCalculator';

function RestTimer({ seconds, onSkip, tip }) {
  const [remaining, setRemaining] = useState(seconds);
  const onSkipRef = useRef(onSkip);
  useEffect(() => { onSkipRef.current = onSkip; }, [onSkip]);

  useEffect(() => { setRemaining(seconds); }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) { onSkipRef.current?.(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const isUrgent = remaining <= 5;

  return (
    <div className="flex flex-col items-center gap-5 py-8 animate-fade-in">
      <span
        style={{
          fontSize: 72,
          fontWeight: 700,
          fontFamily: "'Oswald', sans-serif",
          color: isUrgent ? '#EF4444' : '#FFFFFF',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          textTransform: 'uppercase',
        }}
      >
        {remaining}
      </span>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, color: '#555555', letterSpacing: '0.12em', textTransform: 'uppercase' }}>REST</p>

      <div className="flex gap-2">
        <button
          onClick={() => setRemaining(r => r + 15)}
          className="btn-press"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, color: '#888888', background: 'transparent', border: '1px solid #222222', height: 48, padding: '0 20px', borderRadius: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          +15S
        </button>
        <button
          onClick={onSkip}
          className="btn-press"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, color: '#888888', background: 'transparent', border: '1px solid #222222', height: 48, padding: '0 20px', borderRadius: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          SKIP
        </button>
      </div>

      {tip && (
        <div
          className="mx-4 p-3 animate-fade-in"
          style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0 }}
        >
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, color: '#555555', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>REST TIP</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#888888' }}>{tip}</p>
        </div>
      )}
    </div>
  );
}

export default function ActiveWorkout() {
  const navigate = useNavigate();
  const { profile: authProfile } = useAuth();
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
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipReason, setSkipReason] = useState('');

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

  function goHome() { setShowExitModal(true); }

  function cancelWorkout() {
    clearInterval(timerRef.current);
    ctx.clearActiveWorkout();
    navigate('/');
  }

  async function finishWorkout(early = false) {
    clearInterval(timerRef.current);
    const profile = authProfile || storage.getProfile();
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
    try {
      const totalVolume = Object.values(ctx.completedSets).flat().reduce((acc, s) => {
        return acc + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
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
      sessionStorage.setItem('spark_workout_saved', '1');
      navigate('/');
    } catch (err) {
      console.error('[ActiveWorkout] Save failed:', err);
      setSaving(false);
      alert('Failed to save workout. Please try again.');
    }
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
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto" style={{ background: '#0A0A0A' }}>
      {/* Plate calc modal */}
      {showCalc && <PlateCalculator onClose={() => setShowCalc(false)} />}

      {/* Exit modal */}
      {showExitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.85)' }}
        >
          <div
            className="w-full p-6"
            style={{ background: '#111111', border: '1px solid #222222', maxWidth: 360, borderRadius: 0 }}
          >
            <h3 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 18, color: '#FFFFFF', textTransform: 'uppercase', marginBottom: 8 }}>Leave workout?</h3>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#888888', marginBottom: 20, lineHeight: 1.5 }}>
              Choose what to do with your current session.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setShowExitModal(false); finishWorkout(true); }}
                className="py-3 btn-press text-left px-4"
                style={{ background: '#E8FF00', color: '#000000', fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 14, textTransform: 'uppercase', borderRadius: 0, border: 'none' }}
              >
                Finish early &amp; save results
              </button>
              <button
                onClick={cancelWorkout}
                className="py-3 btn-press text-left px-4"
                style={{ background: 'transparent', border: '1px solid #EF4444', color: '#EF4444', fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 14, borderRadius: 0 }}
              >
                Cancel workout — discard progress
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className="py-3 btn-press"
                style={{ background: '#111111', border: '1px solid #222222', color: '#888888', fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 14, borderRadius: 0 }}
              >
                Keep going
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip exercise modal */}
      {showSkipModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.85)' }}
        >
          <div
            className="w-full p-6"
            style={{ background: '#111111', border: '1px solid #222222', maxWidth: 360, borderRadius: 0 }}
          >
            <h3 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 18, color: '#FFFFFF', textTransform: 'uppercase', marginBottom: 8 }}>Skip exercise?</h3>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#888888', marginBottom: 16, lineHeight: 1.5 }}>
              Select a reason or type your own.
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {['Equipment busy', 'Pain / discomfort', 'Too easy', 'Too hard'].map(r => (
                <button
                  key={r}
                  onClick={() => setSkipReason(r)}
                  className="py-2.5 px-4 btn-press text-left"
                  style={{
                    background: skipReason === r ? '#E8FF00' : 'transparent',
                    color: skipReason === r ? '#000000' : '#888888',
                    border: `1px solid ${skipReason === r ? '#E8FF00' : '#222222'}`,
                    borderRadius: 0,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Other reason..."
              value={['Equipment busy', 'Pain / discomfort', 'Too easy', 'Too hard'].includes(skipReason) ? '' : skipReason}
              onChange={e => setSkipReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0A0A0A',
                border: '1px solid #222222',
                borderRadius: 0,
                color: '#FFFFFF',
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                outline: 'none',
                marginBottom: 16,
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowSkipModal(false)}
                className="flex-1 py-3 btn-press"
                style={{ background: 'transparent', border: '1px solid #222222', color: '#888888', fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 13, borderRadius: 0 }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowSkipModal(false); skipExercise(skipReason || 'skipped'); setSkipReason(''); }}
                className="flex-1 py-3 btn-press"
                style={{ background: '#E8FF00', border: 'none', color: '#000000', fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 13, textTransform: 'uppercase', borderRadius: 0 }}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{ background: '#0A0A0A', borderBottom: '1px solid #222222' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={goHome} className="btn-press" style={{ color: '#888888', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #222222', borderRadius: 0, background: 'transparent' }} title="Go home">
            <Home size={18} />
          </button>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1.5">
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, color: '#888888', fontVariantNumeric: 'tabular-nums' }}>
                {exerciseIndex + 1} / {exercises.length}
              </span>
              <div className="flex gap-3 items-center">
                {(() => {
                  const vol = Object.values(ctx.completedSets).flat()
                    .filter(s => s.set_type !== 'warmup')
                    .reduce((acc, s) => acc + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
                  return vol > 0 ? (
                    <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, fontWeight: 700, color: '#E8FF00', fontVariantNumeric: 'tabular-nums' }}>
                      {vol.toFixed(0)}kg
                    </span>
                  ) : null;
                })()}
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontVariantNumeric: 'tabular-nums', color: '#555555' }}>
                  {formatTime(ctx.elapsedSeconds)}
                </span>
              </div>
            </div>
            <div className="overflow-hidden" style={{ height: 2, background: '#222222', borderRadius: 0 }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  background: '#E8FF00',
                  transition: 'width 0.5s ease',
                  borderRadius: 0,
                }}
              />
            </div>
          </div>
          <button onClick={() => setShowExitModal(true)} className="btn-press" style={{ color: '#888888', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #222222', borderRadius: 0, background: 'transparent' }}>
            <X size={18} />
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
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555555', border: '1px solid #222222', borderRadius: 0, padding: '4px 8px', display: 'inline-block' }}
                  >
                    {mg}
                  </span>
                ))}
              </div>
              <div className="flex items-start gap-2">
                <h1 className="flex-1 leading-tight" style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 32, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                  {currentEx?.name || '—'}
                </h1>
                <button
                  onClick={() => setShowCalc(true)}
                  className="btn-press flex items-center justify-center mt-1"
                  style={{ width: 36, height: 36, background: '#111111', border: '1px solid #222222', color: '#555555', flexShrink: 0, borderRadius: 0 }}
                  title="Plate / warm-up calculator"
                >
                  <Calculator size={15} />
                </button>
              </div>
              <div className="flex gap-3 mt-1.5">
                <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 14, color: '#E8FF00', textTransform: 'uppercase' }}>
                  {currentEx?.sets} sets × {currentEx?.reps}
                </span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#555555' }}>Rest: {currentEx?.rest_seconds}s</span>
              </div>
              {currentEx?.weight_guidance && (
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#555555', marginTop: 2 }}>{currentEx.weight_guidance}</p>
              )}
            </div>

            {/* Set progress dots */}
            <div className="flex gap-1.5 mb-5">
              {Array.from({ length: totalSets }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 2,
                    background: i < completedSets ? '#E8FF00' : '#222222',
                    transition: 'background 0.3s',
                    borderRadius: 0,
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
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, color: '#555555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>COMPLETED SETS</p>
                {currentLogs.map((s, i) => {
                  const type = getExerciseType(currentEx);
                  const summary = EXERCISE_TYPE_CONFIG[type]?.summary(s) || '';
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2.5"
                      style={{ background: '#111111', borderLeft: '3px solid #E8FF00', borderRadius: 0 }}
                    >
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: '#888888' }}>
                        {type === 'cardio' ? `Round ${i + 1}` : `Set ${i + 1}`}
                      </span>
                      <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 14, color: '#FFFFFF' }}>{summary}</span>
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
                  className="flex items-center gap-2 btn-press"
                  style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  {showCues ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>Form cues</span>
                </button>
                {showCues && (
                  <div className="mt-2 p-3 animate-fade-in" style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0 }}>
                    {currentEx.form_cues.map((cue, i) => (
                      <p key={i} className="py-1" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#888888' }}>
                        <span style={{ color: '#E8FF00' }}>→</span> {cue}
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
        style={{ background: '#0A0A0A', borderTop: '1px solid #222222' }}
      >
        <button
          onClick={goPrev}
          disabled={exerciseIndex === 0}
          className="btn-press flex items-center gap-1 justify-center"
          style={{
            height: 44,
            padding: '0 12px',
            background: 'transparent',
            border: '1px solid #222222',
            borderRadius: 0,
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            fontWeight: 500,
            color: exerciseIndex === 0 ? '#222222' : '#888888',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          <ChevronLeft size={14} /> PREV
        </button>
        <button
          onClick={() => { setSkipReason(''); setShowSkipModal(true); }}
          className="flex-1 btn-press flex items-center justify-center gap-2"
          style={{ height: 44, background: 'transparent', border: '1px solid #222222', borderRadius: 0, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          <SkipForward size={13} />
          Skip
        </button>
        <button
          onClick={goNext}
          className="btn-press flex items-center gap-1 justify-center"
          style={{ height: 44, padding: '0 12px', background: '#E8FF00', color: '#000000', borderRadius: 0, border: 'none', fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          NEXT <ChevronRight size={14} />
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
  { id: 'working', label: 'Working', color: '#E8FF00' },
  { id: 'warmup',  label: 'Warm-up', color: '#22C55E' },
  { id: 'drop',    label: 'Drop',    color: '#888888' },
  { id: 'failure', label: 'Failure', color: '#EF4444' },
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

  const logBtnColor = setType === 'failure' ? '#EF4444' : setType === 'warmup' ? '#22C55E' : '#E8FF00';
  const logBtnTextColor = setType === 'failure' ? '#FFFFFF' : setType === 'warmup' ? '#FFFFFF' : '#000000';

  return (
    <div
      className="p-4 animate-fade-in"
      style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0 }}
    >
      {/* Last performance banner */}
      {lastLabel && (
        <div
          className="mb-3 px-3 py-2 flex items-center gap-2"
          style={{ background: '#0A0A0A', borderLeft: '3px solid #22C55E', borderRadius: 0 }}
        >
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#555555' }}>Last time:</span>
          <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 12, color: '#22C55E' }}>{lastLabel}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, color: '#555555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {config.label(setNumber)} OF {totalSets}
        </p>
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="btn-press"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 9,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '4px 10px',
            borderRadius: 0,
            background: 'transparent',
            color: activeSetType?.color,
            border: `1px solid ${activeSetType?.color}`,
          }}
        >
          {activeSetType?.label}
        </button>
      </div>

      {/* Advanced options */}
      {showAdvanced && (
        <div className="mb-4 p-3" style={{ background: '#0A0A0A', border: '1px solid #222222', borderRadius: 0 }}>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {SET_TYPES.map(st => (
              <button
                key={st.id}
                onClick={() => setSetType(st.id)}
                className="btn-press"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 9,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '4px 10px',
                  borderRadius: 0,
                  background: setType === st.id ? st.color : 'transparent',
                  color: setType === st.id ? (st.id === 'working' ? '#000000' : '#FFFFFF') : '#555555',
                  border: `1px solid ${setType === st.id ? st.color : '#222222'}`,
                  transition: 'all 0.15s',
                }}
              >
                {st.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, color: '#555555', letterSpacing: '0.06em', textTransform: 'uppercase' }}>RPE</label>
            <input
              type="number" min="1" max="10"
              value={rpe}
              onChange={e => setRpe(e.target.value)}
              placeholder="1–10"
              className="w-16 px-2 py-1.5 text-center outline-none"
              style={{ background: '#111111', border: '1px solid #222222', color: '#FFFFFF', fontSize: 14, borderRadius: 0, fontFamily: "'Inter', sans-serif" }}
            />
          </div>
        </div>
      )}

      {/* Inputs */}
      <div className="flex gap-3 mb-4">
        {config.fields.map(f => (
          <div key={f.key} className="flex-1">
            <label className="mb-1.5 block" style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, color: '#555555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {f.label}
            </label>
            <input
              type={f.type}
              inputMode={f.type === 'number' ? 'decimal' : 'text'}
              placeholder={f.placeholder(exercise)}
              value={vals[f.key]}
              onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
              className="w-full px-3 text-center outline-none"
              style={{
                background: '#111111',
                border: '1px solid #222222',
                color: '#FFFFFF',
                fontSize: 28,
                fontWeight: 700,
                fontFamily: "'Oswald', sans-serif",
                height: 48,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                borderRadius: 0,
              }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleLog}
        className="w-full btn-press flex items-center justify-center gap-2"
        style={{ background: logBtnColor, color: logBtnTextColor, height: 64, fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.04em', borderRadius: 0, border: 'none' }}
      >
        COMPLETE SET →
      </button>
    </div>
  );
}
