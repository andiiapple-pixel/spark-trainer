import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Zap } from 'lucide-react';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import WorkoutDisplay from './WorkoutDisplay';
import { storage } from '../../../utils/storage';
import { useAuth } from '../../../auth/AuthContext';
import { generateWorkout } from '../../../api/anthropic';
import { useActiveWorkout } from '../../../context/ActiveWorkoutContext';
import { recovery as recoveryApi } from '../../../services/api';
import { getScoreInfo } from '../../recovery/RecoveryCheckin';

const FOCUS_OPTIONS = [
  { id: 'strength',  label: 'Strength & Muscle',      sub: 'Build size and power' },
  { id: 'cardio',    label: 'Fat Burn & Cardio',      sub: 'Burn calories, elevate heart rate' },
  { id: 'endurance', label: 'Endurance',              sub: 'Improve stamina and capacity' },
  { id: 'mobility',  label: 'Mobility & Recovery',    sub: 'Stretch, restore, de-stress' },
  { id: 'athletic',  label: 'Athletic Performance',   sub: 'Speed, power, agility' },
  { id: 'custom',    label: 'Custom',                  sub: "I'll tell you exactly what I want" },
];

const LOCATION_OPTIONS = [
  { id: 'gym',     label: 'Gym',             sub: 'Full equipment available' },
  { id: 'home',    label: 'Home',            sub: 'Bodyweight / limited kit' },
  { id: 'outdoors',label: 'Outdoors',        sub: 'Park, track, open space' },
  { id: 'hotel',   label: 'Hotel / Minimal', sub: 'Tight space, no equipment' },
];

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90];

const ENERGY_OPTIONS = [
  { id: 'tired',   label: 'Tired / Low energy',  sub: 'Light session, movement quality focus' },
  { id: 'average', label: 'Average energy',       sub: 'Moderate intensity is fine' },
  { id: 'good',    label: 'Feeling good',         sub: "Let's push today" },
  { id: 'great',   label: 'Feeling great',        sub: 'Full send — beast mode' },
];

const AVOID_CHIPS = ['Lower back', 'Knees', 'Shoulders', 'Wrists', 'Hips', 'Skip this'];

