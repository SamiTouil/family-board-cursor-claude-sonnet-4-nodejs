import React from 'react';
import { Button } from './Button';
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
  applyDisabled?: boolean;
}

interface SettingsModalProps extends BaseModalProps {
  variant: 'settings';
  onApply?: never;
}

type ModalProps = StandardModalProps | SettingsModalProps;

const Modal: React.FC<ModalProps> = (props) => {
  const { title, isOpen, onClose, children, variant = 'standard' } = props;
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
        {variant === 'standard' && 'onApply' in props && (
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={props.onApply} disabled={(props as StandardModalProps).applyDisabled}>
              Apply
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;

