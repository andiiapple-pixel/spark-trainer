import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, RefreshCw } from 'lucide-react';
import ScreenHeader from '../../shared/ScreenHeader';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import WorkoutDisplay from './WorkoutDisplay';
import { storage } from '../../../utils/storage';
import { generateWorkout } from '../../../api/anthropic';
import { useActiveWorkout } from '../../../context/ActiveWorkoutContext';

const FOCUS_OPTIONS = [
  { id: 'strength', emoji: '💪', label: 'Strength & Muscle', sub: 'Build size and power' },
  { id: 'cardio', emoji: '🔥', label: 'Fat Burn & Cardio', sub: 'Burn calories, elevate heart rate' },
  { id: 'endurance', emoji: '🏃', label: 'Endurance', sub: 'Improve stamina and capacity' },
  { id: 'mobility', emoji: '🧘', label: 'Mobility & Recovery', sub: 'Stretch, restore, de-stress' },
  { id: 'athletic', emoji: '⚡', label: 'Athletic Performance', sub: 'Speed, power, agility' },
  { id: 'custom', emoji: '🎯', label: 'Custom', sub: "I'll tell you exactly what I want" },
];

const LOCATION_OPTIONS = [
  { id: 'gym', emoji: '🏋️', label: 'Gym', sub: 'Full equipment available' },
  { id: 'home', emoji: '🏠', label: 'Home', sub: 'Bodyweight / limited kit' },
  { id: 'outdoors', emoji: '🌿', label: 'Outdoors', sub: 'Park, track, open space' },
  { id: 'hotel', emoji: '🏨', label: 'Hotel / Minimal', sub: 'Tight space, no equipment' },
];

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90];

const ENERGY_OPTIONS = [
  { id: 'tired', emoji: '😴', label: 'Tired / Low energy', sub: "Let's go easy" },
  { id: 'average', emoji: '😐', label: 'Average', sub: 'Moderate is fine' },
  { id: 'good', emoji: '💪', label: 'Good', sub: "Let's push" },
  { id: 'great', emoji: '🔥', label: 'Feeling great', sub: 'Beast mode activated' },
];

