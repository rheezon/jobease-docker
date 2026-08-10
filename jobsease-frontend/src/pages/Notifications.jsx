import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Bell, Settings, LogOut, Briefcase, MapPin, DollarSign, 
  Search, Home, User, FileText, MessageCircle, Compass, 
  Gift, ChevronDown, Filter, SortAsc, AlertCircle, CheckCircle,
  X, Wifi, Building, Users, Star, Clock, TrendingUp, Eye, Trash2,
  ArrowLeft, Calendar, ExternalLink, Bookmark, Share2, UserPlus
} from 'lucide-react';
import { generateLinkedInReferralUrl } from '../utils/linkedinCompanyMapping';

const Notifications = () => {
  const { notifierId } = useParams();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [notifier, setNotifier] = useState(null);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (notifierId) {
      // Fetch/filter notifier configuration here (mock for now, or fetch from service)
      // setNotifier(...) based on notifierId
    }
    loadNotifications();
  }, [notifierId]);

  const loadNotifications = () => {
    // Mock notifications data
    const mockNotifications = [
      {
        id: 1,
        title: 'New Frontend Developer Position',
        company: 'TechCorp Inc.',
        location: 'San Francisco, CA',
        salary: '$80,000 - $120,000',
        type: 'job_match',
        isRead: false,
        timestamp: '2 hours ago',
        description: 'We found a perfect match for your React and JavaScript skills!',
        skills: ['React', 'JavaScript', 'TypeScript'],
        url: '#'
      },
      {
        id: 2,
        title: 'Profile Update Reminder',
        company: 'JobKick',
        location: '',
        salary: '',
        type: 'system',
        isRead: true,
        timestamp: '1 day ago',
        description: 'Consider updating your skills to get better job matches.',
        skills: [],
        url: '#'
      },
      {
        id: 3,
        title: 'Remote Work Opportunity',
        company: 'StartupXYZ',
        location: 'Remote',
        salary: '$70,000 - $100,000',
        type: 'job_match',
        isRead: false,
        timestamp: '3 hours ago',
        description: 'A startup is looking for a full-stack developer with your exact skill set.',
        skills: ['Node.js', 'React', 'MongoDB'],
        url: '#'
      },
      {
        id: 4,
        title: 'Weekly Job Digest',
        company: 'JobKick',
        location: '',
        salary: '',
        type: 'digest',
        isRead: true,
        timestamp: '2 days ago',
        description: 'Your weekly summary of new job opportunities.',
        skills: [],
        url: '#'
      }
    ];
    
    setNotifications(mockNotifications);
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const handleApplyForReferral = (companyName) => {
    // Generate LinkedIn URL using company ID mapping for accurate results
    const linkedInUrl = generateLinkedInReferralUrl(companyName);
    window.open(linkedInUrl, '_blank');
  };

  const filteredNotifications = notifications.filter(notif => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !notif.isRead;
    if (activeFilter === 'job_matches') return notif.type === 'job_match';
    if (activeFilter === 'system') return notif.type === 'system';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const navigationItems = [
    { id: 'notifiers', label: 'My Notifiers', icon: Briefcase, onClick: () => navigate('/dashboard') },
    { id: 'profile', label: 'Profile', icon: User, onClick: () => navigate('/profile') },
    { id: 'notifications', label: 'Notifications', icon: Bell, active: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="modern-dashboard">
        <div className="loading">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="modern-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-text">JobKick</span>
          </div>
        </div>
        
        <div className="header-right">
          <div className="user-profile">
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
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-layout">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            <div className="nav-item" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={20} />
              <span>Back to Dashboard</span>
            </div>
            <div className="nav-item active">
              <Bell size={20} />
              <span>Notifications</span>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          {notifierId && (
            <div className="notifier-bar">
              <h2 className="notifier-title">Job Notifications for: {notifier?.name || `Notifier ${notifierId}`}</h2>
              <button onClick={() => navigate('/dashboard')} className="back-btn">
                <ArrowLeft size={16} /> Back to Dashboard
              </button>
            </div>
          )}
          {/* Notifications Header */}
          <div className="notifications-header">
            <div className="header-content">
              <div className="header-left">
                <button 
                  onClick={() => navigate('/dashboard')} 
                  className="back-btn"
                >
                  <ArrowLeft size={20} />
                  Back to Dashboard
                </button>
                <div className="header-text">
                  <h1 className="page-title">Notifications</h1>
                  <p className="page-subtitle">
                    {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
                  </p>
                </div>
              </div>
              <div className="header-actions">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="mark-all-read-btn">
                    <CheckCircle size={16} />
                    Mark All as Read
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="notifications-filters">
            <button 
              className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button 
              className={`filter-tab ${activeFilter === 'unread' ? 'active' : ''}`}
              onClick={() => setActiveFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
            <button 
              className={`filter-tab ${activeFilter === 'job_matches' ? 'active' : ''}`}
              onClick={() => setActiveFilter('job_matches')}
            >
              Job Matches ({notifications.filter(n => n.type === 'job_match').length})
            </button>
            <button 
              className={`filter-tab ${activeFilter === 'system' ? 'active' : ''}`}
              onClick={() => setActiveFilter('system')}
            >
              System ({notifications.filter(n => n.type === 'system').length})
            </button>
          </div>

          {/* Notifications List */}
          <div className="notifications-list">
            {filteredNotifications.length === 0 ? (
              <div className="empty-state">
                <Bell size={64} className="empty-icon" />
                <h3>No Notifications</h3>
                <p>You're all caught up! We'll notify you when new opportunities match your profile.</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="notification-icon">
                    {notification.type === 'job_match' ? (
                      <Briefcase size={20} />
                    ) : notification.type === 'system' ? (
                      <Settings size={20} />
                    ) : (
                      <Bell size={20} />
                    )}
                  </div>
                  
                  <div className="notification-content">
                    <div className="notification-header">
                      <h3 className="notification-title">{notification.title}</h3>
                      <div className="notification-meta">
                        <span className="timestamp">{notification.timestamp}</span>
                        {!notification.isRead && <div className="unread-dot"></div>}
                      </div>
                    </div>
                    
                    <p className="notification-description">{notification.description}</p>
                    
                    {notification.company && (
                      <div className="notification-details">
                        <div className="detail-item">
                          <Building size={14} />
                          <span>{notification.company}</span>
                        </div>
                        {notification.location && (
                          <div className="detail-item">
                            <MapPin size={14} />
                            <span>{notification.location}</span>
                          </div>
                        )}
                        {notification.salary && (
                          <div className="detail-item">
                            <DollarSign size={14} />
                            <span>{notification.salary}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {notification.skills.length > 0 && (
                      <div className="notification-skills">
                        {notification.skills.map((skill, index) => (
                          <span key={index} className="skill-tag">{skill}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="notification-actions">
                    {notification.type === 'job_match' && (
                      <>
                        <button className="action-btn primary">
                          <ExternalLink size={16} />
                          View Job
                        </button>
                        {notification.company && (
                          <button 
                            className="action-btn referral-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyForReferral(notification.company);
                            }}
                            title="Find referrals on LinkedIn"
                          >
                            <UserPlus size={16} />
                            Ask for Referral
                          </button>
                        )}
                      </>
                    )}
                    <button className="action-btn secondary">
                      <Bookmark size={16} />
                    </button>
                    <button className="action-btn secondary">
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Notifications;