import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Plus, Trophy, TrendingUp, TrendingDown, HelpCircle, Trash2 } from 'lucide-react';
import { storage, formatDate, getCurrentStreak, getWeeklyWorkoutCount } from '../../utils/storage';
import { data as dataApi, recovery as recoveryApi } from '../../services/api';
import RecoveryCheckin, { CircleScore, getScoreInfo } from '../recovery/RecoveryCheckin';

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core'];

const HEATMAP_MUSCLES = [
  { key: 'chest', label: 'Chest' },
  { key: 'back', label: 'Back' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'arms', label: 'Arms' },
  { key: 'legs', label: 'Legs' },
  { key: 'core', label: 'Core' },
  { key: 'cardio', label: 'Cardio' },
];

function MuscleHeatmap({ history }) {
  const now = Date.now();
  const week = 7 * 24 * 3600 * 1000;

  const counts7 = {};
  const counts30 = {};

  history.forEach(w => {
    const age = now - new Date(w.savedAt || w.completed_at || 0).getTime();
    (w.exercises || []).forEach(ex => {
      const mgs = ex.prescribed?.muscle_groups || ex.muscle_groups || [];
      mgs.forEach(mg => {
        const key = mg.toLowerCase().split(' ')[0]; // chest, back, etc
        if (age <= week) counts7[key] = (counts7[key] || 0) + 1;
        if (age <= 30 * 24 * 3600 * 1000) counts30[key] = (counts30[key] || 0) + 1;
      });
    });
  });

  function getColor(count) {
    if (!count) return '#1a1a24';
    if (count === 1) return 'rgba(99,102,241,0.2)';
    if (count <= 3) return 'rgba(99,102,241,0.45)';
    if (count <= 5) return '#6366f1';
    return '#f97316';
  }

  return (
    <div className="p-4 rounded-2xl" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
      <p className="text-xs font-semibold mb-3" style={{ color: '#475569', letterSpacing: '0.06em' }}>MUSCLE FREQUENCY — LAST 7 DAYS</p>
      <div className="grid grid-cols-4 gap-2">
        {HEATMAP_MUSCLES.map(m => {
          const count = counts7[m.key] || 0;
          const color = getColor(count);
          return (
            <div key={m.key} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: color, border: '1px solid #2d2d3d' }}>
                <span className="text-white text-sm font-bold">{count || '—'}</span>
              </div>
              <span className="text-xs text-center" style={{ color: '#475569' }}>{m.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3">
        <span className="text-xs" style={{ color: '#475569' }}>None</span>
        {['rgba(99,102,241,0.2)', 'rgba(99,102,241,0.45)', '#6366f1', '#f97316'].map((c, i) => (
          <div key={i} className="w-4 h-4 rounded" style={{ background: c }} />
        ))}
        <span className="text-xs" style={{ color: '#475569' }}>High</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color = '#6366f1', info }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col p-4 rounded-2xl" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
      <span className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</span>
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-sm font-medium" style={{ color: '#f8fafc' }}>{label}</span>
        {info && (
          <button onClick={() => setShow(s => !s)} className="btn-press" style={{ color: '#475569' }}>
            <HelpCircle size={13} />
          </button>
        )}
      </div>
      {sub && <span className="text-xs mt-0.5" style={{ color: '#475569' }}>{sub}</span>}
      {info && show && (
        <p className="text-xs mt-1.5 leading-relaxed animate-fade-in" style={{ color: '#475569' }}>{info}</p>
      )}
    </div>
  );
}

function VolumeChartHeader() {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-semibold" style={{ color: '#475569', letterSpacing: '0.06em' }}>VOLUME BY MUSCLE (sets)</p>
        <button onClick={() => setShow(s => !s)} className="btn-press" style={{ color: '#475569' }}>
          <HelpCircle size={13} />
        </button>
      </div>
      {show && (
        <p className="text-xs mt-1.5 leading-relaxed animate-fade-in" style={{ color: '#475569' }}>
          Total sets logged per muscle group across your last 20 workouts. A balanced chart means you're training your whole body evenly — spikes or gaps can highlight what you're over- or under-training.
        </p>
      )}
    </div>
  );
}

function WeightLogEntries({ metrics, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const entries = [...metrics].filter(m => m.weight).reverse();
  if (!entries.length) return null;
  const visible = expanded ? entries : entries.slice(0, 3);
  const hidden = entries.length - 3;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold" style={{ color: '#475569', letterSpacing: '0.06em' }}>LOG ENTRIES</p>
        {hidden > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs btn-press"
            style={{ color: '#6366f1' }}
          >
            {expanded ? 'Show less' : `+${hidden} more`}
          </button>
        )}
      </div>
      {visible.map(m => (
        <div
          key={m.id}
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl animate-fade-in"
          style={{ background: '#111118', border: '1px solid #1e1e2e' }}
        >
          <span className="text-sm font-semibold flex-1 tabular-nums" style={{ color: '#f8fafc' }}>{m.weight} kg</span>
          <span className="text-xs" style={{ color: '#475569' }}>
            {new Date(m.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <button
            onClick={() => onDelete(m.id)}
            className="p-1.5 rounded-lg btn-press"
            style={{ color: '#ef4444' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// Epley formula: estimated 1RM
function epley(weight, reps) {
  if (!weight || !reps || reps <= 0) return null;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

function StrengthChart({ exerciseName, history }) {
  const dataPoints = [];
  history.forEach(w => {
    const ex = (w.exercises || []).find(e => e.name?.toLowerCase() === exerciseName.toLowerCase());
    if (!ex?.sets_logged?.length) return;
    const best = ex.sets_logged.reduce((max, s) => {
      const rm = epley(parseFloat(s.weight), parseInt(s.reps));
      return rm > max ? rm : max;
    }, 0);
    if (best > 0) {
      dataPoints.push({
        date: new Date(w.savedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
        '1RM': best,
      });
    }
  });
  // Oldest first
  dataPoints.reverse();

  if (dataPoints.length < 2) {
    return (
      <p className="text-xs py-4 text-center" style={{ color: '#475569' }}>
        Log {exerciseName} in at least 2 workouts to see your strength trend.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={dataPoints}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} />
        <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} unit="kg" />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="1RM" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-sm" style={{ background: '#111118', border: '1px solid #2d2d3d', color: '#f8fafc' }}>
      <p className="font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.value}{p.unit || ''}</p>
      ))}
    </div>
  );
}

// Map API workout DB row → history shape used for stats
function adaptApiWorkout(w) {
  const wData = w.workout_data
    ? (typeof w.workout_data === 'string' ? JSON.parse(w.workout_data) : w.workout_data)
    : {};
  return {
    id: w.id,
    type: w.workout_type || wData.sessionConfig?.focus || 'custom',
    duration_mins: w.duration_mins || 0,
    total_volume: w.total_volume_kg,
    savedAt: w.completed_at,
    exercises: wData.exercises || [],
    user_notes_today: w.user_notes_today,
  };
}

export default function Progress() {
  const [activeTab, setActiveTab] = useState('body');
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [selectedPR, setSelectedPR] = useState(null);

  const profile = storage.getProfile();

  // Data loaded from API, seeded from localStorage while loading
  const [metrics, setMetrics] = useState(() => storage.getHealthMetrics());
  const [history, setHistory] = useState(() => storage.getWorkoutHistory());
  const [prs, setPrs] = useState(() => storage.getPersonalRecords());

  useEffect(() => {
    dataApi.getHealthMetrics()
      .then(res => {
        const apiMetrics = (res.metrics || []).map(m => ({
          id: m.id,
          date: m.logged_at,
          weight: m.weight_kg ? String(m.weight_kg) : null,
        }));
        if (apiMetrics.length > 0) setMetrics(apiMetrics);
      })
      .catch(() => {});

    dataApi.getWorkouts({ limit: 100 })
      .then(res => {
        const workouts = (res.workouts || []).map(adaptApiWorkout);
        if (workouts.length > 0) setHistory(workouts);
      })
      .catch(() => {});

    dataApi.getPersonalRecords()
      .then(res => {
        const records = res.records || [];
        if (records.length > 0) {
          const prMap = {};
          records.forEach(r => {
            prMap[r.exercise_name] = {
              exerciseName: r.exercise_name,
              weight: r.weight_kg,
              reps: r.reps,
              date: r.set_at,
            };
          });
          setPrs(prMap);
        }
      })
      .catch(() => {});
  }, []);

  const streak = getCurrentStreak(history);
  const weeklyCount = getWeeklyWorkoutCount(history);

  const weightData = metrics
    .filter(m => m.weight)
    .slice(-30)
    .map(m => ({
      date: new Date(m.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
      weight: parseFloat(m.weight),
    }));

  const latestWeight = weightData[weightData.length - 1]?.weight;
  const prevWeight = weightData[weightData.length - 2]?.weight;
  const weightTrend = latestWeight && prevWeight ? latestWeight - prevWeight : 0;

  // Volume by muscle group (last 4 weeks)
  const formatMuscle = (mg) => mg
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bAnd\b/g, '&');

  const muscleVolume = {};
  history.slice(0, 20).forEach(w => {
    (w.exercises || []).forEach(ex => {
      (ex.prescribed?.muscle_groups || []).forEach(mg => {
        const label = formatMuscle(mg);
        muscleVolume[label] = (muscleVolume[label] || 0) + (ex.sets_logged?.length || 0);
      });
    });
  });
  const volumeData = Object.entries(muscleVolume)
    .map(([name, sets]) => ({ name, sets }))
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 7);

  // BMI
  const bmi = profile?.heightCm && profile?.weightKg
    ? (parseFloat(latestWeight || profile.weightKg) / Math.pow(parseFloat(profile.heightCm) / 100, 2)).toFixed(1)
    : null;

  // TDEE estimate
  const tdee = profile ? (() => {
    const w = parseFloat(latestWeight || profile.weightKg) || 70;
    const h = parseFloat(profile.heightCm) || 170;
    const a = parseFloat(profile.age) || 30;
    const bmr = profile.sex === 'Female'
      ? 10 * w + 6.25 * h - 5 * a - 161
      : 10 * w + 6.25 * h - 5 * a + 5;
    const multipliers = { 2: 1.375, 3: 1.55, 4: 1.55, 5: 1.725, 6: 1.725 };
    return Math.round(bmr * (multipliers[profile.daysPerWeek] || 1.55));
  })() : null;

  async function logWeight() {
    if (!newWeight) return;
    const val = parseFloat(newWeight);
    if (isNaN(val)) return;
    // Optimistic update
    const localEntry = { id: Date.now(), date: new Date().toISOString(), weight: String(val) };
    setMetrics(prev => [...prev, localEntry]);
    storage.addHealthMetric({ weight: String(val) });
    setNewWeight('');
    setShowWeightForm(false);
    // Persist to API
    dataApi.saveHealthMetric({ weight_kg: val })
      .then(res => {
        if (res.metric) {
          const saved = { id: res.metric.id, date: res.metric.logged_at, weight: String(res.metric.weight_kg) };
          setMetrics(prev => [...prev.filter(m => m.id !== localEntry.id), saved]);
        }
      })
      .catch(() => {});
  }

  function deleteMetric(id) {
    setMetrics(prev => prev.filter(m => m.id !== id));
    dataApi.deleteHealthMetric(id).catch(() => {});
  }

  const [recoveryLogs, setRecoveryLogs] = useState([]);
  useEffect(() => {
    recoveryApi.getLogs().then(r => setRecoveryLogs(r.logs || [])).catch(() => {});
  }, []);

  const tabs = ['body', 'training', 'prs', 'recovery'];

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-24" style={{ background: '#0a0a0f' }}>
      <div className="px-5 pt-14 pb-4">
        <h1 className="font-bold" style={{ color: '#f8fafc', fontSize: 24, letterSpacing: '-0.01em' }}>My Progress</h1>
      </div>

      {/* Tab bar */}
      <div className="flex px-5 mb-4 border-b" style={{ borderColor: '#1e1e2e' }}>
        {[
          { id: 'body', label: 'Body' },
          { id: 'training', label: 'Training' },
          { id: 'prs', label: 'PRs' },
          { id: 'recovery', label: 'Recovery' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 text-sm font-semibold btn-press relative"
            style={{ color: activeTab === tab.id ? '#818cf8' : '#475569' }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ background: '#6366f1' }} />
            )}
          </button>
        ))}
      </div>

      <div className="px-5 flex flex-col gap-4">
        {/* BODY STATS */}
        {activeTab === 'body' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold" style={{ color: '#475569', letterSpacing: '0.06em' }}>WEIGHT LOG</p>
              <button
                onClick={() => setShowWeightForm(f => !f)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full btn-press"
                style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <Plus size={14} /> Log weight
              </button>
            </div>

            {showWeightForm && (
              <div className="flex gap-2 animate-fade-in">
                <input
                  type="number"
                  placeholder="e.g. 75.5 kg"
                  value={newWeight}
                  onChange={e => setNewWeight(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none"
                  style={{ background: '#111118', border: '1px solid #6366f1', color: '#f8fafc', fontSize: 16 }}
                />
                <button
                  onClick={logWeight}
                  className="px-4 py-2.5 rounded-full font-semibold text-sm btn-press"
                  style={{ background: '#6366f1', color: '#fff' }}
                >
                  Save
                </button>
              </div>
            )}

            {weightData.length > 1 ? (
              <div className="p-4 rounded-2xl" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Last 30 days</span>
                  {weightTrend !== 0 && (
                    <span
                      className="flex items-center gap-1 text-sm font-semibold"
                      style={{ color: weightTrend < 0 ? '#10b981' : '#f97316' }}
                    >
                      {weightTrend < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                      {Math.abs(weightTrend).toFixed(1)}kg
                    </span>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={weightData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                    <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} />
                    <YAxis
                      tick={{ fill: '#475569', fontSize: 10 }}
                      tickLine={false}
                      domain={['dataMin - 2', 'dataMax + 2']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ fill: '#6366f1', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center py-10 rounded-2xl"
                style={{ background: '#111118', border: '1px solid #1e1e2e' }}
              >
                <p className="text-sm" style={{ color: '#475569' }}>Log 2+ weights to see your trend chart.</p>
              </div>
            )}

            {/* Weight log entries */}
            <WeightLogEntries metrics={metrics} onDelete={deleteMetric} />

            {/* BMI / TDEE */}
            <div className="grid grid-cols-2 gap-3">
              {bmi && (
                <StatCard
                  label="BMI"
                  value={bmi}
                  sub={bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : 'Obese'}
                  color="#06b6d4"
                  info="Body Mass Index — your weight relative to your height. It's a rough population-level indicator, not a measure of fitness. Muscular people often read as 'overweight' even when very lean."
                />
              )}
              {tdee && (
                <StatCard
                  label="Est. TDEE"
                  value={String(tdee)}
                  sub="kcal / day"
                  color="#f97316"
                  info="Total Daily Energy Expenditure — an estimate of how many calories you burn in a day based on your stats and training frequency. Eat near this number to maintain weight, below it to lose fat, above it to gain muscle."
                />
              )}
            </div>
          </>
        )}

        {/* TRAINING */}
        {activeTab === 'training' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total workouts" value={history.length} color="#6366f1" />
              <StatCard label="Current streak" value={`${streak} 🔥`} sub="days" color="#f97316" />
              <StatCard label="This week" value={weeklyCount} sub={`of ${profile?.daysPerWeek || 3} planned`} color="#10b981" />
              <StatCard label="All time" value={`${history.reduce((a, w) => a + (w.duration_mins || 0), 0)}m`} sub="total training" color="#8b5cf6" />
            </div>

            {/* Acute:Chronic Workload Ratio */}
            {(() => {
              const now = Date.now();
              const weekMs = 7 * 86400000;
              const getVol = (from, to) => history
                .filter(w => { const t = new Date(w.savedAt).getTime(); return t >= from && t < to; })
                .reduce((sum, w) => sum + (w.total_volume || 0), 0);
              const acute = getVol(now - weekMs, now);
              const chronic4 = [0,1,2,3].reduce((sum, i) => sum + getVol(now - (i+1)*weekMs, now - i*weekMs), 0) / 4;
              if (!chronic4 || !acute) return null;
              const acwr = (acute / chronic4).toFixed(2);
              const acwrColor = acwr < 0.8 ? '#6366f1' : acwr <= 1.3 ? '#10b981' : '#ef4444';
              const acwrLabel = acwr < 0.8 ? 'Low — consider adding volume' : acwr <= 1.3 ? 'Optimal training load' : 'High — injury risk zone';
              return (
                <div className="p-4 rounded-2xl" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#475569', letterSpacing: '0.06em' }}>WORKLOAD RATIO (ACWR)</p>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold tabular-nums" style={{ color: acwrColor }}>{acwr}</div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: acwrColor }}>{acwrLabel}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#475569' }}>This week vs 4-week avg · Safe zone: 0.8–1.3</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e2e' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(parseFloat(acwr) / 2 * 100, 100)}%`, background: acwrColor, transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })()}

            {volumeData.length > 0 && (
              <div className="p-4 rounded-2xl" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
                <VolumeChartHeader />
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={volumeData} margin={{ bottom: 55 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#475569', fontSize: 10 }}
                      tickLine={false}
                      angle={-40}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="sets" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Muscle Heatmap */}
            <MuscleHeatmap history={history} />
          </>
        )}

        {/* PERSONAL RECORDS */}
        {activeTab === 'prs' && (
          <>
            <p className="text-xs font-semibold" style={{ color: '#475569', letterSpacing: '0.06em' }}>PERSONAL BESTS</p>
            {Object.keys(prs).length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-10 rounded-2xl text-center"
                style={{ background: '#111118', border: '1px solid #1e1e2e' }}
              >
                <Trophy size={32} style={{ color: '#2d2d3d', marginBottom: 8 }} />
                <p className="text-sm" style={{ color: '#475569' }}>Log weights during workouts to set your first PRs.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {Object.values(prs)
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((pr) => (
                    <button
                      key={pr.exerciseName}
                      onClick={() => setSelectedPR(selectedPR === pr.exerciseName ? null : pr.exerciseName)}
                      className="flex items-center gap-4 px-4 py-3 rounded-2xl text-left btn-press"
                      style={{
                        background: selectedPR === pr.exerciseName ? 'rgba(99,102,241,0.1)' : '#111118',
                        border: `1px solid ${selectedPR === pr.exerciseName ? '#6366f150' : '#1e1e2e'}`,
                      }}
                    >
                      <Trophy size={16} style={{ color: '#f59e0b' }} />
                      <div className="flex-1">
                        <div className="font-medium text-sm" style={{ color: '#f8fafc' }}>{pr.exerciseName}</div>
                        <div className="text-xs" style={{ color: '#475569' }}>{formatDate(pr.date)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold tabular-nums" style={{ color: '#f97316' }}>{pr.weight}kg</div>
                        <div className="text-xs" style={{ color: '#475569' }}>{pr.reps} reps</div>
                      </div>
                    </button>
                  ))}
              </div>
            )}

            {/* Strength Progress Chart */}
            {selectedPR && (
              <div className="p-4 rounded-2xl animate-fade-in" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold" style={{ color: '#475569', letterSpacing: '0.06em' }}>EST. 1RM TREND — {selectedPR.toUpperCase()}</p>
                  <p className="text-xs" style={{ color: '#475569' }}>Epley formula</p>
                </div>
                <StrengthChart exerciseName={selectedPR} history={history} />
              </div>
            )}
          </>
        )}

        {/* RECOVERY */}
        {activeTab === 'recovery' && (
          <>
            <RecoveryCheckin />
            {recoveryLogs.length > 0 && (
              <>
                <p className="text-xs font-semibold" style={{ color: '#475569', letterSpacing: '0.06em' }}>LAST 7 DAYS</p>
                <div className="flex flex-col gap-2">
                  {recoveryLogs.slice(0, 7).map(log => {
                    const info = getScoreInfo(log.recovery_score);
                    return (
                      <div key={log.id} className="flex items-center gap-3 p-3 rounded-2xl"
                        style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
                        <CircleScore score={log.recovery_score} color={info.color} size={44} />
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: '#f8fafc' }}>{info.label}</p>
                          <p className="text-xs" style={{ color: '#475569' }}>
                            {new Date(log.logged_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <div className="text-xs text-right" style={{ color: '#475569' }}>
                          <div>Sleep: {log.sleep_quality}</div>
                          <div>Stress: {log.stress_level}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
