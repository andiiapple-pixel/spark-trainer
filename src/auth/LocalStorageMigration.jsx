/**
 * On first login, checks if there is existing trainer_* localStorage data.
 * If found, offers to import it to the user's account.
 */
import { useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { KEYS } from '../utils/storage';
import { data as dataApi } from '../services/api';

function hasLocalData() {
  return Object.values(KEYS).some(key => localStorage.getItem(key) !== null);
}

function collectLocalData() {
  const get = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } };
  return {
    profile:        get(KEYS.PROFILE),
    workouts:       get(KEYS.WORKOUT_HISTORY),
    healthMetrics:  get(KEYS.HEALTH_METRICS),
    activeProgramme: get(KEYS.ACTIVE_PROGRAMME),
    programmeLibrary: get(KEYS.PROGRAMME_LIBRARY),
    personalRecords: get(KEYS.PERSONAL_RECORDS),
    coachChat:      get(KEYS.COACH_CHAT),
  };
}

function clearLocalData() {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
}

export default function LocalStorageMigration({ onDone }) {
  const [show, setShow]         = useState(false);
  const [importing, setImport]  = useState(false);
  const [done, setDone]         = useState(false);

  useEffect(() => {
    // Only show once
    const dismissed = sessionStorage.getItem('migration_dismissed');
    if (!dismissed && hasLocalData()) setShow(true);
  }, []);

  async function doImport() {
    setImport(true);
    try {
      const payload = collectLocalData();
      await dataApi.importFromStorage(payload);
      clearLocalData();
      dismiss(true);
    } catch (err) {
      console.error('Import failed:', err);
      setImport(false);
      alert('Import failed. Your local data has been preserved. Please try again later.');
    }
  }

  function dismiss(imported = false) {
    if (!imported) clearLocalData();
    sessionStorage.setItem('migration_dismissed', '1');
    setDone(true);
    setShow(false);
    onDone?.({ imported });
  }

  if (!show || done) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 24px', zIndex: 200 }}>
      <div style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0, padding: 24, width: '100%', maxWidth: 420, margin: '0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#E8FF00', borderRadius: 0, padding: 8 }}>
              <Upload size={18} color="#0A0A0A" />
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>Import existing data?</h3>
          </div>
          <button onClick={() => dismiss(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555555', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 14, color: '#888888', lineHeight: 1.6, margin: '0 0 20px' }}>
          We found existing workout data on this device. Would you like to import it to your account so you can access it from any device?
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => dismiss(false)}
            style={{ flex: 1, padding: '11px', background: '#0A0A0A', border: '1px solid #222222', borderRadius: 0, color: '#888888', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            No thanks
          </button>
          <button
            onClick={doImport}
            disabled={importing}
            style={{ flex: 2, padding: '11px', background: importing ? '#222222' : '#E8FF00', border: 'none', borderRadius: 0, color: importing ? '#555555' : '#0A0A0A', fontSize: 14, fontWeight: 600, cursor: importing ? 'not-allowed' : 'pointer' }}
          >
            {importing ? 'Importing…' : 'Yes, import my data'}
          </button>
        </div>
      </div>
    </div>
  );
}