const AVOID_CHIPS = ['Lower back', 'Knees', 'Shoulders', 'Wrists', 'Hips', 'Skip this'];

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

  // Restore previously generated workout if navigating back to it
  useEffect(() => {
    if (ctx.status === 'generated' && ctx.workout) {
      setWorkout(ctx.workout);
    }
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
      const result = await generateWorkout(profile, sessionConfig, history.slice(0, 3));
      const w = { ...result, sessionConfig, generatedAt: new Date().toISOString() };
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
      <div className="flex flex-col min-h-screen max-w-[430px] mx-auto">
        <ScreenHeader title="Generating Workout" onBack={() => setStep(4)} />
        <LoadingState message="Your trainer is building your workout..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen max-w-[430px] mx-auto">
        <ScreenHeader title="Oops" onBack={() => setError(null)} />
        <ErrorState message={error} onRetry={generate} />
      </div>
    );
  }

  if (workout) {
    return (
      <WorkoutDisplay
        workout={workout}
        onStart={() => {
          ctx.startWorkout();
          navigate('/workout/active');
        }}
        onRegenerate={regenerate}
        onBack={() => setWorkout(null)}
      />
    );
  }

  const steps = [
    // Step 0 — Focus
    <div key={0} className="flex flex-col gap-3 animate-fade-in">
      <h2 className="text-xl font-bold px-4" style={{ color: '#f1f5f9' }}>What&apos;s the focus today?</h2>
      <div className="px-4 flex flex-col gap-2">
        {FOCUS_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => { update('focus', opt.id); setStep(1); }}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left btn-press transition-all"
            style={{
              background: config.focus === opt.id ? '#1e2d4a' : '#1e1e2a',
              border: `1px solid ${config.focus === opt.id ? '#3b82f6' : '#2a2a3a'}`,
            }}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <div className="flex-1">
              <div className="font-semibold" style={{ color: '#f1f5f9' }}>{opt.label}</div>
              <div className="text-xs" style={{ color: '#64748b' }}>{opt.sub}</div>
            </div>
          </button>
        ))}
        {config.focus === 'custom' && (
          <textarea
            autoFocus
            placeholder="e.g. chest and triceps, moderate intensity, no barbells..."
            value={config.customFocus}
            onChange={e => update('customFocus', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none mt-1"
            style={{ background: '#1e1e2a', border: '1px solid #3b82f6', color: '#f1f5f9' }}
          />
        )}
      </div>
    </div>,

    // Step 1 — Location
    <div key={1} className="flex flex-col gap-3 animate-fade-in">
      <h2 className="text-xl font-bold px-4" style={{ color: '#f1f5f9' }}>Where are you training?</h2>
      <div className="px-4 flex flex-col gap-2">
        {LOCATION_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => { update('location', opt.id); setStep(2); }}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left btn-press transition-all"
            style={{
              background: config.location === opt.id ? '#1e2d4a' : '#1e1e2a',
              border: `1px solid ${config.location === opt.id ? '#3b82f6' : '#2a2a3a'}`,
            }}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <div>
              <div className="font-semibold" style={{ color: '#f1f5f9' }}>{opt.label}</div>
              <div className="text-xs" style={{ color: '#64748b' }}>{opt.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </div>,

    // Step 2 — Duration
    <div key={2} className="flex flex-col gap-4 animate-fade-in px-4">
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>How long do you have?</h2>
        <p className="text-xs mt-1" style={{ color: '#64748b' }}>Including warm-up and cool-down</p>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {DURATION_OPTIONS.map(mins => (
          <button
            key={mins}
            onClick={() => update('duration', mins)}
            className="py-4 rounded-xl font-bold text-lg btn-press transition-all"
            style={{
              background: config.duration === mins ? '#3b82f6' : '#1e1e2a',
              border: `1px solid ${config.duration === mins ? '#3b82f6' : '#2a2a3a'}`,
              color: config.duration === mins ? '#fff' : '#94a3b8',
            }}
          >
            {mins}
            <span className="text-sm font-normal"> min</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setStep(3)}
        disabled={!config.duration}
        className="w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 btn-press mt-2"
        style={{ background: '#3b82f6', color: '#fff' }}
      >
        Continue <ChevronRight size={18} />
      </button>
    </div>,

    // Step 3 — Energy + Avoid
    <div key={3} className="flex flex-col gap-5 animate-fade-in px-4">
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>How are you feeling today?</h2>
      </div>
      <div className="flex flex-col gap-2">
        {ENERGY_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => update('energy', opt.id)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left btn-press transition-all"
            style={{
              background: config.energy === opt.id ? '#1e2d4a' : '#1e1e2a',
              border: `1px solid ${config.energy === opt.id ? '#3b82f6' : '#2a2a3a'}`,
            }}
          >
            <span className="text-xl">{opt.emoji}</span>
            <div>
              <div className="font-semibold" style={{ color: '#f1f5f9' }}>{opt.label}</div>
              <div className="text-xs" style={{ color: '#64748b' }}>{opt.sub}</div>
            </div>
          </button>
        ))}
      </div>
      <div>
        <p className="text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>Any areas to avoid today?</p>
        <div className="flex flex-wrap gap-2">
          {AVOID_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => toggleAvoid(chip)}
              className="px-3 py-1.5 rounded-full text-sm btn-press transition-all"
              style={{
                background: config.avoid.includes(chip) ? '#7c3aed' : '#1e1e2a',
                border: `1px solid ${config.avoid.includes(chip) ? '#7c3aed' : '#2a2a3a'}`,
                color: config.avoid.includes(chip) ? '#fff' : '#94a3b8',
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
        className="w-full py-3.5 rounded-xl font-semibold btn-press"
        style={{
          background: config.energy ? '#3b82f6' : '#1e1e2a',
          color: config.energy ? '#fff' : '#475569',
          border: config.energy ? 'none' : '1px solid #2a2a3a',
        }}
      >
        Continue <ChevronRight size={18} className="inline ml-1" />
      </button>
    </div>,

    // Step 4 — Notes
    <div key={4} className="flex flex-col gap-4 animate-fade-in px-4">
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Anything else to tell your trainer?</h2>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>
          Sore spots, exercises you hate, how you&apos;re really feeling. Your trainer reads everything.
        </p>
      </div>
      <textarea
        placeholder="e.g. my left knee is sore, skip deadlifts today, feeling stressed, lower back was tight yesterday..."
        value={config.notes}
        onChange={e => update('notes', e.target.value.slice(0, 200))}
        rows={4}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
        style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#f1f5f9' }}
      />
      <div className="flex justify-between items-center">
        <span className="text-xs" style={{ color: '#475569' }}>{config.notes.length}/200</span>
        <span className="text-xs" style={{ color: '#475569' }}>Optional — skip if nothing to add</span>
      </div>
      <button
        onClick={() => setStep(5)}
        className="w-full py-3.5 rounded-xl font-semibold btn-press"
        style={{ background: '#3b82f6', color: '#fff' }}
      >
        Continue <ChevronRight size={18} className="inline ml-1" />
      </button>
    </div>,

    // Step 5 — Confirm
    <div key={5} className="flex flex-col gap-4 animate-fade-in px-4">
      <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Ready to go?</h2>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2a3a' }}>
        {[
          { label: 'Focus', value: FOCUS_OPTIONS.find(f => f.id === config.focus)?.label || config.customFocus },
          { label: 'Location', value: LOCATION_OPTIONS.find(l => l.id === config.location)?.label },
          { label: 'Duration', value: `${config.duration} minutes` },
          { label: 'Energy', value: ENERGY_OPTIONS.find(e => e.id === config.energy)?.label },
          config.avoid.length && !config.avoid.includes('Skip this') && {
            label: 'Avoiding', value: config.avoid.join(', '),
          },
          config.notes && { label: 'Your note', value: config.notes },
          { label: 'Goal', value: profile?.goal },
          { label: 'Experience', value: profile?.experience },
        ].filter(Boolean).map((row, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3"
            style={{ borderBottom: i < 5 ? '1px solid #1a1a24' : 'none', background: '#1e1e2a' }}
          >
            <span className="text-xs w-24 flex-shrink-0 pt-0.5" style={{ color: '#64748b' }}>{row.label}</span>
            <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{row.value}</span>
          </div>
        ))}
      </div>
      <button
        onClick={generate}
        className="w-full py-4 rounded-xl font-bold text-lg btn-press"
        style={{ background: '#3b82f6', color: '#fff' }}
      >
        Generate My Workout 🚀
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
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-8">
      <ScreenHeader
        title="New Workout"
        progress={(step + 1) / totalSteps}
        onBack={step === 0 ? undefined : () => setStep(s => s - 1)}
      />
      <div className="flex-1 py-4">
        {steps[step]}
      </div>
    </div>
  );
}
