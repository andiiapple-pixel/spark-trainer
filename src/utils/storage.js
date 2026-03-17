const KEYS = {
  PROFILE: 'trainer_user_profile',
  HEALTH_METRICS: 'trainer_health_metrics',
  WORKOUT_HISTORY: 'trainer_workout_history',
  ACTIVE_PROGRAMME: 'trainer_active_programme',
  PROGRAMME_LIBRARY: 'trainer_programme_library',
  PERSONAL_RECORDS: 'trainer_personal_records',
  COACH_CHAT: 'trainer_coach_chat',
  SETTINGS: 'trainer_app_settings',
};

export { KEYS };

function get(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write error', e);
  }
}

export const storage = {
  getProfile: () => get(KEYS.PROFILE),
  setProfile: (p) => set(KEYS.PROFILE, p),

  getHealthMetrics: () => get(KEYS.HEALTH_METRICS, []),
  addHealthMetric: (entry) => {
    const arr = get(KEYS.HEALTH_METRICS, []);
    arr.push({ ...entry, id: Date.now(), date: entry.date || new Date().toISOString() });
    set(KEYS.HEALTH_METRICS, arr);
  },
  deleteHealthMetric: (id) => {
    const arr = get(KEYS.HEALTH_METRICS, []).filter(m => m.id !== id);
    set(KEYS.HEALTH_METRICS, arr);
  },

  getWorkoutHistory: () => get(KEYS.WORKOUT_HISTORY, []),
  addWorkout: (workout) => {
    const arr = get(KEYS.WORKOUT_HISTORY, []);
    const entry = { ...workout, id: Date.now(), savedAt: new Date().toISOString() };
    arr.unshift(entry);
    set(KEYS.WORKOUT_HISTORY, arr);
    return entry;
  },

  getActiveProgramme: () => get(KEYS.ACTIVE_PROGRAMME),
  setActiveProgramme: (p) => set(KEYS.ACTIVE_PROGRAMME, p),
  clearActiveProgramme: () => localStorage.removeItem(KEYS.ACTIVE_PROGRAMME),

  getProgrammeLibrary: () => get(KEYS.PROGRAMME_LIBRARY, []),
  addProgramme: (prog) => {
    const arr = get(KEYS.PROGRAMME_LIBRARY, []);
    arr.unshift(prog);
    set(KEYS.PROGRAMME_LIBRARY, arr);
  },

  getPersonalRecords: () => get(KEYS.PERSONAL_RECORDS, {}),
  updatePR: (exerciseName, weight, reps, date) => {
    const prs = get(KEYS.PERSONAL_RECORDS, {});
    const key = exerciseName.toLowerCase().trim();
    const existing = prs[key];
    if (!existing || weight > existing.weight || (weight === existing.weight && reps > existing.reps)) {
      prs[key] = { exerciseName, weight, reps, date: date || new Date().toISOString(), isNew: true };
      set(KEYS.PERSONAL_RECORDS, prs);
      return true;
    }
    return false;
  },

  getCoachChat: () => get(KEYS.COACH_CHAT, []),
  addCoachMessage: (msg) => {
    const arr = get(KEYS.COACH_CHAT, []);
    arr.push({ ...msg, id: Date.now(), timestamp: new Date().toISOString() });
    if (arr.length > 50) arr.splice(0, arr.length - 50);
    set(KEYS.COACH_CHAT, arr);
  },
  setCoachChat: (msgs) => set(KEYS.COACH_CHAT, msgs),

  getSettings: () => get(KEYS.SETTINGS, { units: 'metric', theme: 'dark' }),
  setSettings: (s) => set(KEYS.SETTINGS, s),
};

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysSince(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function getWeeklyWorkoutCount(history) {
  const weekAgo = Date.now() - 7 * 86400000;
  return history.filter(w => new Date(w.savedAt).getTime() > weekAgo).length;
}

export function getCurrentStreak(history) {
  if (!history.length) return 0;
  const sorted = [...history].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  let streak = 0;
  let lastDate = null;
  for (const w of sorted) {
    const d = new Date(w.savedAt);
    d.setHours(0, 0, 0, 0);
    if (!lastDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diff = (today - d) / 86400000;
      if (diff > 1) break;
      lastDate = d;
      streak = 1;
    } else {
      const diff = (lastDate - d) / 86400000;
      if (diff <= 1.5) { streak++; lastDate = d; }
      else break;
    }
  }
  return streak;
}

export function getMotivationalLine(history) {
  if (!history.length) return "Every legend has a first day. This is yours.";
  const last = history[0];
  const days = daysSince(last.savedAt);
  if (days === 0) return "You already trained today. Champions rest smart too.";
  if (days === 1) return "Yesterday's work earned today's energy. Keep the chain going.";
  if (days >= 7) return `It's been ${days} days — no judgment. Your trainer is ready when you are.`;
  if (days >= 3) return `${days} days since your last session. Time to get back to it.`;
  return "You've had your rest. Time to earn it.";
}
