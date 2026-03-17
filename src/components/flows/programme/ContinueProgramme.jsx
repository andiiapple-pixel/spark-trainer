import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, ChevronRight } from 'lucide-react';
import ScreenHeader from '../../shared/ScreenHeader';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import WorkoutDisplay from '../new-workout/WorkoutDisplay';
import { storage, daysSince } from '../../../utils/storage';
import { generateWorkout } from '../../../api/anthropic';

export default function ContinueProgramme() {
  const navigate = useNavigate();
  const programme = storage.getActiveProgramme();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [workout, setWorkout] = useState(null);

  if (!programme) {
    return (
      <div className="flex flex-col min-h-screen max-w-[430px] mx-auto">
        <ScreenHeader title="My Programme" />
        <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6 text-center">
          <p className="text-4xl">📋</p>
          <p className="font-semibold" style={{ color: '#f1f5f9' }}>No active programme</p>
          <p className="text-sm" style={{ color: '#64748b' }}>Build a structured plan to get started.</p>
          <button
            onClick={() => navigate('/programme/build')}
            className="px-6 py-3 rounded-xl font-semibold btn-press"
            style={{ background: '#3b82f6', color: '#fff' }}
          >
            Build a Programme
          </button>
        </div>
      </div>
    );
  }

  const split = programme.split || [];
  const lastIndex = programme.lastCompletedDayIndex ?? -1;
  const nextIndex = (lastIndex + 1) % split.length;
  const nextDay = split[nextIndex];
  const daysSinceLast = programme.lastCompletedDate ? daysSince(programme.lastCompletedDate) : 999;
  const isRestDay = nextDay?.type === 'rest';

  const weeklyProgress = split.filter((_, i) => {
    const startOfWeek = (programme.currentWeek - 1) * split.length;
    return i >= startOfWeek && i <= lastIndex;
  }).length;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const profile = storage.getProfile();
      const history = storage.getWorkoutHistory();
      const sessionConfig = {
        focus: nextDay?.type || 'strength',
        session_name: nextDay?.name || 'Training Session',
        location: profile?.equipment === 'home_gym' ? 'home' : 'gym',
        duration_mins: profile?.sessionLength || 60,
        energy_level: 'good',
        user_notes_today: notes || null,
      };
      const programmeCtx = {
        programme_name: programme.name,
        current_week: programme.currentWeek,
        total_weeks: programme.weeks,
        session_type: nextDay?.name,
        progression_model: programme.progression,
      };
      const result = await generateWorkout(profile, sessionConfig, history.slice(0, 3), programmeCtx);
      setWorkout({
        ...result,
        sessionConfig,
        programmeDay: nextIndex,
        generatedAt: new Date().toISOString(),
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen max-w-[430px] mx-auto">
        <ScreenHeader title="Loading Session" />
        <LoadingState message={`Generating your ${nextDay?.name} session...`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen max-w-[430px] mx-auto">
        <ScreenHeader title="Error" onBack={() => setError(null)} />
        <ErrorState message={error} onRetry={generate} />
      </div>
    );
  }

  if (workout) {
    return (
      <WorkoutDisplay
        workout={workout}
        onStart={() => navigate('/workout/active', { state: { workout } })}
        onRegenerate={async (note) => {
          setWorkout(null);
          if (note) setNotes(note);
          await generate();
        }}
        onBack={() => setWorkout(null)}
      />
    );
  }

  const overallProgress = ((lastIndex + 1) / (split.length * programme.weeks));

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-8">
      <ScreenHeader title={programme.name} />

      <div className="px-4 flex flex-col gap-4">
        {/* Progress */}
        <div className="p-4 rounded-xl" style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
              Week {programme.currentWeek} of {programme.weeks}
            </span>
            <span className="text-xs" style={{ color: '#64748b' }}>
              {Math.round(overallProgress * 100)}% complete
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#0f0f14' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${overallProgress * 100}%`, background: '#3b82f6' }}
            />
          </div>
        </div>

        {/* Split overview */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: '#64748b' }}>THIS WEEK&apos;S SPLIT</p>
          <div className="flex flex-col gap-1.5">
            {split.map((day, i) => {
              const isDone = i <= lastIndex;
              const isNext = i === nextIndex;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{
                    background: isNext ? '#1e2d4a' : '#1e1e2a',
                    border: `1px solid ${isNext ? '#3b82f6' : '#2a2a3a'}`,
                  }}
                >
                  {isDone ? (
                    <CheckCircle size={18} style={{ color: '#10b981' }} />
                  ) : isNext ? (
                    <div className="w-4.5 h-4.5 rounded-full border-2 animate-pulse-slow" style={{ borderColor: '#3b82f6', width: 18, height: 18 }} />
                  ) : (
                    <Circle size={18} style={{ color: '#2a2a3a' }} />
                  )}
                  <span
                    className="font-medium"
                    style={{ color: isDone ? '#64748b' : isNext ? '#93c5fd' : '#94a3b8' }}
                  >
                    {day.name}
                  </span>
                  {isDone && <span className="ml-auto text-xs" style={{ color: '#10b981' }}>✓</span>}
                  {isNext && <span className="ml-auto text-xs font-semibold" style={{ color: '#3b82f6' }}>NEXT</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status message */}
        {daysSinceLast >= 7 && (
          <div className="p-3 rounded-xl" style={{ background: '#2e1f0f', border: '1px solid #f9731650' }}>
            <p className="text-sm" style={{ color: '#fed7aa' }}>
              It&apos;s been {daysSinceLast} days. Restart from Week 1 or pick up where you left off?
            </p>
            <button
              onClick={() => {
                const prog = { ...programme, currentWeek: 1, lastCompletedDayIndex: -1, lastCompletedDate: null };
                storage.setActiveProgramme(prog);
                navigate('/');
              }}
              className="mt-2 text-xs underline"
              style={{ color: '#f97316' }}
            >
              Restart from Week 1
            </button>
          </div>
        )}

        {/* Notes */}
        <div>
          <p className="text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
            Anything your trainer should know before {nextDay?.name}?
          </p>
          <textarea
            placeholder="e.g. shoulders still a bit sore from last session, skip barbell rows today..."
            value={notes}
            onChange={e => setNotes(e.target.value.slice(0, 200))}
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', color: '#f1f5f9' }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: '#475569' }}>{notes.length}/200</span>
            <span className="text-xs" style={{ color: '#475569' }}>Optional</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={generate}
          className="w-full py-4 rounded-xl font-bold text-base btn-press flex items-center justify-center gap-2"
          style={{ background: '#10b981', color: '#fff' }}
        >
          Generate {nextDay?.name} Session
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
