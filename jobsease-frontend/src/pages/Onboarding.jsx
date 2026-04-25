import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Bell, Settings, LogOut, Briefcase, MapPin, DollarSign, 
  Search, Home, User, FileText, MessageCircle, Compass, 
  Gift, ChevronDown, Filter, SortAsc, CheckCircle,
  X, Wifi, Building, Users, Star, Clock, TrendingUp, Eye, Trash2,
  Download, Edit3, Save, Moon, Sun
} from 'lucide-react';
import { notifierService, userInfoService } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import ResumeIntakePanel from '../components/ResumeIntakePanel';

const Onboarding = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, title: '', message: '' });
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    experience: '',
    skills: [],
    salaryExpectation: '',
    role: '',
    customRole: '',
    notifierName: '',
    companiesPreference: '',
    noticePeriod: '',
    additionalPreferencesText: '',
    resumeLatex: '',
  });

  // Education details as an array
  const [educationDetails, setEducationDetails] = useState([
    {
      degreeName: '',
      degreeCustom: '',
      collegeType: '',
      batchPassout: '',
      major: '',
    }
  ]);

  const [skillInput, setSkillInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  
  const { user, updateUserProfile, logout } = useAuth();
  const navigate = useNavigate();

  // If user already has a notifier, skip this page
  useEffect(() => {
    const maybeSkipOnboarding = async () => {
      try {
        if (user?.onboardingCompleted) {
          navigate('/dashboard', { replace: true });
          return;
        }
        const list = await notifierService.getAll();
        if (Array.isArray(list) && list.length > 0) {
          await updateUserProfile({ onboardingCompleted: true });
          navigate('/dashboard', { replace: true });
        }
      } catch {
        // ignore; stay on onboarding if check fails
      }
    };
    if (user) {
      maybeSkipOnboarding();
    }
  }, [user, navigate, updateUserProfile]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogout = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Logout',
      message: 'Are you sure you want to logout?',
      action: () => {
        logout();
        navigate('/login');
      }
    });
  };

  // Education handlers
  const addEducationEntry = () => {
    setEducationDetails([...educationDetails, {
      degreeName: '',
      degreeCustom: '',
      collegeType: '',
      batchPassout: '',
      major: '',
    }]);
  };

  const removeEducationEntry = (index) => {
    if (educationDetails.length > 1) {
      const updated = educationDetails.filter((_, i) => i !== index);
      setEducationDetails(updated);
    }
  };

  const handleEducationChange = (index, field, value) => {
    const updated = [...educationDetails];
    updated[index][field] = value;
    setEducationDetails(updated);
  };

  const degreeOptions = [
    'B.Tech',
    'B.E.',
    'M.Tech',
    'M.E.',
    'BCA',
    'MCA',
    'B.Sc',
    'M.Sc',
    'B.Com',
    'M.Com',
    'BBA',
    'MBA',
    'Diploma',
    'PhD',
    'Other'
  ];

  // Skills suggestions
  const skillsSuggestions = [
    'JavaScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Swift', 'Kotlin', 'TypeScript',
    'React', 'Angular', 'Vue.js', 'Node.js', 'Express.js', 'Next.js', 'Nuxt.js', 'Svelte',
    'HTML', 'CSS', 'SCSS', 'Sass', 'Tailwind CSS', 'Bootstrap', 'Material-UI', 'Ant Design',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch', 'Firebase', 'Supabase',
    'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI', 'GitHub Actions',
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy',
    'Data Science', 'Data Analysis', 'Business Intelligence', 'Tableau', 'Power BI', 'Excel',
    'Project Management', 'Agile', 'Scrum', 'Kanban', 'Jira', 'Confluence', 'Slack',
    'UI/UX Design', 'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'InDesign',
    'Mobile Development', 'iOS', 'Android', 'React Native', 'Flutter', 'Xamarin',
    'DevOps', 'Linux', 'Bash', 'Shell Scripting', 'Ansible', 'Terraform', 'Vagrant',
    'Cybersecurity', 'Penetration Testing', 'Ethical Hacking', 'Network Security',
    'Blockchain', 'Web3', 'Solidity', 'Ethereum', 'Bitcoin', 'Cryptocurrency',
    'API Development', 'REST API', 'GraphQL', 'Microservices', 'Serverless',
    'Testing', 'Unit Testing', 'Integration Testing', 'Selenium', 'Jest', 'Cypress',
    'Version Control', 'Git', 'SVN', 'Mercurial', 'GitHub', 'GitLab', 'Bitbucket'
  ];

  const roleOptions = [
    'Machine Learning Engineer',
    'Senior Machine Learning Engineer',
    'Software Developer',
    'Backend Developer',
    'Frontend Developer',
    'Data Scientist',
    'DevOps Engineer',
    'Product Manager',
    'Project Manager',
    'Program Manager',
    'Operations Manager',
    'Engineering Manager',
    'Director of Engineering',
    'Director of Product',
    'Director of Operations',
    'General Manager',
    'Chief of Staff',
    'HR Manager',
    'Talent Acquisition Specialist',
    'Marketing Manager',
    'Sales Manager',
    'Customer Success Manager',
    'Finance Manager',
    'Cybersecurity Analyst',
    'Security Engineer',
    'Penetration Tester',
    'SOC Analyst',
    'Cloud Security Engineer',
  ];

  if (!import.meta.env.PROD) {
    try { console.debug('[DEBUG] Onboarding component rendered', { userPresent: !!user, isLoading }); } catch {}
  }

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        experience: user.experience || '',
        skills: user.skills || [],
        salaryExpectation: user.salaryExpectation || '',
        role: user.role || '',
        notifierName: user.notifierName || '',
        companiesPreference: user.companiesPreference || '',
        noticePeriod: user.noticePeriod || '',
        additionalPreferencesText: user.additionalPreferencesText || '',
        resumeLatex: user.resumeLatex || '',
      }));
      
      if (user.profilePhoto) {
        setPhotoPreview(user.profilePhoto);
      }
      
    }
  }, [user]);

  const handleResumeAutofill = (payload) => {
    if (!payload?.formData) return;
    setFormData((prev) => ({
      ...prev,
      ...payload.formData,
      fullName: payload.formData.fullName || prev.fullName || user?.fullName || '',
      email: user?.email || prev.email,
      skills:
        Array.isArray(payload.formData.skills) && payload.formData.skills.length > 0
          ? payload.formData.skills
          : prev.skills,
    }));
    if (payload.educationDetails?.length) {
      setEducationDetails(payload.educationDetails);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'role' && value !== '__custom__' ? { customRole: '' } : {})
    }));
  };

  const handleSkillInputChange = (e) => {
    const value = e.target.value;
    setSkillInput(value);
    
    if (value.trim()) {
      const filtered = skillsSuggestions.filter(skill =>
        skill.toLowerCase().includes(value.toLowerCase()) &&
        !formData.skills.includes(skill)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const addSkill = (skill) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
    setSkillInput('');
    setShowSuggestions(false);
  };

  const removeSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSkillKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const skill = skillInput.trim();
      if (skill && !formData.skills.includes(skill)) {
        addSkill(skill);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    try {
      const normalizedRole = formData.role === '__custom__' ? formData.customRole.trim() : formData.role;
      // Validate notifier fields
      if (!formData.location || !formData.experience || formData.skills.length === 0 || 
          !formData.salaryExpectation || !normalizedRole || !formData.notifierName) {
        setError('Please fill in all required notifier fields');
        setIsLoading(false);
        return;
      }
      
      // Validate education fields
      const hasEmptyEducation = educationDetails.some(edu => 
        !(edu.degreeName || edu.degreeCustom) || !edu.collegeType || !edu.batchPassout || !edu.major
      );
      
      if (hasEmptyEducation) {
        setError('Please fill in all required education fields for each entry');
        setIsLoading(false);
        return;
      }
      
      if (educationDetails.length === 0) {
        setError('Please add at least one education record');
        setIsLoading(false);
        return;
      }
      
      // Create all education records
      await Promise.all(
        educationDetails.map(edu => 
          userInfoService.create({
            degreeName: (edu.degreeName && edu.degreeName !== 'Other') ? edu.degreeName : (edu.degreeCustom || ''),
            collegeType: edu.collegeType,
            batchPassout: parseInt(edu.batchPassout),
            major: edu.major
          })
        )
      );
      
      const skillsString = formData.skills.join(', ');
      
      // Create notifier (without college field)
      const createResponse = await notifierService.create({
        name: formData.notifierName,
        role: normalizedRole,
        city: formData.location,
        salaryExpectation: formData.salaryExpectation,
        experience: formData.experience,
        skills: skillsString,
        companiesPreference: formData.companiesPreference || '',
        noticePeriod: formData.noticePeriod || '',
        resumeLatex: formData.resumeLatex || '',
        additionalPreferences: formData.additionalPreferencesText || '',
        isActive: true,
        isDraft: false
      });
      
      // Mark onboarding as completed only after notifier creation to avoid early redirect
      await updateUserProfile({
        onboardingCompleted: true
      });
      
      // Hand off the newly created notifier to dashboard for instant display
      try {
        localStorage.setItem('lastCreatedNotifier', JSON.stringify(createResponse));
      } catch (_) {}
      navigate('/dashboard', { state: { createdNotifier: createResponse } });
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
      try { console.error('[ERROR] Onboarding submit failed', { error: String(err?.message || err) }); } catch {}
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="modern-dashboard">
        <div className="loading">Loading user data...</div>
      </div>
    );
  }

  return (
    <div className="onboarding-bg" style={{ minHeight: '100vh', width: '100vw' }}>
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <button
            type="button"
            className="logo logo-home-btn"
            onClick={() => navigate('/dashboard')}
            aria-label="Go to dashboard"
            title="Go to dashboard"
          >
            <span className="logo-text">JobKick</span>
          </button>
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
      <main style={{ maxWidth: '100%', margin: 0, padding: 0 }}>
        {/* Welcome Banner */}
        <div className="profile-banner">
          <div className="banner-content">
            <div className="banner-icon">
              <User size={20} />
              <CheckCircle size={16} />
            </div>
            <div className="banner-text">
            <p>Welcome to JobKick! Let's set up your <strong>first job notifier</strong> to receive personalized job recommendations.</p>
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-segments">
              <div className="progress-segment active"></div>
              <div className="progress-segment"></div>
              <div className="progress-segment"></div>
              <div className="progress-segment"></div>
              <div className="progress-segment"></div>
            </div>
          </div>
        </div>
        {/* Onboarding Form */}
        <div className="onboarding-section" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1rem' }}>
          <div className="section-header">
            <h1 className="section-title">Set Up Your First Notifier</h1>
            <p className="section-subtitle">This information will be used as your first job notifier.</p>
          </div>

          <form onSubmit={handleSubmit} className="onboarding-form">
            {error && <div className="error-message">{error}</div>}

            <ResumeIntakePanel variant="onboarding" user={user} onOnboardingAutofill={handleResumeAutofill} />

            {/* Notifier Basic Information */}
            <div className="form-section">
              <h3 className="form-section-title">Notifier Basic Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="notifierName">Notifier Name *</label>
                  <input
                    type="text"
                    id="notifierName"
                    name="notifierName"
                    placeholder="e.g., ML Engineer Remote Jobs"
                    value={formData.notifierName}
                    onChange={handleInputChange}
                    required
                  />
                  <small className="field-note">Give this notifier a unique name to identify it</small>
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Your login email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled
                    className="disabled-input"
                  />
                  <small className="field-note">Email from your login account</small>
                </div>

                <div className="form-group">
                  <label htmlFor="location">Preferred City *</label>
                  <select
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select city</option>
                    <option value="Remote">Remote</option>
                    <option value="Any">Any</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Pune">Pune</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Noida">Noida</option>
                    <option value="Gurgaon">Gurgaon</option>
                    <option value="Kolkata">Kolkata</option>
                    <option value="Ahmedabad">Ahmedabad</option>
                    <option value="Jaipur">Jaipur</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="form-section">
              <h3 className="form-section-title">Professional Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="experience">Experience Level *</label>
                  <select
                    id="experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select experience level</option>
                    <option value="Entry Level (0-2 years)">Entry Level (0-2 years)</option>
                    <option value="Mid Level (3-5 years)">Mid Level (3-5 years)</option>
                    <option value="Senior Level (6-10 years)">Senior Level (6-10 years)</option>
                    <option value="Lead/Principal (10+ years)">Lead/Principal (10+ years)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="salaryExpectation">Salary Expectation *</label>
                  <select
                    id="salaryExpectation"
                    name="salaryExpectation"
                    value={formData.salaryExpectation}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select salary range</option>
                    <option value="0-2 LPA">₹0 - ₹2 LPA</option>
                    <option value="2-5 LPA">₹2 - ₹5 LPA</option>
                    <option value="5-10 LPA">₹5 - ₹10 LPA</option>
                    <option value="10-15 LPA">₹10 - ₹15 LPA</option>
                    <option value="15-25 LPA">₹15 - ₹25 LPA</option>
                    <option value="25-50 LPA">₹25 - ₹50 LPA</option>
                    <option value="50+ LPA">₹50+ LPA</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="role">Role You're Looking For *</label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role || ''}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select role</option>
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                    <option value="__custom__">Other (enter your own role)</option>
                  </select>
                </div>
                {formData.role === '__custom__' && (
                  <div className="form-group">
                    <label htmlFor="customRole">Your Role *</label>
                    <input
                      type="text"
                      id="customRole"
                      name="customRole"
                      value={formData.customRole}
                      onChange={handleInputChange}
                      placeholder="e.g., Regional Operations Lead"
                      required
                    />
                    <small className="field-note">Enter your exact role if it's not listed above.</small>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="noticePeriod">Notice Period *</label>
                  <select
                    id="noticePeriod"
                    name="noticePeriod"
                    value={formData.noticePeriod}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select notice period</option>
                    <option value="Immediate">Immediate</option>
                    <option value="7 days">7 days</option>
                    <option value="15 days">15 days</option>
                    <option value="30 days">30 days</option>
                    <option value="45 days">45 days</option>
                    <option value="60 days">60 days</option>
                    <option value="90 days">90 days</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="companiesPreference">Company Preferences</label>
                  <input
                    type="text"
                    id="companiesPreference"
                    name="companiesPreference"
                    placeholder="e.g., Google, Microsoft, Startups"
                    value={formData.companiesPreference}
                    onChange={handleInputChange}
                  />
                  <small className="field-note">Companies you'd prefer to work for (optional)</small>
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="skills">Skills & Technologies *</label>
                <div className="skills-input-container">
                  <div className="skills-tags">
                    {formData.skills.map((skill, index) => (
                      <span key={index} className="skill-tag">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="skill-remove"
                          aria-label={`Remove skill ${skill}`}
                          title={`Remove skill ${skill}`}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    id="skills"
                    placeholder="Type or select skills (press Enter or Space to add)"
                    value={skillInput}
                    onChange={handleSkillInputChange}
                    onKeyPress={handleSkillKeyPress}
                    onFocus={() => setShowSuggestions(true)}
                    className="skills-input"
                  />
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="skills-suggestions">
                      {filteredSuggestions.slice(0, 8).map((skill, index) => (
                        <div
                          key={index}
                          className="suggestion-item"
                          onClick={() => addSkill(skill)}
                        >
                          {skill}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {formData.skills.length === 0 && (
                  <span className="field-error">Please add at least one skill</span>
                )}
              </div>

            </div>

            {/* Education Details Section */}
            <div className="form-section">
              <div className="education-header">
                <h3 className="education-title">Education Details *</h3>
                <button
                  type="button"
                  onClick={addEducationEntry}
                  className="education-add-btn"
                >
                  <Plus size={16} />
                  Add Education
                </button>
              </div>

              {educationDetails.map((edu, index) => (
                <div key={index} className="education-card">
                  {educationDetails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEducationEntry(index)}
                      className="education-remove-btn"
                      title="Remove this education"
                    >
                      <X size={16} />
                    </button>
                  )}
                  
                  <div className="education-label">
                    Education #{index + 1}
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor={`degreeName-${index}`}>Degree *</label>
                      <select
                        id={`degreeName-${index}`}
                        value={degreeOptions.includes(edu.degreeName) ? edu.degreeName : (edu.degreeName ? 'Other' : '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Other') {
                            handleEducationChange(index, 'degreeName', 'Other');
                          } else {
                            // clear custom if selecting a predefined degree
                            handleEducationChange(index, 'degreeCustom', '');
                            handleEducationChange(index, 'degreeName', val);
                          }
                        }}
                        required
                      >
                        <option value="">Select degree</option>
                        {degreeOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      { (edu.degreeName === 'Other' || (!degreeOptions.includes(edu.degreeName) && edu.degreeName)) && (
                        <input
                          type="text"
                          placeholder="Enter your degree (e.g., Bachelor of Technology)"
                          value={edu.degreeCustom || (!degreeOptions.includes(edu.degreeName) ? edu.degreeName : '')}
                          onChange={(e) => handleEducationChange(index, 'degreeCustom', e.target.value)}
                          style={{ marginTop: 8 }}
                          required
                        />
                      )}
                      <small className="field-note">Choose a degree or enter your own</small>
                    </div>

                    <div className="form-group">
                      <label htmlFor={`major-${index}`}>Major/Specialization *</label>
                      <input
                        type="text"
                        id={`major-${index}`}
                        placeholder="e.g., Computer Science, Electronics, Mechanical"
                        value={edu.major}
                        onChange={(e) => handleEducationChange(index, 'major', e.target.value)}
                        required
                      />
                      <small className="field-note">Your field of study</small>
                    </div>

                    <div className="form-group">
                      <label htmlFor={`collegeType-${index}`}>College Type *</label>
                      <select
                        id={`collegeType-${index}`}
                        value={edu.collegeType}
                        onChange={(e) => handleEducationChange(index, 'collegeType', e.target.value)}
                        required
                      >
                        <option value="">Select college tier</option>
                        <option value="Tier1">Tier 1 (IIT/NIT/IIIT/Top Private)</option>
                        <option value="Tier2">Tier 2</option>
                        <option value="Tier3">Tier 3</option>
                        <option value="Other">Other</option>
                      </select>
                      <small className="field-note">Classification of your institution</small>
                    </div>

                    <div className="form-group">
                      <label htmlFor={`batchPassout-${index}`}>Batch Passout Year *</label>
                      <input
                        type="number"
                        id={`batchPassout-${index}`}
                        placeholder="e.g., 2020"
                        min="1950"
                        max="2100"
                        value={edu.batchPassout}
                        onChange={(e) => handleEducationChange(index, 'batchPassout', e.target.value)}
                        required
                      />
                      <small className="field-note">Year of graduation</small>
                    </div>
                  </div>
                </div>
              ))}
              <small className="field-note education-display-note">
                These details will be taken only once and will be used to create all notifiers.
              </small>
            </div>

            {/* Additional Preferences Section */}
            <div className="form-section">
              <h3 className="form-section-title">Additional Preferences (Optional)</h3>
              <div className="form-group full-width">
                <label htmlFor="additionalPreferencesText">Any Additional Requirements or Preferences</label>
                <textarea
                  id="additionalPreferencesText"
                  name="additionalPreferencesText"
                  placeholder="e.g., Remote work preferred, flexible hours, equity options, specific company culture, etc."
                  value={formData.additionalPreferencesText}
                  onChange={handleInputChange}
                  rows={4}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
                />
                <small className="field-note">Describe any other preferences or requirements you have for this job search</small>
              </div>
            </div>

            {/* Submit Button */}
            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    Setting up your profile...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Complete Profile & Continue
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Logout"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
};

export default Onboarding;
