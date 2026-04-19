import { useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { 
  User,
  Bell, Shield, Palette, Sun, Moon, Download, Trash2
} from 'lucide-react';
import { userService } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';

const Settings = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    weekly: true
  });
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: null,
    variant: 'danger',
    confirmText: 'Confirm'
  });

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleDeleteAccount = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Account',
      message: 'Are you sure you want to permanently delete your account? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await userService.deleteAccount();
          logout();
          navigate('/login');
        } catch (e) {
          setError(e.message || 'Failed to delete account.');
        }
      }
    });
  };
  const handleNotificationChange = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <>
          <div className="onboarding-section">
            <div className="section-header">
              <h1 className="section-title">Settings</h1>
              <p className="section-subtitle">Manage your account preferences</p>
            </div>

            {/* Inline error (if any) */}
            {error && (
              <div className="error-message" style={{ marginTop: 8 }}>
                {error}
              </div>
            )}

            {/* Settings Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
              {/* Theme Settings */}
              <div className="settings-card" style={{
                borderRadius: '16px',
                padding: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  <div className="settings-section-header-icon" style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Palette size={20} />
                  </div>
                  <div>
                    <h3 className="settings-section-title" style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      marginBottom: '2px'
                    }}>Appearance</h3>
                    <p className="settings-section-subtitle" style={{
                      fontSize: '13px'
                    }}>Customize the look and feel</p>
                  </div>
                </div>
                
                <div className="settings-section-content">
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '16px'
                  }}>
                    <div>
                      <h4 className="settings-item-title" style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '4px'
                      }}>Theme</h4>
                      <p className="settings-item-description" style={{
                        fontSize: '13px'
                      }}>Choose between light and dark themes</p>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '8px'
                    }}>
                      <button 
                        onClick={() => handleThemeChange('light')}
                        className={`settings-theme-button ${theme === 'light' ? 'active' : ''}`}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Sun size={16} />
                        Light
                      </button>
                      <button 
                        onClick={() => handleThemeChange('dark')}
                        className={`settings-theme-button ${theme === 'dark' ? 'active' : ''}`}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Moon size={16} />
                        Dark
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notification Settings (disabled) */}
              <div className="settings-card" style={{
                borderRadius: '16px',
                padding: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  <div className="settings-section-header-icon" style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 className="settings-section-title" style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      marginBottom: '2px'
                    }}>Notifications</h3>
                    <p className="settings-section-subtitle" style={{
                      fontSize: '13px'
                    }}>Control how you receive notifications</p>
                  </div>
                </div>
                
                <div style={{
                  paddingLeft: '52px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  {/* Email Notifications */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h4 className="settings-item-title" style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '4px'
                      }}>Email Notifications</h4>
                      <p className="settings-item-description" style={{
                        fontSize: '13px'
                      }}>Receive job matches and updates via email</p>
                    </div>
                    <label style={{
                      position: 'relative',
                      display: 'inline-block',
                      width: '44px',
                      height: '24px',
                      cursor: 'not-allowed',
                    }}>
                      <input 
                        type="checkbox" 
                        checked={notifications.email}
                        onChange={() => handleNotificationChange('email')}
                        disabled
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span className={`settings-toggle-bg ${notifications.email ? 'active' : ''}`} style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: '24px',
                        transition: '0.3s',
                        cursor: 'not-allowed',
                        background: '#D1D5DB',
                        border: '1px solid #D1D5DB'
                      }}>
                        <span style={{
                          position: 'absolute',
                          content: '',
                          height: '18px',
                          width: '18px',
                          left: notifications.email ? '23px' : '3px',
                          bottom: '3px',
                          background: '#9CA3AF',
                          borderRadius: '50%',
                          transition: '0.3s'
                        }} />
                      </span>
                    </label>
                  </div>

                  {/* Push Notifications */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h4 className="settings-item-title" style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '4px'
                      }}>Push Notifications</h4>
                      <p className="settings-item-description" style={{
                        fontSize: '13px'
                      }}>Get instant notifications in your browser</p>
                    </div>
                    <label style={{
                      position: 'relative',
                      display: 'inline-block',
                      width: '44px',
                      height: '24px',
                      cursor: 'not-allowed'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={notifications.push}
                        onChange={() => handleNotificationChange('push')}
                        disabled
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span className={`settings-toggle-bg ${notifications.push ? 'active' : ''}`} style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: '24px',
                        transition: '0.3s',
                        cursor: 'not-allowed',
                        background: '#D1D5DB',
                        border: '1px solid #D1D5DB'
                      }}>
                        <span style={{
                          position: 'absolute',
                          content: '',
                          height: '18px',
                          width: '18px',
                          left: notifications.push ? '23px' : '3px',
                          bottom: '3px',
                          background: '#9CA3AF',
                          borderRadius: '50%',
                          transition: '0.3s'
                        }} />
                      </span>
                    </label>
                  </div>

                  {/* SMS Notifications */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h4 className="settings-item-title" style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '4px'
                      }}>SMS Notifications</h4>
                      <p className="settings-item-description" style={{
                        fontSize: '13px'
                      }}>Receive important updates via text message</p>
                    </div>
                    <label style={{
                      position: 'relative',
                      display: 'inline-block',
                      width: '44px',
                      height: '24px',
                      cursor: 'not-allowed'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={notifications.sms}
                        onChange={() => handleNotificationChange('sms')}
                        disabled
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span className={`settings-toggle-bg ${notifications.sms ? 'active' : ''}`} style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: '24px',
                        transition: '0.3s',
                        cursor: 'not-allowed',
                        background: '#D1D5DB',
                        border: '1px solid #D1D5DB'
                      }}>
                        <span style={{
                          position: 'absolute',
                          content: '',
                          height: '18px',
                          width: '18px',
                          left: notifications.sms ? '23px' : '3px',
                          bottom: '3px',
                          background: '#9CA3AF',
                          borderRadius: '50%',
                          transition: '0.3s'
                        }} />
                      </span>
                    </label>
                  </div>

                  {/* Weekly Digest */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h4 className="settings-item-title" style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '4px'
                      }}>Weekly Digest</h4>
                      <p className="settings-item-description" style={{
                        fontSize: '13px'
                      }}>Get a summary of your weekly job matches</p>
                    </div>
                    <label style={{
                      position: 'relative',
                      display: 'inline-block',
                      width: '44px',
                      height: '24px',
                      cursor: 'not-allowed'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={notifications.weekly}
                        onChange={() => handleNotificationChange('weekly')}
                        disabled
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span className={`settings-toggle-bg ${notifications.weekly ? 'active' : ''}`} style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: '24px',
                        transition: '0.3s',
                        cursor: 'not-allowed',
                        background: '#D1D5DB',
                        border: '1px solid #D1D5DB'
                      }}>
                        <span style={{
                          position: 'absolute',
                          content: '',
                          height: '18px',
                          width: '18px',
                          left: notifications.weekly ? '23px' : '3px',
                          bottom: '3px',
                          background: '#9CA3AF',
                          borderRadius: '50%',
                          transition: '0.3s'
                        }} />
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              

              {/* Privacy Settings removed as requested */}

              {/* Account Settings (disabled) */}
              <div className="settings-card" style={{
                borderRadius: '16px',
                padding: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  <div className="settings-section-header-icon" style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="settings-section-title" style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      marginBottom: '2px'
                    }}>Account</h3>
                    <p className="settings-section-subtitle" style={{
                      fontSize: '13px'
                    }}>Manage your account data</p>
                  </div>
                </div>
                
                <div style={{
                  paddingLeft: '52px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  {/* Export Data */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h4 className="settings-item-title" style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '4px'
                      }}>Export Data</h4>
                      <p className="settings-item-description" style={{
                        fontSize: '13px'
                      }}>Download a copy of your profile and job data</p>
                    </div>
                    <button className="settings-button-secondary" disabled style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'not-allowed',
                      background: '#E5E7EB',
                      color: '#9CA3AF',
                      border: '1px solid #D1D5DB',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}>
                      <Download size={16} />
                      Export
                    </button>
                  </div>

                  {/* Delete Account */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h4 className="settings-item-title" style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '4px'
                      }}>Delete Account</h4>
                      <p className="settings-item-description" style={{
                        fontSize: '13px'
                      }}>Permanently delete your account and all data</p>
                    </div>
                    <button
                      type="button"
                      className="settings-button-danger"
                      onClick={handleDeleteAccount}
                      style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                        background: 'transparent',
                        color: '#DC2626',
                        border: '1px solid #DC2626',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                      }}
                    >
                      <Trash2 size={16} />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
      {/* Confirm dialog for logout/delete actions */}
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
    </>
  );
};

export default Settings;

