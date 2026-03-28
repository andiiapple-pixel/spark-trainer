import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Zap } from 'lucide-react';
import { storage, getMotivationalLine, getWeeklyWorkoutCount, getCurrentStreak } from '../../utils/storage';
import { useAuth } from '../../auth/AuthContext';
import { useActiveWorkout } from '../../context/ActiveWorkoutContext';
import { RecoveryCheckinOnce } from '../recovery/RecoveryCheckin';
import { recovery as recoveryApi } from '../../services/api';
import { generateDailyMessage } from '../../api/anthropic';

function getDeloadSuggestion(history) {
  if (history.length < 8) return null;
  const now = Date.now();
  const weekMs = 7 * 86400000;
  const weekCounts = [0, 1, 2, 3].map(w => {
    const from = now - (w + 1) * weekMs;
    const to = now - w * weekMs;
    return history.filter(h => {
      const t = new Date(h.savedAt).getTime();
      return t >= from && t < to;
    }).length;
  });
  const consistentWeeks = weekCounts.slice(0, 3).filter(c => c >= 2).length;
  if (consistentWeeks >= 3) return `3+ weeks of consistent training — a deload week can boost long-term progress.`;
  return null;
}

export default function Home() {
  const navigate = useNavigate();
  const { profile: authProfile, user: authUser } = useAuth();
  const ctx = useActiveWorkout();
  const [deloadDismissed, setDeloadDismissed] = useState(
    () => localStorage.getItem('spark_deload_dismissed') === new Date().toDateString()
  );
  const [dailyMessage, setDailyMessage] = useState(() => {
    const cached = localStorage.getItem('spark_daily_msg');
    if (cached) {
      try {
        const { date, text } = JSON.parse(cached);
        if (date === new Date().toDateString()) return text;
      } catch { /* ignore */ }
    }
    return null;
  });

  const [recoveryScore, setRecoveryScore] = useState(null);
  const [showCustomConfirm, setShowCustomConfirm] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(() => {
    if (sessionStorage.getItem('spark_workout_saved')) {
      sessionStorage.removeItem('spark_workout_saved');
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (showSavedToast) {
      const t = setTimeout(() => setShowSavedToast(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showSavedToast]);

  useEffect(() => {
    recoveryApi.getToday()
      .then(r => { if (r.log) setRecoveryScore(r.log.recovery_score); })
      .catch(() => {});
  }, []);

  const profile = authProfile || storage.getProfile();
  const history = storage.getWorkoutHistory();
  const programme = storage.getActiveProgramme();
  const { hasActiveWorkout, workout: activeWkt, status: activeStatus } = ctx;
  const streak = getCurrentStreak(history);
  const weeklyCount = getWeeklyWorkoutCount(history);
  const goalDays = profile?.daysPerWeek || profile?.training_days_per_week || 3;
  const motivational = getMotivationalLine(history);

  function getNextProgrammeDay() {
    if (!programme) return null;
    const split = programme.split || [];
    const lastDayIndex = programme.lastCompletedDayIndex ?? -1;
    const nextIndex = (lastDayIndex + 1) % split.length;
    const nextDay = split[nextIndex];
    if (!nextDay) return null;
    const lastDate = programme.lastCompletedDate;
    const daysSinceLast = lastDate
      ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
      : 999;
    let statusMsg = '';
    if (daysSinceLast === 0) statusMsg = 'Good timing — ready for today?';
    else if (daysSinceLast === 1) statusMsg = 'Your programme says today is a training day.';
    else if (daysSinceLast >= 7) statusMsg = `Been ${daysSinceLast} days — pick up here?`;
    else if (daysSinceLast >= 2) statusMsg = `You missed ${daysSinceLast - 1} day(s) — continue?`;
    return { dayName: nextDay.name || nextDay, statusMsg, nextIndex };
  }

  const nextProg = getNextProgrammeDay();
  const deloadMsg = !deloadDismissed ? getDeloadSuggestion(history) : null;

  useEffect(() => {
    if (dailyMessage || !profile) return;
    generateDailyMessage(profile, {
      streak, weeklyCount, goalDays,
      recoveryScore: null,
      lastWorkoutDate: history[0]?.savedAt || null,
    }).then(text => {
      const trimmed = text.trim();
      setDailyMessage(trimmed);
      localStorage.setItem('spark_daily_msg', JSON.stringify({ date: new Date().toDateString(), text: trimmed }));
    }).catch(() => {});
  }, []);

  function startNewWorkout() {
    if (hasActiveWorkout) {
      if (confirm('You have an active workout. Start a new one? Your saved progress will be lost.')) {
        ctx.clearActiveWorkout();
        navigate('/new-workout');
      }
    } else if (programme) {
      setShowCustomConfirm(true);
    } else {
      navigate('/new-workout');
    }
  }

  function resumeActiveWorkout() {
    if (activeStatus === 'in_progress') {
      navigate('/workout/active');
    } else if (activeWkt?.programmeDay !== undefined) {
      navigate('/programme/continue');
    } else {
      navigate('/new-workout');
    }
  }

  const weekProgress = Math.min(weeklyCount / goalDays, 1);
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();

  // Determine hero headline
  let heroHeadline;
  let heroContext = null;
  if (hasActiveWorkout) {
    heroHeadline = activeWkt?.session_name || activeWkt?.sessionConfig?.focus || 'YOUR WORKOUT';
  } else if (programme && nextProg) {
    heroContext = programme.name;
    heroHeadline = nextProg.dayName;
  } else {
    const fullName = profile?.name || authUser?.full_name || '';
    const firstName = fullName.split(' ')[0];
    heroHeadline = firstName || 'ATHLETE';
  }

  return (
    <div
      className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-24"
      style={{ background: '#0A0A0A' }}
    >
      {/* Workout saved toast */}
      {showSavedToast && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex justify-center animate-fade-in"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
        >
          <div style={{
            background: '#E8FF00',
            color: '#000000',
            padding: '12px 24px',
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            WORKOUT SAVED
          </div>
        </div>
      )}

      {/* Custom workout confirmation modal */}
      {showCustomConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.85)' }}
        >
          <div className="w-full p-6" style={{ background: '#111111', border: '1px solid #222222', maxWidth: 360, borderRadius: 0 }}>
            <h3 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 18, color: '#FFFFFF', textTransform: 'uppercase', marginBottom: 8 }}>
              Custom workout?
            </h3>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#888888', marginBottom: 20, lineHeight: 1.5 }}>
              You have an active programme. This workout won't count towards your programme progression.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setShowCustomConfirm(false); navigate('/new-workout'); }}
                className="py-3 btn-press px-4"
                style={{ background: '#E8FF00', color: '#000000', fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 14, textTransform: 'uppercase', borderRadius: 0, border: 'none' }}
              >
                Start custom workout
              </button>
              <button
                onClick={() => setShowCustomConfirm(false)}
                className="py-3 btn-press"
                style={{ background: '#111111', border: '1px solid #222222', color: '#888888', fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 14, borderRadius: 0 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Top bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2">
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 10,
          fontWeight: 400,
          textTransform: 'uppercase',
          letterSpacing: 3,
          color: '#555555',
        }}>
          {dateStr}
        </span>
        <button
          onClick={() => navigate('/profile')}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid #222222',
            background: '#111111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#E8FF00',
          }} />
        </button>
      </div>

      {/* 2. Hero headline */}
      <div className="px-5" style={{ paddingTop: 24, paddingBottom: 20 }}>
        {heroContext && (
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 10,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: 2,
            color: '#E8FF00',
            display: 'block',
            marginBottom: 8,
          }}>
            {heroContext}
          </span>
        )}
        <h1 style={{
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 700,
          fontSize: 52,
          lineHeight: 0.95,
          textTransform: 'uppercase',
          color: '#FFFFFF',
          margin: 0,
        }}>
          {heroHeadline}
        </h1>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          fontWeight: 400,
          color: '#888888',
          marginTop: 12,
          lineHeight: 1.5,
        }}>
          {dailyMessage || motivational}
        </p>
      </div>

      {/* 3. Stat strip */}
      <div className="px-5" style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex',
          gap: 1,
          background: '#222222',
        }}>
          {/* This week */}
          <div style={{
            flex: 1,
            background: '#111111',
            padding: '14px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <span style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: 24,
              color: '#E8FF00',
            }}>
              {weeklyCount}<span style={{ color: '#555555', fontSize: 16 }}>/{goalDays}</span>
            </span>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 9,
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: 2,
              color: '#555555',
              marginTop: 4,
            }}>
              THIS WEEK
            </span>
          </div>
          {/* Streak */}
          <div style={{
            flex: 1,
            background: '#111111',
            padding: '14px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <span style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: 24,
              color: '#FFFFFF',
            }}>
              {streak}
            </span>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 9,
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: 2,
              color: '#555555',
              marginTop: 4,
            }}>
              STREAK
            </span>
          </div>
          {/* Recovery */}
          <div style={{
            flex: 1,
            background: '#111111',
            padding: '14px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <span style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: 24,
              color: recoveryScore != null ? (recoveryScore > 80 ? '#E8FF00' : '#FFFFFF') : '#555555',
            }}>
              {recoveryScore != null ? recoveryScore : '\u2014'}
            </span>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 9,
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: 2,
              color: '#555555',
              marginTop: 4,
            }}>
              RECOVERY
            </span>
          </div>
        </div>
      </div>

      {/* 4. Week progress bar */}
      <div className="px-5" style={{ marginBottom: 20 }}>
        <div style={{
          height: 3,
          background: '#111111',
          width: '100%',
        }}>
          <div style={{
            height: 3,
            background: '#E8FF00',
            width: `${weekProgress * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          color: '#555555',
          marginTop: 6,
          display: 'block',
        }}>
          {weeklyCount} of {goalDays} sessions this week
        </span>
      </div>

      {/* 5. Recovery check-in — only shown if not yet logged today */}
      <div className="px-5" style={{ marginBottom: 16 }}>
        <RecoveryCheckinOnce compact />
      </div>

      {/* 6. Deload suggestion */}
      {deloadMsg && (
        <div className="px-5" style={{ marginBottom: 16 }}>
          <div style={{
            borderLeft: '3px solid #E8FF00',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: '#E8FF00',
                margin: 0,
                marginBottom: 4,
              }}>
                DELOAD SUGGESTION
              </p>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 400,
                color: '#888888',
                margin: 0,
                lineHeight: 1.5,
              }}>
                {deloadMsg}
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('spark_deload_dismissed', new Date().toDateString());
                setDeloadDismissed(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#555555',
                cursor: 'pointer',
                padding: 4,
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 7. Active workout banner */}
      {hasActiveWorkout && (
        <div className="px-5" style={{ marginBottom: 16 }}>
          <div style={{
            background: '#E8FF00',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#000000',
              }} />
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: 2,
                color: '#000000',
              }}>
                {activeStatus === 'in_progress' ? 'IN PROGRESS' : 'READY TO START'}
              </span>
            </div>
            <div style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: 28,
              textTransform: 'uppercase',
              color: '#000000',
              marginBottom: 4,
            }}>
              {activeWkt?.session_name || activeWkt?.sessionConfig?.focus || 'Your workout'}
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: 'rgba(0,0,0,0.5)',
              marginBottom: 16,
            }}>
              {activeStatus === 'in_progress'
                ? `Exercise ${ctx.currentExerciseIndex + 1} of ${activeWkt?.exercises?.length ?? '?'} — paused`
                : `${activeWkt?.exercises?.length ?? '?'} exercises · ${activeWkt?.estimated_duration_mins ?? '?'} min`}
            </div>
            <button
              onClick={resumeActiveWorkout}
              style={{
                width: '100%',
                padding: '12px 0',
                background: 'transparent',
                border: '2px solid #000000',
                borderRadius: 0,
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#000000',
                cursor: 'pointer',
              }}
            >
              RESUME WORKOUT &rarr;
            </button>
          </div>
        </div>
      )}

      {/* 8. Programme card */}
      {programme && nextProg && !hasActiveWorkout && (
        <div className="px-5" style={{ marginBottom: 16 }}>
          <div style={{
            borderLeft: '3px solid #E8FF00',
            padding: '16px 20px',
          }}>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: 2,
              color: '#E8FF00',
              display: 'block',
              marginBottom: 6,
            }}>
              {programme.name}
            </span>
            <div style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              textTransform: 'uppercase',
              color: '#FFFFFF',
              marginBottom: 16,
            }}>
              {nextProg.dayName}
            </div>
            <button
              onClick={() => navigate('/programme/continue')}
              style={{
                width: '100%',
                padding: '14px 0',
                background: '#E8FF00',
                border: 'none',
                borderRadius: 0,
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#000000',
                cursor: 'pointer',
              }}
            >
              GENERATE TODAY&apos;S SESSION &rarr;
            </button>
          </div>
        </div>
      )}

      {/* 9. Primary CTA — de-emphasized when programme is active */}
      {!hasActiveWorkout && (
        <div className="px-5" style={{ marginBottom: 20 }}>
          <button
            onClick={startNewWorkout}
            className="btn-press"
            style={{
              width: '100%',
              padding: '16px 0',
              background: programme ? 'transparent' : '#E8FF00',
              border: programme ? '1px solid #222222' : 'none',
              borderRadius: 0,
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: programme ? 13 : 15,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: programme ? '#888888' : '#000000',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Zap size={16} />
            {programme ? 'CUSTOM WORKOUT' : 'START SESSION'} &rarr;
          </button>
        </div>
      )}

      {/* 10. Quick actions */}
      <div className="px-5" style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex',
          gap: 1,
          background: '#222222',
        }}>
          {[
            { label: 'HISTORY', onClick: () => navigate('/history') },
            { label: 'EXERCISES', onClick: () => navigate('/exercises') },
            { label: 'PROGRAMME', onClick: () => navigate('/programme/build') },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              style={{
                flex: 1,
                background: '#111111',
                border: 'none',
                padding: '14px 0',
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: 400,
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: '#888888',
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