function StepHeader({ step, total, onBack }) {
  return (
    <div style={{ background: '#0A0A0A' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 12px' }}>
        <button
          onClick={onBack}
          className="btn-press"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, background: 'transparent',
            border: '1px solid #222222', borderRadius: 0,
            color: '#888888', cursor: 'pointer',
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: 3, color: '#555555', textTransform: 'uppercase' }}>
          {step + 1} / {total}
        </span>
      </div>
      <div style={{ height: 2, background: '#222222' }}>
        <div
          style={{
            height: '100%',
            width: `${((step + 1) / total) * 100}%`,
            background: '#E8FF00',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

function OptionCard({ label, sub, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className="btn-press"
      style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        width: '100%', textAlign: 'left',
        padding: 16, minHeight: 48,
        background: selected ? '#E8FF00' : 'transparent',
        border: `1px solid ${selected ? '#E8FF00' : '#222222'}`,
        borderRadius: 0, cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <div style={{
        fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500,
        color: selected ? '#000000' : '#FFFFFF',
      }}>
        {label}
      </div>
      {sub && (
        <div style={{
          fontFamily: "'Inter', sans-serif", fontSize: 12, marginTop: 2,
          color: selected ? 'rgba(0,0,0,0.5)' : '#555555',
        }}>
          {sub}
        </div>
      )}
    </button>
  );
}

export default function NewWorkout() {
  const navigate = useNavigate();
  const { profile: authProfile } = useAuth();
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
  const [confirmRedOverride, setConfirmRedOverride] = useState(false);

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
      const profile = authProfile || storage.getProfile();
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

  const profile = authProfile || storage.getProfile();

  if (loading) {
    return (
      <div
        className="flex flex-col min-h-screen max-w-[430px] mx-auto items-center justify-center gap-6 px-6"
        style={{ background: '#0A0A0A' }}
      >
        <Zap size={36} style={{ color: '#E8FF00' }} className="animate-pulse" />
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', marginBottom: 8 }}>
            Generating...
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#555555' }}>
            Your trainer is crafting something great.
          </p>
        </div>
        <div style={{ width: 192, height: 3, background: '#222222' }}>
          <div
            className="animate-pulse"
            style={{ width: '60%', height: '100%', background: '#E8FF00' }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen max-w-[430px] mx-auto" style={{ background: '#0A0A0A' }}>
        <div style={{ padding: '16px 24px' }}>
          <button
            onClick={() => setError(null)}
            className="btn-press"
            style={{ color: '#888888', background: 'none', border: 'none', cursor: 'pointer' }}
          >
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
    <div key={0} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', marginBottom: 12 }}>
        What&apos;s the focus?
      </h2>
      {FOCUS_OPTIONS.map(opt => (
        <OptionCard
          key={opt.id}
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
            style={{
              width: '100%', padding: '12px 16px', background: '#111111',
              border: '1px solid #222222', borderRadius: 0, color: '#FFFFFF',
              fontFamily: "'Inter', sans-serif", fontSize: 14, outline: 'none', resize: 'none',
            }}
          />
          <button
            onClick={() => setStep(1)}
            disabled={!config.customFocus.trim()}
            className="btn-press"
            style={{
              width: '100%', padding: '16px', border: 'none', cursor: 'pointer',
              fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 14,
              letterSpacing: 2, textTransform: 'uppercase',
              background: config.customFocus.trim() ? '#E8FF00' : '#222222',
              color: config.customFocus.trim() ? '#000000' : '#555555',
            }}
          >
            Continue →
          </button>
        </>
      )}
    </div>,

    // Step 1 — Location
    <div key={1} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', marginBottom: 12 }}>
        Where are you training?
      </h2>
      {LOCATION_OPTIONS.map(opt => (
        <OptionCard
          key={opt.id}
          label={opt.label}
          sub={opt.sub}
          selected={config.location === opt.id}
          onClick={() => { update('location', opt.id); setStep(2); }}
        />
      ))}
    </div>,

    // Step 2 — Duration
    <div key={2} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>
        How long?
      </h2>
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 56, fontWeight: 700, color: '#E8FF00' }}>
          {config.duration}
        </span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: '#555555', marginLeft: 4 }}>min</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: '#222222' }}>
        {DURATION_OPTIONS.map(mins => (
          <button
            key={mins}
            onClick={() => update('duration', mins)}
            className="btn-press"
            style={{
              padding: '14px', border: 'none', cursor: 'pointer',
              background: config.duration === mins ? '#E8FF00' : '#111111',
              color: config.duration === mins ? '#000000' : '#888888',
              fontFamily: "'Oswald', sans-serif", fontSize: 16, fontWeight: 700,
            }}
          >
            {mins}<span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2 }}>m</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setStep(3)}
        className="btn-press"
        style={{
          width: '100%', padding: '16px', border: 'none', cursor: 'pointer',
          background: '#E8FF00', color: '#000000',
          fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 14,
          letterSpacing: 2, textTransform: 'uppercase',
        }}
      >
        Continue →
      </button>
    </div>,

    // Step 3 — Energy + Avoid
    <div key={3} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>
        How are you feeling?
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ENERGY_OPTIONS.map(opt => (
          <OptionCard
            key={opt.id}
            label={opt.label}
            sub={opt.sub}
            selected={config.energy === opt.id}
            onClick={() => update('energy', opt.id)}
          />
        ))}
      </div>
      <div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: 2, color: '#555555', textTransform: 'uppercase', marginBottom: 8 }}>
          Areas to avoid today?
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {AVOID_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => toggleAvoid(chip)}
              className="btn-press"
              style={{
                padding: '8px 16px', cursor: 'pointer',
                fontFamily: "'Inter', sans-serif", fontSize: 12,
                background: config.avoid.includes(chip) ? '#E8FF00' : 'transparent',
                border: `1px solid ${config.avoid.includes(chip) ? '#E8FF00' : '#222222'}`,
                borderRadius: 0,
                color: config.avoid.includes(chip) ? '#000000' : '#888888',
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
        className="btn-press"
        style={{
          width: '100%', padding: '16px', border: 'none', cursor: 'pointer',
          fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 14,
          letterSpacing: 2, textTransform: 'uppercase',
          background: config.energy ? '#E8FF00' : '#222222',
          color: config.energy ? '#000000' : '#555555',
        }}
      >
        Continue →
      </button>
    </div>,

    // Step 4 — Notes
    <div key={4} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>
          Anything else?
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#888888', marginTop: 8, lineHeight: 1.5 }}>
          Sore spots, exercises you hate, how you&apos;re really feeling today.
        </p>
      </div>
      <div style={{ background: '#111111', border: '1px solid #222222' }}>
        <textarea
          placeholder="e.g. left knee is a bit sore, skip heavy deadlifts today..."
          value={config.notes}
          onChange={e => update('notes', e.target.value.slice(0, 200))}
          rows={5}
          style={{
            width: '100%', padding: 16, background: 'transparent', border: 'none',
            color: '#FFFFFF', fontFamily: "'Inter', sans-serif", fontSize: 15,
            outline: 'none', resize: 'none',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', borderTop: '1px solid #222222' }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#555555' }}>Your trainer reads every note.</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#555555' }}>{config.notes.length}/200</span>
        </div>
      </div>
      <button
        onClick={() => setStep(5)}
        className="btn-press"
        style={{
          width: '100%', padding: '16px', border: 'none', cursor: 'pointer',
          background: '#E8FF00', color: '#000000',
          fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 14,
          letterSpacing: 2, textTransform: 'uppercase',
        }}
      >
        Continue →
      </button>
    </div>,

    // Step 5 — Confirm
    <div key={5} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>
        Ready to generate?
      </h2>

      {/* Recovery card */}
      {todayRecovery && (() => {
        const score = todayRecovery.recovery_score;
        const info = getScoreInfo(score);
        return (
          <div style={{ borderLeft: '3px solid #E8FF00', padding: '12px 16px' }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: 2, color: '#E8FF00', textTransform: 'uppercase', marginBottom: 4 }}>
              Recovery Today — {score}/100
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: '#FFFFFF' }}>{info.desc}</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#888888', marginTop: 4 }}>
              {score <= 40 ? '35% volume reduction applied' :
               score <= 65 ? '15% volume reduction applied' :
               score >= 86 ? 'Peak day — pushing harder' : 'Standard workout'}
            </p>
            {score <= 65 && !confirmRedOverride && (
              <button
                onClick={() => {
                  if (overrideRecovery) {
                    setOverrideRecovery(false);
                  } else if (score <= 40) {
                    setConfirmRedOverride(true);
                  } else {
                    setOverrideRecovery(true);
                  }
                }}
                className="btn-press"
                style={{
                  marginTop: 8, background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif", fontSize: 11,
                  color: overrideRecovery ? '#22C55E' : '#555555',
                  textDecoration: 'underline',
                }}
              >
                {overrideRecovery ? 'Override active — full workout' : 'Override: generate full workout anyway'}
              </button>
            )}
            {confirmRedOverride && (
              <div style={{ marginTop: 8, padding: 12, border: '1px solid #EF4444', background: 'rgba(239,68,68,0.1)' }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#EF4444', marginBottom: 8, lineHeight: 1.4 }}>
                  Your recovery score is very low. Training at full intensity increases injury risk.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setConfirmRedOverride(false)}
                    className="btn-press"
                    style={{ flex: 1, padding: '8px 0', background: 'transparent', border: '1px solid #222222', borderRadius: 0, color: '#888888', fontFamily: "'Inter', sans-serif", fontSize: 11, cursor: 'pointer' }}
                  >
                    Keep reduction
                  </button>
                  <button
                    onClick={() => { setOverrideRecovery(true); setConfirmRedOverride(false); }}
                    className="btn-press"
                    style={{ flex: 1, padding: '8px 0', background: '#EF4444', border: 'none', borderRadius: 0, color: '#FFFFFF', fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Override anyway
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Summary */}
      <div style={{ border: '1px solid #222222' }}>
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
            style={{
              display: 'flex', alignItems: 'start', gap: 12, padding: '12px 16px',
              background: '#111111',
              borderBottom: i < arr.length - 1 ? '1px solid #222222' : 'none',
            }}
          >
            <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500,
              letterSpacing: 2, color: '#555555', textTransform: 'uppercase',
              width: 80, flexShrink: 0, paddingTop: 2,
            }}>
              {row.label}
            </span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: '#FFFFFF' }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={generate}
        className="btn-press"
        style={{
          width: '100%', padding: '18px', border: 'none', cursor: 'pointer',
          background: '#E8FF00', color: '#000000',
          fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 15,
          letterSpacing: 3, textTransform: 'uppercase',
        }}
      >
        Generate Workout →
      </button>
    </div>,
  ];

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto" style={{ background: '#0A0A0A' }}>
      <StepHeader step={step} total={totalSteps} onBack={handleBack} />
      <div className="flex-1 overflow-y-auto" style={{ padding: '20px 24px' }}>
        <div className="animate-fade-in">{steps[step]}</div>
      </div>
    </div>
  );
}
