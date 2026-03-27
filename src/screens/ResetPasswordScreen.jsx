import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { auth as authApi } from '../services/api';

function getStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '#222222' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#EF4444' };
  if (score === 2) return { score, label: 'Fair', color: '#F59E0B' };
  if (score === 3) return { score, label: 'Good', color: '#F59E0B' };
  if (score === 4) return { score, label: 'Strong', color: '#E8FF00' };
  return { score, label: 'Very strong', color: '#22C55E' };
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
      <div style={{ fontSize: 48, color: '#EF4444', fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>&#10007;</div>
      <h1 style={headStyle}>Invalid link</h1>
      <p style={{ color: '#888888', margin: '8px 0 20px', fontFamily: "'Inter', sans-serif", fontSize: 15 }}>This reset link is invalid.</p>
      <Link to="/forgot-password" style={linkStyle}>Request a new reset link</Link>
    </Screen>
  );

  if (status === 'success') return (
    <Screen>
      <div style={{ fontSize: 48, color: '#E8FF00', fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>&#10003;</div>
      <h1 style={headStyle}>Password reset!</h1>
      <p style={{ color: '#888888', margin: '8px 0 20px', fontFamily: "'Inter', sans-serif", fontSize: 15 }}>You can now log in with your new password.</p>
      <Link to="/login" style={linkStyle}>Go to login</Link>
    </Screen>
  );

  if (status === 'error') return (
    <Screen>
      <div style={{ fontSize: 48, color: '#EF4444', fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>&#10007;</div>
      <h1 style={headStyle}>{errCode === 'EXPIRED' ? 'Link expired' : 'Link already used'}</h1>
      <p style={{ color: '#888888', margin: '8px 0 20px', maxWidth: 320, textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: 15 }}>{errMsg}</p>
      <Link to="/forgot-password" style={linkStyle}>Request a new reset link</Link>
    </Screen>
  );

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 24, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 2 }}>
            Pocket Trainer<span style={{ color: '#E8FF00' }}>.</span>
          </div>
        </div>

        <div style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0, padding: 24 }}>
          <h1 style={{ margin: '0 0 8px', color: '#FFFFFF', fontSize: 22, fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>Set new password</h1>
          <p style={{ margin: '0 0 28px', color: '#888888', fontSize: 14, fontFamily: "'Inter', sans-serif" }}>Choose a strong password for your account.</p>

          {errMsg && (
            <div style={{ background: '#0A0A0A', border: '1px solid #EF4444', borderRadius: 0, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#EF4444', fontFamily: "'Inter', sans-serif" }}>
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
                  style={{ ...inputStyle, paddingRight: 44 }} placeholder="--------" />
                <button type="button" onClick={() => setShowPw(s => !s)} style={eyeBtn}>
                  {showPw ? <EyeOff size={18} color="#555555" /> : <Eye size={18} color="#555555" />}
                </button>
              </div>
            </div>

            {form.password && (
              <>
                <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 0, background: i <= strength.score ? strength.color : '#222222', transition: 'background 0.2s' }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: strength.color, fontWeight: 500, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>{strength.label}</span>
                <div style={{ background: '#0A0A0A', borderRadius: 0, padding: '10px 12px', marginBottom: 16 }}>
                  {rules.map(r => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {r.ok ? <Check size={13} color="#22C55E" /> : <X size={13} color="#555555" />}
                      <span style={{ fontSize: 11, color: r.ok ? '#22C55E' : '#555555', fontFamily: "'Inter', sans-serif" }}>{r.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Confirm password</label>
              <input type="password" value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                required autoComplete="new-password" style={inputStyle} placeholder="--------" />
            </div>

            <button type="submit" disabled={loading} style={submitBtn(loading)}>
              {loading ? 'Saving...' : 'Reset password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Screen({ children }) {
  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, textAlign: 'center' }}>
      {children}
    </div>
  );
}

const headStyle  = { margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: 1 };
const linkStyle  = { color: '#555555', textDecoration: 'none', fontWeight: 500, fontSize: 13, fontFamily: "'Inter', sans-serif" };
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 400, color: '#555555', marginBottom: 8,
  fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: 2,
};
const inputStyle = {
  width: '100%', height: 48, padding: '0 14px', background: '#0A0A0A',
  border: 'none', borderBottom: '1px solid #222222', borderRadius: 0,
  color: '#FFFFFF', fontSize: 15, outline: 'none', boxSizing: 'border-box',
  fontFamily: "'Inter', sans-serif", transition: 'border-color 0.2s',
};
const eyeBtn = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex',
};
const submitBtn = (loading) => ({
  width: '100%', height: 52, background: loading ? '#222222' : '#E8FF00',
  color: loading ? '#555555' : '#000000', border: 'none', borderRadius: 0,
  fontSize: 14, fontWeight: 700, fontFamily: "'Oswald', sans-serif",
  textTransform: 'uppercase', letterSpacing: 2,
  cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
});
