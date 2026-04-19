import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { notifierService, userInfoService } from '../services/api';
import { FileText, Save as SaveIcon, Trash2, X } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import ConfirmDialog from '../components/ConfirmDialog';
import ResumeIntakePanel from '../components/ResumeIntakePanel';

const schema = yup.object({
  name: yup.string().required('Notifier name is required'),
  role: yup.string().required('Role is required'),
  city: yup.string().required('City is required'),
  salaryExpectation: yup.string().required('Salary expectation is required'),
  experience: yup.string().required('Experience level is required'),
  noticePeriod: yup.string().required('Notice period is required'),
  companiesPreference: yup.string(),
  additionalPreferences: yup.string(),
  resumeLatex: yup.string(),
});

const CreateNotifier = () => {
  const { user } = useAuth();
  const { refreshSidebarCounts, navigateWithGuard, registerNotifierFormGuard } = useOutletContext() || {};
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [searchParams] = useSearchParams();
  const draftIdParam = searchParams.get('draftId');
  const [draftId, setDraftId] = useState(draftIdParam ? String(draftIdParam) : '');
  const [leaveNavOpen, setLeaveNavOpen] = useState(false);
  const [baselineVersion, setBaselineVersion] = useState(0);
  const leaveResolverRef = useRef(null);
  const baselineRef = useRef(null);
  const isDirtyRef = useRef(false);
  const [educationRecords, setEducationRecords] = useState([]);
  const navigate = useNavigate();

  // Skills state
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);

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

  const { register, handleSubmit, formState: { errors }, setValue, getValues, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { additionalPreferences: '' },
  });
  const watched = watch();

  const snapshotForm = () =>
    JSON.stringify({
      ...getValues(),
      skills: [...skills].sort().join(','),
      resumeFileName: resumeFileName || '',
    });

  const isDirty = useMemo(() => {
    if (!baselineRef.current) return false;
    return snapshotForm() !== baselineRef.current;
    // snapshotForm closes over form state; watched drives recomputation
    // eslint-disable-next-line react-hooks/exhaustive-deps -- baseline snapshot compared to current
  }, [watched, skills, resumeFileName, baselineVersion]);

  isDirtyRef.current = isDirty;

  useEffect(() => {
    if (isLoading) return;
    const id = requestAnimationFrame(() => {
      baselineRef.current = snapshotForm();
      setBaselineVersion((v) => v + 1);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset baseline when load completes
  }, [isLoading, draftIdParam]);

  useEffect(() => {
    if (!registerNotifierFormGuard) return undefined;
    return registerNotifierFormGuard({
      isDirty: () => isDirtyRef.current,
      promptLeave: () =>
        new Promise((resolve) => {
          if (!isDirtyRef.current) {
            resolve(true);
            return;
          }
          leaveResolverRef.current = resolve;
          setLeaveNavOpen(true);
        }),
    });
  }, [registerNotifierFormGuard]);

  useEffect(() => {
    if (draftIdParam) {
      loadDraft(draftIdParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadDraft stable for draft id param
  }, [draftIdParam]);

  useEffect(() => {
    if (error) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [error]);

  // Fetch education records
  useEffect(() => {
    const fetchEducation = async () => {
      try {
        const records = await userInfoService.getAll();
        setEducationRecords(records || []);
      } catch (err) {
        console.error('[ERROR] Failed to fetch education records', { error: String(err?.message || err) });
      }
    };
    fetchEducation();
  }, []);

  const loadDraft = async (id) => {
    try {
      setIsLoading(true);
      const draft = await notifierService.getById(id);
      
      if (draft && draft.isDraft) {
        setDraftId(String(draft.id));
        setValue('name', draft.name || '');
        setValue('role', draft.role || '');
        setValue('city', draft.city || '');
        setValue('salaryExpectation', draft.salaryExpectation || '');
        setValue('experience', draft.experience || '');
        setValue('noticePeriod', draft.noticePeriod || '');
        setValue('companiesPreference', draft.companiesPreference || '');
        setValue('additionalPreferences', draft.additionalPreferences || '');
        setValue('resumeLatex', draft.resumeLatex || '');
        
        // Handle skills - convert comma-separated string to array
        if (draft.skills) {
          const skillsArray = typeof draft.skills === 'string' 
            ? draft.skills.split(',').map(s => s.trim()).filter(s => s)
            : Array.isArray(draft.skills) 
            ? draft.skills 
            : [];
          setSkills(skillsArray);
        }
      }
    } catch (e) {
      setError(e.message || 'Failed to load draft');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkillInputChange = (e) => {
    const value = e.target.value;
    setSkillInput(value);
    
    if (value.trim()) {
      const filtered = skillsSuggestions.filter(skill =>
        skill.toLowerCase().includes(value.toLowerCase()) &&
        !skills.includes(skill)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const addSkill = (skill) => {
    if (skill && !skills.includes(skill)) {
      setSkills(prev => [...prev, skill]);
    }
    setSkillInput('');
    setShowSuggestions(false);
  };

  const removeSkill = (skillToRemove) => {
    setSkills(prev => prev.filter(skill => skill !== skillToRemove));
  };

  const handleSkillKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const skill = skillInput.trim();
      if (skill && !skills.includes(skill)) {
        addSkill(skill);
      }
    }
  };


  const persistDraft = async () => {
    const data = getValues();
    if (!data.name || data.name.trim() === '') {
      setError('Please enter a notifier name before saving draft');
      throw new Error('name-required');
    }

    setIsLoading(true);
    setError('');

    try {
      const skillsString = skills.join(', ');
      const draftData = {
        ...data,
        skills: skillsString || '',
        resumeFileName: resumeFileName || '',
        resumeLatex: data.resumeLatex || '',
        isActive: false,
        isDraft: true,
      };

      if (draftId) {
        await notifierService.update(draftId, draftData);
      } else {
        const createdDraft = await notifierService.create(draftData);
        setDraftId(String(createdDraft.id));
      }
      refreshSidebarCounts?.();
      requestAnimationFrame(() => {
        baselineRef.current = snapshotForm();
        setBaselineVersion((v) => v + 1);
      });
    } catch (e) {
      setError(e.message || 'Failed to save draft');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const saveDraft = async () => {
    try {
      await persistDraft();
      navigate('/dashboard');
    } catch (err) {
      if (err?.message !== 'name-required') {
        setError(err.message || 'Failed to save draft');
      }
    }
  };

  const finishLeave = (allow) => {
    const r = leaveResolverRef.current;
    leaveResolverRef.current = null;
    setLeaveNavOpen(false);
    r?.(allow);
  };

  const handleNotifierResumeAutofill = (patch) => {
    if (!patch?.setValue) return;
    Object.entries(patch.setValue).forEach(([key, val]) => {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        setValue(key, val);
      }
    });
    if (Array.isArray(patch.skills) && patch.skills.length > 0) {
      setSkills(patch.skills);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'resumeFileName')) {
      setResumeFileName(patch.resumeFileName || '');
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    try {
      if (skills.length === 0) {
        setError('Please add at least one skill');
        setIsLoading(false);
        return;
      }

      const skillsString = skills.join(', ');

      // Use the resumeLatex value from the form field
      const notifierData = {
        ...data,
        skills: skillsString,
        resumeFileName: resumeFileName || '',
        resumeLatex: data.resumeLatex || '',
        isActive: true,
        isDraft: false,
      };
      
      if (draftId) {
        // Update existing draft to make it active notifier
        await notifierService.update(draftId, notifierData);
      } else {
        // Create new notifier
        await notifierService.create(notifierData);
      }
      
      navigate('/dashboard');
      refreshSidebarCounts?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="create-notifier-container">
      <div className="create-notifier-content">
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className="notifier-form">
          <ResumeIntakePanel variant="notifier" user={user} onNotifierAutofill={handleNotifierResumeAutofill} />

          <div className="form-section">
            <h2>Notifier Information</h2>
            <div className="form-group">
              <label htmlFor="name">Notifier Name *</label>
              <input
                type="text"
                id="name"
                placeholder="e.g., ML Engineer Remote Jobs"
                {...register('name')}
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="field-error">{errors.name.message}</span>}
              <small className="field-note">Give this notifier a unique name to identify it</small>
            </div>
            <div className="form-group">
              <label>Name (from Profile)</label>
              <input type="text" value={user?.fullName || ''} disabled className="disabled-input" />
            </div>
            <div className="form-group">
              <label>Email (from Profile)</label>
              <input type="email" value={user?.email || ''} disabled className="disabled-input" />
            </div>
            <small className="field-note">Contact information for notifiers is shared and set in your profile.</small>
          </div>

          <div className="form-section">
            <h2>Basic Information</h2>
            
            {/* Job Type (used as Notifier Name) */}
            <div className="form-group">
              <label htmlFor="role">Role You're Looking For *</label>
              <select
                id="role"
                {...register('role')}
                className={errors.role ? 'error' : ''}
                defaultValue=""
              >
                <option value="" disabled>Select role</option>
                <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                <option value="Senior Machine Learning Engineer">Senior Machine Learning Engineer</option>
                <option value="Software Developer">Software Developer</option>
                <option value="Backend Developer">Backend Developer</option>
                <option value="Frontend Developer">Frontend Developer</option>
                <option value="Full Stack Developer">Full Stack Developer</option>
                <option value="Mobile Developer (Android)">Mobile Developer (Android)</option>
                <option value="Mobile Developer (iOS)">Mobile Developer (iOS)</option>
                <option value="Data Scientist">Data Scientist</option>
                <option value="Data Engineer">Data Engineer</option>
                <option value="MLOps Engineer">MLOps Engineer</option>
                <option value="DevOps Engineer">DevOps Engineer</option>
                <option value="Cloud Engineer">Cloud Engineer</option>
                <option value="QA Engineer">QA Engineer</option>
                <option value="Blockchain Developer">Blockchain Developer</option>
                <option value="AI Engineer">AI Engineer</option>
                <option value="Data Analyst">Data Analyst</option>
                <option value="Business Analyst">Business Analyst</option>
                <option value="UI/UX Designer">UI/UX Designer</option>
                <option value="Product Designer">Product Designer</option>
                <option value="Product Manager">Product Manager</option>
                <option value="Cybersecurity Analyst">Cybersecurity Analyst</option>
                <option value="Security Engineer">Security Engineer</option>
                <option value="Penetration Tester">Penetration Tester</option>
                <option value="SOC Analyst">SOC Analyst</option>
                <option value="Cloud Security Engineer">Cloud Security Engineer</option>
                <option value="Intern">Intern</option>
              </select>
              {errors.role && <span className="field-error">{errors.role.message}</span>}
            </div>

            {/* City select */}
            <div className="form-group">
              <label htmlFor="city">Preferred City *</label>
              <select
                id="city"
                {...register('city')}
                className={errors.city ? 'error' : ''}
                defaultValue=""
              >
                <option value="" disabled>Select city</option>
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
              {errors.city && <span className="field-error">{errors.city.message}</span>}
            </div>

            {/* Salary Expectation select (already present) */}
            <div className="form-group">
              <label htmlFor="salaryExpectation">Salary Expectation *</label>
              <select
                id="salaryExpectation"
                {...register('salaryExpectation')}
                className={errors.salaryExpectation ? 'error' : ''}
                defaultValue=""
              >
                <option value="" disabled>Select salary range</option>
                <option value="0-2 LPA">0-2 LPA</option>
                <option value="2-5 LPA">2-5 LPA</option>
                <option value="5-10 LPA">5-10 LPA</option>
                <option value="10-15 LPA">10-15 LPA</option>
                <option value="15-25 LPA">15-25 LPA</option>
                <option value="25-50 LPA">25-50 LPA</option>
                <option value="50+ LPA">50+ LPA</option>
              </select>
              {errors.salaryExpectation && <span className="field-error">{errors.salaryExpectation.message}</span>}
            </div>

            {/* Company Preferences */}
            <div className="form-group">
              <label htmlFor="companiesPreference">Company Preferences</label>
              <input
                type="text"
                id="companiesPreference"
                placeholder="e.g., Google, Microsoft, Startups"
                {...register('companiesPreference')}
              />
              <small className="field-note">Companies you'd prefer to work for (optional)</small>
            </div>

            {/* Experience Level select */}
            <div className="form-group">
              <label htmlFor="experience">Experience Level *</label>
              <select
                id="experience"
                {...register('experience')}
                className={errors.experience ? 'error' : ''}
                defaultValue=""
              >
                <option value="" disabled>Select experience level</option>
                <option value="Entry Level (0-2 years)">Entry Level (0-2 years)</option>
                <option value="Mid Level (3-5 years)">Mid Level (3-5 years)</option>
                <option value="Senior Level (6-10 years)">Senior Level (6-10 years)</option>
                <option value="Lead/Principal (10+ years)">Lead/Principal (10+ years)</option>
              </select>
              {errors.experience && <span className="field-error">{errors.experience.message}</span>}
            </div>

            {/* Notice Period select */}
            <div className="form-group">
              <label htmlFor="noticePeriod">Notice Period *</label>
              <select
                id="noticePeriod"
                {...register('noticePeriod')}
                className={errors.noticePeriod ? 'error' : ''}
                defaultValue=""
              >
                <option value="" disabled>Select notice period</option>
                <option value="Immediate">Immediate</option>
                <option value="7 days">7 days</option>
                <option value="15 days">15 days</option>
                <option value="30 days">30 days</option>
                <option value="45 days">45 days</option>
                <option value="60 days">60 days</option>
                <option value="90 days">90 days</option>
              </select>
              {errors.noticePeriod && <span className="field-error">{errors.noticePeriod.message}</span>}
            </div>

            {/* Skills Section */}
            <div className="form-group full-width">
              <label htmlFor="skills">Skills & Technologies *</label>
              <div className="skills-input-container">
                <div className="skills-tags">
                  {skills.map((skill, index) => (
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
              {skills.length === 0 && (
                <span className="field-error">Please add at least one skill</span>
              )}
            </div>

            {/* Additional Preferences textarea (optional) */}
            <div className="form-group">
              <label htmlFor="additionalPreferences">Additional Preferences</label>
              <textarea
                id="additionalPreferences"
                placeholder="e.g., Remote preferred, flexible hours, equity, etc."
                {...register('additionalPreferences')}
                rows={3}
              />
            </div>
          </div>

          {/* Education Details Section (Read-only) */}
          {educationRecords.length > 0 && (
            <div className="form-section">
              <h2>Your Education Details</h2>
              {educationRecords.map((edu, index) => (
                <div 
                  key={edu.id || index} 
                  className="education-display-card"
                  style={{
                    marginBottom: educationRecords.length > 1 && index < educationRecords.length - 1 ? '12px' : '0'
                  }}
                >
                  <div className="education-display-grid">
                    <div>
                      <div className="education-display-label">Degree</div>
                      <div className="education-display-value">{edu.degreeName}</div>
                    </div>
                    <div>
                      <div className="education-display-label">Major</div>
                      <div className="education-display-value">{edu.major}</div>
                    </div>
                    <div>
                      <div className="education-display-label">College Type</div>
                      <div className="education-display-value">{edu.collegeType}</div>
                    </div>
                    <div>
                      <div className="education-display-label">Batch</div>
                      <div className="education-display-value">{edu.batchPassout}</div>
                    </div>
                  </div>
                </div>
              ))}
              <small className="field-note education-display-note">
                These are your education details saved during onboarding. They cannot be modified here.
              </small>
            </div>
          )}

          {/* Resume LaTeX Code Section */}
          <div className="form-section">
            <h2>Resume LaTeX Code (Optional)</h2>
            <div className="form-group">
              <label htmlFor="resumeLatexInput">LaTeX Code for Resume</label>
              <textarea
                id="resumeLatexInput"
                placeholder="Paste your resume LaTeX code here..."
                {...register('resumeLatex')}
                rows={10}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  borderRadius: '8px', 
                  border: '1px solid #E5E7EB', 
                  fontSize: '13px', 
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  backgroundColor: '#F9FAFB'
                }}
              />
              <small className="field-note">Enter your resume in LaTeX format. This will be used to generate your resume PDF as per the job in the notifier.</small>
            </div>
          </div>

          {resumeFileName ? (
            <div className="form-section" style={{ paddingBottom: 8 }}>
              <p className="field-note" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} />
                Last resume file reference: <strong>{resumeFileName}</strong>
              </p>
            </div>
          ) : null}

          <div className="form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
            <button 
              type="button" 
              className="cancel-button" 
              onClick={() => (navigateWithGuard ? navigateWithGuard('/dashboard') : navigate('/dashboard'))}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: '140px'
              }}
            >
              <X size={16} />
              Cancel
            </button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button" 
                className="draft-button"
                onClick={saveDraft}
                disabled={isLoading}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: '140px'
                }}
              >
                <SaveIcon size={16} />
                Save as Draft
              </button>
              <button 
                type="submit" 
                className="submit-button" 
                disabled={isLoading}
                style={{
                  minWidth: '180px'
                }}
              >
                {isLoading ? 'Creating Notifier...' : 'Create Notifier'}
              </button>
            </div>
          </div>
        </form>
        
        <div className="page-footer">
          <p>created by rheezon</p>
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={leaveNavOpen}
        closeOnOverlayClick={false}
        title="Leave Add Notifier?"
        message="You have unsaved changes. Save as a draft, discard them, or stay on this page."
        variant="warning"
        cancelText="Stay"
        onCancel={() => finishLeave(false)}
        middleText="Discard"
        onMiddle={() => finishLeave(true)}
        confirmText="Save draft"
        onConfirm={async () => {
          try {
            await persistDraft();
            finishLeave(true);
          } catch {
            finishLeave(false);
          }
        }}
      />
    </div>
  );
};

export default CreateNotifier;