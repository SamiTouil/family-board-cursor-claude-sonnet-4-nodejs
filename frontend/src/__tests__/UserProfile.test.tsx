import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UserProfile } from '../features/auth/components/UserProfile';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';

// Mock the contexts and services
vi.mock('../contexts/AuthContext');
vi.mock('../services/api');

const mockUseAuth = vi.mocked(useAuth);
const mockAuthApi = vi.mocked(authApi);

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  avatarUrl: '',
  isVirtual: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('UserProfile', () => {
  const mockOnClose = vi.fn();
  const mockRefreshUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      refreshUser: mockRefreshUser,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      loading: false,
      isAuthenticated: true,
    });

    mockAuthApi.update.mockResolvedValue(undefined);
    mockAuthApi.changePassword.mockResolvedValue(undefined);
  });

  it('renders the user profile modal', () => {
    render(<UserProfile onClose={mockOnClose} />);
    
    expect(screen.getByText('user.settings')).toBeInTheDocument();
    expect(screen.getByText('user.personalInfo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'user.changePassword' })).toBeInTheDocument();
  });

  it('displays user information in the form', () => {
    render(<UserProfile onClose={mockOnClose} />);
    
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('User')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<UserProfile onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('updates profile information when form is submitted', async () => {
    render(<UserProfile onClose={mockOnClose} />);
    
    const firstNameInput = screen.getByLabelText(/firstName/i);
    const lastNameInput = screen.getByLabelText(/lastName/i);
    const updateButton = screen.getByRole('button', { name: /updateProfile/i });
    
    fireEvent.change(firstNameInput, { target: { value: 'Updated' } });
    fireEvent.change(lastNameInput, { target: { value: 'Name' } });
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(mockAuthApi.update).toHaveBeenCalledWith('user-1', {
        firstName: 'Updated',
        lastName: 'Name',
        avatarUrl: '',
      });
      expect(mockRefreshUser).toHaveBeenCalled();
    });
  });

  it('validates required fields in profile form', async () => {
    render(<UserProfile onClose={mockOnClose} />);
    
    const firstNameInput = screen.getByLabelText(/firstName/i);
    const updateButton = screen.getByRole('button', { name: /updateProfile/i });
    
    fireEvent.change(firstNameInput, { target: { value: '' } });
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(screen.getByText('auth.validation.firstNameRequired')).toBeInTheDocument();
    });
    
    expect(mockAuthApi.update).not.toHaveBeenCalled();
  });

  it('validates avatar URL format', async () => {
    render(<UserProfile onClose={mockOnClose} />);
    
    const avatarInput = screen.getByLabelText(/avatar/i);
    const updateButton = screen.getByRole('button', { name: /updateProfile/i });
    
    fireEvent.change(avatarInput, { target: { value: 'invalid-url' } });
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(screen.getByText('user.validation.invalidAvatarUrl')).toBeInTheDocument();
    });
    
    expect(mockAuthApi.update).not.toHaveBeenCalled();
  });

  it('changes password when password form is submitted', async () => {
    render(<UserProfile onClose={mockOnClose} />);
    
    const currentPasswordInput = screen.getByLabelText('user.currentPassword');
    const newPasswordInput = screen.getByLabelText('user.newPassword');
    const confirmPasswordInput = screen.getByLabelText('user.confirmNewPassword');
    const changePasswordButton = screen.getByRole('button', { name: 'user.changePassword' });
    
    fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.click(changePasswordButton);
    
    await waitFor(() => {
      expect(mockAuthApi.changePassword).toHaveBeenCalledWith({
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });
    });
  });

  it('validates password change form', async () => {
    render(<UserProfile onClose={mockOnClose} />);
    
    const newPasswordInput = screen.getByLabelText('user.newPassword');
    const confirmPasswordInput = screen.getByLabelText('user.confirmNewPassword');
    const changePasswordButton = screen.getByRole('button', { name: 'user.changePassword' });
    
    fireEvent.change(newPasswordInput, { target: { value: 'short' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different' } });
    fireEvent.click(changePasswordButton);
    
    await waitFor(() => {
      expect(screen.getByText('auth.validation.passwordTooShort')).toBeInTheDocument();
      expect(screen.getByText('auth.validation.passwordsDoNotMatch')).toBeInTheDocument();
    });
    
    expect(mockAuthApi.changePassword).not.toHaveBeenCalled();
  });

  it('clears form errors when user starts typing', async () => {
    render(<UserProfile onClose={mockOnClose} />);
    
    const firstNameInput = screen.getByLabelText(/firstName/i);
    const updateButton = screen.getByRole('button', { name: /updateProfile/i });
    
    // Trigger validation error
    fireEvent.change(firstNameInput, { target: { value: '' } });
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(screen.getByText('auth.validation.firstNameRequired')).toBeInTheDocument();
    });
    
    // Start typing to clear error
    fireEvent.change(firstNameInput, { target: { value: 'T' } });
    
    await waitFor(() => {
      expect(screen.queryByText('auth.validation.firstNameRequired')).not.toBeInTheDocument();
    });
  });

  it('shows success message after successful profile update', async () => {
    render(<UserProfile onClose={mockOnClose} />);
    
    const updateButton = screen.getByRole('button', { name: /updateProfile/i });
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(screen.getByText('user.profileUpdated')).toBeInTheDocument();
    });
  });

  it('shows success message after successful password change', async () => {
    render(<UserProfile onClose={mockOnClose} />);
    
    const currentPasswordInput = screen.getByLabelText('user.currentPassword');
    const newPasswordInput = screen.getByLabelText('user.newPassword');
    const confirmPasswordInput = screen.getByLabelText('user.confirmNewPassword');
    const changePasswordButton = screen.getByRole('button', { name: 'user.changePassword' });
    
    fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.click(changePasswordButton);
    
    await waitFor(() => {
      expect(screen.getByText('user.passwordChanged')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockAuthApi.update.mockRejectedValue({
      response: { data: { message: 'Update failed' } }
    });
    
    render(<UserProfile onClose={mockOnClose} />);
    
    const updateButton = screen.getByRole('button', { name: /updateProfile/i });
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('returns null when user is not available', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      refreshUser: mockRefreshUser,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      loading: false,
      isAuthenticated: false,
    });
    
    const { container } = render(<UserProfile onClose={mockOnClose} />);
    expect(container.firstChild).toBeNull();
  });

  it('handles generic validation errors with proper translation', async () => {
    mockAuthApi.update.mockRejectedValue({
      response: { data: { message: 'Validation error' } }
    });
    
    render(<UserProfile onClose={mockOnClose} />);
    
    const updateButton = screen.getByRole('button', { name: /updateProfile/i });
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(screen.getByText('errors.validationError')).toBeInTheDocument();
    });
  });

  it('handles Zod validation errors properly', async () => {
    mockAuthApi.update.mockRejectedValue({
      response: { 
        data: { 
          message: 'Validation error',
          errors: [
            { message: 'First name is required' },
            { message: 'Invalid avatar URL' }
          ]
        } 
      }
    });
    
    render(<UserProfile onClose={mockOnClose} />);
    
    const updateButton = screen.getByRole('button', { name: /updateProfile/i });
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(screen.getByText('First name is required, Invalid avatar URL')).toBeInTheDocument();
    });
  });

  it('handles password change validation errors with proper translation', async () => {
    mockAuthApi.changePassword.mockRejectedValue({
      response: { data: { message: 'Validation error' } }
    });
    
    render(<UserProfile onClose={mockOnClose} />);
    
    const currentPasswordInput = screen.getByLabelText('user.currentPassword');
    const newPasswordInput = screen.getByLabelText('user.newPassword');
    const confirmPasswordInput = screen.getByLabelText('user.confirmNewPassword');
    const changePasswordButton = screen.getByRole('button', { name: 'user.changePassword' });
    
    fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.click(changePasswordButton);
    
    await waitFor(() => {
      expect(screen.getByText('errors.validationError')).toBeInTheDocument();
    });
  });

  it('uses correct translation key for confirm password label', () => {
    render(<UserProfile onClose={mockOnClose} />);
    
    expect(screen.getByText('user.confirmNewPassword')).toBeInTheDocument();
  });
}); 