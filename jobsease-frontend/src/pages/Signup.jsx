import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../components/AuthProvider';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/api';

const schema = yup.object({
  fullName: yup.string().required('Full name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
});

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [verifyMessage, setVerifyMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendFeedback, setResendFeedback] = useState('');
  
  const { signup, loginWithGoogle } = useAuth();
  const googleDivRef = useRef(null);
  const [googleError, setGoogleError] = useState('');
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signup(data.email, data.password, data.fullName);
      if (result?.requiresEmailVerification) {
        setPendingEmail(data.email);
        setVerifyMessage(result.message || 'Check your email to verify your account.');
        setVerificationSent(true);
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setGoogleError('');
    const clientId = window._env_?.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

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
                setGoogleError('Google sign up failed. Please try again.');
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
            text: 'signup_with',
          });
        }
        return true;
      } catch (_) {
        setGoogleError('Google init failed. Check client ID.');
        return true; // stop retrying on error
      }
    };

    // Try immediately, then retry with interval if Google GSI script hasn't loaded yet
    if (!initGoogle()) {
      const interval = setInterval(() => {
        if (initGoogle()) clearInterval(interval);
      }, 200);
      const timeout = setTimeout(() => clearInterval(interval), 5000);
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

      {/* Right side - Signup form */}
      <div className="auth-form-section">
        <div className="auth-form-container">
          <div className="auth-header">
            <h2 className="brand-name">Welcome to JobKick</h2>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-tagline">Find your next opportunity!</p>
          </div>

          <div className="auth-options">
            <div ref={googleDivRef} style={{ display: 'flex', justifyContent: 'center' }} />
            {googleError && <div className="error-message">{googleError}</div>}
          </div>

          <div style={{ height: '1px', background: '#E1E8ED', margin: '12px 0 16px' }} />

          {verificationSent ? (
            <div className="auth-form" style={{ marginTop: '8px' }}>
              <div className="success-message" role="status">
                <p style={{ margin: '0 0 12px' }}>{verifyMessage}</p>
                <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9 }}>
                  We sent the link to <strong>{pendingEmail}</strong>. After you verify, you can log in.
                </p>
              </div>
              {resendFeedback && (
                <div className={resendFeedback.startsWith('Could not') ? 'error-message' : 'success-message'} style={{ marginTop: '12px' }}>
                  {resendFeedback}
                </div>
              )}
              <button
                type="button"
                className="auth-submit-btn"
                style={{ marginTop: '16px' }}
                disabled={resendLoading}
                onClick={async () => {
                  setResendFeedback('');
                  setResendLoading(true);
                  try {
                    const data = await authService.resendVerification(pendingEmail);
                    setResendFeedback(data?.message || 'If an unverified account exists, we sent a new link.');
                  } catch (e) {
                    setResendFeedback(e.message || 'Could not resend. Try again later.');
                  } finally {
                    setResendLoading(false);
                  }
                }}
              >
                {resendLoading ? 'Sending…' : 'Resend verification email'}
              </button>
              <p style={{ marginTop: '20px', textAlign: 'center' }}>
                <Link to="/login" className="auth-link">Back to log in</Link>
              </p>
            </div>
          ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <div className="input-container">
                <input
                  type="text"
                  id="fullName"
                  placeholder="Enter name"
                  {...register('fullName')}
                  className={errors.fullName ? 'error' : ''}
                />
              </div>
              {errors.fullName && <span className="field-error">{errors.fullName.message}</span>}
            </div>

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

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-container">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  placeholder="min 8 characters"
                  {...register('confirmPassword')}
                  className={errors.confirmPassword ? 'error' : ''}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && <span className="field-error">{errors.confirmPassword.message}</span>}
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
          )}

          <div className="auth-footer">
            <p className="terms-text">
              By continuing you accept our standard <span className="terms-link" aria-disabled="true">terms and conditions</span> and our <span className="terms-link" aria-disabled="true">privacy policy</span>.
            </p>
            {!verificationSent && (
              <p className="terms-text" style={{ marginBottom: '12px' }}>
                If you already signed up but did not verify, submit the same email and password again — we will send a new verification link.
              </p>
            )}
            <p>
              Already have an account? <Link to="/login" className="auth-link">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;