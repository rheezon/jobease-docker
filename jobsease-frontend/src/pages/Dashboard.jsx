import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../components/AuthProvider';
import { notifierService } from '../services/api';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, Bell, Settings as SettingsIcon, LogOut, Briefcase, MapPin, DollarSign, 
  Search, Home, User, FileText, MessageCircle, Compass, 
  Gift, ChevronDown, Filter, SortAsc, AlertCircle, CheckCircle,
  X, Wifi, Building, Users, Star, Clock, TrendingUp, Eye, Trash2, ArrowLeft, Edit,
  Moon, Sun, BarChart3, Menu
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

const Dashboard = () => {
  const [notifiers, setNotifiers] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('notifiers');
  const [showProfileBanner, setShowProfileBanner] = useState(() => {
    // Only show banner if user hasn't seen it before
    const hasSeenBanner = localStorage.getItem('hasSeenWelcomeBanner');
    return !hasSeenBanner;
  });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: null,
    variant: 'danger'
  });
  const [notifiersPage, setNotifiersPage] = useState(1);
  const [draftsPage, setDraftsPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  
  const { user, logout, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasFetchedRef = useRef(false);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    // Only fetch if user is available
    if (!user) {
      hasFetchedRef.current = false;
      return;
    }
    
    // Prefer created notifier passed via route state; fallback to localStorage cache
    let createdFromState = location.state?.createdNotifier || null;
    if (!createdFromState) {
      try {
        const cached = localStorage.getItem('lastCreatedNotifier');
        if (cached) {
          createdFromState = JSON.parse(cached);
          localStorage.removeItem('lastCreatedNotifier');
        }
      } catch {}
    }
    
    // Fetch notifiers for display (guard inside function prevents duplicates)
    fetchUserNotifiers(createdFromState).finally(() => {
      hasFetchedRef.current = true;
      // Clear location state after processing to prevent re-renders
      if (location.state?.createdNotifier || location.state?.refreshNotifiers) {
        navigate(location.pathname, { replace: true, state: null });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (error) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [error]);

  const fetchUserNotifiers = async (createdFromState = null) => {
    // Prevent multiple simultaneous calls
    if (loading && hasFetchedRef.current) return;
    
    setLoading(true);
    try {
      const allNotifiers = await notifierService.getAll();
      
      // Filter notifiers based on isDraft field
      let activeNotifiers = allNotifiers.filter(n => !n.isDraft);
      let draftNotifiers = allNotifiers.filter(n => n.isDraft);
      
      // If we just created a notifier, optimistically include it if not in list yet
      if (createdFromState && !createdFromState.isDraft) {
        const exists = activeNotifiers.some(n => n.id === createdFromState.id);
        if (!exists) {
          activeNotifiers = [createdFromState, ...activeNotifiers];
          setActiveTab('notifiers');
        }
      }
      
      setNotifiers(activeNotifiers);
      setDrafts(draftNotifiers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const discardDraft = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Discard Draft',
      message: 'Are you sure you want to discard this draft? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await notifierService.delete(id);
          await fetchUserNotifiers();
        } catch (e) {
          setError(e.message || 'Failed to delete draft');
        }
      }
    });
  };

  const handleDeleteNotifier = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Notifier',
      message: 'Are you sure you want to delete this notifier? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await notifierService.delete(id);
          await fetchUserNotifiers();
        } catch (e) {
          setError(e.message || 'Failed to delete notifier');
        }
      }
    });
  };

  const handleToggleActive = async (id) => {
    setTogglingId(id);
    try {
      const updatedNotifier = await notifierService.toggleActive(id);
      // Update the notifier in the state
      setNotifiers(prev => prev.map(n => n.id === id ? updatedNotifier : n));
    } catch (e) {
      setError(e.message || 'Failed to toggle notifier status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleLogout = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      variant: 'warning',
      confirmText: 'Logout',
      onConfirm: () => {
        logout();
        navigate('/login');
      }
    });
  };

  // Utility to format salary expectation from value to INR LPA string
  const formatInrLpa = (salary) => {
    if (salary == null || salary === '') return '-';
    // If salary is just digits or numeric
    if (typeof salary === 'number' || /^\d+$/.test(salary)) {
      const lpa = (typeof salary === 'number' ? salary : parseInt(salary, 10)) / 100000;
      return `₹${Number(lpa) % 1 === 0 ? lpa : lpa.toFixed(1)} LPA`;
    }
    // If salary is a range of digits: '800000-1500000'
    if (typeof salary === 'string' && /^(\d+)-(\d+)$/.test(salary)) {
      const [min, max] = salary.split('-').map(v => parseInt(v, 10) / 100000);
      return `₹${Number(min) % 1 === 0 ? min : min.toFixed(1)}-${Number(max) % 1 === 0 ? max : max.toFixed(1)} LPA`;
    }
    // If salary is a band in LPA, e.g. '10-15lpa'
    if (typeof salary === 'string' && salary.toLowerCase().includes('lpa')) {
      const band = salary.toLowerCase().replace('lpa','').split('-');
      if (band.length === 2) {
        return `₹${band[0]}-${band[1]} LPA`;
      }
      return `₹${band[0]} LPA`;
    }
    // If salary is some other text, just show as is
    return salary;
  };

  const formatLpaUserBand = (salary) => {
    if (!salary) return '-';
    const val = String(salary).trim().toLowerCase();
    if (val.includes('lpa')) return salary.replace(/lpa/i, 'LPA');
    if (val.match(/^\d+(\.\d+)?-\d+(\.\d+)?$/)) return salary + ' LPA';
    if (val.match(/^\d+(\.\d+)?$/)) return salary + ' LPA';
    return salary;
  };

  // Filter notifiers and drafts based on search query
  const filteredNotifiers = notifiers.filter(notifier => 
    notifier.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredDrafts = drafts.filter(draft => 
    draft.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset pagination when filters/tab change
  useEffect(() => {
    setNotifiersPage(1);
    setDraftsPage(1);
  }, [searchQuery, activeTab]);

  // Paginated slices
  const notifiersTotalPages = Math.max(1, Math.ceil(filteredNotifiers.length / pageSize));
  const draftsTotalPages = Math.max(1, Math.ceil(filteredDrafts.length / pageSize));
  const pagedNotifiers = filteredNotifiers.slice((notifiersPage - 1) * pageSize, notifiersPage * pageSize);
  const pagedDrafts = filteredDrafts.slice((draftsPage - 1) * pageSize, draftsPage * pageSize);

  const navigationItems = [
    { id: 'notifiers', label: `Notifiers ${notifiers.length}`, icon: Briefcase, active: activeTab === 'notifiers', onClick: () => setActiveTab('notifiers') },
    { id: 'drafts', label: `Drafts ${drafts.length}`, icon: FileText, active: activeTab === 'drafts', onClick: () => setActiveTab('drafts') },
    { id: 'add-notifier', label: 'Add Notifier', icon: Plus, onClick: () => navigate('/create-notifier'), isHighlight: true },
    { id: 'job-insights', label: 'Job Insights', icon: BarChart3, onClick: () => navigate('/job-insights') },
    { id: 'profile', label: 'Profile', icon: User, onClick: () => navigate('/profile') },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, onClick: () => navigate('/settings') },
    { id: 'logout', label: 'Logout', icon: LogOut, onClick: handleLogout, isDanger: true },
  ];

  if (loading) {
    return (
      <div className="modern-dashboard">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="modern-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <button 
            className="hamburger-menu" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
          <div className="logo">
            <span className="logo-text">JobKick</span>
          </div>
        </div>
        
        <div className="header-right" style={{ position: 'relative' }}>
          <div className="theme-toggle-switch" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme" role="button">
            <div className={`toggle-track-theme ${theme === 'dark' ? 'active' : ''}`}>
              <div className="toggle-thumb-theme">
                {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
              </div>
            </div>
          </div>
          <div className="user-profile" onClick={() => setShowUserMenu(v => !v)} style={{ cursor: 'pointer' }} aria-label="Open user menu" title="Open user menu" role="button">
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
              <button className="action-btn secondary" style={{ width: '100%' }} onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </header>

      <div className="dashboard-layout">
        {/* Sidebar Overlay for mobile */}
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
              display: 'none'
            }}
          />
        )}
        
        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            {navigationItems.map((item) => (
              <div 
                key={item.id} 
                className={`nav-item ${item.active ? 'active' : ''} ${item.isHighlight ? 'highlight' : ''} ${item.isDanger ? 'danger' : ''}`} 
                onClick={() => {
                  item.onClick();
                  setSidebarOpen(false); // Close sidebar after navigation on mobile
                }}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          {showProfileBanner && (
            <div className="profile-banner">
              <div className="banner-content">
                <div className="banner-icon">
                  <User size={20} />
                  <CheckCircle size={16} />
                </div>
                <div className="banner-text">
                <p>Welcome to JobKick! Manage your created notifiers or resume drafts you saved earlier.</p>
                </div>
                <button className="banner-close" onClick={() => {
                  setShowProfileBanner(false);
                  localStorage.setItem('hasSeenWelcomeBanner', 'true');
                }}>
                  <X size={20} />
                </button>
              </div>
              <div className="progress-bar">
                <div className="progress-segments">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="progress-segment active"></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="section-tabs">
            <button className={`tab ${activeTab === 'notifiers' ? 'active' : ''}`} onClick={() => setActiveTab('notifiers')}>
              Notifiers {notifiers.length}
            </button>
            <button className={`tab ${activeTab === 'drafts' ? 'active' : ''}`} onClick={() => setActiveTab('drafts')}>
              Drafts {drafts.length}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {activeTab === 'notifiers' && (
            <div className="notifiers-section">
              <div className="section-header">
                <h1 className="section-title">Your Job Notifiers</h1>
                <p className="section-subtitle">Create and manage your job notifiers</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => navigate('/job-insights')} className="secondary-button" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                  }}>
                    <BarChart3 size={16} />
                    Job Insights
                  </button>
                  <button onClick={() => navigate('/create-notifier')} className="primary-button add-notifier-btn">
                    <Plus size={16} />
                    Add Notifier
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="search-bar-dashboard">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search notifiers by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && (
                  <button className="clear-search" onClick={() => setSearchQuery('')}>
                    <X size={16} />
                  </button>
                )}
              </div>

              {filteredNotifiers.length === 0 ? (
                <div className="empty-state">
                  <Briefcase size={64} className="empty-icon" />
                  <h3>{searchQuery ? 'No notifiers found matching your search' : 'No notifiers created yet!'}</h3>
                  <p>{searchQuery ? 'Try a different search term' : "Click 'Add Notifier' to start receiving job notifications."}</p>
                </div>
              ) : (
                <div className="notifiers-grid">
                  {pagedNotifiers.map((notifier) => (
                    <div key={notifier.id} className="notifier-card-enhanced">
                      {/* Card Header */}
                      <div className="card-header-enhanced">
                        <div className="header-top">
                          <div className="name-status-row">
                            <h3 className="notifier-name">{notifier.name}</h3>
                            <div className="status-toggle-group">
                              <span className={`status-badge-enhanced ${notifier.isActive ? 'active' : 'inactive'}`}>
                                <span className="status-dot"></span>
                                {notifier.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <button 
                                onClick={() => handleToggleActive(notifier.id)}
                                disabled={togglingId === notifier.id}
                                className="toggle-switch-enhanced"
                                title={notifier.isActive ? 'Deactivate notifier' : 'Activate notifier'}
                              >
                                <div className={`toggle-track ${notifier.isActive ? 'active' : ''}`}>
                                  <div className="toggle-thumb"></div>
                                </div>
                              </button>
                            </div>
                          </div>
                          {notifier.role && (
                            <p className="notifier-role">{notifier.role}</p>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="card-actions-enhanced">
                          <Link to={`/notifier/${notifier.id}`} className="action-btn-enhanced primary">
                            <Eye size={18} />
                            <span>View Jobs</span>
                          </Link>
                          <Link 
                            to={`/edit-notifier/${notifier.id}`}
                            className="action-btn-enhanced secondary"
                            title="Edit notifier"
                            aria-label="Edit notifier"
                          >
                            <Edit size={18} />
                          </Link>
                          <button 
                            onClick={() => handleDeleteNotifier(notifier.id)} 
                            className="action-btn-enhanced danger"
                            title="Delete notifier"
                            aria-label="Delete notifier"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="card-body-enhanced">
                        {/* Details Grid */}
                        <div className="details-grid-enhanced">
                          <div className="detail-item-enhanced">
                            <div className="detail-icon">
                              <MapPin size={16} />
                            </div>
                            <div className="detail-content">
                              <span className="detail-label">Location</span>
                              <span className="detail-value">{notifier.city || 'Any'}</span>
                            </div>
                          </div>
                          
                          <div className="detail-item-enhanced">
                            <div className="detail-icon">
                              <DollarSign size={16} />
                            </div>
                            <div className="detail-content">
                              <span className="detail-label">Salary</span>
                              <span className="detail-value">{formatLpaUserBand(notifier.salaryExpectation)}</span>
                            </div>
                          </div>
                          
                          <div className="detail-item-enhanced">
                            <div className="detail-icon">
                              <Briefcase size={16} />
                            </div>
                            <div className="detail-content">
                              <span className="detail-label">Experience</span>
                              <span className="detail-value">{notifier.experience}</span>
                            </div>
                          </div>
                          
                          <div className="detail-item-enhanced">
                            <div className="detail-icon">
                              <Clock size={16} />
                            </div>
                            <div className="detail-content">
                              <span className="detail-label">Notice Period</span>
                              <span className="detail-value">{notifier.noticePeriod || 'Not specified'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Skills Section */}
                        {notifier.skills && (
                          <div className="skills-section-enhanced">
                            <div className="skills-header">
                              <Star size={14} />
                              <span>Skills</span>
                            </div>
                            <div className="skills-tags-enhanced">
                              {(() => {
                                const skillsArray = typeof notifier.skills === 'string' 
                                  ? notifier.skills.split(',').map(s => s.trim()).filter(s => s)
                                  : Array.isArray(notifier.skills) 
                                  ? notifier.skills 
                                  : [];
                                
                                return (
                                  <>
                                    {skillsArray.slice(0, 5).map((skill, index) => (
                                      <span key={index} className="skill-tag-enhanced">{skill}</span>
                                    ))}
                                    {skillsArray.length > 5 && (
                                      <span className="skill-tag-enhanced more">+{skillsArray.length - 5} more</span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Footer Info */}
                        <div className="card-footer-enhanced">
                          <div className="footer-item">
                            <Clock size={14} />
                            <span>Created {notifier.createdAt ? new Date(notifier.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}</span>
                          </div>
                          {notifier.unreadNotificationsCount > 0 && (
                            <div className="footer-item notification-count">
                              <Bell size={14} />
                              <span>{notifier.unreadNotificationsCount} new job{notifier.unreadNotificationsCount !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {filteredNotifiers.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>
                    Showing {(notifiersPage - 1) * pageSize + 1}
                    {' - '}
                    {Math.min(notifiersPage * pageSize, filteredNotifiers.length)} of {filteredNotifiers.length}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="action-btn" disabled={notifiersPage === 1} onClick={() => setNotifiersPage(p => Math.max(1, p - 1))}>Prev</button>
                    <span style={{ fontSize: 13 }}>Page {notifiersPage} / {notifiersTotalPages}</span>
                    <button className="action-btn" disabled={notifiersPage >= notifiersTotalPages} onClick={() => setNotifiersPage(p => Math.min(notifiersTotalPages, p + 1))}>Next</button>
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setNotifiersPage(1); setDraftsPage(1); }}
                      className="filter-input"
                      style={{ padding: '6px 10px', borderRadius: 6 }}
                    >
                      <option value={6}>6 / page</option>
                      <option value={8}>8 / page</option>
                      <option value={12}>12 / page</option>
                      <option value={16}>16 / page</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'drafts' && (
            <div className="notifiers-section">
              <div className="section-header">
                <h1 className="section-title">Drafts</h1>
                <p className="section-subtitle">Pick up where you left off.</p>
              </div>

              {/* Search Bar */}
              <div className="search-bar-dashboard">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search drafts by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && (
                  <button className="clear-search" onClick={() => setSearchQuery('')}>
                    <X size={16} />
                  </button>
                )}
              </div>

              {filteredDrafts.length === 0 ? (
                <div className="empty-state">
                  <FileText size={64} className="empty-icon" />
                  <h3>{searchQuery ? 'No drafts found matching your search' : 'No drafts saved'}</h3>
                  <p>{searchQuery ? 'Try a different search term' : 'Start a new notifier and your progress will be saved automatically.'}</p>
                </div>
              ) : (
                <div className="notifiers-grid">
                  {pagedDrafts.map((draft) => (
                    <div key={draft.id} className="notifier-card-enhanced">
                      {/* Card Header */}
                      <div className="card-header-enhanced">
                        <div className="header-top">
                          <div className="name-status-row">
                            <h3 className="notifier-name">{draft.name || draft.role || 'Untitled Draft'}</h3>
                            <div className="status-toggle-group">
                              <span className="status-badge-enhanced inactive">
                                <span className="status-dot"></span>
                                Draft
                              </span>
                            </div>
                          </div>
                          {draft.role && (
                            <p className="notifier-role">{draft.role}</p>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="card-actions-enhanced">
                          <button 
                            onClick={() => navigate(`/create-notifier?draftId=${draft.id}`)} 
                            className="action-btn-enhanced primary"
                          >
                            <Eye size={18} />
                            <span>Resume Draft</span>
                          </button>
                          <button 
                            onClick={() => discardDraft(draft.id)} 
                            className="action-btn-enhanced danger"
                            title="Discard draft"
                            aria-label="Discard draft"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="card-body-enhanced">
                        {/* Details Grid */}
                        <div className="details-grid-enhanced">
                          <div className="detail-item-enhanced">
                            <div className="detail-icon">
                              <MapPin size={16} />
                            </div>
                            <div className="detail-content">
                              <span className="detail-label">Location</span>
                              <span className="detail-value">{draft.city || 'Any'}</span>
                            </div>
                          </div>
                          
                          <div className="detail-item-enhanced">
                            <div className="detail-icon">
                              <DollarSign size={16} />
                            </div>
                            <div className="detail-content">
                              <span className="detail-label">Salary</span>
                              <span className="detail-value">{formatLpaUserBand(draft.salaryExpectation)}</span>
                            </div>
                          </div>
                          
                          <div className="detail-item-enhanced">
                            <div className="detail-icon">
                              <Briefcase size={16} />
                            </div>
                            <div className="detail-content">
                              <span className="detail-label">Experience</span>
                              <span className="detail-value">{draft.experience || 'Not specified'}</span>
                            </div>
                          </div>
                          
                          <div className="detail-item-enhanced">
                            <div className="detail-icon">
                              <Clock size={16} />
                            </div>
                            <div className="detail-content">
                              <span className="detail-label">Notice Period</span>
                              <span className="detail-value">{draft.noticePeriod || 'Not specified'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Skills Section */}
                        {draft.skills && (
                          <div className="skills-section-enhanced">
                            <div className="skills-header">
                              <Star size={14} />
                              <span>Skills</span>
                            </div>
                            <div className="skills-tags-enhanced">
                              {(() => {
                                // Handle skills as either string or array
                                const skillsArray = typeof draft.skills === 'string' 
                                  ? draft.skills.split(',').map(s => s.trim()).filter(s => s)
                                  : Array.isArray(draft.skills) 
                                  ? draft.skills 
                                  : [];
                                
                                if (skillsArray.length === 0) return null;
                                
                                return (
                                  <>
                                    {skillsArray.slice(0, 5).map((skill, index) => (
                                      <span key={index} className="skill-tag-enhanced">{skill}</span>
                                    ))}
                                    {skillsArray.length > 5 && (
                                      <span className="skill-tag-enhanced more">+{skillsArray.length - 5} more</span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Footer Info */}
                        <div className="card-footer-enhanced">
                          <div className="footer-item">
                            <Clock size={14} />
                            <span>Saved {draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {filteredDrafts.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>
                    Showing {(draftsPage - 1) * pageSize + 1}
                    {' - '}
                    {Math.min(draftsPage * pageSize, filteredDrafts.length)} of {filteredDrafts.length}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="action-btn" disabled={draftsPage === 1} onClick={() => setDraftsPage(p => Math.max(1, p - 1))}>Prev</button>
                    <span style={{ fontSize: 13 }}>Page {draftsPage} / {draftsTotalPages}</span>
                    <button className="action-btn" disabled={draftsPage >= draftsTotalPages} onClick={() => setDraftsPage(p => Math.min(draftsTotalPages, p + 1))}>Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
      />
    </div>
  );
};

export default Dashboard;