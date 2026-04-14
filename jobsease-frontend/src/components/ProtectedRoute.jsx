import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

const ProtectedRoute = ({ children, requireOnboarding = true }) => {
  const { isAuthenticated, loading, needsOnboarding } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only check onboarding if required (not for onboarding page itself)
  if (requireOnboarding && needsOnboarding) {
    return <Navigate to="/welcome" replace />;
  }

  return children;
};

export default ProtectedRoute;
