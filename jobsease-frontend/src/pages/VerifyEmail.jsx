import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { authService } from '../services/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [phase, setPhase] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    let redirectTimer;

    const run = async () => {
      if (!token) {
        setMessage('This verification link is missing a token. Use the link from your email or request a new one from sign up.');
        setPhase('error');
        return;
      }
      try {
        const data = await authService.verifyEmail(token);
        if (cancelled) return;
        setMessage(data?.message || 'Your email has been verified.');
        setPhase('success');
        redirectTimer = setTimeout(() => {
          if (!cancelled) navigate('/login');
        }, 4000);
      } catch (e) {
        if (cancelled) return;
        setMessage(e.message || 'Verification failed.');
        setPhase('error');
      }
    };

    run();
    return () => {
      cancelled = true;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [token, navigate]);

  if (phase === 'loading') {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="loading">Verifying your email…</div>
        </div>
      </div>
    );
  }

  if (phase === 'success') {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <CheckCircle size={40} color="#10B981" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
            Email verified
          </h1>
          <p style={{ color: '#6B7280', marginBottom: '24px', lineHeight: 1.6 }}>{message}</p>
          <p style={{ color: '#9CA3AF', fontSize: '0.9rem', marginBottom: '24px' }}>
            Redirecting to log in…
          </p>
          <Link
            to="/login"
            className="primary-button"
            style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', display: 'inline-flex' }}
          >
            Go to log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 24px',
          background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <AlertCircle size={40} color="#DC2626" />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
          Could not verify email
        </h1>
        <p style={{ color: '#6B7280', marginBottom: '28px', lineHeight: 1.6 }}>{message}</p>
        <Link
          to="/signup"
          className="primary-button"
          style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', display: 'inline-flex' }}
        >
          Back to sign up
        </Link>
        <p style={{ marginTop: '16px' }}>
          <Link to="/login" className="auth-link">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
