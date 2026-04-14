import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import '../styles/ConfirmDialog.css';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onCancel,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger' // 'danger' or 'warning'
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  return (
    <div className="confirm-dialog-overlay" onClick={handleCancel}>
      <div className="confirm-dialog-container" onClick={(e) => e.stopPropagation()}>
        <button className="confirm-dialog-close" onClick={handleCancel}>
          <X size={20} />
        </button>
        
        <div className="confirm-dialog-header">
          <div className={`confirm-dialog-icon ${variant}`}>
            <AlertTriangle size={24} />
          </div>
          <h2 className="confirm-dialog-title">{title}</h2>
        </div>

        <div className="confirm-dialog-body">
          <p className="confirm-dialog-message">{message}</p>
        </div>

        <div className="confirm-dialog-footer">
          <button 
            className="confirm-dialog-btn cancel-btn" 
            onClick={handleCancel}
          >
            {cancelText}
          </button>
          <button 
            className={`confirm-dialog-btn confirm-btn ${variant}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

