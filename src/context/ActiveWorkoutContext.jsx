/**
 * ActiveWorkoutContext — single source of truth for the active workout session.
 *
 * All workout state lives here in memory and is persisted to localStorage on
 * every change so it survives page refreshes. Components read from and write
 * to this context directly — no route state, no scattered localStorage reads.
 *
 * Status lifecycle:
 *   null → 'generated' (workout ready, not started)
 *         → 'in_progress' (user started the session)
 *               → null (finished or cancelled)
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'spark_active_workout';

const defaultState = {
  workout: null,          // full generated workout object (exercises, warm-up, etc.)
  status: null,           // 'generated' | 'in_progress' | null
  currentExerciseIndex: 0,
  completedSets: {},      // { [exerciseIndex]: [{reps, weight, duration, timestamp, ...}] }
  skippedExercises: [],   // [{index, name, reason}]
  elapsedSeconds: 0,      // updated every second during workout
  startedAt: null,        // ISO timestamp when workout began
};

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState, ...JSON.parse(raw) };
  } catch {}
  return defaultState;
}

const ActiveWorkoutContext = createContext(null);

export function ActiveWorkoutProvider({ children }) {
  const [state, setState] = useState(loadFromStorage);

  // Persist to localStorage on every state change
  useEffect(() => {
    try {
      if (state.status) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, [state]);

  /** Save a generated workout (status → 'generated'). Resets all progress. */
  const setWorkoutGenerated = useCallback((workout) => {
    setState({ ...defaultState, workout, status: 'generated' });
  }, []);

  /** Transition from 'generated' → 'in_progress'. */
  const startWorkout = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'in_progress',
      startedAt: prev.startedAt || new Date().toISOString(),
    }));
  }, []);

  /** Move to a specific exercise index. */
  const setExerciseIndex = useCallback((index) => {
    setState(prev => ({ ...prev, currentExerciseIndex: index }));
  }, []);

  /** Append a logged set for a given exercise. */
  const logSet = useCallback((exerciseIndex, entry) => {
    setState(prev => {
      const existing = prev.completedSets[exerciseIndex] || [];
      return {
        ...prev,
        completedSets: {
          ...prev.completedSets,
          [exerciseIndex]: [...existing, { ...entry, timestamp: Date.now() }],
        },
      };
    });
  }, []);

  /** Record a skipped exercise. */
  const skipExercise = useCallback((entry) => {
    setState(prev => ({
      ...prev,
      skippedExercises: [...prev.skippedExercises, entry],
    }));
  }, []);

  /**
   * Increment the elapsed timer by 1 second.
   * Called every second from a setInterval inside ActiveWorkout.
   */
  const tickTimer = useCallback(() => {
    setState(prev => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }));
  }, []);

  /** Clear all workout state (on save, cancel, or logout). */
  const clearActiveWorkout = useCallback(() => {
    setState(defaultState);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return (
    <ActiveWorkoutContext.Provider
      value={{
        ...state,
        hasActiveWorkout: !!state.status,
        setWorkoutGenerated,
        startWorkout,
        setExerciseIndex,
        logSet,
        skipExercise,
        tickTimer,
        clearActiveWorkout,
      }}
    >
      {children}
    </ActiveWorkoutContext.Provider>
  );
}

export function useActiveWorkout() {
  const ctx = useContext(ActiveWorkoutContext);
  if (!ctx) throw new Error('useActiveWorkout must be used within ActiveWorkoutProvider');
  return ctx;
}
