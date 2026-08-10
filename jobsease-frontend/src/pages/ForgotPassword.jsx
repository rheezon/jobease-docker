import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { authService } from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authService.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle size={40} color="#6366F1" />
          </div>
          
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
            Check Your Email
          </h1>
          
          <p style={{ color: '#6B7280', marginBottom: '32px', lineHeight: 1.6 }}>
            We've sent a password reset link to <strong>{email}</strong>. 
            Please check your inbox and click the link to reset your password.
          </p>

          <div style={{
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
              <strong>Didn't receive the email?</strong><br />
              Check your spam folder or wait a few minutes before requesting a new link.
            </p>
          </div>

          <Link 
            to="/login" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#6366F1',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            <ArrowLeft size={18} />
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-header">
          <h1>Forgot Password?</h1>
          <p>Enter your email address and we'll send you a link to reset your password</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message" style={{ textAlign: 'center' }}>
              {error}
              {error.toLowerCase().includes('no account found') && (
                <div style={{ marginTop: '12px' }}>
                  <Link 
                    to="/signup" 
                    style={{
                      color: '#6366F1',
                      textDecoration: 'none',
                      fontWeight: 600
                    }}
                  >
                    Create a new account →
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail 
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
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                style={{ paddingLeft: '40px' }}
                disabled={isLoading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="primary-button" 
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

