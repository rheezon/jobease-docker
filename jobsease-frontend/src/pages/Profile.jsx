import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { userInfoService } from '../services/api';
import { 
  User, Mail, Edit2, Save, X as XIcon, Plus, Trash2
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

const Profile = () => {
  const { user } = useAuth();
  const [educationRecords, setEducationRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedRecords, setEditedRecords] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: null
  });

  useEffect(() => {
    const fetchEducationDetails = async () => {
      try {
        const records = await userInfoService.getAll();
        setEducationRecords(records);
      } catch (error) {
        console.error('[ERROR] Error fetching education details', { error: String(error?.message || error) });
      } finally {
        setLoading(false);
      }
    };

    fetchEducationDetails();
  }, []);

  const handleEditClick = () => {
    setEditedRecords(JSON.parse(JSON.stringify(educationRecords))); // Deep copy
    setIsEditMode(true);
    setValidationErrors({});
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedRecords([]);
    setValidationErrors({});
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...editedRecords];
    updated[index][field] = value;
    setEditedRecords(updated);
    // Clear validation error for this record when user edits
    setValidationErrors(prev => {
      const next = { ...prev };
      if (next[index]) {
        const { [field]: _removed, ...rest } = next[index];
        next[index] = rest;
        if (Object.keys(next[index]).length === 0) {
          delete next[index];
        }
      }
      return next;
    });
  };

  const handleSaveChanges = async () => {
    // Client-side validation
    const errors = {};
    editedRecords.forEach((rec, idx) => {
      const recErrors = {};
      if (!rec.degreeName || String(rec.degreeName).trim() === '') {
        recErrors.degreeName = 'Degree name is required';
      }
      if (!rec.major || String(rec.major).trim() === '') {
        recErrors.major = 'Major is required';
      }
      if (!rec.collegeType || String(rec.collegeType).trim() === '') {
        recErrors.collegeType = 'College tier is required';
      }
      const year = String(rec.batchPassout || '').trim();
      const yearNum = parseInt(year, 10);
      if (!year) {
        recErrors.batchPassout = 'Batch passout year is required';
      } else if (Number.isNaN(yearNum) || yearNum < 1950 || yearNum > 2100) {
        recErrors.batchPassout = 'Enter a valid year between 1950 and 2100';
      }
      if (Object.keys(recErrors).length > 0) {
        errors[idx] = recErrors;
      }
    });
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    try {
      setIsSaving(true);
      
      // Determine create/update/delete sets
      const newRecords = editedRecords.filter(record => !record.id);
      const existingRecords = editedRecords.filter(record => record.id);
      const originalIds = new Set(educationRecords.filter(r => r.id).map(r => r.id));
      const editedIds = new Set(existingRecords.map(r => r.id));
      const deletedIds = [...originalIds].filter(id => !editedIds.has(id));
      
      // Create new records
      const createPromises = newRecords.map(record =>
        userInfoService.create({
          degreeName: record.degreeName,
          major: record.major,
          collegeType: record.collegeType,
          batchPassout: parseInt(record.batchPassout)
        })
      );
      
      // Update existing records
      const updatePromises = existingRecords.map(record =>
        userInfoService.update(record.id, {
          degreeName: record.degreeName,
          major: record.major,
          collegeType: record.collegeType,
          batchPassout: parseInt(record.batchPassout)
        })
      );

      // Delete removed records
      const deletePromises = deletedIds.map(id => userInfoService.delete(id));

      await Promise.all([...createPromises, ...updatePromises, ...deletePromises]);

      // Refresh the data
      const updatedRecords = await userInfoService.getAll();
      setEducationRecords(updatedRecords);
      setIsEditMode(false);
      setEditedRecords([]);
      setValidationErrors({});
    } catch (error) {
      console.error('[ERROR] Error updating education details', { error: String(error?.message || error) });
      // Do not alert; field errors are shown inline for validation issues
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEducation = () => {
    const newRecord = {
      degreeName: '',
      major: '',
      collegeType: '',
      batchPassout: ''
    };
    setEditedRecords([...editedRecords, newRecord]);
  };

  const handleDeleteEducation = (index) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Education Record',
      message: 'Are you sure you want to delete this education record? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      action: async () => {
        // Stage deletion locally (do not call backend now). Persist on Save.
        const updated = editedRecords.filter((_, i) => i !== index);
        setEditedRecords(updated);
      }
    });
  };

  return (
    <>
    <div className="onboarding-section">
            <div className="section-header">
              <h1 className="section-title">Profile Information</h1>
              <p className="section-subtitle">Your account details</p>
            </div>

            {/* Profile Card */}
            <div className="profile-card" style={{
              borderRadius: '16px',
              padding: '32px',
              marginTop: '24px'
            }}>
              {/* Profile Header */}
              <div className="profile-header-row">
                <div className="profile-avatar-circle">
                  {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                <div>
                  <h2 className="profile-section-title" style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    {user?.fullName || 'N/A'}
                  </h2>
                </div>
                  </div>

              {/* Email */}
              <div className="profile-info-card" style={{
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px'
                }}>
                  <div className="profile-info-card-icon" style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="profile-info-card-label" style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      marginBottom: '2px'
                    }}>Email Address</p>
                    <p className="profile-info-card-value" style={{
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      {user?.email || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Education Details Section */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p>Loading education details...</p>
                </div>
              ) : educationRecords.length > 0 ? (
                <div className="profile-section-border" style={{
                  marginTop: '24px',
                  paddingTop: '24px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <h3 className="profile-section-title" style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      margin: 0
                    }}>Education Details</h3>
                    
                    {!isEditMode ? (
                      <button
                        onClick={handleEditClick}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <Edit2 size={16} />
                        Edit
                      </button>
                    ) : (
                      <div className="profile-edit-actions">
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="profile-cancel-btn"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            background: '#F3F4F6',
                            color: '#6B7280',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: isSaving ? 0.5 : 1
                          }}
                        >
                          <XIcon size={16} />
                          Cancel
                        </button>
                          <button
                          onClick={handleAddEducation}
                          disabled={isSaving}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: isSaving ? 0.7 : 1
                          }}
                        >
                          <Plus size={16} />
                          Add
                          </button>
                        <button
                          onClick={handleSaveChanges}
                          disabled={isSaving}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: isSaving ? 0.7 : 1
                          }}
                        >
                          <Save size={16} />
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    )}
                </div>

                  {(isEditMode ? editedRecords : educationRecords).map((edu, index) => (
                    <div 
                      key={edu.id || index} 
                      className="education-display-card"
                      style={{
                        marginBottom: educationRecords.length > 1 && index < educationRecords.length - 1 ? '12px' : '0',
                        position: 'relative'
                      }}
                    >
                      {isEditMode && editedRecords.length > 1 && (
                          <button
                          onClick={() => handleDeleteEducation(index)}
                          title="Remove this education"
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: '#FEE2E2',
                            color: '#DC2626',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            zIndex: 10
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#FECACA'}
                          onMouseOut={(e) => e.currentTarget.style.background = '#FEE2E2'}
                        >
                          <Trash2 size={14} />
                          </button>
                      )}
                      <div className="education-display-grid">
                        <div>
                          <div className="education-display-label">Degree</div>
                          {isEditMode ? (
                    <input
                      type="text"
                              value={edu.degreeName}
                              onChange={(e) => handleFieldChange(index, 'degreeName', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '6px',
                                border: '1px solid #E5E7EB',
                                fontSize: '14px',
                                fontWeight: '500'
                              }}
                              className="form-group"
                            />
                          ) : (
                            <div className="education-display-value">{edu.degreeName}</div>
                    )}
                          {isEditMode && validationErrors[index]?.degreeName && (
                            <span className="field-error">{validationErrors[index].degreeName}</span>
                          )}
                  </div>
                        <div>
                          <div className="education-display-label">Major</div>
                          {isEditMode ? (
                        <input
                              type="text"
                              value={edu.major}
                              onChange={(e) => handleFieldChange(index, 'major', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '6px',
                                border: '1px solid #E5E7EB',
                                fontSize: '14px',
                                fontWeight: '500'
                              }}
                              className="form-group"
                            />
                          ) : (
                            <div className="education-display-value">{edu.major}</div>
                          )}
                          {isEditMode && validationErrors[index]?.major && (
                            <span className="field-error">{validationErrors[index].major}</span>
                          )}
                        </div>
                        <div>
                          <div className="education-display-label">College Type</div>
                          {isEditMode ? (
                            <select
                              value={edu.collegeType}
                              onChange={(e) => handleFieldChange(index, 'collegeType', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '6px',
                                border: '1px solid #E5E7EB',
                                fontSize: '14px',
                                fontWeight: '500'
                              }}
                              className="form-group"
                            >
                              <option value="" disabled>Select college tier</option>
                              <option value="Tier1">Tier 1</option>
                              <option value="Tier2">Tier 2</option>
                              <option value="Tier3">Tier 3</option>
                              <option value="Other">Other</option>
                            </select>
                          ) : (
                            <div className="education-display-value">{edu.collegeType}</div>
                          )}
                          {isEditMode && validationErrors[index]?.collegeType && (
                            <span className="field-error">{validationErrors[index].collegeType}</span>
                          )}
                      </div>
                        <div>
                          <div className="education-display-label">Batch</div>
                          {isEditMode ? (
                      <input
                              type="number"
                              value={edu.batchPassout}
                              onChange={(e) => handleFieldChange(index, 'batchPassout', e.target.value)}
                              min="1950"
                              max="2100"
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '6px',
                                border: '1px solid #E5E7EB',
                                fontSize: '14px',
                                fontWeight: '500'
                              }}
                              className="form-group"
                            />
                          ) : (
                            <div className="education-display-value">{edu.batchPassout}</div>
                          )}
                          {isEditMode && validationErrors[index]?.batchPassout && (
                            <span className="field-error">{validationErrors[index].batchPassout}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <small className="field-note education-display-note" style={{ marginTop: '12px' }}>
                    These details will be used for all notifiers.
                  </small>
                    </div>
                  ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p>No education details found.</p>
                </div>
              )}
              </div>
          </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={() => {
          if (confirmDialog.action) confirmDialog.action();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText || 'Confirm'}
        variant={confirmDialog.variant || 'warning'}
      />
    </>
  );
};

export default Profile;

