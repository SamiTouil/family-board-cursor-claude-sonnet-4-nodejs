import React from 'react';
import './Modal.css';

interface BaseModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

interface StandardModalProps extends BaseModalProps {
  variant?: 'standard';
  onApply: () => void;
}

interface SettingsModalProps extends BaseModalProps {
  variant: 'settings';
  onApply?: never;
}

type ModalProps = StandardModalProps | SettingsModalProps;

const Modal: React.FC<ModalProps> = ({ title, isOpen, onClose, onApply, children, variant = 'standard' }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close-button" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-content">{children}</div>
        {variant === 'standard' && (
          <div className="modal-footer">
            <button className="modal-cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button className="modal-apply-button" onClick={onApply}>
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;

