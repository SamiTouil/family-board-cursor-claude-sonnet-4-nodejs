import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UserAvatar } from '../components/ui/UserAvatar';

describe('UserAvatar', () => {
  const defaultProps = {
    firstName: 'John',
    lastName: 'Doe'
  };

  it('renders initials when no avatar URL is provided', () => {
    render(<UserAvatar {...defaultProps} />);
    
    const initials = screen.getByText('JD');
    expect(initials).toBeDefined();
  });

  it('renders avatar image when URL is provided', () => {
    const avatarUrl = 'https://example.com/avatar.jpg';
    render(<UserAvatar {...defaultProps} avatarUrl={avatarUrl} />);
    
    const image = screen.getByRole('img');
    expect(image).toBeDefined();
    expect(image.getAttribute('src')).toBe(avatarUrl);
    expect(image.getAttribute('alt')).toBe('John Doe');
  });

  it('applies correct size classes', () => {
    const { container: smallContainer } = render(<UserAvatar {...defaultProps} size="small" />);
    expect(smallContainer.querySelector('.user-avatar-small')).toBeDefined();

    const { container: mediumContainer } = render(<UserAvatar {...defaultProps} size="medium" />);
    expect(mediumContainer.querySelector('.user-avatar-medium')).toBeDefined();

    const { container: largeContainer } = render(<UserAvatar {...defaultProps} size="large" />);
    expect(largeContainer.querySelector('.user-avatar-large')).toBeDefined();
  });

  it('applies custom className', () => {
    const customClass = 'custom-avatar-class';
    const { container } = render(<UserAvatar {...defaultProps} className={customClass} />);
    
    expect(container.querySelector(`.${customClass}`)).toBeDefined();
  });

  it('generates consistent colors for same name', () => {
    const { container: container1 } = render(<UserAvatar firstName="Alice" lastName="Smith" />);
    const { container: container2 } = render(<UserAvatar firstName="Alice" lastName="Smith" />);
    
    const initials1 = container1.querySelector('.user-avatar-initials');
    const initials2 = container2.querySelector('.user-avatar-initials');
    
    expect(initials1?.getAttribute('style')).toBe(initials2?.getAttribute('style'));
  });

  it('generates different colors for different names', () => {
    const { container: container1 } = render(<UserAvatar firstName="Alice" lastName="Smith" />);
    const { container: container2 } = render(<UserAvatar firstName="Bob" lastName="Johnson" />);
    
    const initials1 = container1.querySelector('.user-avatar-initials');
    const initials2 = container2.querySelector('.user-avatar-initials');
    
    expect(initials1?.getAttribute('style')).not.toBe(initials2?.getAttribute('style'));
  });

  it('handles empty names gracefully', () => {
    render(<UserAvatar firstName="" lastName="" />);
    
    // Should still render something, even with empty names
    const avatar = document.querySelector('.user-avatar');
    expect(avatar).toBeDefined();
  });

  it('handles single character names', () => {
    render(<UserAvatar firstName="A" lastName="B" />);
    
    const initials = screen.getByText('AB');
    expect(initials).toBeDefined();
  });

  it('converts initials to uppercase', () => {
    render(<UserAvatar firstName="john" lastName="doe" />);
    
    const initials = screen.getByText('JD');
    expect(initials).toBeDefined();
  });

  it('defaults to medium size when no size is specified', () => {
    const { container } = render(<UserAvatar {...defaultProps} />);
    
    expect(container.querySelector('.user-avatar-medium')).toBeDefined();
  });

  it('applies clickable class when onClick is provided', () => {
    const mockClick = vi.fn();
    const { container } = render(<UserAvatar {...defaultProps} onClick={mockClick} />);
    
    expect(container.querySelector('.user-avatar-clickable')).toBeDefined();
  });

  it('does not apply clickable class when onClick is not provided', () => {
    const { container } = render(<UserAvatar {...defaultProps} />);
    
    expect(container.querySelector('.user-avatar-clickable')).toBeNull();
  });

  it('calls onClick when avatar is clicked', () => {
    const mockClick = vi.fn();
    const { container } = render(<UserAvatar {...defaultProps} onClick={mockClick} />);
    
    const avatar = container.querySelector('.user-avatar');
    fireEvent.click(avatar!);
    
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard interaction when clickable', () => {
    const mockClick = vi.fn();
    const { container } = render(<UserAvatar {...defaultProps} onClick={mockClick} />);
    
    const avatar = container.querySelector('.user-avatar');
    
    // Test Enter key
    fireEvent.keyDown(avatar!, { key: 'Enter' });
    expect(mockClick).toHaveBeenCalledTimes(1);
    
    // Test Space key
    fireEvent.keyDown(avatar!, { key: ' ' });
    expect(mockClick).toHaveBeenCalledTimes(2);
    
    // Test other key (should not trigger)
    fireEvent.keyDown(avatar!, { key: 'Escape' });
    expect(mockClick).toHaveBeenCalledTimes(2);
  });

  it('sets proper accessibility attributes when clickable', () => {
    const mockClick = vi.fn();
    const { container } = render(<UserAvatar {...defaultProps} onClick={mockClick} />);
    
    const avatar = container.querySelector('.user-avatar');
    expect(avatar?.getAttribute('role')).toBe('button');
    expect(avatar?.getAttribute('tabIndex')).toBe('0');
  });

  it('does not set accessibility attributes when not clickable', () => {
    const { container } = render(<UserAvatar {...defaultProps} />);
    
    const avatar = container.querySelector('.user-avatar');
    expect(avatar?.getAttribute('role')).toBeNull();
    expect(avatar?.getAttribute('tabIndex')).toBeNull();
  });
}); 