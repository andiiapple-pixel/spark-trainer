import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, LogOut } from 'lucide-react';
import ScreenHeader from '../shared/ScreenHeader';
import { storage } from '../../utils/storage';
import { data as dataApi } from '../../services/api';
import { useAuth } from '../../auth/AuthContext';

// Safely coerce the DB injuries value (TEXT column) to a JS array.
// Handles: JS array, JSON string '["a","b"]', PG text array '{a,b}', plain string.
function parseInjuries(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  if (typeof val === 'string') {
    // JSON array: ["Lower back","Knees"]
    try { const p = JSON.parse(val); if (Array.isArray(p)) return p; } catch {}
    // PostgreSQL text-array literal: {Lower back,Knees}
    if (val.startsWith('{') && val.endsWith('}')) {
      return val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    }
    // Comma-separated fallback
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// Maps API response (snake_case DB fields) → local profile shape
function apiToLocal(apiProfile, apiUser) {
  const extra = apiProfile?.extra_data || {};
  return {
    name: apiUser?.full_name || extra.name || '',
    age: apiProfile?.age || '',
    sex: apiProfile?.biological_sex || '',
    heightCm: apiProfile?.height_cm || '',
    weightKg: apiProfile?.weight_kg || '',
    goal: apiProfile?.fitness_goal || '',
    experience: apiProfile?.experience_level || '',
    injuries: parseInjuries(apiProfile?.injuries),
    injuryNotes: extra.injuryNotes || '',
    equipment: apiProfile?.equipment_access || '',
    homeEquipment: extra.homeEquipment || [],
    daysPerWeek: Number(apiProfile?.training_days_per_week) || 3,
    sessionLength: Number(apiProfile?.preferred_session_mins) || 45,
    sleep: apiProfile?.sleep_quality || '',
    stress: apiProfile?.stress_level || '',
    diet: apiProfile?.diet_style || '',
  };
}

// Maps local profile shape → API request body (snake_case DB fields)
// injuries is serialised to a JSON string so the TEXT column always holds valid JSON.
function localToApi(p) {
  return {
    full_name: p.name || null,
    age: p.age ? Number(p.age) : null,
    biological_sex: p.sex || null,
    height_cm: p.heightCm ? Number(p.heightCm) : null,
    weight_kg: p.weightKg ? Number(p.weightKg) : null,
    fitness_goal: p.goal || null,
    experience_level: p.experience || null,
    injuries: JSON.stringify(Array.isArray(p.injuries) ? p.injuries : []),
    equipment_access: p.equipment || null,
    training_days_per_week: p.daysPerWeek || null,
    preferred_session_mins: p.sessionLength || null,
    sleep_quality: p.sleep || null,
    stress_level: p.stress || null,
    diet_style: p.diet || null,
    extra_data: {
      name: p.name || null,
      injuryNotes: p.injuryNotes || null,
      homeEquipment: p.homeEquipment || [],
    },
  };
}

const GOALS = [
  { id: 'muscle',   emoji: '💪', label: 'Build muscle & strength' },
  { id: 'fat_loss', emoji: '🔥', label: 'Lose fat & get lean' },
  { id: 'endurance',emoji: '🏃', label: 'Improve endurance & fitness' },
  { id: 'recomp',   emoji: '⚖️', label: 'Body recomposition' },
  { id: 'sport',    emoji: '🏆', label: 'Train for an event or sport' },
  { id: 'health',   emoji: '💆', label: 'General health & wellbeing' },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner',     label: 'Complete beginner',     sub: 'New to structured training' },
  { id: 'novice',       label: 'Some experience',       sub: '6–24 months' },
  { id: 'intermediate', label: 'Intermediate',          sub: '2–4 years' },
  { id: 'advanced',     label: 'Advanced',              sub: '4+ years' },
];

const EQUIPMENT_OPTIONS = [
  { id: 'full_gym',   emoji: '🏋️', label: 'Full gym access',   sub: 'Barbells, machines, cables' },
  { id: 'home_gym',   emoji: '🏠', label: 'Home gym',          sub: 'Select what you have' },
  { id: 'bodyweight', emoji: '🤸', label: 'Bodyweight only',   sub: 'No equipment needed' },
  { id: 'bands',      emoji: '🎽', label: 'Resistance bands',  sub: 'Bands + bodyweight' },
  { id: 'dumbbells',  emoji: '🏋️', label: 'Dumbbells only',    sub: 'Dumbbell set at home' },
];

export default function Profile() {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();
  const [profile, setProfile] = useState(() => storage.getProfile() || {});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { type: 'success'|'error', text }

  useEffect(() => {
    dataApi.getProfile()
      .then(({ profile: apiProfile, user: apiUser }) => {
        if (apiProfile || apiUser) {
          const local = apiToLocal(apiProfile, apiUser);
          setProfile(local);
          storage.setProfile(local);
        }
      })
      .catch(() => {
        // API unavailable — keep localStorage data already set as initial state
      })
      .finally(() => setLoading(false));
  }, []);

  function update(field, value) {
    setProfile(p => ({ ...p, [field]: value }));
  }

  async function save() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const { profile: saved } = await dataApi.saveProfile(localToApi(profile));
      storage.setProfile(profile);
      if (saved) updateProfile(saved);
      setSaveMsg({ type: 'success', text: 'Changes saved!' });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.message || 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  function resetApp() {
    if (confirm('This will clear all your data. Are you sure?')) {
      localStorage.clear();
      navigate('/');
      window.location.reload();
    }
  }

  const fields = [
    { label: 'Name', field: 'name', type: 'text' },
    { label: 'Age', field: 'age', type: 'number' },
    { label: 'Height (cm)', field: 'heightCm', type: 'number' },
    { label: 'Weight (kg)', field: 'weightKg', type: 'number' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-8">
        <ScreenHeader title="My Profile" />
        <div className="px-4 pt-8 flex justify-center">
          <p style={{ color: '#64748b', fontSize: 14 }}>Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-8">
      <ScreenHeader title="My Profile" />

      <div className="px-4 flex flex-col gap-4">
        {/* Basic info */}
        <div className="flex flex-col gap-3">
          {fields.map(f => (
            <div key={f.field}>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#94a3b8' }}>{f.label}</label>
              <input
                type={f.type}
                value={profile[f.field] || ''}
                onChange={e => update(f.field, e.target.value)}
                className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#f1f5f9' }}
              />
            </div>
          ))}
        </div>

        {/* Sex */}
        <div>
          <label className="text-xs font-medium mb-2 block" style={{ color: '#94a3b8' }}>Sex</label>
          <div className="flex gap-2">
            {['Male', 'Female', 'Other'].map(s => (
              <button
                key={s}
                onClick={() => update('sex', s)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium btn-press"
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

        {/* Fitness Goal */}
        <div>
          <label className="text-xs font-medium mb-2 block" style={{ color: '#94a3b8' }}>Fitness goal</label>
          <div className="flex flex-col gap-2">
            {GOALS.map(g => (
              <button
                key={g.id}
                onClick={() => update('goal', g.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-left btn-press"
                style={{
                  background: profile.goal === g.id ? '#1e3a5f' : '#1e1e2a',
                  border: `1px solid ${profile.goal === g.id ? '#3b82f6' : '#2a2a3a'}`,
                }}
              >
                <span>{g.emoji}</span>
                <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{g.label}</span>
                {profile.goal === g.id && <Check size={15} className="ml-auto" style={{ color: '#3b82f6', flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Experience Level */}
        <div>
          <label className="text-xs font-medium mb-2 block" style={{ color: '#94a3b8' }}>Training experience</label>
          <div className="flex flex-col gap-2">
            {EXPERIENCE_LEVELS.map(e => (
              <button
                key={e.id}
                onClick={() => update('experience', e.id)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left btn-press"
                style={{
                  background: profile.experience === e.id ? '#1e3a5f' : '#1e1e2a',
                  border: `1px solid ${profile.experience === e.id ? '#3b82f6' : '#2a2a3a'}`,
                }}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{e.label}</div>
                  <div className="text-xs" style={{ color: '#64748b' }}>{e.sub}</div>
                </div>
                {profile.experience === e.id && <Check size={15} style={{ color: '#3b82f6', flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div>
          <label className="text-xs font-medium mb-2 block" style={{ color: '#94a3b8' }}>Equipment access</label>
          <div className="flex flex-col gap-2">
            {EQUIPMENT_OPTIONS.map(e => (
              <button
                key={e.id}
                onClick={() => update('equipment', e.id)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left btn-press"
                style={{
                  background: profile.equipment === e.id ? '#1e3a5f' : '#1e1e2a',
                  border: `1px solid ${profile.equipment === e.id ? '#3b82f6' : '#2a2a3a'}`,
                }}
              >
                <span className="text-lg">{e.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{e.label}</div>
                  <div className="text-xs" style={{ color: '#64748b' }}>{e.sub}</div>
                </div>
                {profile.equipment === e.id && <Check size={15} style={{ color: '#3b82f6', flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Training days */}
        <div>
          <label className="text-xs font-medium mb-2 block" style={{ color: '#94a3b8' }}>Training days per week</label>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6].map(d => (
              <button
                key={d}
                onClick={() => update('daysPerWeek', d)}
                className="flex-1 py-3 rounded-xl font-bold text-base btn-press"
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

        {/* Session length */}
        <div>
          <label className="text-xs font-medium mb-2 block" style={{ color: '#94a3b8' }}>Preferred session length</label>
          <div className="grid grid-cols-5 gap-2">
            {[15, 30, 45, 60, 90].map(mins => (
              <button
                key={mins}
                onClick={() => update('sessionLength', mins)}
                className="py-3 rounded-xl font-medium text-xs btn-press"
                style={{
                  background: profile.sessionLength === mins ? '#3b82f6' : '#1e1e2a',
                  border: `1px solid ${profile.sessionLength === mins ? '#3b82f6' : '#2a2a3a'}`,
                  color: profile.sessionLength === mins ? '#fff' : '#94a3b8',
                }}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Injuries */}
        {parseInjuries(profile.injuries).length > 0 && (
          <div>
            <label className="text-xs font-medium mb-2 block" style={{ color: '#94a3b8' }}>Standing injuries</label>
            <div className="flex flex-wrap gap-2">
              {parseInjuries(profile.injuries).map(inj => (
                <span key={inj} className="px-3 py-1.5 rounded-full text-sm" style={{ background: '#7c3aed30', color: '#c4b5fd', border: '1px solid #7c3aed50' }}>
                  {inj}
                </span>
              ))}
            </div>
            {profile.injuryNotes && (
              <p className="text-xs mt-2 italic" style={{ color: '#64748b' }}>{profile.injuryNotes}</p>
            )}
          </div>
        )}

        {/* Save */}
        {saveMsg && (
          <p style={{ fontSize: 13, fontWeight: 600, color: saveMsg.type === 'success' ? '#10b981' : '#ef4444', textAlign: 'center' }}>
            {saveMsg.type === 'success' && <Check size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />}
            {saveMsg.text}
          </p>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3.5 rounded-xl font-semibold btn-press flex items-center justify-center gap-2"
          style={{ background: saveMsg?.type === 'success' ? '#10b981' : '#3b82f6', color: '#fff', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : saveMsg?.type === 'success' ? <><Check size={18} /> Saved!</> : 'Save Changes'}
        </button>

        {/* Danger zone */}
        <div className="mt-2 pt-4" style={{ borderTop: '1px solid #2a2a3a' }}>
          <button
            onClick={resetApp}
            className="w-full py-3 rounded-xl text-sm font-medium btn-press flex items-center justify-center gap-2"
            style={{ background: '#1a1a24', border: '1px solid #ef444430', color: '#ef4444' }}
          >
            <LogOut size={16} />
            Reset all data
          </button>
        </div>
      </div>
    </div>
  );
}
