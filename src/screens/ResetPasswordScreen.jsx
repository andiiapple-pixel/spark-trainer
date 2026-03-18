import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, XCircle, Check, X } from 'lucide-react';
import { auth as authApi } from '../services/api';

function getStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '#2a2a3a' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score === 2) return { score, label: 'Fair', color: '#f97316' };
  if (score === 3) return { score, label: 'Good', color: '#eab308' };
  if (score === 4) return { score, label: 'Strong', color: '#3b82f6' };
  return { score, label: 'Very strong', color: '#10b981' };
}

export default function ResetPasswordScreen() {
  const [params] = useSearchParams();
  const token = params.get('token');

  const [form, setForm]       = useState({ password: '', confirm: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(null); // null | 'success' | 'error'
  const [errMsg, setErrMsg]   = useState('');
  const [errCode, setErrCode] = useState('');

  const strength = getStrength(form.password);
  const rules = [
    { label: 'At least 8 characters', ok: form.password.length >= 8 },
    { label: 'One uppercase letter',  ok: /[A-Z]/.test(form.password) },
    { label: 'One number',            ok: /[0-9]/.test(form.password) },
    { label: 'One special character', ok: /[^A-Za-z0-9]/.test(form.password) },
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) return setErrMsg('Passwords do not match.');
    setErrMsg('');
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password: form.password });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrCode(err.body?.code || '');
      setErrMsg(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) return (
    <Screen>
      <XCircle size={48} color="#ef4444" />
      <h1 style={headStyle}>Invalid link</h1>
      <p style={{ color: '#94a3b8', margin: '8px 0 20px' }}>This reset link is invalid.</p>
      <Link to="/forgot-password" style={linkStyle}>Request a new reset link</Link>
    </Screen>
  );

  if (status === 'success') return (
    <Screen>
      <CheckCircle size={48} color="#10b981" />
      <h1 style={headStyle}>Password reset!</h1>
      <p style={{ color: '#94a3b8', margin: '8px 0 20px' }}>You can now log in with your new password.</p>
      <Link to="/login" style={linkStyle}>Go to login →</Link>
    </Screen>
  );

  if (status === 'error') return (
    <Screen>
      <XCircle size={48} color="#ef4444" />
      <h1 style={headStyle}>{errCode === 'EXPIRED' ? 'Link expired' : 'Link already used'}</h1>
      <p style={{ color: '#94a3b8', margin: '8px 0 20px', maxWidth: 320, textAlign: 'center' }}>{errMsg}</p>
      <Link to="/forgot-password" style={linkStyle}>Request a new reset link</Link>
    </Screen>
  );

  return (
    <div style={{ background: '#0f0f14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 16, padding: '32px 28px' }}>
          <h1 style={{ margin: '0 0 8px', color: '#f1f5f9', fontSize: 22, fontWeight: 700 }}>Set new password</h1>
          <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: 14 }}>Choose a strong password for your account.</p>

          {errMsg && (
            <div style={{ background: '#1a1a2e', border: '1px solid #ef4444', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#ef4444' }}>
              {errMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>New password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required autoComplete="new-password"
                  style={{ ...inputStyle, paddingRight: 44 }} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(s => !s)} style={eyeBtn}>
                  {showPw ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                </button>
              </div>
            </div>

            {form.password && (
              <>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength.score ? strength.color : '#2a2a3a', transition: 'background 0.2s' }} />
                  ))}
                </div>
                <div style={{ background: '#0f0f14', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
                  {rules.map(r => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {r.ok ? <Check size={13} color="#10b981" /> : <X size={13} color="#475569" />}
                      <span style={{ fontSize: 12, color: r.ok ? '#10b981' : '#475569' }}>{r.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Confirm password</label>
              <input type="password" value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                required autoComplete="new-password" style={inputStyle} placeholder="••••••••" />
            </div>

            <button type="submit" disabled={loading} style={submitBtn(loading)}>
              {loading ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Screen({ children }) {
  return (
    <div style={{ background: '#0f0f14', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, textAlign: 'center' }}>
      {children}
    </div>
  );
}

const headStyle  = { margin: 0, color: '#f1f5f9', fontSize: 22, fontWeight: 700 };
const linkStyle  = { color: '#3b82f6', textDecoration: 'none', fontWeight: 600, fontSize: 14 };
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 };
const inputStyle = {
  width: '100%', padding: '11px 14px', background: '#0f0f14', border: '1px solid #2a2a3a',
  borderRadius: 10, color: '#f1f5f9', fontSize: 15, outline: 'none', boxSizing: 'border-box',
};
const eyeBtn = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex',
};
const submitBtn = (loading) => ({
  width: '100%', padding: '13px', background: '#3b82f6', color: '#fff', border: 'none',
  borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
});
