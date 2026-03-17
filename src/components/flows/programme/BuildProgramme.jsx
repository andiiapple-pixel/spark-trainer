import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft } from 'lucide-react';
import ScreenHeader from '../../shared/ScreenHeader';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import { storage } from '../../../utils/storage';
import { generateProgrammeOverview } from '../../../api/anthropic';

const GOALS = [
  { id: 'muscle', emoji: '🏗️', label: 'Build muscle and strength' },
  { id: 'fat_loss', emoji: '🔥', label: 'Lose fat and get lean' },
  { id: 'endurance', emoji: '🏃', label: 'Improve endurance and fitness' },
  { id: 'recomp', emoji: '⚖️', label: 'Body recomposition' },
  { id: 'sport', emoji: '🏆', label: 'Train for an event or sport' },
  { id: 'health', emoji: '💆', label: 'General health and wellbeing' },
];

const SPLITS = {
  2: [{ name: 'Full Body A', type: 'full_body' }, { name: 'Full Body B', type: 'full_body' }],
  3: [
    { name: 'Push', type: 'push' }, { name: 'Pull', type: 'pull' }, { name: 'Legs', type: 'legs' },
  ],
  4: [
    { name: 'Upper A', type: 'upper' }, { name: 'Lower A', type: 'lower' },
    { name: 'Upper B', type: 'upper' }, { name: 'Lower B', type: 'lower' },
  ],
  5: [
    { name: 'Push', type: 'push' }, { name: 'Pull', type: 'pull' }, { name: 'Legs', type: 'legs' },
    { name: 'Upper', type: 'upper' }, { name: 'Lower', type: 'lower' },
  ],
  6: [
    { name: 'Push A', type: 'push' }, { name: 'Pull A', type: 'pull' }, { name: 'Legs A', type: 'legs' },
    { name: 'Push B', type: 'push' }, { name: 'Pull B', type: 'pull' }, { name: 'Legs B', type: 'legs' },
  ],
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function BuildProgramme() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    goal: '', weeks: 6, daysPerWeek: 3,
    selectedDays: ['Mon', 'Wed', 'Fri'],
    split: [], progression: 'auto', deload: 'auto',
    name: '',
  });
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const totalSteps = 6;

  function update(field, value) {
    setConfig(c => ({ ...c, [field]: value }));
  }

  function toggleDay(day) {
    setConfig(c => {
      const days = c.selectedDays.includes(day)
        ? c.selectedDays.filter(d => d !== day)
        : [...c.selectedDays, day];
      return { ...c, selectedDays: days };
    });
  }

  async function generateOverview() {
    setLoading(true);
    setError(null);
    try {
      const profile = storage.getProfile();
      const split = SPLITS[config.daysPerWeek] || SPLITS[3];
      const fullConfig = {
        ...config,
        split,
        auto_name: `${config.daysPerWeek}-Day ${config.goal} Programme — ${config.weeks} Weeks`,
      };
      update('split', split);
      const text = await generateProgrammeOverview(profile, fullConfig);
      setOverview(text);
      setStep(5);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function activate() {
    const split = SPLITS[config.daysPerWeek] || SPLITS[3];
    const programme = {
      id: Date.now(),
      name: config.name || `${config.daysPerWeek}-Day ${config.goal} Programme`,
      goal: config.goal,
      weeks: config.weeks,
      daysPerWeek: config.daysPerWeek,
      selectedDays: config.selectedDays,
      split,
      progression: config.progression,
      deload: config.deload,
      overview,
      currentWeek: 1,
      lastCompletedDayIndex: -1,
      lastCompletedDate: null,
      createdAt: new Date().toISOString(),
    };
    storage.setActiveProgramme(programme);
    storage.addProgramme(programme);
    navigate('/');
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen max-w-[430px] mx-auto">
        <ScreenHeader title="Building Programme" />
        <LoadingState message="Your trainer is designing your programme..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen max-w-[430px] mx-auto">
        <ScreenHeader title="Error" onBack={() => setError(null)} />
        <ErrorState message={error} onRetry={generateOverview} />
      </div>
    );
  }

  const steps = [
    // Goal
    <div key={0} className="flex flex-col gap-3 animate-fade-in px-4">
      <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>What&apos;s your primary goal?</h2>
      <div className="flex flex-col gap-2">
        {GOALS.map(g => (
          <button
            key={g.id}
            onClick={() => { update('goal', g.id); setStep(1); }}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left btn-press transition-all"
            style={{
              background: config.goal === g.id ? '#1e2d4a' : '#1e1e2a',
              border: `1px solid ${config.goal === g.id ? '#3b82f6' : '#2a2a3a'}`,
            }}
          >
            <span className="text-xl">{g.emoji}</span>
            <span className="font-semibold" style={{ color: '#f1f5f9' }}>{g.label}</span>
            {config.goal === g.id && <Check size={16} className="ml-auto" style={{ color: '#3b82f6' }} />}
          </button>
        ))}
      </div>
    </div>,

    // Length
    <div key={1} className="flex flex-col gap-5 animate-fade-in px-4">
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Programme length</h2>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>
          Research shows 6–8 weeks is optimal for measurable adaptation.
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[4, 6, 8, 12].map(w => (
          <button
            key={w}
            onClick={() => update('weeks', w)}
            className="py-4 rounded-xl font-bold text-lg btn-press transition-all"
            style={{
              background: config.weeks === w ? '#3b82f6' : '#1e1e2a',
              border: `1px solid ${config.weeks === w ? '#3b82f6' : '#2a2a3a'}`,
              color: config.weeks === w ? '#fff' : '#94a3b8',
            }}
          >
            {w}<span className="text-sm font-normal block">wks</span>
          </button>
        ))}
      </div>
      <button onClick={() => setStep(2)} className="w-full py-3.5 rounded-xl font-semibold btn-press" style={{ background: '#3b82f6', color: '#fff' }}>
        Continue <ChevronRight size={18} className="inline ml-1" />
      </button>
    </div>,

    // Days per week
    <div key={2} className="flex flex-col gap-5 animate-fade-in px-4">
      <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Days per week</h2>
      <div className="flex gap-2">
        {[2, 3, 4, 5, 6].map(d => (
          <button
            key={d}
            onClick={() => update('daysPerWeek', d)}
            className="flex-1 py-4 rounded-xl font-bold text-xl btn-press transition-all"
            style={{
              background: config.daysPerWeek === d ? '#3b82f6' : '#1e1e2a',
              border: `1px solid ${config.daysPerWeek === d ? '#3b82f6' : '#2a2a3a'}`,
              color: config.daysPerWeek === d ? '#fff' : '#94a3b8',
            }}
          >
            {d}
          </button>
        ))}
      </div>
      {config.daysPerWeek && (
        <div className="p-4 rounded-xl animate-fade-in" style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#64748b' }}>RECOMMENDED SPLIT</p>
          <div className="flex flex-wrap gap-2">
            {(SPLITS[config.daysPerWeek] || []).map((day, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full text-sm"
                style={{ background: '#3b82f620', color: '#93c5fd' }}
              >
                {day.name}
              </span>
            ))}
          </div>
        </div>
      )}
      <button onClick={() => setStep(3)} className="w-full py-3.5 rounded-xl font-semibold btn-press" style={{ background: '#3b82f6', color: '#fff' }}>
        Continue <ChevronRight size={18} className="inline ml-1" />
      </button>
    </div>,

    // Which days
    <div key={3} className="flex flex-col gap-5 animate-fade-in px-4">
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Which days?</h2>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>Select {config.daysPerWeek} days</p>
      </div>
      <div className="flex gap-2">
        {DAYS.map(day => {
          const selected = config.selectedDays.includes(day);
          return (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold btn-press transition-all"
              style={{
                background: selected ? '#3b82f6' : '#1e1e2a',
                border: `1px solid ${selected ? '#3b82f6' : '#2a2a3a'}`,
                color: selected ? '#fff' : '#64748b',
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setStep(4)}
        disabled={config.selectedDays.length !== config.daysPerWeek}
        className="w-full py-3.5 rounded-xl font-semibold btn-press"
        style={{
          background: config.selectedDays.length === config.daysPerWeek ? '#3b82f6' : '#1e1e2a',
          color: config.selectedDays.length === config.daysPerWeek ? '#fff' : '#475569',
          border: config.selectedDays.length === config.daysPerWeek ? 'none' : '1px solid #2a2a3a',
        }}
      >
        Continue <ChevronRight size={18} className="inline ml-1" />
      </button>
    </div>,

    // Style
    <div key={4} className="flex flex-col gap-5 animate-fade-in px-4">
      <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Programme style</h2>
      <div>
        <p className="text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>Progression model</p>
        <div className="flex flex-col gap-2">
          {[
            { id: 'linear', label: 'Linear', sub: 'Add weight/reps each session' },
            { id: 'undulating', label: 'Undulating', sub: 'Vary intensity across sessions' },
            { id: 'auto', label: 'Auto (Claude decides)', sub: 'Best for your goal and experience' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => update('progression', opt.id)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left btn-press transition-all"
              style={{
                background: config.progression === opt.id ? '#1e2d4a' : '#1e1e2a',
                border: `1px solid ${config.progression === opt.id ? '#3b82f6' : '#2a2a3a'}`,
              }}
            >
              <div>
                <div className="font-medium" style={{ color: '#f1f5f9' }}>{opt.label}</div>
                <div className="text-xs" style={{ color: '#64748b' }}>{opt.sub}</div>
              </div>
              {config.progression === opt.id && <Check size={16} className="ml-auto" style={{ color: '#3b82f6' }} />}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>Deload week</p>
        <div className="flex gap-2">
          {[
            { id: 'yes', label: 'Every 4 weeks' },
            { id: 'no', label: 'No' },
            { id: 'auto', label: 'Auto' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => update('deload', opt.id)}
              className="flex-1 py-2.5 px-2 rounded-xl text-sm font-medium btn-press transition-all"
              style={{
                background: config.deload === opt.id ? '#1e2d4a' : '#1e1e2a',
                border: `1px solid ${config.deload === opt.id ? '#3b82f6' : '#2a2a3a'}`,
                color: config.deload === opt.id ? '#93c5fd' : '#94a3b8',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={generateOverview}
        className="w-full py-4 rounded-xl font-bold btn-press"
        style={{ background: '#3b82f6', color: '#fff' }}
      >
        Build My Programme 🚀
      </button>
    </div>,

    // Review & Activate
    <div key={5} className="flex flex-col gap-4 animate-fade-in px-4 pb-8">
      <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Review &amp; Activate</h2>

      {/* Schedule */}
      <div className="p-4 rounded-xl" style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: '#64748b' }}>WEEKLY SCHEDULE</p>
        <div className="flex gap-1">
          {DAYS.map(day => {
            const dayIndex = config.selectedDays.indexOf(day);
            const split = SPLITS[config.daysPerWeek] || [];
            const session = dayIndex >= 0 ? split[dayIndex % split.length] : null;
            return (
              <div
                key={day}
                className="flex-1 flex flex-col items-center py-2 rounded-lg"
                style={{
                  background: session ? '#1e2d4a' : '#1a1a24',
                  border: `1px solid ${session ? '#3b82f640' : '#2a2a3a'}`,
                }}
              >
                <span className="text-xs" style={{ color: session ? '#93c5fd' : '#475569' }}>{day}</span>
                {session && (
                  <span className="text-xs font-semibold mt-0.5" style={{ color: '#3b82f6' }}>
                    {session.name.split(' ')[0]}
                  </span>
                )}
                {!session && <span className="text-xs" style={{ color: '#2a2a3a' }}>—</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Overview */}
      {overview && (
        <div className="p-4 rounded-xl" style={{ background: '#1e2d4a', border: '1px solid #3b82f640' }}>
          <p className="text-xs font-bold mb-2" style={{ color: '#3b82f6' }}>FROM YOUR TRAINER</p>
          <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>{overview}</p>
        </div>
      )}

      {/* Name */}
      <div>
        <label className="text-sm font-medium mb-1.5 block" style={{ color: '#94a3b8' }}>Programme name (optional)</label>
        <input
          type="text"
          placeholder={`${config.daysPerWeek}-Day ${config.goal} — ${config.weeks} Weeks`}
          value={config.name}
          onChange={e => update('name', e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-base outline-none"
          style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#f1f5f9' }}
        />
      </div>

      <button
        onClick={activate}
        className="w-full py-4 rounded-xl font-bold text-base btn-press"
        style={{ background: '#10b981', color: '#fff' }}
      >
        Activate Programme ✓
      </button>
    </div>,
  ];

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-8">
      <ScreenHeader
        title="Build Programme"
        progress={(step + 1) / totalSteps}
        onBack={step === 0 ? undefined : () => setStep(s => s - 1)}
      />
      <div className="flex-1 py-4">
        {steps[step]}
      </div>
    </div>
  );
}
