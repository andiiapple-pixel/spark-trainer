import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Mail, Key, Monitor, Trash2, Check, X, Eye, EyeOff, BadgeCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { account as accountApi, data as dataApi } from '../services/api';

export default function AccountSettingsScreen() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [tab, setTab] = useState('info'); // info | password | sessions | danger

  return (
    <div style={{ background: '#0f0f14', minHeight: '100vh', maxWidth: 430, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Account Settings</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '0 20px', gap: 4, marginBottom: 8, overflowX: 'auto' }}>
        {[
          { id: 'info',     label: 'Profile',  icon: Mail },
          { id: 'password', label: 'Password', icon: Key },
          { id: 'sessions', label: 'Sessions', icon: Monitor },
          { id: 'danger',   label: 'Danger',   icon: AlertTriangle },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: tab === id ? '#1e1e2a' : 'transparent',
              border: tab === id ? '1px solid #2a2a3a' : '1px solid transparent',
              borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
              color: tab === id ? '#f1f5f9' : '#64748b', fontSize: 13, fontWeight: 600,
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '8px 20px 100px' }}>
        {tab === 'info'     && <InfoTab user={user} updateUser={updateUser} />}
        {tab === 'password' && <PasswordTab />}
        {tab === 'sessions' && <SessionsTab />}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Name */}
      <Card title="Display name">
        <form onSubmit={saveName}>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Your name" />
          {error && <p style={{ color: '#ef4444', fontSize: 13, margin: '6px 0' }}>{error}</p>}
          <button type="submit" disabled={loading} style={btnPrimary(loading)}>
            {saved ? <><Check size={14} style={{ verticalAlign: 'middle' }} /> Saved</> : loading ? 'Saving…' : 'Save name'}
          </button>
        </form>
      </Card>

      {/* Email */}
      <Card title="Email address">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 12px', background: '#0f0f14', borderRadius: 8 }}>
          <span style={{ flex: 1, fontSize: 14, color: '#f1f5f9' }}>{user?.email}</span>
          {user?.email_verified
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#10b981', fontWeight: 600 }}><BadgeCheck size={14} /> Verified</span>
            : <span style={{ fontSize: 12, color: '#f97316', fontWeight: 600 }}>Unverified</span>}
        </div>

        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Change your email address (requires password + verification):</p>
        <form onSubmit={changeEmail}>
          <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New email address" style={{ ...inputStyle, marginBottom: 8 }} required />
          <input type="password" value={emailPw} onChange={e => setEmailPw(e.target.value)} placeholder="Confirm with your password" style={{ ...inputStyle, marginBottom: 10 }} required />
          {emailMsg && (
            <p style={{ fontSize: 13, color: emailMsg.type === 'success' ? '#10b981' : '#ef4444', marginBottom: 10 }}>
              {emailMsg.text}
            </p>
          )}
          <button type="submit" disabled={emailLoading} style={btnPrimary(emailLoading)}>
            {emailLoading ? 'Sending…' : 'Change email'}
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
  const colors = ['#2a2a3a','#ef4444','#f97316','#eab308','#10b981'];
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
    <Card title="Change password">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Current password</label>
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} value={form.current} onChange={e => set('current', e.target.value)}
              required style={{ ...inputStyle, paddingRight: 40 }} placeholder="••••••••" />
            <button type="button" onClick={() => setShow(s => !s)} style={eyeBtn}>
              {showPw ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 6 }}>
          <label style={labelStyle}>New password</label>
          <input type="password" value={form.next} onChange={e => set('next', e.target.value)}
            required style={inputStyle} placeholder="••••••••" autoComplete="new-password" />
        </div>

        {form.next && (
          <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= s ? colors[s] : '#2a2a3a' }} />
            ))}
            <span style={{ fontSize: 11, color: colors[s], marginLeft: 6, fontWeight: 600 }}>{labels[s]}</span>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Confirm new password</label>
          <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)}
            required style={inputStyle} placeholder="••••••••" />
        </div>

        {status && (
          <p style={{ fontSize: 13, color: status.type === 'success' ? '#10b981' : '#ef4444', marginBottom: 12 }}>
            {status.msg}
          </p>
        )}
        <button type="submit" disabled={loading} style={btnPrimary(loading)}>
          {loading ? 'Saving…' : 'Change password'}
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

  if (loading) return <p style={{ color: '#64748b', fontSize: 14 }}>Loading sessions…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sessions.length > 1 && (
        <button onClick={revokeAll} style={{ ...btnDanger, alignSelf: 'flex-end', fontSize: 13, padding: '8px 14px' }}>
          Log out all devices
        </button>
      )}

      {sessions.length === 0 && (
        <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: 24 }}>No active sessions found.</p>
      )}

      {sessions.map(s => (
        <div key={s.id} style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>
                {s.device_label || 'Unknown device'}
              </p>
              <p style={{ margin: '0 0 2px', fontSize: 12, color: '#64748b' }}>IP: {s.ip_address || 'Unknown'}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                Last active: {s.last_used_at ? new Date(s.last_used_at).toLocaleString() : 'Unknown'}
              </p>
            </div>
            <button
              onClick={() => revoke(s.id)}
              disabled={revoking === s.id}
              style={{ background: 'none', border: '1px solid #2a2a3a', borderRadius: 8, padding: '6px 12px', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {revoking === s.id ? '…' : 'Revoke'}
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
      <Card title="Danger zone">
        <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>
          Deleting your account is permanent. All your workouts, progress, programmes, and chat history will be irreversibly removed.
        </p>
        <button onClick={() => setShowModal(true)} style={btnDanger}>
          <Trash2 size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Delete my account
        </button>
      </Card>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }}>
          <div style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <AlertTriangle size={22} color="#ef4444" />
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Delete account?</h2>
            </div>
            <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 20, lineHeight: 1.6 }}>
              This action is <strong style={{ color: '#ef4444' }}>irreversible</strong>. All your data will be permanently deleted.
              Enter your password to confirm.
            </p>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Your password" style={{ ...inputStyle, marginBottom: 12 }} />
            {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, background: '#0f0f14', border: '1px solid #2a2a3a', borderRadius: 10, color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={deleteAccount} disabled={loading || !password}
                style={{ flex: 1, padding: 12, background: '#ef4444', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Deleting…' : 'Delete account'}
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
    <div style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 14, padding: '20px 18px' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{title}</h2>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 14px', background: '#0f0f14', border: '1px solid #2a2a3a',
  borderRadius: 10, color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 5 };
const eyeBtn = {
  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex',
};
const btnPrimary = (loading) => ({
  width: '100%', padding: '11px', background: '#3b82f6', color: '#fff', border: 'none',
  borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
  opacity: loading ? 0.7 : 1, marginTop: 4,
});
const btnDanger = {
  padding: '11px 16px', background: '#1a1a2e', border: '1px solid #ef4444', borderRadius: 10,
  color: '#ef4444', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
