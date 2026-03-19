import { useState, useEffect } from 'react';
import { recovery as recoveryApi } from '../../services/api';

const QUESTIONS = [
  {
    key: 'sleep_quality',
    label: 'Sleep quality last night',
    options: [
      { value: 'poor',  emoji: '😴', label: 'Poor' },
      { value: 'ok',    emoji: '😐', label: 'OK' },
      { value: 'good',  emoji: '😊', label: 'Good' },
      { value: 'great', emoji: '🌟', label: 'Great' },
    ],
  },
  {
    key: 'sleep_duration',
    label: 'Hours of sleep',
    options: [
      { value: 'under-6', emoji: '⏰', label: 'Under 6h' },
      { value: '6-7',     emoji: '😴', label: '6–7h' },
      { value: '7-8',     emoji: '🌙', label: '7–8h' },
      { value: '8+',      emoji: '💤', label: '8h+' },
    ],
  },
  {
    key: 'body_feeling',
    label: 'How does your body feel?',
    options: [
      { value: 'very-sore',    emoji: '😣', label: 'Very sore' },
      { value: 'somewhat-sore', emoji: '😕', label: 'Somewhat sore' },
      { value: 'fresh',        emoji: '💪', label: 'Fresh' },
      { value: 'energised',    emoji: '⚡', label: 'Energised' },
    ],
  },
  {
    key: 'stress_level',
    label: 'Stress level today',
    options: [
      { value: 'high',     emoji: '😰', label: 'High' },
      { value: 'moderate', emoji: '😐', label: 'Moderate' },
      { value: 'low',      emoji: '😌', label: 'Low' },
    ],
  },
];

function calcScore({ sleep_quality, sleep_duration, body_feeling, stress_level }) {
  let score = 0;
  score += { poor: 0, ok: 25, good: 35, great: 40 }[sleep_quality] ?? 0;
  score += { 'under-6': 0, '6-7': 10, '7-8': 20, '8+': 25 }[sleep_duration] ?? 0;
  score += { 'very-sore': 0, 'somewhat-sore': 5, fresh: 15, energised: 20 }[body_feeling] ?? 0;
  score += { high: 0, moderate: 5, low: 15 }[stress_level] ?? 0;
  return Math.min(100, Math.max(0, score));
}

function getScoreInfo(score) {
  if (score <= 40) return { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', label: 'Recovery needed', desc: 'Consider rest or light movement today.' };
  if (score <= 65) return { color: '#f97316', bg: 'rgba(249,115,22,0.08)', label: 'Train with caution', desc: 'Moderate intensity recommended.' };
  if (score <= 85) return { color: '#10b981', bg: 'rgba(16,185,129,0.08)', label: 'Good to train', desc: 'Standard workout recommended.' };
  return { color: '#6366f1', bg: 'rgba(99,102,241,0.08)', label: 'Peak performance', desc: 'Great day to push hard. Consider a PR attempt!' };
}

export default function RecoveryCheckin({ onDone, compact = false }) {
  const [answers, setAnswers] = useState({});
  const [todayLog, setTodayLog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingToday, setLoadingToday] = useState(true);

  useEffect(() => {
    recoveryApi.getToday()
      .then(r => {
        if (r.log) {
          setTodayLog(r.log);
          setSaved(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingToday(false));
  }, []);

  const allAnswered = QUESTIONS.every(q => answers[q.key]);
  const previewScore = allAnswered ? calcScore(answers) : null;
  const previewInfo = previewScore !== null ? getScoreInfo(previewScore) : null;
  const displayLog = todayLog && saved ? todayLog : null;
  const displayScore = displayLog?.recovery_score ?? previewScore;
  const displayInfo = displayScore !== null ? getScoreInfo(displayScore) : null;

  async function submit() {
    if (!allAnswered) return;
    setSaving(true);
    try {
      const res = await recoveryApi.logCheckin(answers);
      setTodayLog(res.log);
      setSaved(true);
      onDone?.(res.log);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (loadingToday) return null;

  // Show score if already logged today
  if (saved && todayLog) {
    const info = getScoreInfo(todayLog.recovery_score);
    return (
      <div className="p-4 rounded-2xl" style={{ background: info.bg, border: `1px solid ${info.color}40` }}>
        <div className="flex items-center gap-4">
          <CircleScore score={todayLog.recovery_score} color={info.color} size={compact ? 52 : 64} />
          <div>
            <p className="text-xs font-semibold" style={{ color: info.color, letterSpacing: '0.05em' }}>TODAY'S RECOVERY</p>
            <p className="font-bold text-lg" style={{ color: '#f8fafc' }}>{info.label}</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{info.desc}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl space-y-4" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
      <div>
        <p className="font-semibold" style={{ color: '#f8fafc' }}>Daily Recovery Check-in</p>
        <p className="text-xs mt-0.5" style={{ color: '#475569' }}>30 seconds · helps your trainer personalise today's session</p>
      </div>

      {QUESTIONS.map(q => (
        <div key={q.key}>
          <p className="text-sm mb-2" style={{ color: '#94a3b8' }}>{q.label}</p>
          <div className="flex gap-2">
            {q.options.map(opt => (
              <button
                key={opt.value}
                onClick={() => setAnswers(a => ({ ...a, [q.key]: opt.value }))}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl text-xs btn-press"
                style={{
                  background: answers[q.key] === opt.value ? 'rgba(99,102,241,0.12)' : '#1a1a24',
                  border: `1px solid ${answers[q.key] === opt.value ? '#6366f150' : '#2d2d3d'}`,
                  color: answers[q.key] === opt.value ? '#818cf8' : '#94a3b8',
                }}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Preview score */}
      {previewInfo && (
        <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: previewInfo.bg, border: `1px solid ${previewInfo.color}40` }}>
          <CircleScore score={previewScore} color={previewInfo.color} size={44} />
          <div>
            <p className="font-semibold text-sm" style={{ color: '#f8fafc' }}>{previewInfo.label}</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>{previewInfo.desc}</p>
          </div>
        </div>
      )}

      <button
        onClick={submit}
        disabled={!allAnswered || saving}
        className="w-full py-3 rounded-full font-semibold text-sm btn-press"
        style={{
          background: allAnswered ? '#6366f1' : '#1a1a24',
          color: allAnswered ? '#fff' : '#475569',
        }}
      >
        {saving ? 'Saving...' : 'Log Recovery'}
      </button>
    </div>
  );
}

function CircleScore({ score, color, size = 64 }) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e1e2e" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
        style={{ transform: `rotate(90deg) translate(0px, -${size}px)`, fontSize: size > 52 ? '14px' : '11px', fontWeight: 'bold', fill: color }}>
        {score}
      </text>
    </svg>
  );
}

export { calcScore, getScoreInfo, CircleScore };
