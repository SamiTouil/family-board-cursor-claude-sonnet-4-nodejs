import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CustomSelect } from '../components/CustomSelect';

const mockOptions = [
  { value: 1, label: '1 Day' },
  { value: 3, label: '3 Days' },
  { value: 7, label: '7 Days' },
  { value: 14, label: '14 Days' },
  { value: 30, label: '30 Days' },
];

describe('CustomSelect', () => {
  it('renders with selected value', () => {
    const mockOnChange = vi.fn();
    
    render(
      <CustomSelect
        value={7}
        onChange={mockOnChange}
        options={mockOptions}
      />
    );

    // Check that the selected value is shown in the select trigger
    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger).toHaveTextContent('7 Days');
  });

  it('opens dropdown when clicked', () => {
    const mockOnChange = vi.fn();
    
    render(
      <CustomSelect
        value={7}
        onChange={mockOnChange}
        options={mockOptions}
      />
    );

    const select = screen.getByRole('combobox');
    
    // Initially dropdown should be closed
    expect(select).toHaveAttribute('aria-expanded', 'false');
    
    // Click to open
    fireEvent.click(select);
    
    // Should now be open
    expect(select).toHaveAttribute('aria-expanded', 'true');
    
    // All options should be present as buttons
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(mockOptions.length);
  });

  it('calls onChange when option is selected', () => {
    const mockOnChange = vi.fn();
    
    render(
      <CustomSelect
        value={7}
        onChange={mockOnChange}
        options={mockOptions}
      />
    );

    // Open dropdown
    const select = screen.getByRole('combobox');
    fireEvent.click(select);

    // Click on "14 Days" option
    const options = screen.getAllByRole('option');
    const fourteenDayOption = options.find(option => option.textContent === '14 Days');
    expect(fourteenDayOption).toBeDefined();
    
    fireEvent.click(fourteenDayOption!);

    expect(mockOnChange).toHaveBeenCalledWith(14);
  });

  it('shows placeholder when no value is selected', () => {
    const mockOnChange = vi.fn();
    
    render(
      <CustomSelect
        value=""
        onChange={mockOnChange}
        options={mockOptions}
        placeholder="Select duration..."
      />
    );

    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger).toHaveTextContent('Select duration...');
  });

  it('is disabled when disabled prop is true', () => {
    const mockOnChange = vi.fn();
    
    render(
      <CustomSelect
        value={7}
        onChange={mockOnChange}
        options={mockOptions}
        disabled={true}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-disabled', 'true');
    expect(select).toHaveAttribute('tabindex', '-1');
    
    // Should not open dropdown when clicked
    fireEvent.click(select);
    expect(select).toHaveAttribute('aria-expanded', 'false');
  });
}); 