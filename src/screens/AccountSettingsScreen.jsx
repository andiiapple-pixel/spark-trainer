import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Mail, Key, Monitor, Trash2, Check, X, Eye, EyeOff, BadgeCheck, AlertTriangle, Download } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { account as accountApi, data as dataApi, getAccessToken } from '../services/api';

export default function AccountSettingsScreen() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [tab, setTab] = useState('info'); // info | password | sessions | danger

  const tabs = [
    { id: 'info',     label: 'Profile' },
    { id: 'password', label: 'Password' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'data',     label: 'Data' },
    { id: 'danger',   label: 'Danger' },
  ];

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', maxWidth: 430, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate(-1)}
          className="btn-press"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            background: 'transparent',
            border: '1px solid #222222',
            borderRadius: 0,
            cursor: 'pointer',
            color: '#888888',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 style={{
          margin: 0,
          fontFamily: "'Oswald', sans-serif",
          fontSize: 24,
          fontWeight: 700,
          color: '#FFFFFF',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
        }}>
          ACCOUNT
        </h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '0 20px', gap: 0, marginBottom: 16, overflowX: 'auto' }}>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: tab === id ? 500 : 400,
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === id ? '2px solid #E8FF00' : '2px solid transparent',
              borderRadius: 0,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              color: tab === id ? '#FFFFFF' : '#555555',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '8px 20px 100px' }}>
        {tab === 'info'     && <InfoTab user={user} updateUser={updateUser} />}
        {tab === 'password' && <PasswordTab />}
        {tab === 'sessions' && <SessionsTab />}
        {tab === 'data'     && <DataTab />}
        {tab === 'danger'   && <DangerTab logout={logout} navigate={navigate} />}
      </div>
    </div>
  );
}

// ─── Info Tab ─────────────────────────────────────────────────────────────────
function InfoTab({ user, updateUser }) {
  const [name, setName]     = useState(user?.full_name || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState(null);

  const [newEmail, setNewEmail]     = useState('');
  const [emailPw, setEmailPw]       = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg]     = useState(null);

  async function saveName(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await dataApi.saveProfile({ full_name: name });
      updateUser({ full_name: name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeEmail(e) {
    e.preventDefault();
    setEmailLoading(true);
    setEmailMsg(null);
    try {
      await accountApi.changeEmail({ new_email: newEmail, password: emailPw });
      setEmailMsg({ type: 'success', text: `Verification sent to ${newEmail}. Click the link to confirm.` });
      setNewEmail(''); setEmailPw('');
    } catch (err) {
      setEmailMsg({ type: 'error', text: err.message });
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Name */}
      <Card title="DISPLAY NAME">
        <form onSubmit={saveName}>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Your name" />
          {error && <p style={{ fontFamily: "'Inter', sans-serif", color: '#EF4444', fontSize: 13, margin: '8px 0' }}>{error}</p>}
          <button type="submit" disabled={loading} style={btnPrimary(loading)}>
            {saved ? <><Check size={14} style={{ verticalAlign: 'middle' }} /> SAVED</> : loading ? 'SAVING...' : 'SAVE NAME'}
          </button>
        </form>
      </Card>

      {/* Email */}
      <Card title="EMAIL ADDRESS">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '12px 16px', background: '#0A0A0A', border: '1px solid #222222', borderRadius: 0 }}>
          <span style={{ flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#FFFFFF' }}>{user?.email}</span>
          {user?.email_verified
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#10b981', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}><BadgeCheck size={14} /> Verified</span>
            : <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#EF4444', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Unverified</span>}
        </div>

        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#555555', marginBottom: 12 }}>Change your email address (requires password + verification):</p>
        <form onSubmit={changeEmail}>
          <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New email address" style={{ ...inputStyle, marginBottom: 8 }} required />
          <input type="password" value={emailPw} onChange={e => setEmailPw(e.target.value)} placeholder="Confirm with your password" style={{ ...inputStyle, marginBottom: 10 }} required />
          {emailMsg && (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: emailMsg.type === 'success' ? '#10b981' : '#EF4444', marginBottom: 10 }}>
              {emailMsg.text}
            </p>
          )}
          <button type="submit" disabled={emailLoading} style={btnPrimary(emailLoading)}>
            {emailLoading ? 'SENDING...' : 'CHANGE EMAIL'}
          </button>
        </form>
      </Card>
    </div>
  );
}

// ─── Password Tab ─────────────────────────────────────────────────────────────
function PasswordTab() {
  const [form, setForm]   = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function getStrength(pw) {
    let s = 0;
    if (pw.length >= 8) s++; if (/[A-Z]/.test(pw)) s++; if (/[0-9]/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  }
  const s = getStrength(form.next);
  const colors = ['#222222','#EF4444','#E8FF00','#E8FF00','#10b981'];
  const labels = ['','Weak','Fair','Good','Strong'];

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.next !== form.confirm) return setStatus({ type: 'error', msg: 'Passwords do not match.' });
    setLoading(true);
    setStatus(null);
    try {
      await accountApi.changePassword({ current_password: form.current, new_password: form.next });
      setStatus({ type: 'success', msg: 'Password changed. You may need to log in again on other devices.' });
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="CHANGE PASSWORD">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>CURRENT PASSWORD</label>
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} value={form.current} onChange={e => set('current', e.target.value)}
              required style={{ ...inputStyle, paddingRight: 40 }} placeholder="--------" />
            <button type="button" onClick={() => setShow(s => !s)} style={eyeBtn}>
              {showPw ? <EyeOff size={16} color="#555555" /> : <Eye size={16} color="#555555" />}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>NEW PASSWORD</label>
          <input type="password" value={form.next} onChange={e => set('next', e.target.value)}
            required style={inputStyle} placeholder="--------" autoComplete="new-password" />
        </div>

        {form.next && (
          <div style={{ display: 'flex', gap: 3, marginBottom: 12, alignItems: 'center' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ flex: 1, height: 2, background: i <= s ? colors[s] : '#222222' }} />
            ))}
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: colors[s], marginLeft: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>{labels[s]}</span>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>CONFIRM NEW PASSWORD</label>
          <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)}
            required style={inputStyle} placeholder="--------" />
        </div>

        {status && (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: status.type === 'success' ? '#10b981' : '#EF4444', marginBottom: 12 }}>
            {status.msg}
          </p>
        )}
        <button type="submit" disabled={loading} style={btnPrimary(loading)}>
          {loading ? 'SAVING...' : 'CHANGE PASSWORD'}
        </button>
      </form>
    </Card>
  );
}

