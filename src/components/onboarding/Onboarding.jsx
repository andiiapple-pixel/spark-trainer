import { useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { storage } from '../../utils/storage';

const GOALS = [
  { id: 'muscle', emoji: '💪', label: 'Build muscle & strength' },
  { id: 'fat_loss', emoji: '🔥', label: 'Lose fat & get lean' },
  { id: 'endurance', emoji: '🏃', label: 'Improve endurance & fitness' },
  { id: 'recomp', emoji: '⚖️', label: 'Body recomposition' },
  { id: 'sport', emoji: '🏆', label: 'Train for an event or sport' },
  { id: 'health', emoji: '💆', label: 'General health & wellbeing' },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Complete beginner', sub: 'New to structured training' },
  { id: 'novice', label: 'Some experience', sub: '6–24 months' },
  { id: 'intermediate', label: 'Intermediate', sub: '2–4 years' },
  { id: 'advanced', label: 'Advanced', sub: '4+ years' },
];

const INJURY_CHIPS = ['Lower back', 'Knees', 'Shoulders', 'Wrists', 'Hips', 'Neck', 'Ankles', 'None'];

const EQUIPMENT_OPTIONS = [
  { id: 'full_gym', emoji: '🏋️', label: 'Full gym access', sub: 'Barbells, machines, cables' },
  { id: 'home_gym', emoji: '🏠', label: 'Home gym', sub: 'Select what you have' },
  { id: 'bodyweight', emoji: '🤸', label: 'Bodyweight only', sub: 'No equipment needed' },
  { id: 'bands', emoji: '🎽', label: 'Resistance bands', sub: 'Bands + bodyweight' },
  { id: 'dumbbells', emoji: '🏋️', label: 'Dumbbells only', sub: 'Dumbbell set at home' },
];

const SLEEP_OPTIONS = ['Poor (< 6hrs)', 'Fair (6-7hrs)', 'Good (7-8hrs)', 'Great (8+hrs)'];
const STRESS_OPTIONS = ['Low', 'Moderate', 'High', 'Very high'];
const DIET_OPTIONS = ['Standard / no restrictions', 'Vegetarian', 'Vegan', 'High protein', 'Keto / Low carb', 'Intermittent fasting'];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    name: '', age: '', sex: '',
    heightCm: '', weightKg: '',
    goal: '', experience: '',
    injuries: [], injuryNotes: '',
    equipment: '', homeEquipment: [],
    daysPerWeek: 3, sessionLength: 45,
    sleep: '', stress: '', diet: '',
  });

  const totalSteps = 8;

  function update(field, value) {
    setProfile(p => ({ ...p, [field]: value }));
  }

  function toggleChip(arr, value) {
    if (arr.includes(value)) return arr.filter(v => v !== value);
    if (value === 'None') return ['None'];
    return [...arr.filter(v => v !== 'None'), value];
  }

  function handleComplete() {
    const finalProfile = {
      ...profile,
      createdAt: new Date().toISOString(),
    };
    storage.setProfile(finalProfile);
    if (onComplete) onComplete(finalProfile);
  }

  const steps = [
    // Step 0: Name, age, sex
    <div key={0} className="flex flex-col gap-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9' }}>Let's get to know you 👋</h1>
        <p className="text-sm" style={{ color: '#64748b' }}>Your trainer needs a few basics to get started.</p>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#94a3b8' }}>First name</label>
          <input
            type="text"
            placeholder="e.g. Alex"
            value={profile.name}
            onChange={e => update('name', e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-base outline-none"
            style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#f1f5f9' }}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1.5 block" style={{ color: '#94a3b8' }}>Age</label>
            <input
              type="number"
              placeholder="25"
              value={profile.age}
              onChange={e => update('age', e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-base outline-none"
              style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#f1f5f9' }}
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-1.5 block" style={{ color: '#94a3b8' }}>Sex</label>
            <div className="flex gap-2">
              {['Male', 'Female', 'Other'].map(s => (
                <button
                  key={s}
                  onClick={() => update('sex', s)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium btn-press transition-all"
                  style={{
                    background: profile.sex === s ? '#3b82f6' : '#1e1e2a',
                    border: `1px solid ${profile.sex === s ? '#3b82f6' : '#2a2a3a'}`,
                    color: profile.sex === s ? '#fff' : '#94a3b8',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,

    // Step 1: Height + weight
    <div key={1} className="flex flex-col gap-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9' }}>Body stats</h1>
        <p className="text-sm" style={{ color: '#64748b' }}>Used to calculate your training loads and calorie estimates.</p>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#94a3b8' }}>Height (cm)</label>
          <input
            type="number"
            placeholder="175"
            value={profile.heightCm}
            onChange={e => update('heightCm', e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-base outline-none"
            style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#f1f5f9' }}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#94a3b8' }}>Weight (kg)</label>
          <input
            type="number"
            placeholder="75"
            value={profile.weightKg}
            onChange={e => update('weightKg', e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-base outline-none"
            style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#f1f5f9' }}
          />
        </div>
      </div>
    </div>,

    // Step 2: Goal
    <div key={2} className="flex flex-col gap-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9' }}>What's your main goal?</h1>
        <p className="text-sm" style={{ color: '#64748b' }}>This shapes everything your trainer builds for you.</p>
      </div>
      <div className="flex flex-col gap-2">
        {GOALS.map(g => (
          <button
            key={g.id}
            onClick={() => update('goal', g.id)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left btn-press transition-all"
            style={{
              background: profile.goal === g.id ? '#1e3a5f' : '#1e1e2a',
              border: `1px solid ${profile.goal === g.id ? '#3b82f6' : '#2a2a3a'}`,
            }}
          >
            <span className="text-xl">{g.emoji}</span>
            <span className="font-medium" style={{ color: '#f1f5f9' }}>{g.label}</span>
            {profile.goal === g.id && <Check size={16} className="ml-auto" style={{ color: '#3b82f6' }} />}
          </button>
        ))}
      </div>
    </div>,

    // Step 3: Experience
    <div key={3} className="flex flex-col gap-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9' }}>Training experience</h1>
        <p className="text-sm" style={{ color: '#64748b' }}>Be honest — it helps your trainer set the right intensity.</p>
      </div>
      <div className="flex flex-col gap-2">
        {EXPERIENCE_LEVELS.map(e => (
          <button
            key={e.id}
            onClick={() => update('experience', e.id)}
            className="flex items-center gap-3 px-4 py-4 rounded-xl text-left btn-press transition-all"
            style={{
              background: profile.experience === e.id ? '#1e3a5f' : '#1e1e2a',
              border: `1px solid ${profile.experience === e.id ? '#3b82f6' : '#2a2a3a'}`,
            }}
          >
            <div className="flex-1">
              <div className="font-medium" style={{ color: '#f1f5f9' }}>{e.label}</div>
              <div className="text-sm" style={{ color: '#64748b' }}>{e.sub}</div>
            </div>
            {profile.experience === e.id && <Check size={16} style={{ color: '#3b82f6' }} />}
          </button>
        ))}
      </div>
    </div>,

    // Step 4: Injuries
    <div key={4} className="flex flex-col gap-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9' }}>Any injuries or limitations?</h1>
        <p className="text-sm" style={{ color: '#64748b' }}>Your trainer will always work around these. Be specific.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {INJURY_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => update('injuries', toggleChip(profile.injuries, chip))}
            className="px-4 py-2 rounded-full text-sm font-medium btn-press transition-all"
            style={{
              background: profile.injuries.includes(chip) ? '#7c3aed' : '#1e1e2a',
              border: `1px solid ${profile.injuries.includes(chip) ? '#7c3aed' : '#2a2a3a'}`,
              color: profile.injuries.includes(chip) ? '#fff' : '#94a3b8',
            }}
          >
            {chip}
          </button>
        ))}
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block" style={{ color: '#94a3b8' }}>Tell me more (optional)</label>
        <textarea
          placeholder="e.g. herniated disc L4/L5, left knee ACL surgery 2 years ago..."
          value={profile.injuryNotes}
          onChange={e => update('injuryNotes', e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#f1f5f9' }}
        />
      </div>
    </div>,

    // Step 5: Equipment
    <div key={5} className="flex flex-col gap-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9' }}>Equipment access</h1>
        <p className="text-sm" style={{ color: '#64748b' }}>What do you normally train with?</p>
      </div>
      <div className="flex flex-col gap-2">
        {EQUIPMENT_OPTIONS.map(e => (
          <button
            key={e.id}
            onClick={() => update('equipment', e.id)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left btn-press transition-all"
            style={{
              background: profile.equipment === e.id ? '#1e3a5f' : '#1e1e2a',
              border: `1px solid ${profile.equipment === e.id ? '#3b82f6' : '#2a2a3a'}`,
            }}
          >
            <span className="text-xl">{e.emoji}</span>
            <div className="flex-1">
              <div className="font-medium" style={{ color: '#f1f5f9' }}>{e.label}</div>
              <div className="text-xs" style={{ color: '#64748b' }}>{e.sub}</div>
            </div>
            {profile.equipment === e.id && <Check size={16} style={{ color: '#3b82f6' }} />}
          </button>
        ))}
      </div>
    </div>,

    // Step 6: Schedule
    <div key={6} className="flex flex-col gap-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9' }}>Your training schedule</h1>
        <p className="text-sm" style={{ color: '#64748b' }}>How often can you realistically commit?</p>
      </div>
      <div>
        <label className="text-sm font-medium mb-3 block" style={{ color: '#94a3b8' }}>Days per week</label>
        <div className="flex gap-2">
          {[2, 3, 4, 5, 6].map(d => (
            <button
              key={d}
              onClick={() => update('daysPerWeek', d)}
              className="flex-1 py-3 rounded-xl font-bold text-lg btn-press transition-all"
              style={{
                background: profile.daysPerWeek === d ? '#3b82f6' : '#1e1e2a',
                border: `1px solid ${profile.daysPerWeek === d ? '#3b82f6' : '#2a2a3a'}`,
                color: profile.daysPerWeek === d ? '#fff' : '#94a3b8',
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-3 block" style={{ color: '#94a3b8' }}>
          Preferred session length
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[30, 45, 60, 75, 90].map(mins => (
            <button
              key={mins}
              onClick={() => update('sessionLength', mins)}
              className="py-3 rounded-xl font-medium text-sm btn-press transition-all"
              style={{
                background: profile.sessionLength === mins ? '#3b82f6' : '#1e1e2a',
                border: `1px solid ${profile.sessionLength === mins ? '#3b82f6' : '#2a2a3a'}`,
                color: profile.sessionLength === mins ? '#fff' : '#94a3b8',
              }}
            >
              {mins} min
            </button>
          ))}
        </div>
      </div>
    </div>,

    // Step 7: Lifestyle
    <div key={7} className="flex flex-col gap-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9' }}>Lifestyle context</h1>
        <p className="text-sm" style={{ color: '#64748b' }}>All optional — helps your trainer understand the full picture.</p>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block" style={{ color: '#94a3b8' }}>Sleep quality</label>
        <div className="grid grid-cols-2 gap-2">
          {SLEEP_OPTIONS.map(s => (
            <button key={s} onClick={() => update('sleep', s)}
              className="py-2.5 px-3 rounded-xl text-xs font-medium btn-press transition-all text-left"
              style={{
                background: profile.sleep === s ? '#1e3a5f' : '#1e1e2a',
                border: `1px solid ${profile.sleep === s ? '#3b82f6' : '#2a2a3a'}`,
                color: profile.sleep === s ? '#93c5fd' : '#94a3b8',
              }}
            >{s}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block" style={{ color: '#94a3b8' }}>Stress level</label>
        <div className="flex gap-2">
          {STRESS_OPTIONS.map(s => (
            <button key={s} onClick={() => update('stress', s)}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium btn-press transition-all"
              style={{
                background: profile.stress === s ? '#1e3a5f' : '#1e1e2a',
                border: `1px solid ${profile.stress === s ? '#3b82f6' : '#2a2a3a'}`,
                color: profile.stress === s ? '#93c5fd' : '#94a3b8',
              }}
            >{s}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block" style={{ color: '#94a3b8' }}>Diet style</label>
        <div className="flex flex-wrap gap-2">
          {DIET_OPTIONS.map(d => (
            <button key={d} onClick={() => update('diet', d)}
              className="px-3 py-2 rounded-full text-xs font-medium btn-press transition-all"
              style={{
                background: profile.diet === d ? '#1e3a5f' : '#1e1e2a',
                border: `1px solid ${profile.diet === d ? '#3b82f6' : '#2a2a3a'}`,
                color: profile.diet === d ? '#93c5fd' : '#94a3b8',
              }}
            >{d}</button>
          ))}
        </div>
      </div>
    </div>,
  ];

  const canProceed = [
    () => profile.name.trim() && profile.age && profile.sex,
    () => profile.heightCm && profile.weightKg,
    () => profile.goal,
    () => profile.experience,
    () => true, // injuries optional
    () => profile.equipment,
    () => profile.daysPerWeek && profile.sessionLength,
    () => true, // lifestyle optional
  ][step]?.() ?? true;

  const isLast = step === totalSteps - 1;

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto px-4">
      {/* Progress */}
      <div className="pt-12 pb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs" style={{ color: '#64748b' }}>Step {step + 1} of {totalSteps}</span>
          <span className="text-xs" style={{ color: '#64748b' }}>
            {Math.round(((step + 1) / totalSteps) * 100)}% complete
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e2a' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / totalSteps) * 100}%`, background: '#3b82f6' }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 py-4">
        {steps[step]}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pb-8 pt-4">
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="px-5 py-3.5 rounded-xl font-semibold flex items-center gap-2 btn-press"
            style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#94a3b8' }}
          >
            <ChevronLeft size={18} />
            Back
          </button>
        )}
        <button
          onClick={() => isLast ? handleComplete() : setStep(s => s + 1)}
          disabled={!canProceed}
          className="flex-1 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 btn-press transition-all"
          style={{
            background: canProceed ? '#3b82f6' : '#1e1e2a',
            color: canProceed ? '#fff' : '#475569',
            border: canProceed ? 'none' : '1px solid #2a2a3a',
          }}
        >
          {isLast ? (
            <>You&apos;re all set — let&apos;s go! 🚀</>
          ) : (
            <>Continue <ChevronRight size={18} /></>
          )}
        </button>
      </div>
    </div>
  );
}
