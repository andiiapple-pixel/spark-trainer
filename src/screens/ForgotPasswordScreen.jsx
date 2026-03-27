import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
        <div style={{ fontSize: 48, color: '#E8FF00', fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>&#10003;</div>
        <h1 style={{ margin: '0 0 8px', color: '#FFFFFF', fontSize: 22, fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>Check your email</h1>
        <p style={{ margin: '0 0 24px', color: '#888888', fontSize: 15, lineHeight: 1.6, maxWidth: 320, fontFamily: "'Inter', sans-serif" }}>
          If an account exists for <strong style={{ color: '#FFFFFF' }}>{email}</strong>, we've sent a password reset link.
          It expires in 1 hour.
        </p>
        <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#555555', textDecoration: 'none', fontWeight: 500, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
          <ArrowLeft size={16} /> Back to login
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#555555', textDecoration: 'none', fontSize: 13, marginBottom: 28, fontFamily: "'Inter', sans-serif" }}>
          <ArrowLeft size={16} /> Back to login
        </Link>

        <div style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0, padding: 24 }}>
          <h1 style={{ margin: '0 0 8px', color: '#FFFFFF', fontSize: 22, fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>Forgot password?</h1>
          <p style={{ margin: '0 0 28px', color: '#888888', fontSize: 14, lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
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
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        </div>
      </div>
    </Screen>
  );
}

function Screen({ children }) {
  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {children}
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
  fontFamily: "'Inter', sans-serif",
};
const submitBtn = (loading) => ({
  width: '100%', height: 52, background: loading ? '#222222' : '#E8FF00',
  color: loading ? '#555555' : '#000000', border: 'none', borderRadius: 0,
  fontSize: 14, fontWeight: 700, fontFamily: "'Oswald', sans-serif",
  textTransform: 'uppercase', letterSpacing: 2,
  cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
});
