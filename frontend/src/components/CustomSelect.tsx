import React, { useState, useRef, useEffect } from 'react';

interface SelectOption {
  value: number | string;
  label: string;
}

interface CustomSelectProps {
  id?: string;
  value: number | string;
  onChange: (value: number | string) => void;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  id,
  value,
  onChange,
  options,
  disabled = false,
  className = '',
  placeholder = 'Select an option...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // Find the selected option
  const selectedOption = options.find(option => option.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionClick = (optionValue: number | string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={`user-profile-select-wrapper ${className}`} ref={selectRef}>
      <div
        id={id}
        className={`user-profile-select ${isOpen ? 'user-profile-select-open' : ''} ${disabled ? 'user-profile-select-disabled' : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
      >
        <span className="user-profile-select-value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="user-profile-select-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>
      
      <div className={`user-profile-select-dropdown ${isOpen ? 'user-profile-select-dropdown-open' : ''}`}>
        {options.map((option) => (
          <button
            key={option.value}
            className={`user-profile-select-option ${option.value === value ? 'user-profile-select-option-selected' : ''}`}
            onClick={() => handleOptionClick(option.value)}
            role="option"
            aria-selected={option.value === value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}; 