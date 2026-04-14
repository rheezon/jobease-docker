import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { notifierService, notificationService } from '../services/api';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  TrendingUp, Calendar as CalendarIcon, BarChart3,
  Briefcase, CheckCircle, Clock, AlertCircle, DollarSign,
  Target, Award, Activity, ArrowLeft, Moon, Sun, User, ChevronDown
} from 'lucide-react';

const localizer = momentLocalizer(moment);

const JobInsights = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notifiers, setNotifiers] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const notifiersList = await notifierService.getAll();
      setNotifiers(notifiersList);

      // Fetch jobs for all notifiers
      const jobsPromises = notifiersList.map(notifier => 
        notificationService.getForNotifier(notifier.id).catch(() => [])
      );
      const jobsArrays = await Promise.all(jobsPromises);
      const jobs = jobsArrays.flat();
      setAllJobs(jobs);
    } catch (err) {
      try { console.error('[ERROR] Failed to fetch data for JobInsights', { error: String(err?.message || err) }); } catch {}
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalJobs = allJobs.length;
  const appliedJobs = allJobs.filter(job => job.applied).length;
  const pendingJobs = allJobs.filter(job => !job.applied && (!job.deadline || new Date(job.deadline) >= new Date())).length;
  const thisWeekJobs = allJobs.filter(job => {
    const jobDate = new Date(job.timestamp || job.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return jobDate >= weekAgo;
  }).length;

  // Jobs over time data
  const getJobsOverTimeData = () => {
    const days = parseInt(dateRange);
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const received = allJobs.filter(job => {
        const jobDate = new Date(job.timestamp || job.createdAt);
        return jobDate.toDateString() === date.toDateString();
      }).length;
      
      const applied = allJobs.filter(job => {
        const jobDate = new Date(job.appliedAt || job.createdAt);
        return job.applied && jobDate.toDateString() === date.toDateString();
      }).length;
      
      data.push({
        date: dateStr,
        received,
        applied
      });
    }
    
    return data;
  };


  // Skills in demand
  const getSkillsData = () => {
    const skillCounts = {};
    allJobs.forEach(job => {
      const desc = (job.jobDescription || '').toLowerCase();
      const commonSkills = ['java', 'python', 'javascript', 'react', 'node', 'aws', 'docker', 'kubernetes', 'spring', 'sql', 'mongodb', 'typescript', 'angular', 'vue'];
      
      commonSkills.forEach(skill => {
        if (desc.includes(skill)) {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        }
      });
    });
    
    return Object.entries(skillCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  // Calendar events
  const getCalendarEvents = () => {
    return allJobs
      .filter(job => job.deadline)
      .map(job => {
        const deadline = new Date(job.deadline);
        const today = new Date();
        const daysUntil = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        
        let color = '#10B981'; // green - safe
        if (daysUntil < 0) color = '#6B7280'; // gray - expired
        else if (daysUntil <= 1) color = '#EF4444'; // red - urgent
        else if (daysUntil <= 3) color = '#F59E0B'; // orange - soon
        
        return {
          id: job.id,
          title: `${job.companyName} - ${job.role || 'Job'}`,
          start: deadline,
          end: deadline,
          allDay: true,
          resource: { job, color }
        };
      });
  };

  // Notifier performance
  const getNotifierPerformance = () => {
    return notifiers.map(notifier => {
      const jobs = allJobs.filter(job => job.notifierId === notifier.id);
      const applied = jobs.filter(job => job.applied).length;
      const avgRelevance = jobs.length > 0 
        ? (jobs.reduce((sum, job) => sum + (job.relevanceScore || 0), 0) / jobs.length * 100).toFixed(0)
        : 0;
      
      return {
        name: notifier.name,
        jobsReceived: jobs.length,
        applied,
        applyRate: jobs.length > 0 ? Math.round((applied / jobs.length) * 100) : 0,
        avgRelevance: parseInt(avgRelevance)
      };
    }).sort((a, b) => b.jobsReceived - a.jobsReceived);
  };



  if (loading) {
    return (
      <div className="modern-dashboard">
        <div className="loading">Loading insights...</div>
      </div>
    );
  }

  return (
    <div className="modern-dashboard">
      {/* Header */}
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

      <main className="dashboard-main insights-main">
        {/* Page Title */}
        <div style={{ marginBottom: '32px' }}>
          <h1 className="insights-page-title">
            <BarChart3 size={36} style={{ color: '#6366F1' }} />
            Job Insights Dashboard
          </h1>
          <p style={{ fontSize: '16px', color: '#6B7280' }}>
            Comprehensive analytics and insights about your job search
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="insights-date-filter">
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#6B7280' }}>Time Range:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '2px solid #E5E7EB',
              fontSize: '14px',
              cursor: 'pointer',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="180">Last 6 months</option>
          </select>
        </div>

        {/* Overview Cards */}
        <div className="insights-overview-grid">
          <div className="insights-card" style={{
            padding: '24px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <Briefcase size={32} />
              <TrendingUp size={24} />
            </div>
            <div className="insights-stat-value">{totalJobs}</div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Jobs Received</div>
          </div>

          <div className="insights-card" style={{
            padding: '24px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <CheckCircle size={32} />
              <Award size={24} />
            </div>
            <div className="insights-stat-value">{appliedJobs}</div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Applied Jobs</div>
          </div>

          <div className="insights-card" style={{
            padding: '24px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <Clock size={32} />
              <Target size={24} />
            </div>
            <div className="insights-stat-value">{pendingJobs}</div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Pending Applications</div>
          </div>

          <div className="insights-card" style={{
            padding: '24px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <Activity size={32} />
              <CalendarIcon size={24} />
            </div>
            <div className="insights-stat-value">{thisWeekJobs}</div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>New This Week</div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="insights-section" style={{ marginBottom: '32px' }}>
          <h2 className="insights-section-title">
            <CalendarIcon size={24} style={{ color: '#6366F1' }} />
            Job Deadlines Calendar
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px', lineHeight: '1.5' }}>
            Visual overview of all application deadlines across your notifiers. Click on any event to view detailed job information and manage your applications effectively.
          </p>
          <div className="insights-card insights-calendar-card">
            <Calendar
              localizer={localizer}
              events={getCalendarEvents()}
              startAccessor="start"
              endAccessor="end"
              className="insights-calendar"
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor: event.resource?.color || '#6366F1',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '12px'
                }
              })}
              onSelectEvent={(event) => navigate(`/notifier/${event.resource.job.notifierId}`)}
            />
          </div>
        </div>

        {/* Main Analytics Grid - 2x2 Layout */}
        <div className="insights-analytics-grid">
          {/* Jobs Over Time */}
          <div className="insights-section">
            <h2 className="insights-section-title">
              <TrendingUp size={20} style={{ color: '#6366F1' }} />
              Jobs Over Time
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px', lineHeight: '1.4' }}>
              Track the flow of job opportunities received and applications submitted over time to identify trends and optimize your job search strategy.
            </p>
            <div className="insights-card insights-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getJobsOverTimeData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#6B7280" style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="received" stroke="#6366F1" strokeWidth={2} name="Received" dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="applied" stroke="#10B981" strokeWidth={2} name="Applied" dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Skills in Demand */}
          <div className="insights-section">
            <h2 className="insights-section-title">
              <Target size={20} style={{ color: '#6366F1' }} />
              Skills in Demand
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px', lineHeight: '1.4' }}>
              Discover which technical skills appear most frequently in your job listings to focus your learning and highlight relevant expertise in applications.
            </p>
            <div className="insights-card insights-chart-container" style={{ overflowY: 'auto' }}>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={getSkillsData().slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#6B7280" style={{ fontSize: '10px' }} />
                  <YAxis dataKey="name" type="category" stroke="#6B7280" width={80} style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Notifier Performance */}
          <div className="insights-section">
            <h2 className="insights-section-title">
              <Award size={20} style={{ color: '#6366F1' }} />
              Notifier Performance
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px', lineHeight: '1.4' }}>
              Compare effectiveness of each notifier based on jobs received, application rate, and relevance scores to optimize your notification settings.
            </p>
            <div className="insights-card insights-chart-container" style={{ overflowY: 'auto' }}>
              {getNotifierPerformance().map((notifier, index) => (
                <div key={index} style={{
                  padding: '14px 16px',
                  marginBottom: '10px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  transition: 'all 0.2s'
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-primary)' }}>
                    {notifier.name}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: '#6B7280' }}>Jobs:</span>
                      <span style={{ fontWeight: 600, marginLeft: '6px', color: 'var(--text-primary)' }}>{notifier.jobsReceived}</span>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280' }}>Applied:</span>
                      <span style={{ fontWeight: 600, marginLeft: '6px', color: '#10B981' }}>{notifier.applied}</span>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280' }}>Rate:</span>
                      <span style={{ fontWeight: 600, marginLeft: '6px', color: 'var(--text-primary)' }}>{notifier.applyRate}%</span>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280' }}>Relevance:</span>
                      <span style={{ fontWeight: 600, marginLeft: '6px', color: '#6366F1' }}>{notifier.avgRelevance}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="insights-section">
            <h2 className="insights-section-title">
              <Target size={20} style={{ color: '#6366F1' }} />
              Key Metrics
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px', lineHeight: '1.4' }}>
              Quick snapshot of your job search progress including application conversion rate, active monitoring, and overall job quality across all notifiers.
            </p>
            <div className="insights-card insights-chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="insights-metrics-grid">
                <div style={{ 
                  padding: '18px', 
                  borderRadius: '10px', 
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px', fontWeight: 500 }}>Application Rate</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#6366F1' }}>
                    {totalJobs > 0 ? Math.round((appliedJobs / totalJobs) * 100) : 0}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '3px' }}>
                    {appliedJobs} / {totalJobs} jobs
                  </div>
                </div>
                <div style={{ 
                  padding: '18px', 
                  borderRadius: '10px', 
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px', fontWeight: 500 }}>Active Notifiers</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#10B981' }}>
                    {notifiers.filter(n => n.isActive).length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '3px' }}>
                    of {notifiers.length} total
                  </div>
                </div>
                <div style={{ 
                  padding: '18px', 
                  borderRadius: '10px', 
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px', fontWeight: 500 }}>Avg. Relevance</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#F59E0B' }}>
                    {allJobs.length > 0 
                      ? Math.round((allJobs.reduce((sum, job) => sum + (job.relevanceScore || 0), 0) / allJobs.length) * 100)
                      : 0}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '3px' }}>
                    All jobs
                  </div>
                </div>
                <div style={{ 
                  padding: '18px', 
                  borderRadius: '10px', 
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px', fontWeight: 500 }}>Total Jobs</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#8B5CF6' }}>
                    {totalJobs}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '3px' }}>
                    All notifiers
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default JobInsights;

