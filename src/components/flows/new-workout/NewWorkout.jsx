import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Zap } from 'lucide-react';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import WorkoutDisplay from './WorkoutDisplay';
import { storage } from '../../../utils/storage';
import { generateWorkout } from '../../../api/anthropic';
import { useActiveWorkout } from '../../../context/ActiveWorkoutContext';
import { recovery as recoveryApi } from '../../../services/api';
import { getScoreInfo } from '../../recovery/RecoveryCheckin';

const FOCUS_OPTIONS = [
  { id: 'strength',  emoji: '💪', label: 'Strength & Muscle',      sub: 'Build size and power' },
  { id: 'cardio',    emoji: '🔥', label: 'Fat Burn & Cardio',      sub: 'Burn calories, elevate heart rate' },
  { id: 'endurance', emoji: '🏃', label: 'Endurance',              sub: 'Improve stamina and capacity' },
  { id: 'mobility',  emoji: '🧘', label: 'Mobility & Recovery',    sub: 'Stretch, restore, de-stress' },
  { id: 'athletic',  emoji: '⚡', label: 'Athletic Performance',   sub: 'Speed, power, agility' },
  { id: 'custom',    emoji: '🎯', label: 'Custom',                  sub: "I'll tell you exactly what I want" },
];

const LOCATION_OPTIONS = [
  { id: 'gym',     emoji: '🏋️', label: 'Gym',             sub: 'Full equipment available' },
  { id: 'home',    emoji: '🏠', label: 'Home',            sub: 'Bodyweight / limited kit' },
  { id: 'outdoors',emoji: '🌿', label: 'Outdoors',        sub: 'Park, track, open space' },
  { id: 'hotel',   emoji: '🏨', label: 'Hotel / Minimal', sub: 'Tight space, no equipment' },
];

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90];

const ENERGY_OPTIONS = [
  { id: 'tired',   emoji: '😴', label: 'Tired / Low energy',  sub: 'Light session, movement quality focus' },
  { id: 'average', emoji: '😐', label: 'Average energy',       sub: 'Moderate intensity is fine' },
  { id: 'good',    emoji: '💪', label: 'Feeling good',         sub: "Let's push today" },
  { id: 'great',   emoji: '🔥', label: 'Feeling great',        sub: 'Full send — beast mode' },
];

const AVOID_CHIPS = ['Lower back', 'Knees', 'Shoulders', 'Wrists', 'Hips', 'Skip this'];

