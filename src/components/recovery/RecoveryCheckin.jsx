import { useState, useEffect } from 'react';
import { recovery as recoveryApi } from '../../services/api';

const QUESTIONS = [
  {
    key: 'sleep_quality',
    label: 'SLEEP QUALITY',
    options: [
      { value: 'poor',  label: 'Poor' },
      { value: 'ok',    label: 'OK' },
      { value: 'good',  label: 'Good' },
      { value: 'great', label: 'Great' },
    ],
  },
  {
    key: 'sleep_duration',
    label: 'HOURS OF SLEEP',
    options: [
      { value: 'under-6', label: 'Under 6h' },
      { value: '6-7',     label: '6-7h' },
      { value: '7-8',     label: '7-8h' },
      { value: '8+',      label: '8h+' },
    ],
  },
  {
    key: 'body_feeling',
    label: 'BODY FEELING',
    options: [
      { value: 'very-sore',    label: 'Very sore' },
      { value: 'somewhat-sore', label: 'Somewhat' },
      { value: 'fresh',        label: 'Fresh' },
      { value: 'energised',    label: 'Energised' },
    ],
  },
  {
    key: 'stress_level',
    label: 'STRESS LEVEL',
    options: [
      { value: 'high',     label: 'High' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'low',      label: 'Low' },
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
  if (score <= 40) return { label: 'Recovery needed', desc: 'Consider rest or light movement today.' };
  if (score <= 65) return { label: 'Train with caution', desc: 'Moderate intensity recommended.' };
  if (score <= 85) return { label: 'Good to train', desc: 'Standard workout recommended.' };
  return { label: 'Peak performance', desc: 'Great day to push hard. Consider a PR attempt!' };
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
    const scoreColor = todayLog.recovery_score > 80 ? '#E8FF00' : '#FFFFFF';
    return (
      <div style={{ padding: compact ? 12 : 16, background: 'transparent', border: '1px solid #222222' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: compact ? 36 : 48,
            color: scoreColor,
            lineHeight: 1,
            minWidth: compact ? 52 : 64,
            textAlign: 'center',
          }}>
            {todayLog.recovery_score}
          </div>
          <div>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#555555',
              margin: 0,
            }}>TODAY&apos;S RECOVERY</p>
            <p style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              textTransform: 'uppercase',
              color: '#FFFFFF',
              margin: '4px 0 0 0',
            }}>{info.label}</p>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: '#888888',
              margin: '2px 0 0 0',
            }}>{info.desc}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, background: 'transparent' }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 700,
          fontSize: 18,
          textTransform: 'uppercase',
          color: '#FFFFFF',
          margin: 0,
        }}>Daily Recovery Check-in</p>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          color: '#555555',
          margin: '4px 0 0 0',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>30 seconds — helps personalise today&apos;s session</p>
      </div>

      {QUESTIONS.map(q => (
        <div key={q.key} style={{ marginBottom: 16 }}>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 9,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#555555',
            margin: '0 0 8px 0',
          }}>{q.label}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {q.options.map(opt => {
              const selected = answers[q.key] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setAnswers(a => ({ ...a, [q.key]: opt.value }))}
                  className="btn-press"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: compact ? 40 : 48,
                    padding: '8px 4px',
                    background: selected ? '#E8FF00' : 'transparent',
                    border: `1px solid ${selected ? '#E8FF00' : '#222222'}`,
                    borderRadius: 0,
                    color: selected ? '#000000' : '#888888',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    fontWeight: selected ? 500 : 400,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Preview score */}
      {previewInfo && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          border: '1px solid #222222',
          marginBottom: 16,
        }}>
          <div style={{
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: 32,
            color: previewScore > 80 ? '#E8FF00' : '#FFFFFF',
            lineHeight: 1,
            minWidth: 44,
            textAlign: 'center',
          }}>
            {previewScore}
          </div>
          <div>
            <p style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              textTransform: 'uppercase',
              color: '#FFFFFF',
              margin: 0,
            }}>{previewInfo.label}</p>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: '#888888',
              margin: '2px 0 0 0',
            }}>{previewInfo.desc}</p>
          </div>
        </div>
      )}

      <button
        onClick={submit}
        disabled={!allAnswered || saving}
        className="btn-press"
        style={{
          width: '100%',
          padding: '14px 0',
          background: allAnswered ? '#E8FF00' : 'transparent',
          border: allAnswered ? 'none' : '1px solid #222222',
          borderRadius: 0,
          color: allAnswered ? '#000000' : '#555555',
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          cursor: allAnswered ? 'pointer' : 'default',
        }}
      >
        {saving ? 'Saving...' : 'Log Recovery'}
      </button>
    </div>
  );
}

function CircleScore({ score, color, size = 64 }) {
  const scoreColor = score > 80 ? '#E8FF00' : '#FFFFFF';
  return (
    <div style={{
      fontFamily: "'Oswald', sans-serif",
      fontWeight: 700,
      fontSize: size > 52 ? 32 : 24,
      color: scoreColor,
      lineHeight: 1,
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #222222',
    }}>
      {score}
    </div>
  );
}

export { calcScore, getScoreInfo, CircleScore };
