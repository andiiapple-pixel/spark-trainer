import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Plus, Trophy, TrendingUp, TrendingDown, HelpCircle, Trash2 } from 'lucide-react';
import { storage, formatDate, getCurrentStreak, getWeeklyWorkoutCount } from '../../utils/storage';
import { data as dataApi } from '../../services/api';

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core'];

function StatCard({ label, value, sub, color = '#3b82f6', info }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col p-4 rounded-xl" style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}>
      <span className="text-2xl font-bold" style={{ color }}>{value}</span>
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{label}</span>
        {info && (
          <button onClick={() => setShow(s => !s)} className="btn-press" style={{ color: '#475569' }}>
            <HelpCircle size={13} />
          </button>
        )}
      </div>
      {sub && <span className="text-xs mt-0.5" style={{ color: '#64748b' }}>{sub}</span>}
      {info && show && (
        <p className="text-xs mt-1.5 leading-relaxed animate-fade-in" style={{ color: '#64748b' }}>{info}</p>
      )}
    </div>
  );
}

function VolumeChartHeader() {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-semibold" style={{ color: '#64748b' }}>VOLUME BY MUSCLE (sets)</p>
        <button onClick={() => setShow(s => !s)} className="btn-press" style={{ color: '#475569' }}>
          <HelpCircle size={13} />
        </button>
      </div>
      {show && (
        <p className="text-xs mt-1.5 leading-relaxed animate-fade-in" style={{ color: '#64748b' }}>
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
        <p className="text-xs font-semibold" style={{ color: '#64748b' }}>LOG ENTRIES</p>
        {hidden > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs btn-press"
            style={{ color: '#3b82f6' }}
          >
            {expanded ? 'Show less' : `+${hidden} more`}
          </button>
        )}
      </div>
      {visible.map(m => (
        <div
          key={m.id}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl animate-fade-in"
          style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}
        >
          <span className="text-sm font-semibold flex-1" style={{ color: '#f1f5f9' }}>{m.weight} kg</span>
          <span className="text-xs" style={{ color: '#64748b' }}>
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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg text-sm" style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#f1f5f9' }}>
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

  const tabs = ['body', 'training', 'prs'];

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-24">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>My Progress</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-4 mb-4">
        {[
          { id: 'body', label: 'Body Stats' },
          { id: 'training', label: 'Training' },
          { id: 'prs', label: 'PRs' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold btn-press transition-all"
            style={{
              background: activeTab === tab.id ? '#3b82f6' : '#1e1e2a',
              color: activeTab === tab.id ? '#fff' : '#64748b',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 flex flex-col gap-4">
        {/* BODY STATS */}
        {activeTab === 'body' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>WEIGHT LOG</p>
              <button
                onClick={() => setShowWeightForm(f => !f)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg btn-press"
                style={{ background: '#1e2d4a', color: '#93c5fd' }}
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
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: '#1e1e2a', border: '1px solid #3b82f6', color: '#f1f5f9' }}
                />
                <button
                  onClick={logWeight}
                  className="px-4 py-2.5 rounded-xl font-semibold text-sm btn-press"
                  style={{ background: '#3b82f6', color: '#fff' }}
                >
                  Save
                </button>
              </div>
            )}

            {weightData.length > 1 ? (
              <div className="p-4 rounded-xl" style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
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
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center py-10 rounded-xl"
                style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}
              >
                <p className="text-sm" style={{ color: '#64748b' }}>Log 2+ weights to see your trend chart.</p>
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
                  value={`${tdee}`}
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
              <StatCard label="Total workouts" value={history.length} color="#3b82f6" />
              <StatCard label="Current streak" value={`${streak} 🔥`} sub="days" color="#f97316" />
              <StatCard label="This week" value={weeklyCount} sub={`of ${profile?.daysPerWeek || 3} planned`} color="#10b981" />
              <StatCard label="All time" value={`${history.reduce((a, w) => a + (w.duration_mins || 0), 0)}m`} sub="total training" color="#8b5cf6" />
            </div>

            {volumeData.length > 0 && (
              <div className="p-4 rounded-xl" style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}>
                <VolumeChartHeader />
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={volumeData} margin={{ bottom: 55 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
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
                    <Bar dataKey="sets" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* PERSONAL RECORDS */}
        {activeTab === 'prs' && (
          <>
            <p className="text-xs font-semibold" style={{ color: '#64748b' }}>PERSONAL BESTS</p>
            {Object.keys(prs).length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-10 rounded-xl text-center"
                style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}
              >
                <Trophy size={32} style={{ color: '#2a2a3a', marginBottom: 8 }} />
                <p className="text-sm" style={{ color: '#64748b' }}>Log weights during workouts to set your first PRs.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {Object.values(prs)
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((pr) => (
                    <div
                      key={pr.exerciseName}
                      className="flex items-center gap-4 px-4 py-3 rounded-xl"
                      style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}
                    >
                      <Trophy size={16} style={{ color: '#f97316' }} />
                      <div className="flex-1">
                        <div className="font-medium text-sm" style={{ color: '#f1f5f9' }}>{pr.exerciseName}</div>
                        <div className="text-xs" style={{ color: '#64748b' }}>{formatDate(pr.date)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold" style={{ color: '#f97316' }}>{pr.weight}kg</div>
                        <div className="text-xs" style={{ color: '#64748b' }}>{pr.reps} reps</div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
