import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { storage } from '../../utils/storage';
import { data as dataApi } from '../../services/api';
import { useAuth } from '../../auth/AuthContext';

const GOALS = [
  { id: 'muscle',    label: 'Build muscle & strength',    sub: 'Progressive overload, hypertrophy focus' },
  { id: 'fat_loss',  label: 'Lose fat & get lean',        sub: 'Calorie burn, metabolic training' },
  { id: 'endurance', label: 'Improve endurance',          sub: 'Stamina, cardiovascular fitness' },
  { id: 'recomp',    label: 'Body recomposition',         sub: 'Lose fat and build muscle simultaneously' },
  { id: 'sport',     label: 'Train for a sport or event', sub: 'Performance, power, agility' },
  { id: 'health',    label: 'General health & wellbeing',  sub: 'Balanced, sustainable fitness' },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner',     label: 'Complete beginner',     sub: 'New to structured training' },
  { id: 'novice',       label: 'Some experience',       sub: "I know the basics, 6-24 months in" },
  { id: 'intermediate', label: 'Intermediate',          sub: "I know what I'm doing - 2-4 years" },
  { id: 'advanced',     label: 'Advanced',              sub: "I've been training seriously for years" },
];

const INJURY_CHIPS = ['Lower back', 'Knees', 'Shoulders', 'Wrists', 'Hips', 'Neck', 'Ankles', 'None'];

const EQUIPMENT_OPTIONS = [
  { id: 'full_gym',   label: 'Full gym access',   sub: 'Barbells, machines, cables - the works' },
  { id: 'home_gym',   label: 'Home gym',          sub: 'Select your available equipment' },
  { id: 'bodyweight', label: 'Bodyweight only',   sub: 'Zero equipment, maximum effort' },
  { id: 'bands',      label: 'Resistance bands',  sub: 'Bands plus bodyweight movements' },
  { id: 'dumbbells',  label: 'Dumbbells only',    sub: 'Dumbbell set - full workout capability' },
];

const SLEEP_OPTIONS = ['Poor (< 6hrs)', 'Fair (6-7hrs)', 'Good (7-8hrs)', 'Great (8+hrs)'];
const STRESS_OPTIONS = ['Low', 'Moderate', 'High', 'Very high'];
const DIET_OPTIONS = ['Standard / no restrictions', 'Vegetarian', 'Vegan', 'High protein', 'Keto / Low carb', 'Intermittent fasting'];

/* --- Editorial design tokens --- */
const T = {
  surface: '#0A0A0A',
  raised: '#111111',
  border: '#222222',
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  textMuted: '#555555',
  accent: '#E8FF00',
  onAccent: '#000000',
};

const fontDisplay = "'Oswald', sans-serif";
const fontBody = "'Inter', sans-serif";

/* --- Shared OptionCard (editorial: text-only bordered rectangle) --- */
function OptionCard({ label, sub, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        minHeight: 48,
        padding: 16,
        background: selected ? T.accent : 'transparent',
        border: `1px solid ${selected ? T.accent : T.border}`,
        borderRadius: 0,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <span style={{
        fontFamily: fontBody,
        fontSize: 14,
        fontWeight: 500,
        color: selected ? T.onAccent : T.textPrimary,
        lineHeight: 1.4,
      }}>
        {label}
      </span>
      {sub && (
        <span style={{
          fontFamily: fontBody,
          fontSize: 12,
          color: selected ? 'rgba(0,0,0,0.6)' : T.textSecondary,
          marginTop: 2,
          lineHeight: 1.3,
        }}>
          {sub}
        </span>
      )}
    </button>
  );
}

/* --- Inline label component --- */
function InputLabel({ children }) {
  return (
    <label style={{
      display: 'block',
      fontFamily: fontBody,
      fontSize: 11,
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: 2,
      color: T.textMuted,
      marginBottom: 8,
    }}>
      {children}
    </label>
  );
}

