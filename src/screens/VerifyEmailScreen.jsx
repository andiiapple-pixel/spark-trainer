import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { auth as authApi } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { setAccessToken, setRefreshToken } from '../services/api';

export default function VerifyEmailScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login: setAuthState } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [errorCode, setErrorCode] = useState(null);
  const [email, setEmail]   = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setErrorCode('INVALID_TOKEN'); return; }

    authApi.verifyEmail(token)
      .then(data => {
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        setStatus('success');
        // Redirect to app after short delay
        setTimeout(() => navigate('/', { replace: true }), 2000);
      })
      .catch(err => {
        setStatus('error');
        setErrorCode(err.body?.code || 'UNKNOWN');
      });
  }, []);

  async function resend() {
    if (!email) return;
    try {
      await authApi.resendVerification(email);
      setStatus('resent');
    } catch {
      alert('Failed to resend. Please try again.');
    }
  }

  if (status === 'loading') return (
    <Screen>
      <Loader size={40} color="#E8FF00" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={textStyle}>Verifying your email...</p>
    </Screen>
  );

  if (status === 'success') return (
    <Screen>
      <div style={{ fontSize: 48, color: '#E8FF00', fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>&#10003;</div>
      <h1 style={headStyle}>Email verified!</h1>
      <p style={textStyle}>Redirecting you to the app...</p>
    </Screen>
  );

  if (status === 'resent') return (
    <Screen>
      <div style={{ fontSize: 48, color: '#E8FF00', fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>&#10003;</div>
      <h1 style={headStyle}>Email sent</h1>
      <p style={textStyle}>A new verification link has been sent. Check your inbox.</p>
      <Link to="/login" style={linkStyle}>Back to login</Link>
    </Screen>
  );

  // Error states
  const isExpired  = errorCode === 'EXPIRED';
  const isUsed     = errorCode === 'ALREADY_USED';

  return (
    <Screen>
      <div style={{ fontSize: 48, color: '#EF4444', fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>&#10007;</div>
      <h1 style={headStyle}>{isUsed ? 'Already verified' : 'Link invalid or expired'}</h1>
      <p style={textStyle}>
        {isUsed
          ? 'This email has already been verified. You can log in now.'
          : isExpired
            ? 'Your verification link has expired. Request a new one below.'
            : 'This verification link is invalid.'}
      </p>

      {(isExpired || !isUsed) && (
        <div style={{ width: '100%', maxWidth: 400, marginTop: 8 }}>
          <div style={{ background: '#111111', border: '1px solid #222222', borderRadius: 0, padding: 24 }}>
            <label style={inputLabelStyle}>Email</label>
            <input
              type="email"
              placeholder="Enter your email to resend"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
            <button onClick={resend} style={btnStyle}>Resend verification email</button>
          </div>
        </div>
      )}
      <Link to="/login" style={{ ...linkStyle, marginTop: 12 }}>Back to login</Link>
    </Screen>
  );
}

function Screen({ children }) {
  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, textAlign: 'center' }}>
      {children}
    </div>
  );
}

const headStyle  = { margin: 0, color: '#FFFFFF', fontSize: 22, fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: 1 };
const textStyle  = { margin: 0, color: '#888888', fontSize: 15, lineHeight: 1.6, fontFamily: "'Inter', sans-serif" };
const linkStyle  = { color: '#555555', textDecoration: 'none', fontWeight: 500, fontSize: 13, fontFamily: "'Inter', sans-serif" };
const inputLabelStyle = {
  display: 'block', fontSize: 11, fontWeight: 400, color: '#555555', marginBottom: 8,
  fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: 2,
};
const inputStyle = {
  width: '100%', height: 48, padding: '0 14px', background: '#0A0A0A',
  border: 'none', borderBottom: '1px solid #222222', borderRadius: 0,
  color: '#FFFFFF', fontSize: 15, outline: 'none', boxSizing: 'border-box',
  fontFamily: "'Inter', sans-serif", marginBottom: 16,
};
const btnStyle = {
  width: '100%', height: 52, background: '#E8FF00', color: '#000000', border: 'none',
  borderRadius: 0, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: 2,
};
