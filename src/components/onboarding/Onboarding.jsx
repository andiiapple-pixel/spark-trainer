import { useState } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import { storage } from '../../utils/storage';
import { data as dataApi } from '../../services/api';
import { useAuth } from '../../auth/AuthContext';

const GOALS = [
  { id: 'muscle',    emoji: '💪', label: 'Build muscle & strength',    sub: 'Progressive overload, hypertrophy focus' },
  { id: 'fat_loss',  emoji: '🔥', label: 'Lose fat & get lean',        sub: 'Calorie burn, metabolic training' },
  { id: 'endurance', emoji: '🏃', label: 'Improve endurance',          sub: 'Stamina, cardiovascular fitness' },
  { id: 'recomp',    emoji: '⚖️', label: 'Body recomposition',         sub: 'Lose fat and build muscle simultaneously' },
  { id: 'sport',     emoji: '🏆', label: 'Train for a sport or event', sub: 'Performance, power, agility' },
  { id: 'health',    emoji: '💆', label: 'General health & wellbeing',  sub: 'Balanced, sustainable fitness' },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner',     emoji: '🌱', label: 'Complete beginner',     sub: 'New to structured training' },
  { id: 'novice',       emoji: '📈', label: 'Some experience',       sub: "I know the basics, 6–24 months in" },
  { id: 'intermediate', emoji: '💪', label: 'Intermediate',          sub: "I know what I'm doing — 2–4 years" },
  { id: 'advanced',     emoji: '🏆', label: 'Advanced',              sub: "I've been training seriously for years" },
];

const INJURY_CHIPS = ['Lower back', 'Knees', 'Shoulders', 'Wrists', 'Hips', 'Neck', 'Ankles', 'None'];

const EQUIPMENT_OPTIONS = [
  { id: 'full_gym',   emoji: '🏋️', label: 'Full gym access',   sub: 'Barbells, machines, cables — the works' },
  { id: 'home_gym',   emoji: '🏠', label: 'Home gym',          sub: 'Select your available equipment' },
  { id: 'bodyweight', emoji: '🤸', label: 'Bodyweight only',   sub: 'Zero equipment, maximum effort' },
  { id: 'bands',      emoji: '🎽', label: 'Resistance bands',  sub: 'Bands plus bodyweight movements' },
  { id: 'dumbbells',  emoji: '🏋️', label: 'Dumbbells only',    sub: 'Dumbbell set — full workout capability' },
];

const SLEEP_OPTIONS = ['Poor (< 6hrs)', 'Fair (6-7hrs)', 'Good (7-8hrs)', 'Great (8+hrs)'];
const STRESS_OPTIONS = ['Low', 'Moderate', 'High', 'Very high'];
const DIET_OPTIONS = ['Standard / no restrictions', 'Vegetarian', 'Vegan', 'High protein', 'Keto / Low carb', 'Intermittent fasting'];

// Shared selection card component
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
      <span style={{ fontSize: 24, flexShrink: 0 }}>{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm" style={{ color: '#f8fafc' }}>{label}</div>
        {sub && <div className="text-xs mt-0.5 leading-snug" style={{ color: '#94a3b8' }}>{sub}</div>}
      </div>
      <div
        className="flex-shrink-0 rounded-full flex items-center justify-center"
        style={{
          width: 22,
          height: 22,
          background: selected ? '#6366f1' : 'transparent',
          border: `2px solid ${selected ? '#6366f1' : '#2d2d3d'}`,
          transition: 'all 0.15s',
        }}
      >
        {selected && <Check size={12} color="#fff" strokeWidth={3} />}
      </div>
    </button>
  );
}

