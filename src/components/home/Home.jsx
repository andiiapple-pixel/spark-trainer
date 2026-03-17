import { useNavigate } from 'react-router-dom';
import { Play, RefreshCw, Plus, ClipboardList, TrendingUp, Settings, Flame, Zap } from 'lucide-react';
import { storage, getGreeting, getMotivationalLine, getWeeklyWorkoutCount, getCurrentStreak } from '../../utils/storage';

export default function Home() {
  const navigate = useNavigate();
  const profile = storage.getProfile();
  const history = storage.getWorkoutHistory();
  const programme = storage.getActiveProgramme();
  const streak = getCurrentStreak(history);
  const weeklyCount = getWeeklyWorkoutCount(history);
  const goalDays = profile?.daysPerWeek || 3;
  const motivational = getMotivationalLine(history);
  const greeting = getGreeting();

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
    else if (daysSinceLast >= 7) statusMsg = `Been ${daysSinceLast} days — restart from Week 1 or pick up here?`;
    else if (daysSinceLast >= 2) statusMsg = `You missed ${daysSinceLast - 1} day(s) — skip ahead or repeat?`;

    return { dayName: nextDay.name || nextDay, statusMsg, nextIndex };
  }

  const nextProg = getNextProgrammeDay();

  const mainCards = [
    {
      icon: Play,
      emoji: '▶',
      title: 'Start a New Workout',
      sub: 'One-off session, fully custom',
      color: '#3b82f6',
      bg: '#1e2d4a',
      path: '/new-workout',
    },
    programme && {
      icon: RefreshCw,
      emoji: '🔁',
      title: 'Continue My Programme',
      sub: programme.name || 'Active programme',
      color: '#10b981',
      bg: '#1a2e28',
      path: '/programme/continue',
    },
    {
      icon: Plus,
      emoji: '➕',
      title: 'Build a New Programme',
      sub: 'Create a structured multi-week plan',
      color: '#f97316',
      bg: '#2e1f0f',
      path: '/programme/build',
    },
    {
      icon: ClipboardList,
      emoji: '📋',
      title: 'View Past Workouts',
      sub: 'History, results, PRs',
      color: '#8b5cf6',
      bg: '#1e1a2e',
      path: '/history',
    },
    {
      icon: TrendingUp,
      emoji: '📊',
      title: 'My Progress',
      sub: 'Stats, charts, measurements',
      color: '#06b6d4',
      bg: '#0f2027',
      path: '/progress',
    },
    {
      icon: Settings,
      emoji: '⚙️',
      title: 'My Profile',
      sub: 'Goals, equipment, preferences',
      color: '#64748b',
      bg: '#1a1a24',
      path: '/profile',
    },
  ].filter(Boolean);

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>
              {greeting}, {profile?.name || 'Athlete'} 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>{motivational}</p>
          </div>
          {streak > 0 && (
            <div
              className="flex flex-col items-center px-3 py-2 rounded-xl"
              style={{ background: '#2e1f0f', border: '1px solid #f97316' }}
            >
              <Flame size={18} style={{ color: '#f97316' }} />
              <span className="text-lg font-bold" style={{ color: '#f97316' }}>{streak}</span>
              <span className="text-xs" style={{ color: '#94a3b8' }}>streak</span>
            </div>
          )}
        </div>

        {/* Weekly summary */}
        <div
          className="mt-3 px-4 py-3 rounded-xl flex items-center gap-3"
          style={{ background: '#1a1a24', border: '1px solid #2a2a3a' }}
        >
          <Zap size={16} style={{ color: '#3b82f6' }} />
          <span className="text-sm" style={{ color: '#94a3b8' }}>
            <span className="font-semibold" style={{ color: '#f1f5f9' }}>{weeklyCount}</span> of{' '}
            <span className="font-semibold" style={{ color: '#f1f5f9' }}>{goalDays}</span> workouts this week
          </span>
          <div className="flex gap-1 ml-auto">
            {Array.from({ length: goalDays }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ background: i < weeklyCount ? '#3b82f6' : '#2a2a3a' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Programme card (if active) */}
      {programme && nextProg && (
        <div className="px-4 mb-2">
          <div
            className="p-4 rounded-2xl animate-fade-in"
            style={{ background: '#1a2e28', border: '1px solid #10b981' }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-xs font-semibold mb-0.5" style={{ color: '#10b981' }}>
                  PROGRAMME — {programme.name}
                </div>
                <div className="font-bold text-lg" style={{ color: '#f1f5f9' }}>
                  Next: {nextProg.dayName}
                </div>
                <div className="text-sm mt-0.5" style={{ color: '#64748b' }}>{nextProg.statusMsg}</div>
              </div>
              <div className="text-right">
                <div className="text-xs" style={{ color: '#64748b' }}>
                  Week {programme.currentWeek || 1} of {programme.weeks}
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/programme/continue')}
              className="w-full py-2.5 rounded-xl font-semibold text-sm btn-press mt-1"
              style={{ background: '#10b981', color: '#fff' }}
            >
              Let&apos;s go — generate today&apos;s session
            </button>
          </div>
        </div>
      )}

      {/* Main action cards */}
      <div className="px-4 flex flex-col gap-2.5 mt-2">
        {mainCards.map(card => (
          <button
            key={card.path}
            onClick={() => navigate(card.path)}
            className="flex items-center gap-4 px-4 py-4 rounded-2xl text-left btn-press transition-all"
            style={{
              background: card.bg,
              border: `1px solid ${card.color}30`,
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
              style={{ background: `${card.color}20` }}
            >
              {card.emoji}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base" style={{ color: '#f1f5f9' }}>{card.title}</div>
              <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{card.sub}</div>
            </div>
            <card.icon size={18} style={{ color: card.color }} />
          </button>
        ))}
      </div>
    </div>
  );
}
