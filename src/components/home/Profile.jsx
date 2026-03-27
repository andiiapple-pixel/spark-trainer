import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, LogOut, Plus, Trash2 } from 'lucide-react';
import ScreenHeader from '../shared/ScreenHeader';
import { storage } from '../../utils/storage';
import { data as dataApi, recovery as recoveryApi } from '../../services/api';
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

const GYM_EQUIPMENT_LIST = [
  'Barbell', 'Squat rack', 'Bench', 'Dumbbells', 'Cables', 'Pull-up bar',
  'Resistance bands', 'Kettlebells', 'Machines', 'Leg press', 'Smith machine',
  'Rowing machine', 'Treadmill', 'Bike', 'Trap bar',
];

// Editorial design tokens
const labelStyle = {
  display: 'block',
  fontFamily: "'Inter', sans-serif",
  fontSize: 11,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '2px',
  color: '#555555',
  marginBottom: 8,
};

const inputStyleBase = {
  width: '100%',
  height: 48,
  padding: '0 16px',
  background: '#111111',
  border: '1px solid #222222',
  borderRadius: 0,
  color: '#FFFFFF',
  fontFamily: "'Inter', sans-serif",
  fontSize: 15,
  fontWeight: 400,
  outline: 'none',
  boxSizing: 'border-box',
};

function GymProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEquipment, setNewEquipment] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    recoveryApi.getEquipmentProfiles()
      .then(r => setProfiles(r.profiles || []))
      .catch(() => {});
  }, []);

  async function createProfile() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const r = await recoveryApi.createEquipmentProfile({ name: newName.trim(), equipment_list: newEquipment });
      setProfiles(prev => [...prev, r.profile]);
      setCreating(false);
      setNewName('');
      setNewEquipment([]);
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function deleteProfile(id) {
    try {
      await recoveryApi.deleteEquipmentProfile(id);
      setProfiles(prev => prev.filter(p => p.id !== id));
    } catch { /* ignore */ }
  }

  async function setDefault(id) {
    try {
      const r = await recoveryApi.updateEquipmentProfile(id, { is_default: true });
      setProfiles(prev => prev.map(p => ({
        ...p,
        is_default: p.id === id ? true : false,
      })));
    } catch { /* ignore */ }
  }

  function toggleEquip(item) {
    setNewEquipment(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={labelStyle}>GYM PROFILES</label>
        <button
          onClick={() => setCreating(c => !c)}
          className="btn-press"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid #222222',
            borderRadius: 0,
            color: '#E8FF00',
            cursor: 'pointer',
          }}
        >
          <Plus size={12} /> NEW
        </button>
      </div>

      {profiles.length === 0 && !creating && (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#555555', textAlign: 'center', padding: '16px 0' }}>
          No gym profiles yet. Create one to save your equipment setup.
        </p>
      )}

      {profiles.map(p => (
        <div
          key={p.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            background: 'transparent',
            border: `1px solid ${p.is_default ? '#E8FF00' : '#222222'}`,
            borderRadius: 0,
            marginBottom: 8,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#555555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {(p.equipment_list || []).slice(0, 4).join(', ')}{(p.equipment_list?.length || 0) > 4 ? ` +${p.equipment_list.length - 4}` : ''}
            </div>
          </div>
          {!p.is_default && (
            <button
              onClick={() => setDefault(p.id)}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                padding: '6px 10px',
                background: 'transparent',
                border: '1px solid #222222',
                borderRadius: 0,
                color: '#888888',
                cursor: 'pointer',
              }}
            >
              Set default
            </button>
          )}
          {p.is_default && (
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '6px 10px',
              background: '#E8FF00',
              color: '#000000',
              borderRadius: 0,
            }}>
              Default
            </span>
          )}
          <button onClick={() => deleteProfile(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4 }}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {creating && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, background: '#111111', border: '1px solid #222222', borderRadius: 0 }}>
          <input
            autoFocus
            placeholder="Profile name (e.g. Main Gym)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={inputStyleBase}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {GYM_EQUIPMENT_LIST.map(item => (
              <button
                key={item}
                onClick={() => toggleEquip(item)}
                className="btn-press"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: 400,
                  padding: '6px 12px',
                  background: newEquipment.includes(item) ? '#E8FF00' : 'transparent',
                  color: newEquipment.includes(item) ? '#000000' : '#888888',
                  border: `1px solid ${newEquipment.includes(item) ? '#E8FF00' : '#222222'}`,
                  borderRadius: 0,
                  cursor: 'pointer',
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={createProfile}
              disabled={saving || !newName.trim()}
              className="btn-press"
              style={{
                flex: 1,
                height: 48,
                fontFamily: "'Oswald', sans-serif",
                fontSize: 14,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: '#E8FF00',
                color: '#000000',
                border: 'none',
                borderRadius: 0,
                cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'SAVING...' : 'SAVE PROFILE'}
            </button>
            <button
              onClick={() => { setCreating(false); setNewName(''); setNewEquipment([]); }}
              className="btn-press"
              style={{
                padding: '0 20px',
                height: 48,
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                background: 'transparent',
                border: '1px solid #222222',
                borderRadius: 0,
                color: '#888888',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', maxWidth: 430, margin: '0 auto', paddingBottom: 32, background: '#0A0A0A' }}>
        <ScreenHeader title="Profile" />
        <div style={{ padding: '32px 20px', display: 'flex', justifyContent: 'center' }}>
          <p style={{ fontFamily: "'Inter', sans-serif", color: '#555555', fontSize: 14 }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', maxWidth: 430, margin: '0 auto', paddingBottom: 32, background: '#0A0A0A' }}>
      <ScreenHeader title="Profile" />

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Basic info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {fields.map(f => (
            <div key={f.field}>
              <label style={labelStyle}>{f.label}</label>
              <input
                type={f.type}
                value={profile[f.field] || ''}
                onChange={e => update(f.field, e.target.value)}
                style={inputStyleBase}
              />
            </div>
          ))}
        </div>

        {/* Sex */}
        <div>
          <label style={labelStyle}>Sex</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Male', 'Female', 'Other'].map(s => (
              <button
                key={s}
                onClick={() => update('sex', s)}
                className="btn-press"
                style={{
                  flex: 1,
                  height: 48,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  background: profile.sex === s ? '#E8FF00' : 'transparent',
                  border: `1px solid ${profile.sex === s ? '#E8FF00' : '#222222'}`,
                  borderRadius: 0,
                  color: profile.sex === s ? '#000000' : '#888888',
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Fitness Goal */}
        <div>
          <label style={labelStyle}>Fitness Goal</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {GOALS.map(g => (
              <button
                key={g.id}
                onClick={() => update('goal', g.id)}
                className="btn-press"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  textAlign: 'left',
                  background: profile.goal === g.id ? '#E8FF00' : 'transparent',
                  border: `1px solid ${profile.goal === g.id ? '#E8FF00' : '#222222'}`,
                  borderRadius: 0,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 18 }}>{g.emoji}</span>
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  color: profile.goal === g.id ? '#000000' : '#FFFFFF',
                }}>{g.label}</span>
                {profile.goal === g.id && <Check size={15} style={{ marginLeft: 'auto', color: '#000000', flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Experience Level */}
        <div>
          <label style={labelStyle}>Training Experience</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {EXPERIENCE_LEVELS.map(e => (
              <button
                key={e.id}
                onClick={() => update('experience', e.id)}
                className="btn-press"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  textAlign: 'left',
                  background: profile.experience === e.id ? '#E8FF00' : 'transparent',
                  border: `1px solid ${profile.experience === e.id ? '#E8FF00' : '#222222'}`,
                  borderRadius: 0,
                  cursor: 'pointer',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: profile.experience === e.id ? '#000000' : '#FFFFFF',
                  }}>{e.label}</div>
                  <div style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    color: profile.experience === e.id ? '#000000' : '#555555',
                  }}>{e.sub}</div>
                </div>
                {profile.experience === e.id && <Check size={15} style={{ color: '#000000', flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div>
          <label style={labelStyle}>Equipment Access</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {EQUIPMENT_OPTIONS.map(e => (
              <button
                key={e.id}
                onClick={() => update('equipment', e.id)}
                className="btn-press"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  textAlign: 'left',
                  background: profile.equipment === e.id ? '#E8FF00' : 'transparent',
                  border: `1px solid ${profile.equipment === e.id ? '#E8FF00' : '#222222'}`,
                  borderRadius: 0,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 18 }}>{e.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: profile.equipment === e.id ? '#000000' : '#FFFFFF',
                  }}>{e.label}</div>
                  <div style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    color: profile.equipment === e.id ? '#000000' : '#555555',
                  }}>{e.sub}</div>
                </div>
                {profile.equipment === e.id && <Check size={15} style={{ color: '#000000', flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Gym Profiles */}
        <GymProfiles />

        {/* Training days */}
        <div>
          <label style={labelStyle}>Training Days Per Week</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[2, 3, 4, 5, 6].map(d => (
              <button
                key={d}
                onClick={() => update('daysPerWeek', d)}
                className="btn-press"
                style={{
                  flex: 1,
                  height: 48,
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  background: profile.daysPerWeek === d ? '#E8FF00' : 'transparent',
                  border: `1px solid ${profile.daysPerWeek === d ? '#E8FF00' : '#222222'}`,
                  borderRadius: 0,
                  color: profile.daysPerWeek === d ? '#000000' : '#888888',
                  cursor: 'pointer',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Session length */}
        <div>
          <label style={labelStyle}>Preferred Session Length</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {[15, 30, 45, 60, 90].map(mins => (
              <button
                key={mins}
                onClick={() => update('sessionLength', mins)}
                className="btn-press"
                style={{
                  height: 48,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  background: profile.sessionLength === mins ? '#E8FF00' : 'transparent',
                  border: `1px solid ${profile.sessionLength === mins ? '#E8FF00' : '#222222'}`,
                  borderRadius: 0,
                  color: profile.sessionLength === mins ? '#000000' : '#888888',
                  cursor: 'pointer',
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
            <label style={labelStyle}>Standing Injuries</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {parseInjuries(profile.injuries).map(inj => (
                <span key={inj} style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: 400,
                  padding: '8px 14px',
                  background: 'transparent',
                  color: '#EF4444',
                  border: '1px solid #EF4444',
                  borderRadius: 0,
                }}>
                  {inj}
                </span>
              ))}
            </div>
            {profile.injuryNotes && (
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#555555', marginTop: 8, fontStyle: 'italic' }}>{profile.injuryNotes}</p>
            )}
          </div>
        )}

        {/* Save */}
        {saveMsg && (
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: saveMsg.type === 'success' ? '#10b981' : '#EF4444',
            textAlign: 'center',
          }}>
            {saveMsg.type === 'success' && <Check size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />}
            {saveMsg.text}
          </p>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="btn-press"
          style={{
            width: '100%',
            height: 52,
            fontFamily: "'Oswald', sans-serif",
            fontSize: 16,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: saveMsg?.type === 'success' ? '#10b981' : '#E8FF00',
            color: saveMsg?.type === 'success' ? '#FFFFFF' : '#000000',
            border: 'none',
            borderRadius: 0,
            cursor: 'pointer',
            opacity: saving ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {saving ? 'SAVING...' : saveMsg?.type === 'success' ? <><Check size={18} /> SAVED!</> : 'SAVE CHANGES'}
        </button>

        {/* Danger zone */}
        <div style={{ marginTop: 8, paddingTop: 20, borderTop: '1px solid #222222' }}>
          <button
            onClick={resetApp}
            className="btn-press"
            style={{
              width: '100%',
              height: 48,
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              background: 'transparent',
              border: '1px solid #EF4444',
              borderRadius: 0,
              color: '#EF4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <LogOut size={16} />
            Reset all data
          </button>
        </div>
      </div>
    </div>
  );
}
