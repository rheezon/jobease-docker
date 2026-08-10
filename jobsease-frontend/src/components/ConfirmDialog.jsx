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
  variant = 'danger',
  middleText = '',
  onMiddle = null,
  closeOnOverlayClick = true,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    Promise.resolve(onConfirm?.()).finally(() => onClose());
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  const handleMiddle = () => {
    Promise.resolve(onMiddle?.()).finally(() => onClose());
  };

  const overlayClick = () => {
    if (closeOnOverlayClick) {
      handleCancel();
    }
  };

  return (
    <div className="confirm-dialog-overlay" onClick={overlayClick}>
      <div className="confirm-dialog-container" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="confirm-dialog-close" onClick={handleCancel}>
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

        <div className="confirm-dialog-footer" style={onMiddle ? { flexWrap: 'wrap', gap: 8 } : undefined}>
          <button type="button" className="confirm-dialog-btn cancel-btn" onClick={handleCancel}>
            {cancelText}
          </button>
          {onMiddle && middleText ? (
            <button type="button" className="confirm-dialog-btn cancel-btn" onClick={handleMiddle}>
              {middleText}
            </button>
          ) : null}
          <button
            type="button"
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
