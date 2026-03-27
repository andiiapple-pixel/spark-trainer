import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
      <div style={{ background: '#0A0A0A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 48, fontWeight: 700, color: '#E8FF00', marginBottom: 24 }}>
            &#10003;
          </div>
          <h1 style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 700, marginBottom: 12, fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>Check your inbox</h1>
          <p style={{ color: '#888888', fontSize: 15, lineHeight: 1.6, marginBottom: 24, fontFamily: "'Inter', sans-serif" }}>
            We've sent a verification link to <strong style={{ color: '#FFFFFF' }}>{form.email}</strong>.
            Click the link to activate your account.
          </p>
          <p style={{ color: '#555555', fontSize: 13, marginBottom: 24, fontFamily: "'Inter', sans-serif" }}>Didn't get it? Check your spam folder.</p>
          <Link to="/login" style={{ color: '#555555', textDecoration: 'none', fontWeight: 500, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 24, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 2 }}>
            Pocket Trainer<span style={{ color: '#E8FF00' }}>.</span>
          </div>
        </div>

        <div style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0, padding: 24 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>Create account</h1>
          <p style={{ margin: '0 0 28px', color: '#888888', fontSize: 14, fontFamily: "'Inter', sans-serif" }}>Start training with your personal AI coach</p>

          {error && (
            <div style={{ background: '#0A0A0A', border: '1px solid #EF4444', borderRadius: 0, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#EF4444', fontFamily: "'Inter', sans-serif" }}>
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
                  required autoComplete="new-password" style={{ ...inputStyle, paddingRight: 44 }} placeholder="--------" />
                <button type="button" onClick={() => setShowPw(s => !s)} style={eyeBtn}>
                  {showPw ? <EyeOff size={18} color="#555555" /> : <Eye size={18} color="#555555" />}
                </button>
              </div>
            </div>

            {/* Strength bar */}
            {form.password && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 0,
                      background: i <= strength.score ? strength.color : '#222222',
                      transition: 'background 0.2s',
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: strength.color, fontWeight: 500, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>{strength.label}</span>
              </div>
            )}

            {/* Rules checklist */}
            {form.password && (
              <div style={{ background: '#0A0A0A', borderRadius: 0, padding: '10px 12px', marginBottom: 16 }}>
                {rules.map(r => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {r.ok
                      ? <Check size={13} color="#22C55E" />
                      : <X size={13} color="#555555" />}
                    <span style={{ fontSize: 11, color: r.ok ? '#22C55E' : '#555555', fontFamily: "'Inter', sans-serif" }}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Confirm password</label>
              <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)}
                required autoComplete="new-password" style={inputStyle} placeholder="--------" />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 24, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.tos} onChange={e => set('tos', e.target.checked)}
                style={{ accentColor: '#E8FF00', width: 15, height: 15, marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#888888', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
                I agree to the terms of service and privacy policy
              </span>
            </label>

            <button type="submit" disabled={loading} style={submitBtn(loading)}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#555555', fontFamily: "'Inter', sans-serif" }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: 500 }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}

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