function StepHeader({ step, total, onBack, title }) {
  return (
    <div style={{ background: '#0a0a0f' }}>
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button
          onClick={onBack}
          className="btn-press flex items-center justify-center rounded-full flex-shrink-0"
          style={{ width: 36, height: 36, background: '#111118', border: '1px solid #2d2d3d', color: '#94a3b8' }}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 flex items-center gap-2 justify-center">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                background: i === step ? '#6366f1' : i < step ? '#4338ca' : '#2d2d3d',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
        <div style={{ width: 36 }} />
      </div>
      <div style={{ height: 2, background: '#1e1e2e' }}>
        <div
          style={{
            height: '100%',
            width: `${((step + 1) / total) * 100}%`,
            background: '#6366f1',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

function OptionCard({ emoji, label, sub, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-4 rounded-2xl text-left w-full btn-press"
      style={{
        background: selected ? 'rgba(99,102,241,0.1)' : '#111118',
        border: `2px solid ${selected ? '#6366f1' : '#1e1e2e'}`,
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <span style={{ fontSize: 26, flexShrink: 0 }}>{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm" style={{ color: '#f8fafc' }}>{label}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{sub}</div>}
      </div>
      {selected && (
        <div
          className="flex-shrink-0 rounded-full flex items-center justify-center"
          style={{ width: 20, height: 20, background: '#6366f1' }}
        >
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  );
}

export default function NewWorkout() {
  const navigate = useNavigate();
  const ctx = useActiveWorkout();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    focus: '', customFocus: '', location: '', duration: 45,
    energy: '', avoid: [], notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [workout, setWorkout] = useState(null);
  const [todayRecovery, setTodayRecovery] = useState(null);
  const [overrideRecovery, setOverrideRecovery] = useState(false);

  useEffect(() => {
    if (ctx.status === 'generated' && ctx.workout) {
      setWorkout(ctx.workout);
    }
    recoveryApi.getToday().then(r => setTodayRecovery(r.log)).catch(() => {});
  }, []);

  const totalSteps = 6;

  function update(field, value) {
    setConfig(c => ({ ...c, [field]: value }));
  }

  function toggleAvoid(chip) {
    setConfig(c => ({
      ...c,
      avoid: c.avoid.includes(chip)
        ? c.avoid.filter(v => v !== chip)
        : chip === 'Skip this' ? ['Skip this'] : [...c.avoid.filter(v => v !== 'Skip this'), chip],
    }));
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const profile = storage.getProfile();
      const history = storage.getWorkoutHistory();
      const sessionConfig = {
        focus: config.focus === 'custom' ? config.customFocus : config.focus,
        location: config.location,
        duration_mins: config.duration,
        energy_level: config.energy,
        areas_to_avoid: config.avoid,
        user_notes_today: config.notes || null,
      };

      let recoveryContext = null;
      if (todayRecovery && !overrideRecovery) {
        const score = todayRecovery.recovery_score;
        const category = score <= 40 ? 'red' : score <= 65 ? 'amber' : score <= 85 ? 'green' : 'blue';
        recoveryContext = {
          score, category,
          sleep_quality: todayRecovery.sleep_quality,
          sleep_duration: todayRecovery.sleep_duration,
          body_feeling: todayRecovery.body_feeling,
          stress_level: todayRecovery.stress_level,
          recovery_adjustment: category === 'red' ? 'reduce_volume_35_percent' :
            category === 'amber' ? 'reduce_volume_15_percent' :
            category === 'blue' ? 'peak_day_push_harder' : 'standard',
        };
      }

      const result = await generateWorkout(profile, sessionConfig, history.slice(0, 3), null, recoveryContext);
      const w = { ...result, sessionConfig, generatedAt: new Date().toISOString(), recoveryContext };
      ctx.setWorkoutGenerated(w);
      setWorkout(w);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function regenerate(extraNote) {
    setWorkout(null);
    if (extraNote) update('notes', extraNote);
    await generate();
  }

  const profile = storage.getProfile();

  if (loading) {
    return (
      <div
        className="flex flex-col min-h-screen max-w-[430px] mx-auto items-center justify-center gap-6 px-5"
        style={{ background: '#0a0a0f' }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid #6366f140' }}
        >
          <Zap size={36} style={{ color: '#6366f1' }} className="animate-pulse-slow" />
        </div>
        <div className="text-center">
          <h2 className="font-bold text-xl mb-2" style={{ color: '#f8fafc' }}>Building your workout…</h2>
          <p className="text-sm" style={{ color: '#94a3b8' }}>Your trainer is crafting something great.</p>
        </div>
        <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: '#1e1e2e' }}>
          <div
            className="h-full rounded-full"
            style={{
              background: '#6366f1',
              animation: 'shimmer 1.5s infinite',
              backgroundImage: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen max-w-[430px] mx-auto" style={{ background: '#0a0a0f' }}>
        <div className="flex items-center gap-3 px-5 pt-4">
          <button onClick={() => setError(null)} className="btn-press" style={{ color: '#94a3b8' }}>
            <ChevronLeft size={20} />
          </button>
        </div>
        <ErrorState message={error} onRetry={generate} />
      </div>
    );
  }

  if (workout) {
    return (
      <WorkoutDisplay
        workout={workout}
        onStart={() => { ctx.startWorkout(); navigate('/workout/active'); }}
        onRegenerate={regenerate}
        onBack={() => setWorkout(null)}
      />
    );
  }

  const handleBack = step === 0 ? () => navigate(-1) : () => setStep(s => s - 1);

  const steps = [
    // Step 0 — Focus
    <div key={0} className="flex flex-col gap-3">
      <div className="mb-2">
        <h2 className="font-bold" style={{ color: '#f8fafc', fontSize: 24, letterSpacing: '-0.02em' }}>
          What&apos;s the focus today?
        </h2>
      </div>
      <div className="flex flex-col gap-2">
        {FOCUS_OPTIONS.map(opt => (
          <OptionCard
            key={opt.id}
            emoji={opt.emoji}
            label={opt.label}
            sub={opt.sub}
            selected={config.focus === opt.id}
            onClick={() => { update('focus', opt.id); if (opt.id !== 'custom') setStep(1); }}
          />
        ))}
        {config.focus === 'custom' && (
          <>
            <textarea
              autoFocus
              placeholder="e.g. chest and triceps, moderate intensity, no barbells..."
              value={config.customFocus}
              onChange={e => update('customFocus', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl outline-none resize-none"
              style={{ background: '#111118', border: '1px solid #6366f1', color: '#f8fafc', fontSize: 14 }}
            />
            <button
              onClick={() => setStep(1)}
              disabled={!config.customFocus.trim()}
              className="w-full py-4 rounded-full font-bold btn-press"
              style={{
                background: config.customFocus.trim() ? '#6366f1' : '#1e1e2e',
                color: config.customFocus.trim() ? '#fff' : '#475569',
              }}
            >
              Continue →
            </button>
          </>
        )}
      </div>
    </div>,

    // Step 1 — Location
    <div key={1} className="flex flex-col gap-3">
      <div className="mb-2">
        <h2 className="font-bold" style={{ color: '#f8fafc', fontSize: 24, letterSpacing: '-0.02em' }}>
          Where are you training?
        </h2>
      </div>
      <div className="flex flex-col gap-2">
        {LOCATION_OPTIONS.map(opt => (
          <OptionCard
            key={opt.id}
            emoji={opt.emoji}
            label={opt.label}
            sub={opt.sub}
            selected={config.location === opt.id}
            onClick={() => { update('location', opt.id); setStep(2); }}
          />
        ))}
      </div>
    </div>,

    // Step 2 — Duration
    <div key={2} className="flex flex-col gap-5">
      <div>
        <h2 className="font-bold" style={{ color: '#f8fafc', fontSize: 24, letterSpacing: '-0.02em' }}>
          How long do you have?
        </h2>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Including warm-up and cool-down</p>
      </div>
      {/* Selected duration display */}
      <div className="text-center py-4">
        <span style={{ fontSize: 56, fontWeight: 800, color: '#6366f1', letterSpacing: '-0.03em' }}>
          {config.duration}
        </span>
        <span style={{ fontSize: 20, color: '#475569', marginLeft: 4 }}>min</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {DURATION_OPTIONS.map(mins => (
          <button
            key={mins}
            onClick={() => update('duration', mins)}
            className="py-3.5 rounded-2xl font-bold btn-press"
            style={{
              background: config.duration === mins ? '#6366f1' : '#111118',
              border: `1px solid ${config.duration === mins ? '#6366f1' : '#1e1e2e'}`,
              color: config.duration === mins ? '#fff' : '#94a3b8',
              fontSize: 16,
              transition: 'all 0.15s',
            }}
          >
            {mins}<span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2 }}>m</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setStep(3)}
        className="w-full py-4 rounded-full font-bold btn-press mt-2"
        style={{ background: '#6366f1', color: '#fff', fontSize: 16 }}
      >
        Continue →
      </button>
    </div>,

    // Step 3 — Energy + Avoid
    <div key={3} className="flex flex-col gap-5">
      <div>
        <h2 className="font-bold" style={{ color: '#f8fafc', fontSize: 24, letterSpacing: '-0.02em' }}>
          How are you feeling?
        </h2>
      </div>
      <div className="flex flex-col gap-2">
        {ENERGY_OPTIONS.map(opt => (
          <OptionCard
            key={opt.id}
            emoji={opt.emoji}
            label={opt.label}
            sub={opt.sub}
            selected={config.energy === opt.id}
            onClick={() => update('energy', opt.id)}
          />
        ))}
      </div>
      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>
          AREAS TO AVOID TODAY?
        </p>
        <div className="flex flex-wrap gap-2">
          {AVOID_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => toggleAvoid(chip)}
              className="px-3.5 py-2 rounded-full text-sm font-medium btn-press"
              style={{
                background: config.avoid.includes(chip) ? 'rgba(99,102,241,0.15)' : '#111118',
                border: `1px solid ${config.avoid.includes(chip) ? '#6366f1' : '#2d2d3d'}`,
                color: config.avoid.includes(chip) ? '#a5b4fc' : '#94a3b8',
                transition: 'all 0.15s',
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() => setStep(4)}
        disabled={!config.energy}
        className="w-full py-4 rounded-full font-bold btn-press"
        style={{
          background: config.energy ? '#6366f1' : '#1e1e2e',
          color: config.energy ? '#fff' : '#475569',
          fontSize: 16,
          transition: 'background 0.2s',
        }}
      >
        Continue →
      </button>
    </div>,

    // Step 4 — Notes
    <div key={4} className="flex flex-col gap-4">
      <div>
        <h2 className="font-bold" style={{ color: '#f8fafc', fontSize: 24, letterSpacing: '-0.02em' }}>
          Anything to tell your trainer?
        </h2>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: '#94a3b8' }}>
          Sore spots, exercises you hate, how you&apos;re really feeling today.
        </p>
      </div>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#111118', border: '1px solid #2d2d3d' }}
      >
        <textarea
          placeholder="e.g. left knee is a bit sore, skip heavy deadlifts today…"
          value={config.notes}
          onChange={e => update('notes', e.target.value.slice(0, 200))}
          rows={5}
          className="w-full px-4 py-4 outline-none resize-none"
          style={{ background: 'transparent', color: '#f8fafc', fontSize: 15, fontStyle: 'italic' }}
        />
        <div className="flex justify-between items-center px-4 py-2" style={{ borderTop: '1px solid #1e1e2e' }}>
          <span className="text-xs italic" style={{ color: '#475569' }}>Your trainer reads every note.</span>
          <span className="text-xs" style={{ color: '#475569' }}>{config.notes.length}/200</span>
        </div>
      </div>
      <button
        onClick={() => setStep(5)}
        className="w-full py-4 rounded-full font-bold btn-press"
        style={{ background: '#6366f1', color: '#fff', fontSize: 16 }}
      >
        Continue →
      </button>
    </div>,

    // Step 5 — Confirm
    <div key={5} className="flex flex-col gap-4">
      <div>
        <h2 className="font-bold" style={{ color: '#f8fafc', fontSize: 24, letterSpacing: '-0.02em' }}>
          Ready to generate?
        </h2>
      </div>

      {/* Recovery card */}
      {todayRecovery && (() => {
        const score = todayRecovery.recovery_score;
        const info = getScoreInfo(score);
        return (
          <div
            className="p-4 rounded-2xl"
            style={{ background: `${info.color}15`, border: `1px solid ${info.color}40` }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold" style={{ color: info.color, letterSpacing: '0.05em' }}>
                RECOVERY TODAY — {score}/100
              </p>
            </div>
            <p className="text-sm font-semibold" style={{ color: '#f8fafc' }}>{info.desc}</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
              {score <= 40 ? '35% volume reduction applied' :
               score <= 65 ? '15% volume reduction applied' :
               score >= 86 ? 'Peak day — pushing harder' : 'Standard workout'}
            </p>
            {score <= 65 && (
              <button
                onClick={() => setOverrideRecovery(v => !v)}
                className="mt-2 text-xs underline"
                style={{ color: overrideRecovery ? '#10b981' : '#94a3b8' }}
              >
                {overrideRecovery ? '✓ Override active — full workout' : 'Override: generate full workout anyway'}
              </button>
            )}
          </div>
        );
      })()}

      {/* Summary */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1e1e2e' }}>
        {[
          { label: 'Focus', value: FOCUS_OPTIONS.find(f => f.id === config.focus)?.label || config.customFocus },
          { label: 'Location', value: LOCATION_OPTIONS.find(l => l.id === config.location)?.label },
          { label: 'Duration', value: `${config.duration} minutes` },
          { label: 'Energy', value: ENERGY_OPTIONS.find(e => e.id === config.energy)?.label },
          config.avoid.length && !config.avoid.includes('Skip this') && { label: 'Avoiding', value: config.avoid.join(', ') },
          config.notes && { label: 'Your note', value: config.notes },
          { label: 'Goal', value: profile?.goal },
          { label: 'Experience', value: profile?.experience },
        ].filter(Boolean).map((row, i, arr) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3"
            style={{
              background: '#111118',
              borderBottom: i < arr.length - 1 ? '1px solid #1e1e2e' : 'none',
            }}
          >
            <span className="text-xs font-semibold w-20 flex-shrink-0 pt-0.5" style={{ color: '#475569', letterSpacing: '0.03em' }}>
              {row.label.toUpperCase()}
            </span>
            <span className="text-sm font-medium" style={{ color: '#f8fafc' }}>{row.value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={generate}
        className="w-full py-4 rounded-full font-bold text-base btn-press"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: '#fff',
          fontSize: 17,
        }}
      >
        Generate My Workout ⚡
      </button>
    </div>,
  ];

  const canGoNext = [
    () => config.focus && (config.focus !== 'custom' || config.customFocus.trim()),
    () => config.location,
    () => config.duration,
    () => config.energy,
    () => true,
    () => true,
  ][step]?.() ?? true;

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto" style={{ background: '#0a0a0f' }}>
      <StepHeader step={step} total={totalSteps} onBack={handleBack} />
      <div className="flex-1 px-5 py-5 overflow-y-auto">
        <div className="animate-fade-in">{steps[step]}</div>
      </div>
    </div>
  );
}
