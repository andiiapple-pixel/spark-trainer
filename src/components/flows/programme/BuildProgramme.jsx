import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft } from 'lucide-react';
import ScreenHeader from '../../shared/ScreenHeader';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import { storage } from '../../../utils/storage';
import { generateProgrammeOverview } from '../../../api/anthropic';

const GOALS = [
  { id: 'muscle', label: 'Build muscle and strength' },
  { id: 'fat_loss', label: 'Lose fat and get lean' },
  { id: 'endurance', label: 'Improve endurance and fitness' },
  { id: 'recomp', label: 'Body recomposition' },
  { id: 'sport', label: 'Train for an event or sport' },
  { id: 'health', label: 'General health and wellbeing' },
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
      <div className="flex flex-col min-h-screen max-w-[430px] mx-auto" style={{ background: '#0A0A0A' }}>
        <ScreenHeader title="Building Programme" />
        <LoadingState message="Your trainer is designing your programme..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen max-w-[430px] mx-auto" style={{ background: '#0A0A0A' }}>
        <ScreenHeader title="Error" onBack={() => setError(null)} />
        <ErrorState message={error} onRetry={generateOverview} />
      </div>
    );
  }

  /* Step counter style */
  const stepCounter = (
    <div style={{
      fontFamily: "'Inter', sans-serif",
      fontSize: 10,
      fontWeight: 500,
      color: '#555555',
      textAlign: 'right',
      marginBottom: 16,
    }}>
      {step + 1} / {totalSteps}
    </div>
  );

  const steps = [
    // Goal
    <div key={0} className="animate-fade-in" style={{ padding: '0 16px' }}>
      {stepCounter}
      <h2 style={{
        fontFamily: "'Oswald', sans-serif",
        fontWeight: 700,
        fontSize: 22,
        textTransform: 'uppercase',
        color: '#FFFFFF',
        margin: '0 0 16px 0',
      }}>What&apos;s your primary goal?</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {GOALS.map(g => {
          const selected = config.goal === g.id;
          return (
            <button
              key={g.id}
              onClick={() => { update('goal', g.id); setStep(1); }}
              className="btn-press"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                background: selected ? '#E8FF00' : 'transparent',
                border: `1px solid ${selected ? '#E8FF00' : '#222222'}`,
                borderRadius: 0,
                textAlign: 'left',
                cursor: 'pointer',
                color: selected ? '#000000' : '#FFFFFF',
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <span style={{ flex: 1 }}>{g.label}</span>
              {selected && <Check size={16} style={{ color: '#000000' }} />}
            </button>
          );
        })}
      </div>
    </div>,

    // Length
    <div key={1} className="animate-fade-in" style={{ padding: '0 16px' }}>
      {stepCounter}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 700,
          fontSize: 22,
          textTransform: 'uppercase',
          color: '#FFFFFF',
          margin: '0 0 4px 0',
        }}>Programme length</h2>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: '#888888',
          margin: 0,
        }}>
          Research shows 6-8 weeks is optimal for measurable adaptation.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[4, 6, 8, 12].map(w => {
          const selected = config.weeks === w;
          return (
            <button
              key={w}
              onClick={() => update('weeks', w)}
              className="btn-press"
              style={{
                padding: '16px 0',
                background: selected ? '#E8FF00' : 'transparent',
                border: `1px solid ${selected ? '#E8FF00' : '#222222'}`,
                borderRadius: 0,
                cursor: 'pointer',
                color: selected ? '#000000' : '#888888',
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: 20,
                textAlign: 'center',
              }}
            >
              {w}
              <span style={{
                display: 'block',
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: 400,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 2,
              }}>wks</span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setStep(2)}
        className="btn-press"
        style={{
          width: '100%',
          marginTop: 20,
          padding: '14px 0',
          background: '#E8FF00',
          border: 'none',
          borderRadius: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#000000',
          cursor: 'pointer',
        }}
      >
        Continue
      </button>
    </div>,

    // Days per week
    <div key={2} className="animate-fade-in" style={{ padding: '0 16px' }}>
      {stepCounter}
      <h2 style={{
        fontFamily: "'Oswald', sans-serif",
        fontWeight: 700,
        fontSize: 22,
        textTransform: 'uppercase',
        color: '#FFFFFF',
        margin: '0 0 16px 0',
      }}>Days per week</h2>
      <div style={{ display: 'flex', gap: 8 }}>
        {[2, 3, 4, 5, 6].map(d => {
          const selected = config.daysPerWeek === d;
          return (
            <button
              key={d}
              onClick={() => update('daysPerWeek', d)}
              className="btn-press"
              style={{
                flex: 1,
                padding: '16px 0',
                background: selected ? '#E8FF00' : 'transparent',
                border: `1px solid ${selected ? '#E8FF00' : '#222222'}`,
                borderRadius: 0,
                cursor: 'pointer',
                color: selected ? '#000000' : '#888888',
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: 22,
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
      {config.daysPerWeek && (
        <div style={{
          marginTop: 16,
          padding: 16,
          border: '1px solid #222222',
        }}>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 9,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#555555',
            margin: '0 0 8px 0',
          }}>RECOMMENDED SPLIT</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(SPLITS[config.daysPerWeek] || []).map((day, i) => (
              <span
                key={i}
                style={{
                  padding: '4px 12px',
                  border: '1px solid #222222',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: '#888888',
                }}
              >
                {day.name}
              </span>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setStep(3)}
        className="btn-press"
        style={{
          width: '100%',
          marginTop: 20,
          padding: '14px 0',
          background: '#E8FF00',
          border: 'none',
          borderRadius: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#000000',
          cursor: 'pointer',
        }}
      >
        Continue
      </button>
    </div>,

    // Which days
    <div key={3} className="animate-fade-in" style={{ padding: '0 16px' }}>
      {stepCounter}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 700,
          fontSize: 22,
          textTransform: 'uppercase',
          color: '#FFFFFF',
          margin: '0 0 4px 0',
        }}>Which days?</h2>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: '#888888',
          margin: 0,
        }}>Select {config.daysPerWeek} days</p>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {DAYS.map(day => {
          const selected = config.selectedDays.includes(day);
          return (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className="btn-press"
              style={{
                flex: 1,
                padding: '12px 0',
                background: selected ? '#E8FF00' : 'transparent',
                border: `1px solid ${selected ? '#E8FF00' : '#222222'}`,
                borderRadius: 0,
                cursor: 'pointer',
                color: selected ? '#000000' : '#555555',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 500,
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
        className="btn-press"
        style={{
          width: '100%',
          marginTop: 20,
          padding: '14px 0',
          background: config.selectedDays.length === config.daysPerWeek ? '#E8FF00' : 'transparent',
          border: config.selectedDays.length === config.daysPerWeek ? 'none' : '1px solid #222222',
          borderRadius: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: config.selectedDays.length === config.daysPerWeek ? '#000000' : '#555555',
          cursor: config.selectedDays.length === config.daysPerWeek ? 'pointer' : 'default',
        }}
      >
        Continue
      </button>
    </div>,

    // Style
    <div key={4} className="animate-fade-in" style={{ padding: '0 16px' }}>
      {stepCounter}
      <h2 style={{
        fontFamily: "'Oswald', sans-serif",
        fontWeight: 700,
        fontSize: 22,
        textTransform: 'uppercase',
        color: '#FFFFFF',
        margin: '0 0 20px 0',
      }}>Programme style</h2>
      <div style={{ marginBottom: 20 }}>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 9,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#555555',
          margin: '0 0 8px 0',
        }}>PROGRESSION MODEL</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { id: 'linear', label: 'Linear', sub: 'Add weight/reps each session' },
            { id: 'undulating', label: 'Undulating', sub: 'Vary intensity across sessions' },
            { id: 'auto', label: 'Auto (Claude decides)', sub: 'Best for your goal and experience' },
          ].map(opt => {
            const selected = config.progression === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => update('progression', opt.id)}
                className="btn-press"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  background: selected ? '#E8FF00' : 'transparent',
                  border: `1px solid ${selected ? '#E8FF00' : '#222222'}`,
                  borderRadius: 0,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: selected ? '#000000' : '#FFFFFF',
                  }}>{opt.label}</div>
                  <div style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    color: selected ? '#000000' : '#555555',
                    marginTop: 2,
                  }}>{opt.sub}</div>
                </div>
                {selected && <Check size={16} style={{ color: '#000000' }} />}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 9,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#555555',
          margin: '0 0 8px 0',
        }}>DELOAD WEEK</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { id: 'yes', label: 'Every 4 weeks' },
            { id: 'no', label: 'No' },
            { id: 'auto', label: 'Auto' },
          ].map(opt => {
            const selected = config.deload === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => update('deload', opt.id)}
                className="btn-press"
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  background: selected ? '#E8FF00' : 'transparent',
                  border: `1px solid ${selected ? '#E8FF00' : '#222222'}`,
                  borderRadius: 0,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                  color: selected ? '#000000' : '#888888',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      <button
        onClick={generateOverview}
        className="btn-press"
        style={{
          width: '100%',
          padding: '16px 0',
          background: '#E8FF00',
          border: 'none',
          borderRadius: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#000000',
          cursor: 'pointer',
        }}
      >
        Build My Programme
      </button>
    </div>,

    // Review & Activate
    <div key={5} className="animate-fade-in" style={{ padding: '0 16px 32px' }}>
      {stepCounter}
      <h2 style={{
        fontFamily: "'Oswald', sans-serif",
        fontWeight: 700,
        fontSize: 22,
        textTransform: 'uppercase',
        color: '#FFFFFF',
        margin: '0 0 16px 0',
      }}>Review &amp; Activate</h2>

      {/* Schedule */}
      <div style={{ padding: 16, border: '1px solid #222222', marginBottom: 16 }}>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 9,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#555555',
          margin: '0 0 8px 0',
        }}>WEEKLY SCHEDULE</p>
        <div style={{ display: 'flex', gap: 4 }}>
          {DAYS.map(day => {
            const dayIndex = config.selectedDays.indexOf(day);
            const split = SPLITS[config.daysPerWeek] || [];
            const session = dayIndex >= 0 ? split[dayIndex % split.length] : null;
            return (
              <div
                key={day}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '8px 0',
                  border: `1px solid ${session ? '#E8FF00' : '#222222'}`,
                  background: session ? 'rgba(232,255,0,0.05)' : 'transparent',
                }}
              >
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  color: session ? '#E8FF00' : '#555555',
                }}>{day}</span>
                {session && (
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 9,
                    fontWeight: 500,
                    color: '#FFFFFF',
                    marginTop: 2,
                  }}>
                    {session.name.split(' ')[0]}
                  </span>
                )}
                {!session && <span style={{ fontSize: 10, color: '#333333' }}>--</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Overview */}
      {overview && (
        <div style={{
          padding: 16,
          borderLeft: '2px solid #E8FF00',
          marginBottom: 16,
          background: '#111111',
        }}>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 9,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#E8FF00',
            margin: '0 0 8px 0',
          }}>FROM YOUR TRAINER</p>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            lineHeight: 1.6,
            color: '#888888',
            margin: 0,
          }}>{overview}</p>
        </div>
      )}

      {/* Name */}
      <div style={{ marginBottom: 16 }}>
        <label style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 9,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#555555',
          display: 'block',
          marginBottom: 6,
        }}>Programme name (optional)</label>
        <input
          type="text"
          placeholder={`${config.daysPerWeek}-Day ${config.goal} — ${config.weeks} Weeks`}
          value={config.name}
          onChange={e => update('name', e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: '#111111',
            border: '1px solid #222222',
            borderRadius: 0,
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            color: '#FFFFFF',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <button
        onClick={activate}
        className="btn-press"
        style={{
          width: '100%',
          padding: '16px 0',
          background: '#E8FF00',
          border: 'none',
          borderRadius: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#000000',
          cursor: 'pointer',
        }}
      >
        Activate Programme
      </button>
    </div>,
  ];

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-8" style={{ background: '#0A0A0A' }}>
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
