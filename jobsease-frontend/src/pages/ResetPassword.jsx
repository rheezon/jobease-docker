import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { authService } from '../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    // Validate token on component mount
    const validateToken = async () => {
      if (!token) {
        setError('Invalid or missing reset token');
        setValidatingToken(false);
        return;
      }

      try {
        await authService.validateResetToken(token);
        setTokenValid(true);
      } catch (err) {
        setError('This password reset link is invalid or has expired');
        setTokenValid(false);
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="loading">Validating reset link...</div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
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
            justifyContent: 'center'
          }}>
            <AlertCircle size={40} color="#DC2626" />
          </div>
          
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
            Invalid Reset Link
          </h1>
          
          <p style={{ color: '#6B7280', marginBottom: '32px', lineHeight: 1.6 }}>
            {error}
          </p>

          <Link 
            to="/forgot-password" 
            className="primary-button"
            style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
          >
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
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
            justifyContent: 'center'
          }}>
            <CheckCircle size={40} color="#10B981" />
          </div>
          
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
            Password Reset Successful
          </h1>
          
          <p style={{ color: '#6B7280', marginBottom: '32px', lineHeight: 1.6 }}>
            Your password has been reset successfully. You will be redirected to the login page in a moment.
          </p>

          <Link 
            to="/login" 
            className="primary-button"
            style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Reset Password</h1>
          <p>Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message" style={{ textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={18} 
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9CA3AF'
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                style={{ paddingLeft: '40px', paddingRight: '40px' }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <small style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: '#6B7280' }}>
              Must be at least 6 characters long
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={18} 
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9CA3AF'
                }}
              />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                style={{ paddingLeft: '40px', paddingRight: '40px' }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="primary-button" 
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={isLoading}
          >
            {isLoading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="auth-link">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

