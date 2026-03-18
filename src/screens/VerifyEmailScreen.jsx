import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
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
      <Loader size={40} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={textStyle}>Verifying your email…</p>
    </Screen>
  );

  if (status === 'success') return (
    <Screen>
      <CheckCircle size={48} color="#10b981" />
      <h1 style={headStyle}>Email verified!</h1>
      <p style={textStyle}>Redirecting you to the app…</p>
    </Screen>
  );

  if (status === 'resent') return (
    <Screen>
      <CheckCircle size={48} color="#3b82f6" />
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
      <XCircle size={48} color="#ef4444" />
      <h1 style={headStyle}>{isUsed ? 'Already verified' : 'Link invalid or expired'}</h1>
      <p style={textStyle}>
        {isUsed
          ? 'This email has already been verified. You can log in now.'
          : isExpired
            ? 'Your verification link has expired. Request a new one below.'
            : 'This verification link is invalid.'}
      </p>

      {(isExpired || !isUsed) && (
        <div style={{ width: '100%', maxWidth: 320, marginTop: 8 }}>
          <input
            type="email"
            placeholder="Enter your email to resend"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
          <button onClick={resend} style={btnStyle}>Resend verification email</button>
        </div>
      )}
      <Link to="/login" style={{ ...linkStyle, marginTop: 12 }}>Back to login</Link>
    </Screen>
  );
}

function Screen({ children }) {
  return (
    <div style={{ background: '#0f0f14', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, textAlign: 'center' }}>
      {children}
    </div>
  );
}

const headStyle  = { margin: 0, color: '#f1f5f9', fontSize: 22, fontWeight: 700 };
const textStyle  = { margin: 0, color: '#94a3b8', fontSize: 15, lineHeight: 1.6 };
const linkStyle  = { color: '#3b82f6', textDecoration: 'none', fontWeight: 600, fontSize: 14 };
const inputStyle = {
  width: '100%', padding: '11px 14px', background: '#1e1e2a', border: '1px solid #2a2a3a',
  borderRadius: 10, color: '#f1f5f9', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 10,
};
const btnStyle = {
  width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none',
  borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
};