/* --- Shared input style --- */
const inputStyle = {
  width: '100%',
  height: 48,
  padding: '0 12px',
  background: T.raised,
  border: 'none',
  borderBottom: `1px solid ${T.border}`,
  borderRadius: 0,
  fontFamily: fontBody,
  fontSize: 15,
  color: T.textPrimary,
  outline: 'none',
};

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

  /* --- Chip toggle helper (for injuries, diet) --- */
  function Chip({ label, selected, onClick }) {
    return (
      <button
        onClick={onClick}
        style={{
          padding: '8px 16px',
          background: selected ? T.accent : 'transparent',
          border: `1px solid ${selected ? T.accent : T.border}`,
          borderRadius: 0,
          fontFamily: fontBody,
          fontSize: 12,
          color: selected ? T.onAccent : T.textSecondary,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {label}
      </button>
    );
  }

  /* --- Inline button selector (days, session length, sex) --- */
  function SelectorButton({ label, selected, onClick, style: extraStyle }) {
    return (
      <button
        onClick={onClick}
        style={{
          flex: 1,
          minHeight: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: selected ? T.accent : 'transparent',
          border: `1px solid ${selected ? T.accent : T.border}`,
          borderRadius: 0,
          fontFamily: fontBody,
          fontSize: 14,
          fontWeight: 600,
          color: selected ? T.onAccent : T.textSecondary,
          cursor: 'pointer',
          transition: 'all 0.15s',
          ...extraStyle,
        }}
      >
        {label}
      </button>
    );
  }

  const steps = [
    // Step 0: Name, age, sex
    {
      heading: "LET'S GET TO KNOW YOU",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <InputLabel>FIRST NAME</InputLabel>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Alex"
              value={profile.name}
              onChange={e => update('name', e.target.value)}
              style={inputStyle}
              onFocus={e => { e.target.style.borderBottomColor = T.accent; }}
              onBlur={e => { e.target.style.borderBottomColor = T.border; }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <InputLabel>AGE</InputLabel>
              <input
                type="number"
                placeholder="25"
                value={profile.age}
                onChange={e => update('age', e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderBottomColor = T.accent; }}
                onBlur={e => { e.target.style.borderBottomColor = T.border; }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <InputLabel>SEX</InputLabel>
              <div style={{ display: 'flex', gap: 6 }}>
                {['M', 'F', 'X'].map((s, i) => {
                  const label = ['Male', 'Female', 'Other'][i];
                  return (
                    <SelectorButton
                      key={s}
                      label={s}
                      selected={profile.sex === label}
                      onClick={() => update('sex', label)}
                      style={{ fontSize: 13 }}
                    />
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
      heading: 'BODY STATS',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <InputLabel>HEIGHT (CM)</InputLabel>
            <input
              type="number"
              placeholder="175"
              value={profile.heightCm}
              onChange={e => update('heightCm', e.target.value)}
              style={inputStyle}
              onFocus={e => { e.target.style.borderBottomColor = T.accent; }}
              onBlur={e => { e.target.style.borderBottomColor = T.border; }}
            />
          </div>
          <div>
            <InputLabel>WEIGHT (KG)</InputLabel>
            <input
              type="number"
              placeholder="75"
              value={profile.weightKg}
              onChange={e => update('weightKg', e.target.value)}
              style={inputStyle}
              onFocus={e => { e.target.style.borderBottomColor = T.accent; }}
              onBlur={e => { e.target.style.borderBottomColor = T.border; }}
            />
          </div>
        </div>
      ),
    },

    // Step 2: Goal
    {
      heading: "WHAT'S YOUR MAIN GOAL?",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {GOALS.map(g => (
            <OptionCard
              key={g.id}
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
      heading: 'TRAINING EXPERIENCE',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EXPERIENCE_LEVELS.map(e => (
            <OptionCard
              key={e.id}
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
      heading: 'ANY INJURIES OR LIMITATIONS?',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {INJURY_CHIPS.map(chip => (
              <Chip
                key={chip}
                label={chip}
                selected={profile.injuries.includes(chip)}
                onClick={() => update('injuries', toggleChip(profile.injuries, chip))}
              />
            ))}
          </div>
          <div>
            <InputLabel>MORE DETAIL (OPTIONAL)</InputLabel>
            <textarea
              placeholder="e.g. herniated disc L4/L5, left knee ACL surgery 2 years ago..."
              value={profile.injuryNotes}
              onChange={e => update('injuryNotes', e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: 12,
                background: T.raised,
                border: 'none',
                borderBottom: `1px solid ${T.border}`,
                borderRadius: 0,
                fontFamily: fontBody,
                fontSize: 14,
                color: T.textPrimary,
                outline: 'none',
                resize: 'none',
              }}
              onFocus={e => { e.target.style.borderBottomColor = T.accent; }}
              onBlur={e => { e.target.style.borderBottomColor = T.border; }}
            />
          </div>
        </div>
      ),
    },

    // Step 5: Equipment
    {
      heading: 'EQUIPMENT ACCESS',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EQUIPMENT_OPTIONS.map(e => (
            <OptionCard
              key={e.id}
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
      heading: 'YOUR TRAINING SCHEDULE',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div>
            <InputLabel>DAYS PER WEEK</InputLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              {[2, 3, 4, 5, 6].map(d => (
                <SelectorButton
                  key={d}
                  label={String(d)}
                  selected={profile.daysPerWeek === d}
                  onClick={() => update('daysPerWeek', d)}
                  style={{ fontSize: 20, fontWeight: 700 }}
                />
              ))}
            </div>
          </div>
          <div>
            <InputLabel>SESSION LENGTH</InputLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[30, 45, 60, 75, 90].map(mins => (
                <SelectorButton
                  key={mins}
                  label={`${mins} min`}
                  selected={profile.sessionLength === mins}
                  onClick={() => update('sessionLength', mins)}
                  style={{ flex: 'none', padding: '0 20px', fontSize: 13 }}
                />
              ))}
            </div>
          </div>
        </div>
      ),
    },

    // Step 7: Lifestyle
    {
      heading: 'LIFESTYLE CONTEXT',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <InputLabel>SLEEP QUALITY</InputLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SLEEP_OPTIONS.map(s => (
                <Chip
                  key={s}
                  label={s}
                  selected={profile.sleep === s}
                  onClick={() => update('sleep', s)}
                />
              ))}
            </div>
          </div>
          <div>
            <InputLabel>STRESS LEVEL</InputLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              {STRESS_OPTIONS.map(s => (
                <Chip
                  key={s}
                  label={s}
                  selected={profile.stress === s}
                  onClick={() => update('stress', s)}
                />
              ))}
            </div>
          </div>
          <div>
            <InputLabel>DIET STYLE</InputLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DIET_OPTIONS.map(d => (
                <Chip
                  key={d}
                  label={d}
                  selected={profile.diet === d}
                  onClick={() => update('diet', d)}
                />
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
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        maxWidth: 430,
        margin: '0 auto',
        background: T.surface,
        position: 'relative',
      }}
    >
      {/* Header: back button (left) + step counter (right) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px 8px',
      }}>
        {step > 0 ? (
          <button
            onClick={() => setStep(s => s - 1)}
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: `1px solid ${T.border}`,
              borderRadius: 0,
              color: T.textSecondary,
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={18} />
          </button>
        ) : (
          <div style={{ width: 40 }} />
        )}
        <span style={{
          fontFamily: fontBody,
          fontSize: 10,
          color: T.textMuted,
          letterSpacing: 1,
        }}>
          {step + 1} / {totalSteps}
        </span>
      </div>

      {/* Content area */}
      <div style={{
        flex: 1,
        padding: '16px 24px',
        overflowY: 'auto',
        paddingBottom: 100,
      }}>
        {/* Heading */}
        <h1 style={{
          fontFamily: fontDisplay,
          fontSize: 36,
          fontWeight: 700,
          textTransform: 'uppercase',
          color: T.textPrimary,
          margin: 0,
          marginBottom: 20,
          lineHeight: 1.1,
        }}>
          {currentStep.heading}
        </h1>

        {/* Step content */}
        {currentStep.content}
      </div>

      {/* Fixed continue button at bottom */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        padding: '16px 24px 32px',
        background: `linear-gradient(to top, ${T.surface} 70%, transparent)`,
      }}>
        <button
          onClick={() => isLast ? handleComplete() : setStep(s => s + 1)}
          disabled={!canProceed || completing}
          style={{
            width: '100%',
            height: 52,
            background: canProceed && !completing ? T.accent : T.border,
            color: canProceed && !completing ? T.onAccent : T.textMuted,
            border: 'none',
            borderRadius: 0,
            fontFamily: fontDisplay,
            fontSize: 14,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 2,
            cursor: canProceed && !completing ? 'pointer' : 'default',
            transition: 'background 0.2s',
          }}
        >
          {isLast
            ? completing ? 'SAVING...' : "LET'S GO \u2192"
            : 'CONTINUE \u2192'}
        </button>
      </div>
    </div>
  );
}