export default function Onboarding({ onComplete }) {
  const { setProfile: setAuthProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);
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

  async function handleComplete() {
    setCompleting(true);
    const finalProfile = { ...profile, createdAt: new Date().toISOString() };
    storage.setProfile(finalProfile);
    try {
      const payload = {
        full_name: finalProfile.name || null,
        age: finalProfile.age ? Number(finalProfile.age) : null,
        biological_sex: finalProfile.sex || null,
        height_cm: finalProfile.heightCm ? Number(finalProfile.heightCm) : null,
        weight_kg: finalProfile.weightKg ? Number(finalProfile.weightKg) : null,
        fitness_goal: finalProfile.goal || null,
        experience_level: finalProfile.experience || null,
        injuries: JSON.stringify(Array.isArray(finalProfile.injuries) ? finalProfile.injuries : []),
        equipment_access: finalProfile.equipment || null,
        training_days_per_week: finalProfile.daysPerWeek || null,
        preferred_session_mins: finalProfile.sessionLength || null,
        sleep_quality: finalProfile.sleep || null,
        stress_level: finalProfile.stress || null,
        diet_style: finalProfile.diet || null,
        extra_data: {
          name: finalProfile.name || null,
          injuryNotes: finalProfile.injuryNotes || null,
          homeEquipment: finalProfile.homeEquipment || [],
          createdAt: finalProfile.createdAt,
        },
      };
      const { profile: saved } = await dataApi.saveProfile(payload);
      if (saved) setAuthProfile(saved);
    } catch (err) {
      // API failure must not block navigation
    } finally {
      setCompleting(false);
      if (onComplete) onComplete(finalProfile);
    }
  }

  const steps = [
    // Step 0: Name, age, sex
    {
      heading: "Let's get to know you",
      sub: 'Your trainer needs a few basics to personalise everything.',
      content: (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>FIRST NAME</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Alex"
              value={profile.name}
              onChange={e => update('name', e.target.value)}
              className="w-full px-4 rounded-xl outline-none"
              style={{
                background: '#111118',
                border: '1px solid #2d2d3d',
                color: '#f8fafc',
                fontSize: 16,
                height: 52,
              }}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold mb-2 block" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>AGE</label>
              <input
                type="number"
                placeholder="25"
                value={profile.age}
                onChange={e => update('age', e.target.value)}
                className="w-full px-4 rounded-xl outline-none"
                style={{
                  background: '#111118',
                  border: '1px solid #2d2d3d',
                  color: '#f8fafc',
                  fontSize: 16,
                  height: 52,
                }}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold mb-2 block" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>SEX</label>
              <div className="flex gap-1.5">
                {['M', 'F', 'X'].map((s, i) => {
                  const label = ['Male', 'Female', 'Other'][i];
                  return (
                    <button
                      key={s}
                      onClick={() => update('sex', label)}
                      className="flex-1 rounded-xl font-semibold btn-press"
                      style={{
                        background: profile.sex === label ? '#6366f1' : '#111118',
                        border: `1px solid ${profile.sex === label ? '#6366f1' : '#2d2d3d'}`,
                        color: profile.sex === label ? '#fff' : '#94a3b8',
                        height: 52,
                        fontSize: 13,
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Step 1: Height + weight
    {
      heading: 'Body stats',
      sub: 'Used to calculate training loads and calorie estimates.',
      content: (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>HEIGHT (cm)</label>
            <input
              type="number"
              placeholder="175"
              value={profile.heightCm}
              onChange={e => update('heightCm', e.target.value)}
              className="w-full px-4 rounded-xl outline-none"
              style={{
                background: '#111118',
                border: '1px solid #2d2d3d',
                color: '#f8fafc',
                fontSize: 16,
                height: 52,
              }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>WEIGHT (kg)</label>
            <input
              type="number"
              placeholder="75"
              value={profile.weightKg}
              onChange={e => update('weightKg', e.target.value)}
              className="w-full px-4 rounded-xl outline-none"
              style={{
                background: '#111118',
                border: '1px solid #2d2d3d',
                color: '#f8fafc',
                fontSize: 16,
                height: 52,
              }}
            />
          </div>
        </div>
      ),
    },

    // Step 2: Goal
    {
      heading: "What's your main goal?",
      sub: 'This shapes every workout your trainer builds for you.',
      content: (
        <div className="flex flex-col gap-2">
          {GOALS.map(g => (
            <OptionCard
              key={g.id}
              emoji={g.emoji}
              label={g.label}
              sub={g.sub}
              selected={profile.goal === g.id}
              onClick={() => update('goal', g.id)}
            />
          ))}
        </div>
      ),
    },

    // Step 3: Experience
    {
      heading: 'Training experience',
      sub: "Be honest — it helps your trainer set the right intensity.",
      content: (
        <div className="flex flex-col gap-2">
          {EXPERIENCE_LEVELS.map(e => (
            <OptionCard
              key={e.id}
              emoji={e.emoji}
              label={e.label}
              sub={e.sub}
              selected={profile.experience === e.id}
              onClick={() => update('experience', e.id)}
            />
          ))}
        </div>
      ),
    },

    // Step 4: Injuries
    {
      heading: 'Any injuries or limitations?',
      sub: 'Your trainer will always work around these.',
      content: (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {INJURY_CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => update('injuries', toggleChip(profile.injuries, chip))}
                className="px-4 py-2.5 rounded-full text-sm font-medium btn-press"
                style={{
                  background: profile.injuries.includes(chip) ? 'rgba(99,102,241,0.15)' : '#111118',
                  border: `1px solid ${profile.injuries.includes(chip) ? '#6366f1' : '#2d2d3d'}`,
                  color: profile.injuries.includes(chip) ? '#a5b4fc' : '#94a3b8',
                  transition: 'all 0.15s',
                }}
              >
                {chip}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>MORE DETAIL (optional)</label>
            <textarea
              placeholder="e.g. herniated disc L4/L5, left knee ACL surgery 2 years ago..."
              value={profile.injuryNotes}
              onChange={e => update('injuryNotes', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl outline-none resize-none"
              style={{
                background: '#111118',
                border: '1px solid #2d2d3d',
                color: '#f8fafc',
                fontSize: 14,
              }}
            />
          </div>
        </div>
      ),
    },

    // Step 5: Equipment
    {
      heading: 'Equipment access',
      sub: 'What do you normally train with?',
      content: (
        <div className="flex flex-col gap-2">
          {EQUIPMENT_OPTIONS.map(e => (
            <OptionCard
              key={e.id}
              emoji={e.emoji}
              label={e.label}
              sub={e.sub}
              selected={profile.equipment === e.id}
              onClick={() => update('equipment', e.id)}
            />
          ))}
        </div>
      ),
    },

    // Step 6: Schedule
    {
      heading: 'Your training schedule',
      sub: 'How often can you realistically commit?',
      content: (
        <div className="flex flex-col gap-6">
          <div>
            <label className="text-xs font-semibold mb-3 block" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>DAYS PER WEEK</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map(d => (
                <button
                  key={d}
                  onClick={() => update('daysPerWeek', d)}
                  className="flex-1 rounded-xl font-bold btn-press"
                  style={{
                    height: 52,
                    fontSize: 20,
                    background: profile.daysPerWeek === d ? '#6366f1' : '#111118',
                    border: `1px solid ${profile.daysPerWeek === d ? '#6366f1' : '#2d2d3d'}`,
                    color: profile.daysPerWeek === d ? '#fff' : '#94a3b8',
                    transition: 'all 0.15s',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-3 block" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>SESSION LENGTH</label>
            <div className="grid grid-cols-3 gap-2">
              {[30, 45, 60, 75, 90].map(mins => (
                <button
                  key={mins}
                  onClick={() => update('sessionLength', mins)}
                  className="py-3 rounded-xl font-semibold text-sm btn-press"
                  style={{
                    background: profile.sessionLength === mins ? '#6366f1' : '#111118',
                    border: `1px solid ${profile.sessionLength === mins ? '#6366f1' : '#2d2d3d'}`,
                    color: profile.sessionLength === mins ? '#fff' : '#94a3b8',
                    transition: 'all 0.15s',
                  }}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },

    // Step 7: Lifestyle
    {
      heading: 'Lifestyle context',
      sub: 'All optional — helps your trainer see the full picture.',
      content: (
        <div className="flex flex-col gap-5">
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>SLEEP QUALITY</label>
            <div className="grid grid-cols-2 gap-2">
              {SLEEP_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => update('sleep', s)}
                  className="py-3 px-3 rounded-xl text-sm font-medium btn-press text-left"
                  style={{
                    background: profile.sleep === s ? 'rgba(99,102,241,0.12)' : '#111118',
                    border: `1px solid ${profile.sleep === s ? '#6366f1' : '#2d2d3d'}`,
                    color: profile.sleep === s ? '#a5b4fc' : '#94a3b8',
                    transition: 'all 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>STRESS LEVEL</label>
            <div className="flex gap-2">
              {STRESS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => update('stress', s)}
                  className="flex-1 py-3 rounded-xl text-xs font-medium btn-press"
                  style={{
                    background: profile.stress === s ? 'rgba(99,102,241,0.12)' : '#111118',
                    border: `1px solid ${profile.stress === s ? '#6366f1' : '#2d2d3d'}`,
                    color: profile.stress === s ? '#a5b4fc' : '#94a3b8',
                    transition: 'all 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>DIET STYLE</label>
            <div className="flex flex-wrap gap-2">
              {DIET_OPTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => update('diet', d)}
                  className="px-3 py-2 rounded-full text-xs font-medium btn-press"
                  style={{
                    background: profile.diet === d ? 'rgba(99,102,241,0.12)' : '#111118',
                    border: `1px solid ${profile.diet === d ? '#6366f1' : '#2d2d3d'}`,
                    color: profile.diet === d ? '#a5b4fc' : '#94a3b8',
                    transition: 'all 0.15s',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  const canProceed = [
    () => profile.name.trim() && profile.age && profile.sex,
    () => profile.heightCm && profile.weightKg,
    () => profile.goal,
    () => profile.experience,
    () => true,
    () => profile.equipment,
    () => profile.daysPerWeek && profile.sessionLength,
    () => true,
  ][step]?.() ?? true;

  const isLast = step === totalSteps - 1;
  const currentStep = steps[step];

  return (
    <div
      className="flex flex-col min-h-screen max-w-[430px] mx-auto"
      style={{ background: '#0a0a0f' }}
    >
      {/* Progress bar */}
      <div style={{ height: 3, background: '#111118' }}>
        <div
          style={{
            height: '100%',
            width: `${((step + 1) / totalSteps) * 100}%`,
            background: '#6366f1',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Header nav */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        {step > 0 ? (
          <button
            onClick={() => setStep(s => s - 1)}
            className="btn-press flex items-center justify-center rounded-full"
            style={{ width: 36, height: 36, background: '#111118', border: '1px solid #2d2d3d', color: '#94a3b8' }}
          >
            <ChevronLeft size={18} />
          </button>
        ) : <div style={{ width: 36 }} />}
        <span className="text-xs font-semibold" style={{ color: '#475569', letterSpacing: '0.05em' }}>
          {step + 1} / {totalSteps}
        </span>
        <div style={{ width: 36 }} />
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-4 overflow-y-auto">
        <div className="mb-6 animate-fade-in">
          <h1 className="font-bold leading-tight" style={{ color: '#f8fafc', fontSize: 28, letterSpacing: '-0.02em' }}>
            {currentStep.heading}
          </h1>
          <p className="mt-2 text-base leading-relaxed" style={{ color: '#94a3b8' }}>
            {currentStep.sub}
          </p>
        </div>
        <div className="animate-fade-in">{currentStep.content}</div>
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pb-8 pt-4" style={{ borderTop: '1px solid #1e1e2e' }}>
        <button
          onClick={() => isLast ? handleComplete() : setStep(s => s + 1)}
          disabled={!canProceed || completing}
          className="w-full py-4 rounded-full font-bold text-base btn-press"
          style={{
            background: canProceed && !completing ? '#6366f1' : '#1e1e2e',
            color: canProceed && !completing ? '#fff' : '#475569',
            fontSize: 16,
            transition: 'background 0.2s',
          }}
        >
          {isLast
            ? completing ? 'Saving…' : "You're all set — let's go! 🚀"
            : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
