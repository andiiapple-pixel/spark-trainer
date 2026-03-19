import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'spark_active_workout';

const defaultState = {
  workout: null,
  status: null,
  currentExerciseIndex: 0,
  completedSets: {},
  skippedExercises: [],
  elapsedSeconds: 0,
  startedAt: null,
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
  const debounceRef = useRef(null);

  // Debounced localStorage persist — writes at most every 500ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        if (state.status) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {}
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state]);

  const setWorkoutGenerated = useCallback((workout) => {
    setState({ ...defaultState, workout, status: 'generated' });
  }, []);

  const startWorkout = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'in_progress',
      startedAt: prev.startedAt || new Date().toISOString(),
    }));
  }, []);

  const setExerciseIndex = useCallback((index) => {
    setState(prev => ({ ...prev, currentExerciseIndex: index }));
  }, []);

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

  const skipExercise = useCallback((entry) => {
    setState(prev => ({
      ...prev,
      skippedExercises: [...prev.skippedExercises, entry],
    }));
  }, []);

  const tickTimer = useCallback(() => {
    setState(prev => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }));
  }, []);

  const clearActiveWorkout = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
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
