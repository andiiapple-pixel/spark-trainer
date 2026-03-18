import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Dumbbell } from 'lucide-react';
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
    <div style={{ background: '#0f0f14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#3b82f6', borderRadius: 12, padding: 10 }}>
              <Dumbbell size={24} color="#fff" />
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.5px' }}>Pocket Trainer</span>
          </div>
        </div>

        <div style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 16, padding: '32px 28px' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Welcome back</h1>
          <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: 14 }}>Log in to your account</p>

          {/* Error states */}
          {error?.type === 'unverified' && (
            <div style={{ background: '#1a1a2e', border: '1px solid #f97316', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 14 }}>
              <p style={{ margin: '0 0 8px', color: '#f97316', fontWeight: 600 }}>Email not verified</p>
              <p style={{ margin: '0 0 10px', color: '#94a3b8' }}>Check your inbox for the verification link.</p>
              <button onClick={resendVerification} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 14, cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                Resend verification email →
              </button>
            </div>
          )}
          {error?.type === 'locked' && (
            <div style={{ background: '#1a1a2e', border: '1px solid #ef4444', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 14, color: '#ef4444' }}>
              {error.msg}
            </div>
          )}
          {error?.type === 'generic' && (
            <div style={{ background: '#1a1a2e', border: '1px solid #ef4444', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 14, color: '#ef4444' }}>
              {error.msg}
            </div>
          )}
          {error?.type === 'resent' && (
            <div style={{ background: '#1a1a2e', border: '1px solid #10b981', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 14, color: '#10b981' }}>
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
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(s => !s)} style={eyeBtn}>
                  {showPw ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#94a3b8' }}>
                <input
                  type="checkbox"
                  checked={form.rememberMe}
                  onChange={e => set('rememberMe', e.target.checked)}
                  style={{ accentColor: '#3b82f6', width: 15, height: 15 }}
                />
                Remember me
              </label>
              <Link to="/forgot-password" style={{ fontSize: 14, color: '#3b82f6', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={submitBtn(loading)}
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#64748b' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>Create one</Link>
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
  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
});
