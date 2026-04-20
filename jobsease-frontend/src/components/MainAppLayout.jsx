import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Settings as SettingsIcon,
  LogOut,
  Briefcase,
  FileText,
  User,
  ChevronDown,
  Moon,
  Sun,
  Menu,
  BarChart3,
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { notifierService } from '../services/api';
import ConfirmDialog from './ConfirmDialog';

/**
 * Shared shell: header + sidebar + main `<Outlet />`.
 * Child routes call `navigateWithGuard` / `registerNotifierFormGuard` via `useOutletContext()`.
 */
export default function MainAppLayout() {
  const { user, loading, isAuthenticated, needsOnboarding, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [notifiersCount, setNotifiersCount] = useState(0);
  const [draftsCount, setDraftsCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: null,
    variant: 'danger',
    confirmText: 'Confirm',
  });

  const dirtyCheckRef = useRef(() => false);
  const leavePromptRef = useRef(null);

  const refreshSidebarCounts = useCallback(async () => {
    if (!user) return;
    try {
      const all = await notifierService.getAll();
      setNotifiersCount(all.filter((n) => !n.isDraft).length);
      setDraftsCount(all.filter((n) => n.isDraft).length);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    refreshSidebarCounts();
  }, [refreshSidebarCounts, location.pathname, location.key]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const registerNotifierFormGuard = useCallback((guards) => {
    if (!guards) {
      dirtyCheckRef.current = () => false;
      leavePromptRef.current = null;
      return () => {
        dirtyCheckRef.current = () => false;
        leavePromptRef.current = null;
      };
    }
    dirtyCheckRef.current = guards.isDirty;
    leavePromptRef.current = guards.promptLeave;
    return () => {
      dirtyCheckRef.current = () => false;
      leavePromptRef.current = null;
    };
  }, []);

  const navigateWithGuard = useCallback(
    (to) => {
      void (async () => {
        if (location.pathname === '/create-notifier' && dirtyCheckRef.current()) {
          const prompt = leavePromptRef.current;
          if (prompt) {
            try {
              const leave = await prompt(to);
              if (!leave) return;
            } catch {
              return;
            }
          }
        }
        navigate(to);
      })();
    },
    [location.pathname, navigate]
  );

  const outletContext = useMemo(
    () => ({
      refreshSidebarCounts,
      navigateWithGuard,
      registerNotifierFormGuard,
    }),
    [refreshSidebarCounts, navigateWithGuard, registerNotifierFormGuard]
  );

  if (loading) {
    return (
      <div className="modern-dashboard">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const shellAllowWithoutOnboarding = location.pathname === '/profile';
  if (needsOnboarding && !shellAllowWithoutOnboarding) {
    return <Navigate to="/welcome" replace />;
  }

  const dashboardTab = searchParams.get('tab') === 'drafts' ? 'drafts' : 'notifiers';

  const navigationItems = [
    {
      id: 'notifiers',
      label: `Notifiers ${notifiersCount}`,
      icon: Briefcase,
      active: location.pathname === '/dashboard' && dashboardTab === 'notifiers',
      onClick: () => navigateWithGuard('/dashboard'),
    },
    {
      id: 'drafts',
      label: `Drafts ${draftsCount}`,
      icon: FileText,
      active: location.pathname === '/dashboard' && dashboardTab === 'drafts',
      onClick: () => navigateWithGuard('/dashboard?tab=drafts'),
    },
    {
      id: 'add-notifier',
      label: 'Add Notifier',
      icon: Plus,
      active: location.pathname === '/create-notifier',
      isHighlight: true,
      onClick: () => navigateWithGuard('/create-notifier'),
    },
    {
      id: 'job-insights',
      label: 'Job Insights',
      icon: BarChart3,
      active: location.pathname === '/job-insights',
      onClick: () => navigateWithGuard('/job-insights'),
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      active: location.pathname === '/profile',
      onClick: () => navigateWithGuard('/profile'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
      active: location.pathname === '/settings',
      onClick: () => navigateWithGuard('/settings'),
    },
    {
      id: 'logout',
      label: 'Logout',
      icon: LogOut,
      isDanger: true,
      onClick: () => {
        setConfirmDialog({
          isOpen: true,
          title: 'Logout',
          message: 'Are you sure you want to logout?',
          variant: 'warning',
          confirmText: 'Logout',
          onConfirm: () => {
            logout();
            navigate('/login');
          },
          onCancel: null,
        });
      },
    },
  ];

  return (
    <div className="modern-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <button
            type="button"
            className="hamburger-menu"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
          <button
            type="button"
            className="logo logo-home-btn"
            onClick={() => navigateWithGuard('/dashboard')}
            aria-label="Go to dashboard"
            title="Go to dashboard"
          >
            <span className="logo-text">JobKick</span>
          </button>
        </div>

        <div className="header-right" style={{ position: 'relative' }}>
          <div
            className="theme-toggle-switch"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title="Toggle theme"
            role="button"
          >
            <div className={`toggle-track-theme ${theme === 'dark' ? 'active' : ''}`}>
              <div className="toggle-thumb-theme">
                {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
              </div>
            </div>
          </div>
          <div
            className="user-profile"
            onClick={() => setShowUserMenu((v) => !v)}
            style={{ cursor: 'pointer' }}
            aria-label="Open user menu"
            title="Open user menu"
            role="button"
          >
            <span className="welcome-text">{user?.fullName?.split(' ')[0] || 'User'}</span>
            <div className="user-avatar">
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt="Profile" className="avatar-img" />
              ) : (
                <div className="avatar-img">
                  <User size={20} />
                </div>
              )}
              <ChevronDown size={16} />
            </div>
          </div>
          {showUserMenu && (
            <div className="user-menu">
              <button
                type="button"
                className="action-btn secondary"
                style={{ width: '100%' }}
                onClick={() => {
                  setShowUserMenu(false);
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Logout',
                    message: 'Are you sure you want to logout?',
                    variant: 'warning',
                    confirmText: 'Logout',
                    onConfirm: () => {
                      logout();
                      navigate('/login');
                    },
                    onCancel: null,
                  });
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="dashboard-layout">
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 98,
              display: 'none',
            }}
            aria-hidden="true"
          />
        )}

        <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            {navigationItems.map((item) => (
              <div
                key={item.id}
                className={`nav-item ${item.active ? 'active' : ''} ${item.isHighlight ? 'highlight' : ''} ${item.isDanger ? 'danger' : ''}`}
                onClick={() => {
                  item.onClick();
                  setSidebarOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.onClick();
                    setSidebarOpen(false);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        </aside>

        <main className="dashboard-main">
          <Outlet context={outletContext} />
        </main>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((d) => ({ ...d, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
      />
    </div>
  );
}
