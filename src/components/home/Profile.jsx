import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, LogOut } from 'lucide-react';
import ScreenHeader from '../shared/ScreenHeader';
import { storage } from '../../utils/storage';

const GOAL_LABELS = {
  muscle: '💪 Build muscle & strength',
  fat_loss: '🔥 Lose fat & get lean',
  endurance: '🏃 Improve endurance',
  recomp: '⚖️ Body recomposition',
  sport: '🏆 Train for an event',
  health: '💆 General health',
};

const EXPERIENCE_LABELS = {
  beginner: 'Complete beginner',
  novice: 'Some experience (6–24 months)',
  intermediate: 'Intermediate (2–4 years)',
  advanced: 'Advanced (4+ years)',
};

const EQUIPMENT_LABELS = {
  full_gym: '🏋️ Full gym',
  home_gym: '🏠 Home gym',
  bodyweight: '🤸 Bodyweight only',
  bands: '🎽 Resistance bands',
  dumbbells: '🏋️ Dumbbells only',
};

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => storage.getProfile() || {});
  const [saved, setSaved] = useState(false);

  function update(field, value) {
    setProfile(p => ({ ...p, [field]: value }));
  }

  function save() {
    storage.setProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

        {/* Summary fields */}
        {[
          { label: 'Goal', value: GOAL_LABELS[profile.goal] || profile.goal },
          { label: 'Experience', value: EXPERIENCE_LABELS[profile.experience] || profile.experience },
          { label: 'Equipment', value: EQUIPMENT_LABELS[profile.equipment] || profile.equipment },
          { label: 'Training days/week', value: profile.daysPerWeek },
          { label: 'Session length', value: profile.sessionLength ? `${profile.sessionLength} min` : null },
        ].map(row => row.value && (
          <div key={row.label}>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#94a3b8' }}>{row.label}</label>
            <div
              className="px-4 py-3 rounded-xl text-sm"
              style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#f1f5f9' }}
            >
              {row.value}
            </div>
          </div>
        ))}

        {/* Injuries */}
        {profile.injuries?.length > 0 && (
          <div>
            <label className="text-xs font-medium mb-2 block" style={{ color: '#94a3b8' }}>Standing injuries</label>
            <div className="flex flex-wrap gap-2">
              {profile.injuries.map(inj => (
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
        <button
          onClick={save}
          className="w-full py-3.5 rounded-xl font-semibold btn-press flex items-center justify-center gap-2"
          style={{ background: saved ? '#10b981' : '#3b82f6', color: '#fff' }}
        >
          {saved ? <><Check size={18} /> Saved!</> : 'Save Changes'}
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
