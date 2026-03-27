import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { auth as authApi } from '../services/api';

export default function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const from = location.state?.from?.pathname || '/';

  const [form, setForm]       = useState({ email: '', password: '', rememberMe: false });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email: form.email, password: form.password, rememberMe: form.rememberMe });
      navigate(from, { replace: true });
    } catch (err) {
      const code = err.body?.code;
      if (code === 'EMAIL_NOT_VERIFIED') {
        setError({ type: 'unverified', email: form.email });
      } else if (code === 'ACCOUNT_LOCKED') {
        setError({ type: 'locked', msg: err.message });
      } else {
        setError({ type: 'generic', msg: err.message || 'Login failed. Please check your credentials.' });
      }
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    if (!error?.email) return;
    try {
      await authApi.resendVerification(error.email);
      setError({ type: 'resent' });
    } catch {
      setError({ type: 'generic', msg: 'Failed to resend. Please try again.' });
    }
  }

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
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>Welcome back</h1>
          <p style={{ margin: '0 0 28px', color: '#888888', fontSize: 14, fontFamily: "'Inter', sans-serif" }}>Log in to your account</p>

          {/* Error states */}
          {error?.type === 'unverified' && (
            <div style={{ background: '#0A0A0A', border: '1px solid #F59E0B', borderRadius: 0, padding: '14px 16px', marginBottom: 20 }}>
              <p style={{ margin: '0 0 8px', color: '#F59E0B', fontWeight: 500, fontSize: 12, fontFamily: "'Inter', sans-serif" }}>Email not verified</p>
              <p style={{ margin: '0 0 10px', color: '#888888', fontSize: 12, fontFamily: "'Inter', sans-serif" }}>Check your inbox for the verification link.</p>
              <button onClick={resendVerification} style={{ background: 'none', border: 'none', color: '#E8FF00', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                Resend verification email
              </button>
            </div>
          )}
          {error?.type === 'locked' && (
            <div style={{ background: '#0A0A0A', border: '1px solid #EF4444', borderRadius: 0, padding: '14px 16px', marginBottom: 20, fontSize: 12, color: '#EF4444', fontFamily: "'Inter', sans-serif" }}>
              {error.msg}
            </div>
          )}
          {error?.type === 'generic' && (
            <div style={{ background: '#0A0A0A', border: '1px solid #EF4444', borderRadius: 0, padding: '14px 16px', marginBottom: 20, fontSize: 12, color: '#EF4444', fontFamily: "'Inter', sans-serif" }}>
              {error.msg}
            </div>
          )}
          {error?.type === 'resent' && (
            <div style={{ background: '#0A0A0A', border: '1px solid #22C55E', borderRadius: 0, padding: '14px 16px', marginBottom: 20, fontSize: 12, color: '#22C55E', fontFamily: "'Inter', sans-serif" }}>
              Verification email sent. Check your inbox.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
                autoComplete="email"
                style={inputStyle}
                placeholder="you@example.com"
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: 44 }}
                  placeholder="--------"
                />
                <button type="button" onClick={() => setShowPw(s => !s)} style={eyeBtn}>
                  {showPw ? <EyeOff size={18} color="#555555" /> : <Eye size={18} color="#555555" />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#888888', fontFamily: "'Inter', sans-serif" }}>
                <input
                  type="checkbox"
                  checked={form.rememberMe}
                  onChange={e => set('rememberMe', e.target.checked)}
                  style={{ accentColor: '#E8FF00', width: 15, height: 15 }}
                />
                Remember me
              </label>
              <Link to="/forgot-password" style={{ fontSize: 13, color: '#555555', textDecoration: 'none', fontFamily: "'Inter', sans-serif" }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={submitBtn(loading)}
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#555555', fontFamily: "'Inter', sans-serif" }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: 500 }}>Create one</Link>
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
