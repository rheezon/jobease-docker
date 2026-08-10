import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './components/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import CreateNotifier from './pages/CreateNotifier';
import EditNotifier from './pages/EditNotifier';
import NotifierJobs from './pages/NotifierJobs';
import JobInsights from './pages/JobInsights';
import Welcome from './pages/Welcome';
import NotFound from './pages/NotFound';
import MainAppLayout from './components/MainAppLayout';
import './App.css';

// Component to handle theme based on route
function ThemeManager() {
  const location = useLocation();

  useEffect(() => {
    const authPages = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'];
    const isAuthPage = authPages.includes(location.pathname);

    if (isAuthPage) {
      // Force light theme on auth pages
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      // Restore user's saved theme on other pages
      const savedTheme = localStorage.getItem('theme') || 'light';
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, [location.pathname]);

  return null;
}

function App() {
  // Remove any unexpected/legacy localStorage keys on app start
  useEffect(() => {
    try {
      const allowedKeys = new Set(['theme', 'token', 'user', 'hasSeenWelcomeBanner']);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && !allowedKeys.has(key)) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore cleanup errors
    }
  }, []);

  // Load theme on app start
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <ThemeManager />
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/welcome" element={
              <ProtectedRoute requireOnboarding={false}>
                <Welcome />
              </ProtectedRoute>
            } />
            <Route path="/onboarding" element={
              <ProtectedRoute requireOnboarding={false}>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route element={<MainAppLayout />}>
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute requireOnboarding={false}>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-notifier"
                element={
                  <ProtectedRoute>
                    <CreateNotifier />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-notifier/:id"
                element={
                  <ProtectedRoute>
                    <EditNotifier />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/job-insights"
                element={
                  <ProtectedRoute>
                    <JobInsights />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="/notifications" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />
            <Route path="/notifier/:notifierId/notifications" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />
            <Route path="/notifier/:id" element={
              <ProtectedRoute>
                <NotifierJobs />
              </ProtectedRoute>
            } />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
