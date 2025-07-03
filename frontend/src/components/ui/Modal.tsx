import React from 'react';
import './Modal.css';

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, isOpen, onClose, onApply, children }) => {
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
        <div className="modal-footer">
          <button className="modal-cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-apply-button" onClick={onApply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
