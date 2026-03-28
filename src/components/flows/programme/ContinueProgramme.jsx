import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, ChevronRight } from 'lucide-react';
import ScreenHeader from '../../shared/ScreenHeader';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import WorkoutDisplay from '../new-workout/WorkoutDisplay';
import { storage, daysSince } from '../../../utils/storage';
import { generateWorkout } from '../../../api/anthropic';
import { useActiveWorkout } from '../../../context/ActiveWorkoutContext';

export default function ContinueProgramme() {
  const navigate = useNavigate();
  const ctx = useActiveWorkout();
  const programme = storage.getActiveProgramme();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [workout, setWorkout] = useState(null);

  if (!programme) {
    return (
      <div className="flex flex-col min-h-screen max-w-[430px] mx-auto" style={{ background: '#0A0A0A' }}>
        <ScreenHeader title="My Programme" />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: 16,
          padding: '0 24px',
          textAlign: 'center',
        }}>
          <p style={{
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            textTransform: 'uppercase',
            color: '#FFFFFF',
            margin: 0,
          }}>No active programme</p>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: '#888888',
            margin: 0,
          }}>Build a structured plan to get started.</p>
          <button
            onClick={() => navigate('/programme/build')}
            className="btn-press"
            style={{
              padding: '14px 24px',
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

  const totalCompleted = programme.totalCompleted || 0;
  const weeklyProgress = totalCompleted > 0 ? ((totalCompleted - 1) % split.length) + 1 : 0;

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
      const w = { ...result, sessionConfig, programmeDay: nextIndex, generatedAt: new Date().toISOString() };
      ctx.setWorkoutGenerated(w);
      setWorkout(w);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen max-w-[430px] mx-auto" style={{ background: '#0A0A0A' }}>
        <ScreenHeader title="Loading Session" />
        <LoadingState message={`Generating your ${nextDay?.name} session...`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen max-w-[430px] mx-auto" style={{ background: '#0A0A0A' }}>
        <ScreenHeader title="Error" onBack={() => setError(null)} />
        <ErrorState message={error} onRetry={generate} />
      </div>
    );
  }

  if (workout) {
    return (
      <WorkoutDisplay
        workout={workout}
        onStart={() => { ctx.startWorkout(); navigate('/workout/active'); }}
        onRegenerate={async (note) => {
          setWorkout(null);
          if (note) setNotes(note);
          await generate();
        }}
        onBack={() => setWorkout(null)}
      />
    );
  }

  const totalSessions = split.length * (programme.weeks || 1);
  const overallProgress = Math.min(totalCompleted / totalSessions, 1);

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-8" style={{ background: '#0A0A0A' }}>
      <ScreenHeader title={programme.name} />

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Programme name */}
        <h2 style={{
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 700,
          fontSize: 24,
          textTransform: 'uppercase',
          color: '#FFFFFF',
          margin: 0,
        }}>{programme.name}</h2>

        {/* Progress */}
        <div style={{ padding: 16, border: '1px solid #222222' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: '#FFFFFF',
            }}>
              Week {programme.currentWeek} of {programme.weeks}
            </span>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              color: '#555555',
            }}>
              {Math.round(overallProgress * 100)}% complete
            </span>
          </div>
          <div style={{ height: 2, background: '#222222' }}>
            <div style={{
              height: '100%',
              width: `${overallProgress * 100}%`,
              background: '#E8FF00',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Split overview */}
        <div>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 9,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#555555',
            margin: '0 0 8px 0',
          }}>THIS WEEK&apos;S SPLIT</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {split.map((day, i) => {
              const isDone = i <= lastIndex;
              const isNext = i === nextIndex;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    border: `1px solid ${isNext ? '#E8FF00' : '#222222'}`,
                    background: isNext ? 'rgba(232,255,0,0.05)' : 'transparent',
                    borderLeft: isNext ? '3px solid #E8FF00' : undefined,
                  }}
                >
                  {isDone ? (
                    <CheckCircle size={18} style={{ color: '#E8FF00' }} />
                  ) : isNext ? (
                    <div style={{
                      width: 18,
                      height: 18,
                      border: '2px solid #E8FF00',
                    }} />
                  ) : (
                    <Circle size={18} style={{ color: '#333333' }} />
                  )}
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: isDone ? '#555555' : isNext ? '#FFFFFF' : '#888888',
                  }}>
                    {day.name}
                  </span>
                  {isDone && <span style={{
                    marginLeft: 'auto',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 10,
                    textTransform: 'uppercase',
                    color: '#E8FF00',
                  }}>Done</span>}
                  {isNext && <span style={{
                    marginLeft: 'auto',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 10,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#E8FF00',
                  }}>NEXT</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status message */}
        {daysSinceLast >= 7 && (
          <div style={{
            padding: 12,
            borderLeft: '2px solid #EF4444',
            background: '#111111',
          }}>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: '#888888',
              margin: 0,
            }}>
              It&apos;s been {daysSinceLast} days. Restart from Week 1 or pick up where you left off?
            </p>
            <button
              onClick={() => {
                const prog = { ...programme, currentWeek: 1, lastCompletedDayIndex: -1, lastCompletedDate: null };
                storage.setActiveProgramme(prog);
                navigate('/');
              }}
              style={{
                marginTop: 8,
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                textTransform: 'uppercase',
                color: '#EF4444',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Restart from Week 1
            </button>
          </div>
        )}

        {/* Notes */}
        <div>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: '#888888',
            margin: '0 0 6px 0',
          }}>
            Anything your trainer should know before {nextDay?.name}?
          </p>
          <textarea
            placeholder="e.g. shoulders still a bit sore from last session, skip barbell rows today..."
            value={notes}
            onChange={e => setNotes(e.target.value.slice(0, 200))}
            rows={3}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#111111',
              border: '1px solid #222222',
              borderRadius: 0,
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: '#FFFFFF',
              outline: 'none',
              resize: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#555555' }}>{notes.length}/200</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#555555', textTransform: 'uppercase' }}>Optional</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={generate}
          className="btn-press"
          style={{
            width: '100%',
            padding: '16px 0',
            background: '#E8FF00',
            border: 'none',
            borderRadius: 0,
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#000000',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          Generate {nextDay?.name} Session
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
