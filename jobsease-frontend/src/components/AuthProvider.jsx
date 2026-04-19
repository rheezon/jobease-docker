import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api.js';
import { notifierService } from '../services/api.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        let parsedUser = JSON.parse(userData);
        // Don't fetch notifiers here - let Dashboard handle it to avoid duplicate calls
        // Only set onboardingCompleted if it's already in localStorage
        if (parsedUser.onboardingCompleted === undefined) {
          parsedUser.onboardingCompleted = false;
        }
        setUser(parsedUser);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      const { token, user } = response;

      localStorage.setItem('token', token);

      // Fetch notifiers to set onboarding status correctly before any redirects
      let onboardingCompleted = false;
      try {
        const notifiers = await notifierService.getAll();
        onboardingCompleted = Array.isArray(notifiers) && notifiers.length > 0;
      } catch (_) {
        onboardingCompleted = false;
      }

      const userData = { id: user.id, email: user.email, fullName: user.fullName, onboardingCompleted };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      return response;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    }
  };

  const loginWithGoogle = async (idToken) => {
    try {
      const response = await authService.googleLogin(idToken);
      const { token, user } = response;
      localStorage.setItem('token', token);

      let onboardingCompleted = false;
      try {
        const notifiers = await notifierService.getAll();
        onboardingCompleted = Array.isArray(notifiers) && notifiers.length > 0;
      } catch (_) {
        onboardingCompleted = false;
      }

      const userData = { id: user.id, email: user.email, fullName: user.fullName, onboardingCompleted };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return response;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    }
  };

  const signup = async (email, password, fullName) => {
    try {
      const response = await authService.signup(email, password, fullName);
      if (response.requiresEmailVerification) {
        return response;
      }

      const { token, user } = response;
      localStorage.setItem('token', token);

      const userData = { id: user.id, email: user.email, fullName: user.fullName, onboardingCompleted: false };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return response;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateUserProfile = async (profileData) => {
    try {
      const updatedUser = { ...user, ...profileData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    login,
    loginWithGoogle,
    signup,
    logout,
    updateUserProfile,
    isAuthenticated: !!user,
    loading,
    needsOnboarding: user && !user.onboardingCompleted,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
