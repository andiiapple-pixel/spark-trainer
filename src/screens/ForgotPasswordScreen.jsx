import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { auth as authApi } from '../services/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try { await authApi.forgotPassword(email); } catch {}
    // Always show success (don't reveal if email exists)
    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <Screen>
        <CheckCircle size={48} color="#10b981" />
        <h1 style={{ margin: '0 0 8px', color: '#f1f5f9', fontSize: 22, fontWeight: 700 }}>Check your email</h1>
        <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: 15, lineHeight: 1.6, maxWidth: 320 }}>
          If an account exists for <strong style={{ color: '#f1f5f9' }}>{email}</strong>, we've sent a password reset link.
          It expires in 1 hour.
        </p>
        <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#3b82f6', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back to login
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', textDecoration: 'none', fontSize: 14, marginBottom: 28 }}>
          <ArrowLeft size={16} /> Back to login
        </Link>

        <div style={{ background: '#1e1e2a', border: '1px solid #2a2a3a', borderRadius: 16, padding: '32px 28px' }}>
          <h1 style={{ margin: '0 0 8px', color: '#f1f5f9', fontSize: 22, fontWeight: 700 }}>Forgot password?</h1>
          <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
            Enter your email and we'll send you a reset link.
          </p>

          <form onSubmit={handleSubmit}>
            <label style={labelStyle}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{ ...inputStyle, marginBottom: 20 }}
              placeholder="you@example.com"
            />
            <button type="submit" disabled={loading} style={submitBtn(loading)}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </div>
      </div>
    </Screen>
  );
}

function Screen({ children }) {
  return (
    <div style={{ background: '#0f0f14', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {children}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 };
const inputStyle = {
  width: '100%', padding: '11px 14px', background: '#0f0f14', border: '1px solid #2a2a3a',
  borderRadius: 10, color: '#f1f5f9', fontSize: 15, outline: 'none', boxSizing: 'border-box',
};
const submitBtn = (loading) => ({
  width: '100%', padding: '13px', background: '#3b82f6', color: '#fff', border: 'none',
  borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
});
