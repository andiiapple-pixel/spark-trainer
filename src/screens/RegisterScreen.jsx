import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Dumbbell, Check, X } from 'lucide-react';
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

export default function RegisterScreen() {
  const navigate = useNavigate();
  const [form, setForm]           = useState({ fullName: '', email: '', password: '', confirm: '', tos: false });
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [done, setDone]           = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const strength = getStrength(form.password);

  const rules = [
    { label: 'At least 8 characters', ok: form.password.length >= 8 },
    { label: 'One uppercase letter',  ok: /[A-Z]/.test(form.password) },
    { label: 'One number',            ok: /[0-9]/.test(form.password) },
    { label: 'One special character', ok: /[^A-Za-z0-9]/.test(form.password) },
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (!form.tos) return setError('Please accept the terms of service.');
    setLoading(true);
    try {
      await authApi.register({ email: form.email, password: form.password, full_name: form.fullName });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div style={{ background: '#0f0f14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Check size={32} color="#fff" />
          </div>
          <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Check your inbox</h1>
          <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
            We've sent a verification link to <strong style={{ color: '#f1f5f9' }}>{form.email}</strong>.
            Click the link to activate your account.
          </p>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>Didn't get it? Check your spam folder.</p>
          <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600, fontSize: 15 }}>
            Back to login →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0f0f14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#3b82f6', borderRadius: 12, padding: 10 }}>
              <Dumbbell size={24} color="#fff" />
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.5px' }}>Pocket Trainer</span>
          </div>
        </div>

        <div style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 16, padding: '32px 28px' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Create account</h1>
          <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: 14 }}>Start training with your personal AI coach</p>

          {error && (
            <div style={{ background: '#1a1a2e', border: '1px solid #ef4444', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#ef4444' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Full name</label>
              <input type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)}
                required autoComplete="name" style={inputStyle} placeholder="Alex Johnson" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                required autoComplete="email" style={inputStyle} placeholder="you@example.com" />
            </div>

            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                  required autoComplete="new-password" style={{ ...inputStyle, paddingRight: 44 }} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(s => !s)} style={eyeBtn}>
                  {showPw ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                </button>
              </div>
            </div>

            {/* Strength bar */}
            {form.password && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i <= strength.score ? strength.color : '#2a2a3a',
                      transition: 'background 0.2s',
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: strength.color, fontWeight: 600 }}>{strength.label}</span>
              </div>
            )}

            {/* Rules checklist */}
            {form.password && (
              <div style={{ background: '#0f0f14', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
                {rules.map(r => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {r.ok
                      ? <Check size={13} color="#10b981" />
                      : <X size={13} color="#475569" />}
                    <span style={{ fontSize: 12, color: r.ok ? '#10b981' : '#475569' }}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Confirm password</label>
              <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)}
                required autoComplete="new-password" style={inputStyle} placeholder="••••••••" />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 24, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.tos} onChange={e => set('tos', e.target.checked)}
                style={{ accentColor: '#3b82f6', width: 15, height: 15, marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                I agree to the terms of service and privacy policy
              </span>
            </label>

            <button type="submit" disabled={loading} style={submitBtn(loading)}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}

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
  width: '100%', padding: '13px', background: loading ? '#1d4ed8' : '#3b82f6',
  color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
});
