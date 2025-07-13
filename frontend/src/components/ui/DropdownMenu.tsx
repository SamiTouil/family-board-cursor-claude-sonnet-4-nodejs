import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './DropdownMenu.css';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success' | 'primary';
  disabled?: boolean;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  trigger?: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  items,
  trigger = '⋮',
  align = 'right',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      
      setMenuPosition({
        top: rect.bottom + scrollY + 4,
        left: align === 'right' 
          ? rect.right + scrollX - 160 // 160px is min-width of menu
          : rect.left + scrollX
      });
    }
  }, [isOpen, align]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (item: DropdownMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
    }
  };

  return (
    <>
      <div className={`dropdown-menu-container ${className}`}>
        <button
          ref={triggerRef}
          className="dropdown-menu-trigger"
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          {trigger}
        </button>
      </div>
      
      {isOpen && ReactDOM.createPortal(
        <div 
          ref={dropdownRef}
          className={`dropdown-menu dropdown-menu-portal`}
          style={{
            position: 'absolute',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`
          }}
        >
          {items.map((item) => (
            <button
              key={item.id}
              className={`dropdown-menu-item ${item.variant ? `dropdown-menu-item-${item.variant}` : ''} ${item.disabled ? 'dropdown-menu-item-disabled' : ''}`}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              type="button"
            >
              {item.icon && <span className="dropdown-menu-item-icon">{item.icon}</span>}
              <span className="dropdown-menu-item-label">{item.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};