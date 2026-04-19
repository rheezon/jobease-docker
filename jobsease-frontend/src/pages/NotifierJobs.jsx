import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { notifierService, notificationService } from '../services/api';
import { useAuth } from '../components/AuthProvider';
import { ArrowLeft, Briefcase, MapPin, DollarSign, Star, Save as SaveIcon, FileText as FileIcon, Edit, Trash2, Building, Clock, Users, ExternalLink, Eye, X, ChevronDown, ChevronUp, Moon, Sun, User, Calendar, AlertCircle, CheckCircle, UserPlus, MessageSquare, Mail, Copy, Check } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import InterviewChat from '../components/InterviewChat';
import { generateLinkedInReferralUrl } from '../utils/linkedinCompanyMapping';

const NotifierJobs = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [notifier, setNotifier] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [resumeLatex, setResumeLatex] = useState('');
  const [originalResumeLatex, setOriginalResumeLatex] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showResumeViewer, setShowResumeViewer] = useState(false);
  const [currentNotificationId, setCurrentNotificationId] = useState(null);
  const [notificationResumeLatex, setNotificationResumeLatex] = useState('');
  const [originalNotificationResumeLatex, setOriginalNotificationResumeLatex] = useState('');
  const [hasUnsavedNotificationChanges, setHasUnsavedNotificationChanges] = useState(false);
  const [notificationPdfPreviewUrl, setNotificationPdfPreviewUrl] = useState('');
  const [generatingNotificationPdf, setGeneratingNotificationPdf] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [modalError, setModalError] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [hrContactModal, setHrContactModal] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Tab state for applied/not applied
  const [activeTab, setActiveTab] = useState('not-applied'); // 'not-applied' or 'applied'
  
  // Filter states
  const [filterCompany, setFilterCompany] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterSalary, setFilterSalary] = useState('');
  const [filterJobType, setFilterJobType] = useState(''); // Full-Time | Internship | Part-Time | Contract
  const [filterDeadline, setFilterDeadline] = useState('');
  
  // Notifier details collapse state
  const [isNotifierExpanded, setIsNotifierExpanded] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: null,
    variant: 'danger'
  });
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsPageSize, setJobsPageSize] = useState(10);
  const [interviewChatOpen, setInterviewChatOpen] = useState(false);
  const [interviewNotification, setInterviewNotification] = useState(null);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
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

  useEffect(() => {
    fetchNotifierAndJobs();
  }, [id]);

  const fetchNotifierAndJobs = async () => {
    setLoading(true);
    try {
      const n = await notifierService.getById(id);
      setNotifier(n);
      if (n.resumeLatex && n.resumeLatex.trim().length > 0) {
        setResumeLatex(n.resumeLatex);
      } else {
        setResumeLatex('');
      }

      // Fetch job notifications for this notifier
      const notifications = await notificationService.getForNotifier(id);
      setJobs(notifications);
    } catch (err) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  // Filter jobs based on active tab and filter criteria
  const filteredJobs = jobs.filter(job => {
    // Filter by tab (applied vs not applied)
    if (activeTab === 'not-applied' && job.applied) {
      return false;
    }
    if (activeTab === 'applied' && !job.applied) {
      return false;
    }
    
    const matchesCompany = !filterCompany || (job.companyName || '').toLowerCase().includes(filterCompany.toLowerCase());
    const matchesLocation = !filterLocation || (job.location || '').toLowerCase().includes(filterLocation.toLowerCase());
    const matchesRole = !filterRole || (job.role || '').toLowerCase().includes(filterRole.toLowerCase());
    // Salary range filter - extract numbers from salary string and compare
    let matchesSalary = true;
    if (filterSalary) {
      const salaryText = (job.salary || '').replace(/,/g, '');
      const nums = salaryText.match(/\d+/g);
      const maxSalaryInJob = nums ? Math.max(...nums.map(Number)) : 0;
      const filterVal = parseInt(filterSalary);
      matchesSalary = maxSalaryInJob >= filterVal;
    }
    const matchesJobType = !filterJobType || (job.jobType || '').toLowerCase() === filterJobType.toLowerCase();
    const matchesBatch = true;
    const matchesExperience = true;
    const matchesMinRelevance = true;
    
    let matchesDate = true;
    if (filterDate) {
      const jobDate = new Date(job.timestamp || job.createdAt);
      const filterDateObj = new Date(filterDate);
      matchesDate = jobDate.toDateString() === filterDateObj.toDateString();
    }
    
    // Only apply deadline filter for not-applied tab
    let deadlineNotPassed = true;
    if (activeTab === 'not-applied' && job.deadline) {
      const deadlineDate = new Date(job.deadline);
      const today = new Date();
      deadlineDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      deadlineNotPassed = deadlineDate >= today;
    }
    
    // Optional explicit deadline filter (on any tab)
    let matchesDeadlineDate = true;
    if (filterDeadline) {
      if (job.deadline) {
        const d = new Date(job.deadline);
        const f = new Date(filterDeadline);
        matchesDeadlineDate = d.toDateString() === f.toDateString();
      } else {
        matchesDeadlineDate = false;
      }
    }
    
    return matchesCompany 
      && matchesLocation 
      && matchesRole
      && matchesSalary
      && matchesJobType
      && matchesBatch
      && matchesExperience
      && matchesMinRelevance
      && matchesDate 
      && deadlineNotPassed
      && matchesDeadlineDate;
  });

  // Calculate counts for tabs
  const notAppliedCount = jobs.filter(job => !job.applied && (!job.deadline || new Date(job.deadline) >= new Date())).length;
  const appliedCount = jobs.filter(job => job.applied).length;

  // Reset paging when filters or tab change
  useEffect(() => {
    setJobsPage(1);
  }, [activeTab, filterCompany, filterLocation, filterDate, filterRole, filterSalary, filterJobType, filterDeadline]);

  // Pagination for filtered jobs
  const jobsTotalPages = Math.max(1, Math.ceil(filteredJobs.length / jobsPageSize));
  const pagedJobs = filteredJobs.slice((jobsPage - 1) * jobsPageSize, jobsPage * jobsPageSize);

  const clearFilters = () => {
    setFilterCompany('');
    setFilterLocation('');
    setFilterDate('');
    setFilterRole('');
    setFilterSalary('');
    setFilterJobType('');
    setFilterDeadline('');
  };

  const handleDeleteNotifier = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Notifier',
      message: 'Are you sure you want to delete this notifier? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await notifierService.delete(id);
          navigate('/dashboard');
        } catch (err) {
          setError(err.message || 'Failed to delete notifier');
        }
      }
    });
  };

  const handleDeleteNotification = (notificationId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Job Notification',
      message: 'Are you sure you want to remove this job notification?',
      variant: 'danger',
      confirmText: 'Remove',
      onConfirm: async () => {
        try {
          await notificationService.delete(notificationId);
          // Remove the notification from the local state
          setJobs(jobs.filter(job => job.id !== notificationId));
        } catch (err) {
          setError(err.message || 'Failed to delete notification');
        }
      }
    });
  };

  const handleApplyForReferral = (companyName) => {
    // Generate LinkedIn URL using company ID mapping for accurate results
    const linkedInUrl = generateLinkedInReferralUrl(companyName);
    window.open(linkedInUrl, '_blank');
  };

  const handleMarkAsApplied = (jobId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Mark as Applied',
      message: 'Once marked as applied, you won\'t be able to change this status again. Only confirm if you have actually applied to this job.',
      variant: 'warning',
      confirmText: 'Yes, I Applied',
      onConfirm: async () => {
        try {
          await notificationService.markAsApplied(jobId);
          // Remove the job from local state
          setJobs(jobs.filter(job => job.id !== jobId));
        } catch (err) {
          setError(err.message || 'Failed to mark as applied');
        }
      }
    });
  };

  if (loading) return <div className="modern-dashboard"><div className="loading">Loading jobs...</div></div>;
  if (error) return <div className="modern-dashboard"><div className="error-message">{error}</div></div>;

  return (
    <div className="modern-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <span className="logo-text">JobKick</span>
        </div>
        <div className="header-right" style={{ position: 'relative' }}>
          <div className="theme-toggle-switch" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme" role="button">
            <div className={`toggle-track-theme ${theme === 'dark' ? 'active' : ''}`}>
              <div className="toggle-thumb-theme">
                {theme === 'light' ? <Sun size={28} /> : <Moon size={28} />}
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
      <main className="dashboard-main notifier-jobs-page-main">
        {/* Notifier Details */}
        <div className="notifier-jobs-main-container" style={{ 
          marginBottom: '32px',
          padding: '28px 28px 24px 28px',
          position: 'relative'
        }}>
          {/* Header Section */}
          <div style={{ marginBottom: isNotifierExpanded ? '24px' : '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <h1 className="notifier-jobs-header-title" style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '32px', 
                  fontWeight: 700, 
                  letterSpacing: '-0.5px'
                }}>
                  {notifier?.name}
                </h1>
                {notifier?.role && (
                  <p className="notifier-jobs-header-role" style={{ 
                    margin: 0, 
                    fontSize: '17px', 
                    fontWeight: 500
                  }}>
                    {notifier.role}
                  </p>
                )}
          </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ 
                  padding: '8px 16px', 
                  borderRadius: '20px', 
                  fontSize: '13px', 
                  fontWeight: 600,
                  background: notifier?.isActive 
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                    : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  color: 'white',
                  boxShadow: notifier?.isActive 
                    ? '0 2px 8px rgba(16, 185, 129, 0.3)' 
                    : '0 2px 8px rgba(245, 158, 11, 0.3)'
                }}>
                  {notifier?.isActive ? 'Active' : 'Inactive'}
                </span>
                <button 
                  onClick={() => navigate(`/edit-notifier/${id}`)} 
                  className="action-btn-enhanced secondary"
                  title="Edit notifier"
                  aria-label="Edit notifier"
                >
                  <Edit size={18} />
            </button>
                <button 
                  onClick={handleDeleteNotifier}
                  className="action-btn-enhanced danger"
                  title="Delete notifier"
                  aria-label="Delete notifier"
                >
                  <Trash2 size={18} />
              </button>
              </div>
            </div>
          </div>

          {/* Collapsible Details Section */}
          {isNotifierExpanded && (
          <>
          {/* Details Section - Flowing Layout */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '20px 32px',
            marginBottom: '24px',
            paddingBottom: '0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px' }}>
              <div style={{ 
                padding: '10px', 
                background: 'linear-gradient(135deg, #EBF5FF 0%, #E0F2FE 100%)', 
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MapPin size={20} color="#3B82F6" />
              </div>
              <div>
                <div className="detail-info-label" style={{ fontSize: '12px', fontWeight: 500, marginBottom: '2px' }}>Location</div>
                <div className="detail-info-value" style={{ fontSize: '15px', fontWeight: 600 }}>
                  {notifier?.city || 'Any'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px' }}>
              <div style={{ 
                padding: '10px', 
                background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', 
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <DollarSign size={20} color="#10B981" />
              </div>
              <div>
                <div className="detail-info-label" style={{ fontSize: '12px', fontWeight: 500, marginBottom: '2px' }}>Salary</div>
                <div className="detail-info-value" style={{ fontSize: '15px', fontWeight: 600 }}>
                  {notifier?.salaryExpectation || 'Not specified'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px' }}>
              <div style={{ 
                padding: '10px', 
                background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', 
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Briefcase size={20} color="#F59E0B" />
              </div>
              <div>
                <div className="detail-info-label" style={{ fontSize: '12px', fontWeight: 500, marginBottom: '2px' }}>Experience</div>
                <div className="detail-info-value" style={{ fontSize: '15px', fontWeight: 600 }}>
                  {notifier?.experience || 'Any'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px' }}>
              <div style={{ 
                padding: '10px', 
                background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)', 
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={20} color="#9333EA" />
              </div>
              <div>
                <div className="detail-info-label" style={{ fontSize: '12px', fontWeight: 500, marginBottom: '2px' }}>Notice Period</div>
                <div className="detail-info-value" style={{ fontSize: '15px', fontWeight: 600 }}>
                  {notifier?.noticePeriod || 'Not specified'}
                </div>
              </div>
            </div>

            {notifier?.companiesPreference && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px', flex: '1 1 100%' }}>
                <div style={{ 
                  padding: '10px', 
                  background: 'linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%)', 
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Users size={20} color="#6366F1" />
                </div>
                <div>
                  <div className="detail-info-label" style={{ fontSize: '12px', fontWeight: 500, marginBottom: '2px' }}>Preferred Companies</div>
                  <div className="detail-info-value" style={{ fontSize: '15px', fontWeight: 600 }}>
                    {notifier.companiesPreference}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Skills Section */}
          {notifier?.skills && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ 
                fontSize: '13px', 
                color: '#6B7280', 
                marginBottom: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <Star size={16} color="#F59E0B" />
                Skills
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {(() => {
                  const skillsArray = typeof notifier.skills === 'string' 
                    ? notifier.skills.split(',').map(s => s.trim()).filter(s => s)
                    : Array.isArray(notifier.skills) 
                    ? notifier.skills 
                    : [];
                  
                  return skillsArray.map((skill, index) => (
                    <span key={index} style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 500,
                      boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)'
                    }}>{skill}</span>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Additional Preferences */}
          {notifier?.additionalPreferences && (
            <div className="additional-preferences-box" style={{ 
              marginBottom: '24px',
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
              borderLeft: '4px solid #F97316',
              borderRadius: '8px'
            }}>
              <div className="additional-preferences-label" style={{ 
                fontSize: '12px', 
                color: '#9A3412', 
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '6px' 
              }}>
                Additional Preferences
              </div>
              <div className="additional-preferences-value detail-info-value" style={{ fontSize: '15px', lineHeight: '1.6' }}>
                {notifier.additionalPreferences}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button 
              className="action-btn secondary" 
              onClick={() => {
                setOriginalResumeLatex(resumeLatex);
                setHasUnsavedChanges(false);
                // Load existing PDF if available
                if (notifier?.latexResumePdfUrl) {
                  setPdfPreviewUrl(notifier.latexResumePdfUrl + '?t=' + Date.now());
                }
                setShowEditor(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FileIcon size={16} /> Edit LaTeX Resume
            </button>
          </div>
          </>
          )}

          {/* Toggle Button - On Container Bottom Border */}
          <button
            onClick={() => setIsNotifierExpanded(!isNotifierExpanded)}
            className="toggle-details-btn"
            style={{
              position: 'absolute',
              bottom: '-18px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '8px 20px',
              zIndex: 10
            }}
            title={isNotifierExpanded ? 'Hide details' : 'Show details'}
          >
            {isNotifierExpanded ? (
              <>
                <ChevronUp size={16} />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                Show Details
              </>
            )}
          </button>
        </div>
        <div className="notifier-jobs-listing">
          {/* Job Notifications Section Header */}
          {jobs.length > 0 && (
            <>
              <div className="job-notifications-header" style={{
                marginTop: '32px',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '2px solid #E5E7EB'
              }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Briefcase size={28} style={{ color: '#6366F1' }} />
                  Job Notifications
                  <span style={{
                    padding: '4px 12px',
                    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginLeft: '8px'
                  }}>
                    {notAppliedCount}
                  </span>
                </h2>
              </div>

              {/* Tabs for Applied/Not Applied */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                borderBottom: '2px solid #E5E7EB',
                paddingBottom: '0'
              }}>
                <button
                  onClick={() => setActiveTab('not-applied')}
                  style={{
                    padding: '12px 24px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'not-applied' ? '3px solid #6366F1' : '3px solid transparent',
                    color: activeTab === 'not-applied' ? '#6366F1' : '#6B7280',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '-2px'
                  }}
                  className="job-tab-button"
                >
                  Not Applied ({notAppliedCount})
                </button>
                <button
                  onClick={() => setActiveTab('applied')}
                  style={{
                    padding: '12px 24px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'applied' ? '3px solid #6366F1' : '3px solid transparent',
                    color: activeTab === 'applied' ? '#6366F1' : '#6B7280',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '-2px'
                  }}
                  className="job-tab-button"
                >
                  Applied ({appliedCount})
                </button>
              </div>
            </>
          )}
          
          {/* Filter Section */}
          {jobs.length > 0 && (
            <div className="filter-container">
              <div className="filter-header">
                <h3 className="filter-title">Filter Jobs</h3>
                <button 
                  onClick={clearFilters}
                  className="clear-filters-btn"
                >
                  Clear Filters
                </button>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px'
              }}>
                <div>
                  <label className="filter-label" style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    marginBottom: '6px'
                  }}>
                    Company Name
                  </label>
                  <input
                    type="text"
                    className="filter-input"
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    placeholder="Search company..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                  />
                </div>
                
                <div>
                  <label className="filter-label" style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    marginBottom: '6px'
                  }}>
                    Location
                  </label>
                  <input
                    type="text"
                    className="filter-input"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    placeholder="Search location..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                  />
                </div>
                
                <div>
                  <label className="filter-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Role
                  </label>
                  <input
                    type="text"
                    className="filter-input"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    placeholder="e.g., Backend Developer"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                
                <div>
                  <label className="filter-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Min Salary (LPA)
                  </label>
                  <select
                    className="filter-input"
                    value={filterSalary}
                    onChange={(e) => setFilterSalary(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="">Any</option>
                    <option value="3">3+ LPA</option>
                    <option value="5">5+ LPA</option>
                    <option value="8">8+ LPA</option>
                    <option value="10">10+ LPA</option>
                    <option value="15">15+ LPA</option>
                    <option value="20">20+ LPA</option>
                    <option value="30">30+ LPA</option>
                    <option value="50">50+ LPA</option>
                  </select>
                </div>
                
                <div>
                  <label className="filter-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Job Type
                  </label>
                  <select
                    className="filter-input"
                    value={filterJobType}
                    onChange={(e) => setFilterJobType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="">All</option>
                    <option value="Full-Time">Full-Time</option>
                    <option value="Internship">Internship</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                
                
                <div>
                  <label className="filter-label" style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    marginBottom: '6px'
                  }}>
                    Date
                  </label>
                  <input
                    type="date"
                    className="filter-input"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                  />
                </div>
                
                <div>
                  <label className="filter-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Deadline
                  </label>
                  <input
                    type="date"
                    className="filter-input"
                    value={filterDeadline}
                    onChange={(e) => setFilterDeadline(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                
              </div>
              
              {(filterCompany || filterLocation || filterDate) && (
                <div className="filter-active-info">
                  Showing {filteredJobs.length} of {jobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}
          
          {jobs.length === 0 ? (
            <div className="empty-state" style={{margin: '2rem 0'}}>
              <Briefcase size={64} className="empty-icon" />
              <h3>No job notifications yet.</h3>
              <p>Job notifications will appear here when the scheduler finds matching opportunities for this notifier.</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="empty-state" style={{margin: '2rem 0'}}>
              <Briefcase size={64} className="empty-icon" />
              <h3>No jobs match your filters</h3>
              <p>Try adjusting your filter criteria to see more results.</p>
            </div>
          ) : (
            <div className="job-listings">
                {pagedJobs.map(job => (
                <div key={job.id} className="job-notification-card" style={{
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '20px',
                  cursor: 'default'
                }}>
                  {/* Header with Company Name and Experience Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 className="job-company-name" style={{ 
                        margin: '0 0 8px 0', 
                        fontSize: '22px', 
                        fontWeight: 600, 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <Building size={24} style={{ color: '#6366F1', flexShrink: 0 }} />
                        {job.companyName}
                      </h3>
                      <div className="job-timestamp" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        marginTop: '4px'
                      }}>
                        <Clock size={14} />
                        {new Date(job.timestamp || job.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        padding: '6px 14px',
                        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                      }}>
                        {job.experience}
                      </span>
                      <button
                        onClick={() => handleDeleteNotification(job.id)}
                        className="action-btn-enhanced danger"
                        style={{
                          padding: '10px 14px'
                        }}
                        title="Remove notification"
                        aria-label="Remove notification"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Location and Salary Info */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '24px', 
                    marginBottom: '20px',
                    flexWrap: 'wrap'
                  }}>
                    {job.role && (
                      <div className="job-info-pill" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500
                      }}>
                        <Briefcase size={16} style={{ color: '#6366F1' }} />
                        {job.role}
                      </div>
                    )}
                    <div className="job-info-pill" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 500
                    }}>
                      <MapPin size={16} style={{ color: '#6366F1' }} />
                      {job.location}
                    </div>
                    {job.salary && (
                      <div className="job-info-pill" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500
                      }}>
                        <DollarSign size={16} style={{ color: '#6366F1' }} />
                        {job.salary}
                      </div>
                    )}
                    {job.jobType && (
                      <div className="job-info-pill" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500
                      }}>
                        <Clock size={16} style={{ color: '#6366F1' }} />
                        {job.jobType}
                      </div>
                    )}
                    {job.batch && (
                      <div className="job-info-pill" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500
                      }}>
                        <User size={16} style={{ color: '#6366F1' }} />
                        Batch: {job.batch}
                      </div>
                    )}
                    {job.duration && (
                      <div className="job-info-pill" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500
                      }}>
                        <Calendar size={16} style={{ color: '#6366F1' }} />
                        {job.duration}
                      </div>
                    )}
                    {job.deadline && (
                      <div className="job-info-pill" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#EA580C'
                      }}>
                        <AlertCircle size={16} style={{ color: '#EA580C' }} />
                        Deadline: {new Date(job.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>

                  {/* Job Description */}
                  <div className="job-description-box" style={{ 
                    marginBottom: '20px',
                    padding: '16px',
                    borderRadius: '8px'
                  }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '14px', 
                      lineHeight: '1.7'
                    }}>
                      {job.jobDescription}
                    </p>
                  </div>

                  {/* Info Box */}
                  <div className="job-info-notice" style={{ 
                    marginBottom: '20px', 
                    padding: '12px 16px', 
                    borderRadius: '8px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <FileIcon size={16} style={{ flexShrink: 0, color: '#6366F1' }} />
                    <span style={{ fontWeight: 500 }}>
                      Resume automatically generated and tailored for this job based on your LaTeX code
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => {
                        setCurrentNotificationId(job.id);
                       
                        const initialLatex = job.resumeLatex || notifier?.resumeLatex || '';
                        setNotificationResumeLatex(initialLatex);
                        setOriginalNotificationResumeLatex(initialLatex);
                        setHasUnsavedNotificationChanges(false);
                        
                        if (job.resumeLink) {
                          setNotificationPdfPreviewUrl(job.resumeLink + '?t=' + Date.now());
                        } else {
                          setNotificationPdfPreviewUrl('');
                        }
                        setShowResumeViewer(true);
                      }}
                      className="view-resume-btn"
                    >
                      <Eye size={18} /> View Resume
                    </button>
                    <button
                      onClick={() => {
                        setInterviewNotification(job);
                        setInterviewChatOpen(true);
                      }}
                      className="interview-prep-btn"
                      title="Practice interview with AI"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)';
                      }}
                    >
                      <MessageSquare size={18} /> Interview Prep
                    </button>
                    {activeTab === 'not-applied' && (
                      <>
                        <button 
                          onClick={() => handleMarkAsApplied(job.id)}
                          className="mark-applied-button"
                          title="Mark as applied and remove from list"
                        >
                          <CheckCircle size={18} /> 
                          Mark as Applied
                        </button>
                        <button 
                          onClick={() => {
                            const url = job.jobLink?.startsWith('http') ? job.jobLink : `https://${job.jobLink}`;
                            window.open(url, '_blank');
                          }}
                          className="apply-now-btn"
                        >
                          <ExternalLink size={18} /> Apply Now
                        </button>
                        {job.companyName && (
                          <button
                            onClick={() => handleApplyForReferral(job.companyName)}
                            className="referral-btn-jobs"
                            title="Find referrals on LinkedIn"
                          >
                            <UserPlus size={18} /> Ask for Referral
                          </button>
                        )}
                        {(job.hrContactEmail || job.hrContactApplyLinks) && (
                          <button
                            onClick={() => setHrContactModal(job)}
                            title="View HR contact details"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 18px',
                              borderRadius: '8px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                              color: 'white',
                              fontSize: '14px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 158, 11, 0.3)';
                            }}
                          >
                            <Mail size={18} /> HR Contact
                          </button>
                        )}
                      </>
                    )}
                    {activeTab === 'applied' && (
                      <button 
                        onClick={() => {
                            const url = job.jobLink?.startsWith('http') ? job.jobLink : `https://${job.jobLink}`;
                            window.open(url, '_blank');
                          }}
                        className="view-resume-btn"
                      >
                        <ExternalLink size={18} /> View Job
                      </button>
                    )}
                    </div>
                </div>
              ))}
              {filteredJobs.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>
                    Showing {(jobsPage - 1) * jobsPageSize + 1}
                    {' - '}
                    {Math.min(jobsPage * jobsPageSize, filteredJobs.length)} of {filteredJobs.length}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="action-btn" disabled={jobsPage === 1} onClick={() => setJobsPage(p => Math.max(1, p - 1))}>Prev</button>
                    <span style={{ fontSize: 13 }}>Page {jobsPage} / {jobsTotalPages}</span>
                    <button className="action-btn" disabled={jobsPage >= jobsTotalPages} onClick={() => setJobsPage(p => Math.min(jobsTotalPages, p + 1))}>Next</button>
                    <select
                      value={jobsPageSize}
                      onChange={(e) => { setJobsPageSize(parseInt(e.target.value, 10)); setJobsPage(1); }}
                      className="filter-input"
                      style={{ padding: '6px 10px', borderRadius: 6 }}
                    >
                      <option value={5}>5 / page</option>
                      <option value={10}>10 / page</option>
                      <option value={15}>15 / page</option>
                      <option value={20}>20 / page</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      {showEditor && (
        <div className="modal-overlay">
          <div className="modal-container">
            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 className="modal-title">Edit LaTeX Resume</h3>
                <span style={{ 
                  fontSize: '12px', 
                  color: hasUnsavedChanges ? '#DC2626' : '#059669',
                  fontWeight: 500
                }}>
                  {hasUnsavedChanges ? 'not saved' : 'saved'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
              <button className="action-btn" onClick={() => {
                  setResumeLatex(originalResumeLatex);
                  setHasUnsavedChanges(false);
                }}>Reset</button>
                <button className="action-btn secondary" disabled={generatingPdf} onClick={async () => {
                  try {
                    setGeneratingPdf(true);
                    setModalError('');
                    const response = await notifierService.updateResume(id, resumeLatex);
                    setOriginalResumeLatex(resumeLatex); 
                    setHasUnsavedChanges(false);
                    
                    setNotifier(response);
                    
                    if (response.latexResumePdfUrl) {
                      setPdfPreviewUrl(response.latexResumePdfUrl + '?t=' + Date.now());
                    }
                    
                    setGeneratingPdf(false);
                  } catch (e) { 
                    setGeneratingPdf(false);
                    
                    // Show specific error message from backend inline (no alert)
                    let errorMessage = 'Failed to save and generate preview. Please try again.';
                    
                    if (e.message) {
                      if (e.message.includes('Invalid LaTeX')) {
                        errorMessage = 'Invalid LaTeX Code: ' + e.message.replace('Invalid LaTeX Code: ', '');
                      } else if (e.message.includes('Rate limit exceeded')) {
                        errorMessage = 'Rate limit exceeded. Try again after some time.';
                      } else {
                        errorMessage = e.message;
                      }
                    }
                    setModalError(errorMessage);
                  }
                }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SaveIcon size={16} />
                  {generatingPdf ? 'Saving & Generating...' : 'Save & Preview'}
                </button>
                <button className="action-btn" onClick={() => {
                  setShowEditor(false);
                  setPdfPreviewUrl('');
                }}>Close</button>
              </div>
            </div>
            
            {/* Inline modal error */}
            {modalError && (
              <div className="error-message" style={{ margin: '12px 0' }}>
                {modalError}
              </div>
            )}

            {/* Split Screen Content */}
            <div style={{ display: 'flex', gap: '16px', flex: 1, overflow: 'hidden' }}>
              {/* Left: LaTeX Editor */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="editor-label">LaTeX Code</div>
                <textarea 
                  value={resumeLatex} 
                  onChange={e => {
                    setResumeLatex(e.target.value);
                    setHasUnsavedChanges(true);
                  }} 
                  placeholder="Enter your LaTeX resume code here..."
                  className="latex-textarea"
                />
              </div>
              
              {/* Right: PDF Preview */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="editor-label">PDF Preview</div>
                <div className="pdf-preview-container">
                  {generatingPdf ? (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '100%',
                      color: '#6B7280',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        border: '4px solid #E5E7EB', 
                        borderTop: '4px solid #3B82F6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      <div>Generating PDF...</div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF' }}>This may take a few seconds</div>
                    </div>
                  ) : pdfPreviewUrl ? (
                    <iframe 
                      src={pdfPreviewUrl}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      title="Resume PDF Preview"
                    />
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '100%',
                      color: '#6B7280',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <FileIcon size={48} />
                      <div>No PDF preview available</div>
                      <div style={{ fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
                        Update your LaTeX code, then click "Save & Preview" to generate PDF
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showResumeViewer && (
        <div className="modal-overlay">
          <div className="modal-container">
            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h3 className="modal-title">View Resume</h3>
                  <span style={{ 
                    fontSize: '12px', 
                    color: hasUnsavedNotificationChanges ? '#DC2626' : '#059669',
                    fontWeight: 500
                  }}>
                    {hasUnsavedNotificationChanges ? 'not saved' : 'saved'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#6B7280', fontStyle: 'italic' }}>
                  This resume has been AI-customized to match this job posting. You can edit the LaTeX code to further personalize it.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="action-btn" onClick={() => {
                  setNotificationResumeLatex(originalNotificationResumeLatex);
                  setHasUnsavedNotificationChanges(false);
                }}>Reset</button>
                <button className="action-btn secondary" disabled={generatingNotificationPdf} onClick={async () => {
                  try {
                    setGeneratingNotificationPdf(true);
                    setModalError('');
                    const response = await notificationService.updateResume(currentNotificationId, notificationResumeLatex);
                    setOriginalNotificationResumeLatex(notificationResumeLatex); 
                    setHasUnsavedNotificationChanges(false);
                    
                    // Update the job in the list
                    setJobs(jobs.map(job => 
                      job.id === currentNotificationId 
                        ? { ...job, resumeLatex: notificationResumeLatex, resumeLink: response.resumeLink || job.resumeLink }
                        : job
                    ));
                    
                    if (response.resumeLink) {
                      setNotificationPdfPreviewUrl(response.resumeLink + '?t=' + Date.now());
                    } else if (response.latexResumePdfUrl) {
                      setNotificationPdfPreviewUrl(response.latexResumePdfUrl + '?t=' + Date.now());
                    }
                    
                    setGeneratingNotificationPdf(false);
                  } catch (e) { 
                    setGeneratingNotificationPdf(false);
                    
                    // Show specific error message from backend inline (no alert)
                    let errorMessage = 'Failed to save and generate preview. Please try again.';
                    
                    if (e.message) {
                      if (e.message.includes('Invalid LaTeX')) {
                        errorMessage = 'Invalid LaTeX Code: ' + e.message.replace('Invalid LaTeX Code: ', '');
                      } else if (e.message.includes('Rate limit exceeded')) {
                        errorMessage = 'Rate limit exceeded. Try again after some time.';
                      } else {
                        errorMessage = e.message;
                      }
                    }
                    setModalError(errorMessage);
                  }
                }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SaveIcon size={16} />
                  {generatingNotificationPdf ? 'Saving & Generating...' : 'Save & Preview'}
                </button>
                <button className="action-btn" onClick={() => {
                  setShowResumeViewer(false);
                  setCurrentNotificationId(null);
                  setNotificationResumeLatex('');
                  setOriginalNotificationResumeLatex('');
                  setHasUnsavedNotificationChanges(false);
                  setNotificationPdfPreviewUrl('');
                }}>Close</button>
              </div>
            </div>
            
            {/* Inline modal error */}
            {modalError && (
              <div className="error-message" style={{ margin: '12px 0' }}>
                {modalError}
              </div>
            )}

            {/* Split Screen Content */}
            <div style={{ display: 'flex', gap: '16px', flex: 1, overflow: 'hidden' }}>
              {/* Left: LaTeX Editor */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="editor-label">LaTeX Code</div>
                <textarea 
                  value={notificationResumeLatex} 
                  onChange={e => {
                    setNotificationResumeLatex(e.target.value);
                    setHasUnsavedNotificationChanges(true);
                  }} 
                  placeholder="Enter your LaTeX resume code here..."
                  className="latex-textarea"
                />
              </div>
              
              {/* Right: PDF Preview */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="editor-label">PDF Preview</div>
                <div className="pdf-preview-container">
                  {generatingNotificationPdf ? (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '100%',
                      color: '#6B7280',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        border: '4px solid #E5E7EB', 
                        borderTop: '4px solid #3B82F6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      <div>Generating PDF...</div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF' }}>This may take a few seconds</div>
                    </div>
                  ) : notificationPdfPreviewUrl ? (
                    <iframe 
                      src={notificationPdfPreviewUrl}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      title="Resume PDF Preview"
                    />
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '100%',
                      color: '#6B7280',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <FileIcon size={48} />
                      <div>No PDF preview available</div>
                      <div style={{ fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
                        Update your LaTeX code, then click "Save & Preview" to generate PDF
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
      <InterviewChat
        isOpen={interviewChatOpen}
        onClose={() => {
          setInterviewChatOpen(false);
          setInterviewNotification(null);
        }}
        notification={interviewNotification}
      />

      {/* HR Contact Modal */}
      {hrContactModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}
          onClick={() => { setHrContactModal(null); setCopiedField(null); }}
        >
          <div
            style={{
              background: theme === 'dark' ? '#1F2937' : 'white',
              color: theme === 'dark' ? '#F3F4F6' : '#111827',
              borderRadius: '16px', padding: '28px', maxWidth: '460px',
              width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { setHrContactModal(null); setCopiedField(null); }}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: theme === 'dark' ? '#9CA3AF' : '#6B7280'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                borderRadius: '10px', padding: '8px', display: 'flex'
              }}>
                <Mail size={20} color="white" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>HR Contact</h3>
                <p style={{ margin: 0, fontSize: '13px', color: theme === 'dark' ? '#9CA3AF' : '#6B7280' }}>
                  {hrContactModal.companyName} — {hrContactModal.role}
                </p>
              </div>
            </div>

            {hrContactModal.hrContactEmail && (
              <div style={{
                background: theme === 'dark' ? '#374151' : '#F9FAFB',
                borderRadius: '10px', padding: '14px', marginBottom: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: theme === 'dark' ? '#9CA3AF' : '#6B7280', marginBottom: '4px' }}>Email</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{hrContactModal.hrContactEmail}</div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hrContactModal.hrContactEmail);
                    setCopiedField('email');
                    setTimeout(() => setCopiedField(null), 2000);
                  }}
                  style={{
                    background: copiedField === 'email'
                      ? (theme === 'dark' ? '#065F46' : '#D1FAE5')
                      : (theme === 'dark' ? '#4B5563' : '#E5E7EB'),
                    border: 'none', borderRadius: '8px', padding: '8px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                  title="Copy to clipboard"
                >
                  {copiedField === 'email'
                    ? <Check size={16} color="#10B981" />
                    : <Copy size={16} color={theme === 'dark' ? '#D1D5DB' : '#6B7280'} />}
                </button>
              </div>
            )}

            {hrContactModal.hrContactApplyLinks && (
              <div style={{
                background: theme === 'dark' ? '#374151' : '#F9FAFB',
                borderRadius: '10px', padding: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: theme === 'dark' ? '#9CA3AF' : '#6B7280', marginBottom: '4px' }}>Apply Link</div>
                  <div style={{
                    fontSize: '14px', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{hrContactModal.hrContactApplyLinks}</div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hrContactModal.hrContactApplyLinks);
                    setCopiedField('link');
                    setTimeout(() => setCopiedField(null), 2000);
                  }}
                  style={{
                    background: copiedField === 'link'
                      ? (theme === 'dark' ? '#065F46' : '#D1FAE5')
                      : (theme === 'dark' ? '#4B5563' : '#E5E7EB'),
                    border: 'none', borderRadius: '8px', padding: '8px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    flexShrink: 0, marginLeft: '12px', transition: 'all 0.2s'
                  }}
                  title="Copy to clipboard"
                >
                  {copiedField === 'link'
                    ? <Check size={16} color="#10B981" />
                    : <Copy size={16} color={theme === 'dark' ? '#D1D5DB' : '#6B7280'} />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotifierJobs;
