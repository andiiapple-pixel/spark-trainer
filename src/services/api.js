/**
 * Unified API service layer.
 * Handles auth tokens, automatic refresh, and all data operations.
 * Access token kept in memory. Refresh token in localStorage (httpOnly cookie
 * is ideal but requires same-origin; localStorage is used here for cross-origin dev).
 */

import { config } from '../config';
const BASE = config.apiUrl;

// ─── Token store (in-memory for XSS safety) ───────────────────────────────────
let _accessToken = null;

export function setAccessToken(token) { _accessToken = token; }
export function getAccessToken() { return _accessToken; }
export function clearAccessToken() { _accessToken = null; }

const RT_KEY = 'pt_refresh_token';
export function getRefreshToken() { return localStorage.getItem(RT_KEY); }
export function setRefreshToken(token) { localStorage.setItem(RT_KEY, token); }
export function clearRefreshToken() { localStorage.removeItem(RT_KEY); }

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
let _refreshPromise = null;

async function request(path, options = {}, retry = true) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const body = await res.json().catch(() => ({}));
    if (body.code === 'TOKEN_EXPIRED' || body.error === 'Token expired') {
      // Attempt token refresh (deduplicate concurrent refreshes)
      if (!_refreshPromise) {
        _refreshPromise = refreshTokens().finally(() => { _refreshPromise = null; });
      }
      const refreshed = await _refreshPromise;
      if (refreshed) {
        return request(path, options, false);
      }
    }
    throw Object.assign(new Error(body.error || 'Unauthorised'), { status: 401, body });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || body.errors?.[0]?.msg || `Request failed: ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return res.json();
}

async function refreshTokens() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const data = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).then(r => r.ok ? r.json() : null);

    if (!data) { clearRefreshToken(); return false; }

    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    return true;
  } catch {
    clearRefreshToken();
    return false;
  }
}

function get(path)        { return request(path, { method: 'GET' }); }
function post(path, body) { return request(path, { method: 'POST',   body: JSON.stringify(body) }); }
function put(path, body)  { return request(path, { method: 'PUT',    body: JSON.stringify(body) }); }
function del(path)        { return request(path, { method: 'DELETE' }); }

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  register:             (data) => post('/api/auth/register', data),
  login:                (data) => post('/api/auth/login', data),
  logout:               ()     => post('/api/auth/logout', { refreshToken: getRefreshToken() }),
  logoutAllDevices:     ()     => post('/api/auth/logout-all-devices', {}),
  refresh:              ()     => refreshTokens(),
  verifyEmail:          (token) => post('/api/auth/verify-email', { token }),
  resendVerification:   (email) => post('/api/auth/resend-verification', { email }),
  forgotPassword:       (email) => post('/api/auth/forgot-password', { email }),
  resetPassword:        (data) => post('/api/auth/reset-password', data),
  me:                   ()     => get('/api/auth/me'),
};

// ─── Account ──────────────────────────────────────────────────────────────────
export const account = {
  updateProfile:       (data) => put('/api/account/profile', data),
  changePassword:      (data) => put('/api/account/change-password', data),
  changeEmail:         (data) => put('/api/account/change-email', data),
  getSessions:         ()     => get('/api/account/sessions'),
  revokeSession:       (id)   => del(`/api/account/sessions/${id}`),
  deleteAccount:       (data) => post('/api/account/delete-account', data),
};

// ─── Data ─────────────────────────────────────────────────────────────────────
export const data = {
  // Profile
  getProfile:          ()     => get('/api/data/profile'),
  saveProfile:         (p)    => put('/api/data/profile', p),

  // Workouts
  getWorkouts:         (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return get(`/api/data/workouts${qs ? `?${qs}` : ''}`);
  },
  saveWorkout:         (w)    => post('/api/data/workouts', w),
  getWorkout:          (id)   => get(`/api/data/workouts/${id}`),
  deleteWorkout:       (id)   => del(`/api/data/workouts/${id}`),

  // Programmes
  getProgrammes:       ()     => get('/api/data/programmes'),
  saveProgramme:       (p)    => post('/api/data/programmes', p),
  getActiveProgramme:  ()     => get('/api/data/programmes/active'),
  updateProgramme:     (id,p) => put(`/api/data/programmes/${id}`, p),
  deleteProgramme:     (id)   => del(`/api/data/programmes/${id}`),

  // Health metrics
  getHealthMetrics:    ()     => get('/api/data/health-metrics'),
  saveHealthMetric:    (m)    => post('/api/data/health-metrics', m),
  updateHealthMetric:  (id,m) => put(`/api/data/health-metrics/${id}`, m),
  deleteHealthMetric:  (id)   => del(`/api/data/health-metrics/${id}`),

  // Personal records
  getPersonalRecords:  ()     => get('/api/data/personal-records'),
  savePersonalRecord:  (r)    => post('/api/data/personal-records', r),

  // Coach chat
  getCoachChat:        ()     => get('/api/data/coach-chat'),
  saveCoachMessages:   (msgs) => post('/api/data/coach-chat', msgs),
  clearCoachChat:      ()     => del('/api/data/coach-chat'),

  // localStorage migration
  importFromStorage:   (payload) => post('/api/data/import', payload),

  // Export
  exportJson:          () => get('/api/data/export/json'),
  exportCsv:           () => fetch(`${BASE}/api/data/export/csv`, { headers: { Authorization: `Bearer ${getAccessToken()}` } }),
  importCsv:           (payload) => post('/api/data/import-csv', payload),
};

// ─── Exercises ────────────────────────────────────────────────────────────────
export const exercises = {
  list:           (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return get(`/api/exercises${qs ? `?${qs}` : ''}`);
  },
  search:         (q) => get(`/api/exercises/search?q=${encodeURIComponent(q)}`),
  get:            (slug) => get(`/api/exercises/${slug}`),
  favourite:      (id) => post(`/api/exercises/${id}/favourite`, {}),
  unfavourite:    (id) => del(`/api/exercises/${id}/favourite`),
  getFavourites:  () => get('/api/exercises/user/favourites'),
};

// ─── Recovery ─────────────────────────────────────────────────────────────────
export const recovery = {
  getLogs:                () => get('/api/recovery'),
  getToday:               () => get('/api/recovery/today'),
  logCheckin:             (d) => post('/api/recovery', d),
  getEquipmentProfiles:   () => get('/api/recovery/equipment-profiles'),
  createEquipmentProfile: (d) => post('/api/recovery/equipment-profiles', d),
  updateEquipmentProfile: (id, d) => put(`/api/recovery/equipment-profiles/${id}`, d),
  deleteEquipmentProfile: (id) => del(`/api/recovery/equipment-profiles/${id}`),
  getAchievements:        () => get('/api/recovery/achievements'),
  unlockAchievement:      (a) => post('/api/recovery/achievements', { achievement: a }),
};

// ─── Bootstrap: restore session on app load ───────────────────────────────────
export async function bootstrapAuth() {
  const rt = getRefreshToken();
  if (!rt) return null;
  const refreshed = await refreshTokens();
  if (!refreshed) return null;
  try {
    const { user, profile } = await auth.me();
    return { user, profile };
  } catch {
    return null;
  }
}
