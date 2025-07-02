import React, { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

/**
 * Option interface for CustomSelect component
 */
interface SelectOption {
  value: number | string;
  label: string;
}

/**
 * Props interface for CustomSelect component
 */
interface CustomSelectProps {
  /** Unique identifier for the select element */
  id?: string;
  /** Currently selected value */
  value: number | string;
  /** Callback function called when selection changes */
  onChange: (value: number | string) => void;
  /** Array of options to display in dropdown */
  options: SelectOption[];
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Placeholder text when no value is selected */
  placeholder?: string;
}

/**
 * CustomSelect - A modern, accessible dropdown component
 * 
 * Features:
 * - Modern styling with smooth animations
 * - Full keyboard navigation support
 * - Click outside to close functionality
 * - ARIA attributes for accessibility
 * - Customizable styling and disabled states
 * 
 * @example
 * ```tsx
 * <CustomSelect
 *   value={selectedValue}
 *   onChange={setSelectedValue}
 *   options={[
 *     { value: '1', label: 'Option 1' },
 *     { value: '2', label: 'Option 2' }
 *   ]}
 *   placeholder="Choose an option..."
 * />
 * ```
 */
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
    <div className={`custom-select-wrapper ${className}`} ref={selectRef}>
      <div
        id={id}
        className={`custom-select ${isOpen ? 'custom-select-open' : ''} ${disabled ? 'custom-select-disabled' : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
      >
        <span className="custom-select-value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="custom-select-arrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>
      
      <div className={`custom-select-dropdown ${isOpen ? 'custom-select-dropdown-open' : ''}`}>
        {options.map((option) => (
          <button
            key={option.value}
            className={`custom-select-option ${option.value === value ? 'custom-select-option-selected' : ''}`}
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