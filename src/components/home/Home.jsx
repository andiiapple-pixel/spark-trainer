import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, RefreshCw, Plus, ClipboardList, TrendingUp, Settings,
  Flame, Dumbbell, BookOpen, X, ChevronRight, Zap,
} from 'lucide-react';
import { storage, getGreeting, getMotivationalLine, getWeeklyWorkoutCount, getCurrentStreak } from '../../utils/storage';
import { useActiveWorkout } from '../../context/ActiveWorkoutContext';
import RecoveryCheckin from '../recovery/RecoveryCheckin';
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

  const profile = storage.getProfile();
  const history = storage.getWorkoutHistory();
  const programme = storage.getActiveProgramme();
  const { hasActiveWorkout, workout: activeWkt, status: activeStatus } = ctx;
  const streak = getCurrentStreak(history);
  const weeklyCount = getWeeklyWorkoutCount(history);
  const goalDays = profile?.daysPerWeek || 3;
  const motivational = getMotivationalLine(history);
  const greeting = getGreeting();
  const lastWorkoutDaysAgo = history[0]
    ? Math.floor((Date.now() - new Date(history[0].savedAt).getTime()) / 86400000)
    : null;

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
    } else {
      navigate('/new-workout');
    }
  }

  function resumeActiveWorkout() {
    if (activeStatus === 'in_progress') {
      navigate('/workout/active');
    } else {
      navigate('/new-workout');
    }
  }

  const mainCards = [
    {
      emoji: '⚡',
      title: 'Start a Workout',
      sub: 'One-off session, fully custom',
      color: '#6366f1',
      onClick: startNewWorkout,
    },
    programme && {
      emoji: '🔁',
      title: 'Continue Programme',
      sub: programme.name || 'Active programme',
      color: '#10b981',
      onClick: () => navigate('/programme/continue'),
    },
    {
      emoji: '📋',
      title: 'Build a Programme',
      sub: 'Multi-week structured plan',
      color: '#f59e0b',
      onClick: () => navigate('/programme/build'),
    },
    {
      emoji: '📚',
      title: 'Exercise Library',
      sub: '200+ exercises with form guides',
      color: '#8b5cf6',
      onClick: () => navigate('/exercises'),
    },
    {
      emoji: '📖',
      title: 'Workout History',
      sub: 'Past sessions & results',
      color: '#06b6d4',
      onClick: () => navigate('/history'),
    },
    {
      emoji: '⚙️',
      title: 'My Profile',
      sub: 'Goals, equipment, preferences',
      color: '#475569',
      onClick: () => navigate('/profile'),
    },
  ].filter(Boolean);

  return (
    <div
      className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-24"
      style={{ background: '#0a0a0f' }}
    >
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-bold tracking-tight" style={{ color: '#f8fafc', fontSize: 24 }}>
              {greeting}, {profile?.name || 'Athlete'}
            </h1>
            <p
              className="mt-1 text-sm truncate"
              style={{ color: '#94a3b8' }}
            >
              {dailyMessage || motivational}
            </p>
          </div>
          {streak > 0 && (
            <div
              className="flex flex-col items-center px-3 py-2 rounded-2xl flex-shrink-0"
              style={{ background: '#1a1109', border: '1px solid #f59e0b40' }}
            >
              <Flame size={16} style={{ color: '#f59e0b' }} />
              <span className="font-bold text-lg leading-none mt-0.5" style={{ color: '#f59e0b' }}>{streak}</span>
              <span style={{ fontSize: 9, color: '#94a3b8', letterSpacing: '0.05em', marginTop: 1 }}>STREAK</span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex gap-2 mt-4">
          <div
            className="flex-1 flex flex-col items-center py-3 rounded-2xl"
            style={{ background: '#111118', border: '1px solid #1e1e2e' }}
          >
            <span className="font-bold" style={{ color: '#6366f1', fontSize: 20 }}>
              {weeklyCount}<span style={{ fontSize: 13, color: '#475569' }}>/{goalDays}</span>
            </span>
            <span style={{ fontSize: 10, color: '#475569', letterSpacing: '0.04em', marginTop: 2 }}>THIS WEEK</span>
          </div>
          <div
            className="flex-1 flex flex-col items-center py-3 rounded-2xl"
            style={{ background: '#111118', border: '1px solid #1e1e2e' }}
          >
            <span className="font-bold" style={{ color: '#10b981', fontSize: 20 }}>{history.length}</span>
            <span style={{ fontSize: 10, color: '#475569', letterSpacing: '0.04em', marginTop: 2 }}>SESSIONS</span>
          </div>
          <div
            className="flex-1 flex flex-col items-center py-3 rounded-2xl"
            style={{ background: '#111118', border: '1px solid #1e1e2e' }}
          >
            <span className="font-bold" style={{ color: '#f8fafc', fontSize: 20 }}>
              {lastWorkoutDaysAgo === null ? '—' : lastWorkoutDaysAgo === 0 ? 'Today' : `${lastWorkoutDaysAgo}d`}
            </span>
            <span style={{ fontSize: 10, color: '#475569', letterSpacing: '0.04em', marginTop: 2 }}>LAST SESSION</span>
          </div>
        </div>
      </div>

      {/* Recovery check-in */}
      <div className="px-5 mb-3">
        <RecoveryCheckin compact />
      </div>

      {/* Deload suggestion banner */}
      {deloadMsg && (
        <div className="px-5 mb-3">
          <div
            className="p-3 rounded-2xl flex items-start gap-3 animate-fade-in"
            style={{ background: '#0f1f18', border: '1px solid #10b98140' }}
          >
            <span className="text-base flex-shrink-0 mt-0.5">🔄</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold mb-0.5" style={{ color: '#10b981', letterSpacing: '0.04em' }}>DELOAD SUGGESTION</p>
              <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>{deloadMsg}</p>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('spark_deload_dismissed', new Date().toDateString());
                setDeloadDismissed(true);
              }}
              className="btn-press flex-shrink-0"
              style={{ color: '#475569' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Active workout banner */}
      {hasActiveWorkout && (
        <div className="px-5 mb-3">
          <div
            className="p-4 rounded-2xl animate-fade-in"
            style={{
              background: activeStatus === 'in_progress'
                ? 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%)'
                : 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(99,102,241,0.12) 100%)',
              border: `1px solid ${activeStatus === 'in_progress' ? '#6366f150' : '#8b5cf640'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2 h-2 rounded-full animate-pulse-slow"
                style={{ background: activeStatus === 'in_progress' ? '#10b981' : '#8b5cf6' }}
              />
              <span className="text-xs font-semibold" style={{
                color: activeStatus === 'in_progress' ? '#6ee7b7' : '#c4b5fd',
                letterSpacing: '0.05em',
              }}>
                {activeStatus === 'in_progress' ? 'IN PROGRESS' : 'WORKOUT READY'}
              </span>
            </div>
            <div className="font-bold text-base mb-0.5" style={{ color: '#f8fafc' }}>
              {activeWkt?.session_name || activeWkt?.sessionConfig?.focus || 'Your workout'}
            </div>
            <div className="text-sm mb-3" style={{ color: '#94a3b8' }}>
              {activeStatus === 'in_progress'
                ? `Exercise ${ctx.currentExerciseIndex + 1} of ${activeWkt?.exercises?.length ?? '?'} — paused`
                : `${activeWkt?.exercises?.length ?? '?'} exercises · ${activeWkt?.estimated_duration_mins ?? '?'} min`}
            </div>
            <button
              onClick={resumeActiveWorkout}
              className="w-full py-2.5 rounded-full font-semibold text-sm btn-press flex items-center justify-center gap-2"
              style={{
                background: activeStatus === 'in_progress' ? '#6366f1' : '#8b5cf6',
                color: '#fff',
              }}
            >
              {activeStatus === 'in_progress' ? 'Resume Workout' : 'View Workout'}
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Programme card */}
      {programme && nextProg && !hasActiveWorkout && (
        <div className="px-5 mb-3">
          <div
            className="p-4 rounded-2xl animate-fade-in"
            style={{ background: '#0f1f18', border: '1px solid #10b98140' }}
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="text-xs font-semibold mb-0.5" style={{ color: '#10b981', letterSpacing: '0.05em' }}>
                  PROGRAMME — {programme.name}
                </div>
                <div className="font-bold text-lg" style={{ color: '#f8fafc' }}>
                  Next: {nextProg.dayName}
                </div>
                <div className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{nextProg.statusMsg}</div>
              </div>
              <div className="text-xs text-right" style={{ color: '#475569' }}>
                Week {programme.currentWeek || 1}/{programme.weeks}
              </div>
            </div>
            <button
              onClick={() => navigate('/programme/continue')}
              className="w-full py-2.5 rounded-full font-semibold text-sm btn-press mt-3"
              style={{ background: '#10b981', color: '#fff' }}
            >
              Generate today&apos;s session →
            </button>
          </div>
        </div>
      )}

      {/* Action grid */}
      <div className="px-5">
        <p className="text-xs font-semibold mb-3" style={{ color: '#475569', letterSpacing: '0.06em' }}>QUICK ACTIONS</p>
        <div className="grid grid-cols-2 gap-2.5">
          {mainCards.map(card => (
            <button
              key={card.title}
              onClick={card.onClick}
              className="flex flex-col items-start p-4 rounded-2xl text-left btn-press"
              style={{
                background: '#111118',
                border: '1px solid #1e1e2e',
                minHeight: 88,
              }}
            >
              <div className="text-2xl mb-2">{card.emoji}</div>
              <div className="font-semibold text-sm" style={{ color: '#f8fafc' }}>{card.title}</div>
              <div className="text-xs mt-0.5 leading-tight" style={{ color: '#475569' }}>{card.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
