import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../components/AuthProvider';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/api';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerifyHelp, setShowVerifyHelp] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [verifyFromEmailLink, setVerifyFromEmailLink] = useState(null);

  const { login, loginWithGoogle } = useAuth();
  const googleDivRef = useRef(null);
  const [googleError, setGoogleError] = useState('');
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    setShowVerifyHelp(false);
    setResendMessage('');

    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.message || '';
      setError(msg);
      setShowVerifyHelp(/verify your email/i.test(msg));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const ev = searchParams.get('emailVerified');
    if (ev !== '1' && ev !== '0') {
      return;
    }
    if (ev === '1') {
      setVerifyFromEmailLink({ ok: true });
    } else {
      const reason = searchParams.get('verifyReason');
      setVerifyFromEmailLink({ ok: false, reason });
    }
    const next = new URLSearchParams(searchParams);
    next.delete('emailVerified');
    next.delete('verifyReason');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setGoogleError('');
    const clientId =
      window._env_?.VITE_GOOGLE_CLIENT_ID ||
      window._env_?.GOOGLE_CLIENT_ID ||
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      import.meta.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      setGoogleError('Google sign-in is unavailable. Missing Google client ID configuration.');
      return;
    }

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return false;
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              if (response && response.credential) {
                await loginWithGoogle(response.credential);
                navigate('/dashboard');
              } else {
                setGoogleError('Google sign-in failed. Please try again.');
              }
            } catch (err) {
              setGoogleError(err.message || 'Google authentication failed.');
            }
          },
          auto_select: false,
        });
        if (googleDivRef.current) {
          window.google.accounts.id.renderButton(googleDivRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            shape: 'rectangular',
            text: 'continue_with',
          });
        }
        return true;
      } catch {
        setGoogleError('Google init failed. Check client ID.');
        return true; // stop retrying on error
      }
    };

    // Try immediately, then retry with interval if Google GSI script hasn't loaded yet
    if (!initGoogle()) {
      const interval = setInterval(() => {
        if (initGoogle()) clearInterval(interval);
      }, 200);
      // Stop trying after 5 seconds
      const timeout = setTimeout(() => {
        clearInterval(interval);
        setGoogleError('Google sign-in is unavailable right now. Please refresh and try again.');
      }, 5000);
      return () => { clearInterval(interval); clearTimeout(timeout); };
    }
  }, []);

  return (
    <div className="modern-auth-container">
      {/* Left side - Marketing/Visual section */}
      <div className="auth-visual-section">
        <div className="visual-elements">
          {/* Geometric shapes and graphics */}
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
          <div className="shape shape-6"></div>
          <div className="shape shape-7"></div>
          <div className="shape shape-8"></div>
          <div className="shape shape-9"></div>
          <div className="shape shape-10"></div>
          
          {/* Person avatars */}
          <div className="avatar avatar-1">
            <div className="avatar-face"></div>
          </div>
          <div className="avatar avatar-2">
            <div className="avatar-face"></div>
          </div>
          <div className="avatar avatar-3">
            <div className="avatar-face"></div>
          </div>
          
          {/* 3D Objects */}
          <div className="object-3d laptop">
            <div className="laptop-screen"></div>
          </div>
          <div className="object-3d keyboard">
            <div className="keyboard-keys"></div>
          </div>
          <div className="object-3d microphone">
            <div className="mic-stand"></div>
          </div>
        </div>
        
        <div className="marketing-content">
          <h1 className="marketing-title">Find the job made for you.</h1>
          <p className="marketing-subtitle">Browse over 130K jobs at top companies and fast-growing startups.</p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="auth-form-section">
        <div className="auth-form-container">
          <div className="auth-header">
            <h2 className="brand-name">Welcome to JobKick</h2>
            <h1 className="auth-title">Login</h1>
            <p className="auth-tagline">Find the job made for you!</p>
          </div>

          <div className="auth-options">
            <div ref={googleDivRef} style={{ display: 'flex', justifyContent: 'center' }} />
            {googleError && <div className="error-message" style={{ textAlign: 'center', marginTop: '8px' }}>{googleError}</div>}
          </div>

          <div style={{ height: '1px', background: '#E1E8ED', margin: '12px 0 16px' }} />

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            {verifyFromEmailLink?.ok === true && (
              <div className="success-message" style={{ textAlign: 'center', marginBottom: '12px' }} role="status">
                Your email is verified. You can sign in now.
              </div>
            )}
            {verifyFromEmailLink?.ok === false && (
              <div className="error-message" style={{ textAlign: 'center', marginBottom: '12px' }} role="alert">
                {verifyFromEmailLink.reason === 'invalid_or_expired'
                  ? 'That verification link is invalid or has expired. Use “Resend verification email” below or request a new link from sign up.'
                  : 'Email verification failed. Use “Resend verification email” below or try signing up again.'}
              </div>
            )}
            {error && <div className="error-message" style={{ textAlign: 'center' }}>{error}</div>}

            {showVerifyHelp && (
              <div className="success-message" style={{ textAlign: 'left', marginTop: '8px' }} role="status">
                <p style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>
                  You can send another verification link to the email you entered above.
                </p>
                {resendMessage && (
                  <p style={{ margin: '0 0 10px', fontSize: '0.9rem', opacity: 0.95 }}>{resendMessage}</p>
                )}
                <button
                  type="button"
                  className="auth-submit-btn"
                  style={{ marginTop: 0, padding: '10px 16px', fontSize: '0.95rem' }}
                  disabled={resendLoading}
                  onClick={async () => {
                    const email = getValues('email')?.trim();
                    if (!email) {
                      setResendMessage('Enter your email in the field above first.');
                      return;
                    }
                    setResendLoading(true);
                    setResendMessage('');
                    try {
                      const data = await authService.resendVerification(email);
                      setResendMessage(data?.message || 'If that account is unverified, we sent a new link.');
                    } catch (e) {
                      setResendMessage(e.message || 'Could not send. Try again later.');
                    } finally {
                      setResendLoading(false);
                    }
                  }}
                >
                  {resendLoading ? 'Sending…' : 'Resend verification email'}
                </button>
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-container">
                <input
                  type="email"
                  id="email"
                  placeholder="mail@website.com"
                  {...register('email')}
                  className={errors.email ? 'error' : ''}
                />
              </div>
              {errors.email && <span className="field-error">{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="min 8 characters"
                  {...register('password')}
                  className={errors.password ? 'error' : ''}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password.message}</span>}
            </div>

            <div className="forgot-password">
              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Not registered? <Link to="/signup" className="auth-link">Create an Account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;