// ─── Sessions Tab ─────────────────────────────────────────────────────────────
function SessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [revoking, setRevoking] = useState(null);

  useEffect(() => {
    accountApi.getSessions()
      .then(d => setSessions(d.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function revoke(id) {
    setRevoking(id);
    try {
      await accountApi.revokeSession(id);
      setSessions(s => s.filter(x => x.id !== id));
    } catch {}
    setRevoking(null);
  }

  async function revokeAll() {
    if (!confirm('Log out all other devices?')) return;
    try {
      // Keep current — revoke all
      await fetch; // use API
      await accountApi.getSessions().then(async d => {
        for (const s of d.sessions || []) {
          await accountApi.revokeSession(s.id).catch(() => {});
        }
        setSessions([]);
      });
    } catch {}
  }

  if (loading) return <p style={{ fontFamily: "'Inter', sans-serif", color: '#555555', fontSize: 14 }}>Loading sessions...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sessions.length > 1 && (
        <button
          onClick={revokeAll}
          style={{
            alignSelf: 'flex-end',
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            padding: '10px 16px',
            background: 'transparent',
            border: '1px solid #EF4444',
            borderRadius: 0,
            color: '#EF4444',
            cursor: 'pointer',
            marginBottom: 8,
          }}
        >
          Log out all devices
        </button>
      )}

      {sessions.length === 0 && (
        <p style={{ fontFamily: "'Inter', sans-serif", color: '#555555', fontSize: 14, textAlign: 'center', padding: 24 }}>No active sessions found.</p>
      )}

      {sessions.map(s => (
        <div key={s.id} style={{ background: 'transparent', border: '1px solid #222222', borderRadius: 0, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: '#FFFFFF' }}>
                {s.device_label || 'Unknown device'}
              </p>
              <p style={{ margin: '0 0 2px', fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#555555' }}>IP: {s.ip_address || 'Unknown'}</p>
              <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#555555' }}>
                Last active: {s.last_used_at ? new Date(s.last_used_at).toLocaleString() : 'Unknown'}
              </p>
            </div>
            <button
              onClick={() => revoke(s.id)}
              disabled={revoking === s.id}
              style={{
                background: 'transparent',
                border: '1px solid #222222',
                borderRadius: 0,
                padding: '6px 12px',
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#EF4444',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {revoking === s.id ? '...' : 'Revoke'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Danger Zone ──────────────────────────────────────────────────────────────
function DangerTab({ logout, navigate }) {
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword]  = useState('');
  const [loading, setLoading]    = useState(false);
  const [error, setError]        = useState(null);

  async function deleteAccount() {
    setLoading(true);
    setError(null);
    try {
      await accountApi.deleteAccount({ password });
      await logout();
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div style={{ border: '1px solid #EF4444', borderRadius: 0, padding: '20px 18px' }}>
        <h2 style={{
          margin: '0 0 16px',
          fontFamily: "'Oswald', sans-serif",
          fontSize: 16,
          fontWeight: 700,
          color: '#EF4444',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
        }}>DANGER ZONE</h2>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#888888', marginBottom: 16, lineHeight: 1.6 }}>
          Deleting your account is permanent. All your workouts, progress, programmes, and chat history will be irreversibly removed.
        </p>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            height: 48,
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            background: 'transparent',
            border: '1px solid #EF4444',
            borderRadius: 0,
            color: '#EF4444',
            cursor: 'pointer',
          }}
        >
          <Trash2 size={15} />
          Delete my account
        </button>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }}>
          <div style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0, padding: 28, width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <AlertTriangle size={22} color="#EF4444" />
              <h2 style={{
                margin: 0,
                fontFamily: "'Oswald', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: '#FFFFFF',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}>DELETE ACCOUNT?</h2>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#888888', marginBottom: 20, lineHeight: 1.6 }}>
              This action is <strong style={{ color: '#EF4444' }}>irreversible</strong>. All your data will be permanently deleted.
              Enter your password to confirm.
            </p>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Your password" style={{ ...inputStyle, marginBottom: 12 }} />
            {error && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#EF4444', marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  height: 48,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  background: 'transparent',
                  border: '1px solid #222222',
                  borderRadius: 0,
                  color: '#888888',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={loading || !password}
                style={{
                  flex: 1,
                  height: 48,
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: '#EF4444',
                  border: 'none',
                  borderRadius: 0,
                  color: '#FFFFFF',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'DELETING...' : 'DELETE ACCOUNT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────
function Card({ title, children }) {
  return (
    <div style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0, padding: '20px 18px' }}>
      <h2 style={{
        margin: '0 0 16px',
        fontFamily: "'Oswald', sans-serif",
        fontSize: 15,
        fontWeight: 700,
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>{title}</h2>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  height: 48,
  padding: '0 16px',
  background: '#111111',
  border: '1px solid #222222',
  borderRadius: 0,
  color: '#FFFFFF',
  fontFamily: "'Inter', sans-serif",
  fontSize: 15,
  fontWeight: 400,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontFamily: "'Inter', sans-serif",
  fontSize: 11,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '2px',
  color: '#555555',
  marginBottom: 6,
};

const eyeBtn = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex',
};

const btnPrimary = (loading) => ({
  width: '100%',
  height: 48,
  fontFamily: "'Oswald', sans-serif",
  fontSize: 14,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  background: '#E8FF00',
  color: '#000000',
  border: 'none',
  borderRadius: 0,
  cursor: loading ? 'not-allowed' : 'pointer',
  opacity: loading ? 0.7 : 1,
  marginTop: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
});

// ─── Data Tab ─────────────────────────────────────────────────────────────────
function DataTab() {
  const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState('');

  async function exportJson() {
    setExporting(true);
    try {
      const res = await dataApi.exportJson();
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'spark-trainer-export.json';
      a.click();
      URL.revokeObjectURL(url);
      setMsg('JSON export downloaded.');
    } catch {
      setMsg('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await fetch(`${BASE}/api/data/export/csv`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      });
      if (!res.ok) throw new Error();
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'spark-trainer-workouts.csv';
      a.click();
      URL.revokeObjectURL(url);
      setMsg('CSV export downloaded.');
    } catch {
      setMsg('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  }

  const exportBtnStyle = (disabled) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 48,
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    background: 'transparent',
    border: '1px solid #222222',
    borderRadius: 0,
    color: '#FFFFFF',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.7 : 1,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: 16,
          fontWeight: 700,
          color: '#FFFFFF',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          marginBottom: 8,
        }}>EXPORT MY DATA</h2>
        <p style={{ fontFamily: "'Inter', sans-serif", color: '#555555', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
          Download all your data. JSON includes everything -- workouts, programmes, metrics, PRs. CSV is workouts only.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={exportJson} disabled={exporting} style={exportBtnStyle(exporting)}>
            <Download size={14} />
            Export all data (JSON)
          </button>
          <button onClick={exportCsv} disabled={exporting} style={exportBtnStyle(exporting)}>
            <Download size={14} />
            Export workout history (CSV)
          </button>
        </div>
        {msg && <p style={{ fontFamily: "'Inter', sans-serif", color: '#10b981', fontSize: 13, marginTop: 8 }}>{msg}</p>}
      </div>
    </div>
  );
}
