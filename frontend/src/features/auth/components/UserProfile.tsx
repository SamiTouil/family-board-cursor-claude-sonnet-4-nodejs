import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { authApi } from '../../../services/api';
import Modal from '../../../components/ui/Modal';
import { useMessage } from '../../../hooks';
import type { ChangePasswordData } from '../../../types';
import './UserProfile.css';

interface UserProfileProps {
  onClose: () => void;
}

// Helper function to validate URL
const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useMessage();

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    avatarUrl: user?.avatarUrl || '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const validateProfileForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!profileData.firstName.trim()) {
      errors['firstName'] = t('auth.validation.firstNameRequired');
    }

    if (!profileData.lastName.trim()) {
      errors['lastName'] = t('auth.validation.lastNameRequired');
    }

    // Validate avatar URL if provided
    if (profileData.avatarUrl.trim() && !isValidUrl(profileData.avatarUrl.trim())) {
      errors['avatarUrl'] = t('user.validation.invalidAvatarUrl');
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      errors['currentPassword'] = t('user.validation.currentPasswordRequired');
    }

    if (!passwordData.newPassword) {
      errors['newPassword'] = t('auth.validation.passwordRequired');
    } else if (passwordData.newPassword.length < 6) {
      errors['newPassword'] = t('auth.validation.passwordTooShort');
    }

    if (!passwordData.confirmPassword) {
      errors['confirmPassword'] = t('auth.validation.confirmPasswordRequired');
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors['confirmPassword'] = t('auth.validation.passwordsDoNotMatch');
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateProfileForm() || !user) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await authApi.update(user.id, profileData);
      await refreshUser();
      setMessage({ type: 'success', text: t('user.profileUpdated') });
    } catch (error: any) {
      let errorMessage = t('user.updateError');
      
      if (error.response?.data?.message) {
        // Check if it's a generic validation error and translate it
        if (error.response.data.message === 'Validation error') {
          errorMessage = t('errors.validationError');
        } else {
          errorMessage = error.response.data.message;
        }
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Handle Zod validation errors
        const validationErrors = error.response.data.errors;
        errorMessage = validationErrors.map((err: any) => err.message).join(', ');
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm() || !user) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const changePasswordData: ChangePasswordData = {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      };

      await authApi.changePassword(changePasswordData);
      setMessage({ type: 'success', text: t('user.passwordChanged') });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({});
    } catch (error: any) {
      let errorMessage = t('user.passwordChangeError');
      
      if (error.response?.data?.message) {
        // Check if it's a generic validation error and translate it
        if (error.response.data.message === 'Validation error') {
          errorMessage = t('errors.validationError');
        } else {
          errorMessage = error.response.data.message;
        }
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Handle Zod validation errors
        const validationErrors = error.response.data.errors;
        errorMessage = validationErrors.map((err: any) => err.message).join(', ');
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (profileErrors[name]) {
      setProfileErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Modal
      title={t('user.settings')}
      isOpen={true}
      onClose={onClose}
      variant="settings"
    >
      <div className="user-profile-container">
        {/* Success/Error Messages */}
        {message && (
          <div className={`user-profile-message user-profile-message-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Personal Information */}
        <div className="user-profile-section">
          <h3 className="user-profile-section-title">{t('user.personalInfo')}</h3>
          
          <form onSubmit={handleProfileSubmit} className="user-profile-form">
            <div className="user-profile-form-group">
              <label htmlFor="email" className="user-profile-label">
                {t('user.email')}
              </label>
              <input
                type="email"
                id="email"
                value={user.email || ''}
                className="user-profile-input"
                disabled
              />
              <span className="user-profile-help">{t('user.emailNotEditable')}</span>
            </div>

            <div className="user-profile-form-row">
              <div className="user-profile-form-group">
                <label htmlFor="firstName" className="user-profile-label">
                  {t('user.firstName')}
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleProfileInputChange}
                  className={`user-profile-input ${profileErrors['firstName'] ? 'user-profile-input-error' : ''}`}
                />
                {profileErrors['firstName'] && (
                  <span className="user-profile-error">{profileErrors['firstName']}</span>
                )}
              </div>

              <div className="user-profile-form-group">
                <label htmlFor="lastName" className="user-profile-label">
                  {t('user.lastName')}
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleProfileInputChange}
                  className={`user-profile-input ${profileErrors['lastName'] ? 'user-profile-input-error' : ''}`}
                />
                {profileErrors['lastName'] && (
                  <span className="user-profile-error">{profileErrors['lastName']}</span>
                )}
              </div>
            </div>

            <div className="user-profile-form-group">
              <label htmlFor="avatarUrl" className="user-profile-label">
                {t('user.avatar')} URL ({t('common.optional')})
              </label>
              <input
                type="url"
                id="avatarUrl"
                name="avatarUrl"
                value={profileData.avatarUrl}
                onChange={handleProfileInputChange}
                className={`user-profile-input ${profileErrors['avatarUrl'] ? 'user-profile-input-error' : ''}`}
                placeholder="https://example.com/avatar.jpg"
              />
              {profileErrors['avatarUrl'] && (
                <span className="user-profile-error">{profileErrors['avatarUrl']}</span>
              )}
            </div>

            <div className="user-profile-form-actions">
              <button
                type="submit"
                className="user-profile-button user-profile-button-primary"
                disabled={isLoading}
              >
                {isLoading ? t('user.updating') : t('user.updateProfile')}
              </button>
            </div>
          </form>
        </div>

        {/* Password Change */}
        <div className="user-profile-section">
          <h3 className="user-profile-section-title">{t('user.changePassword')}</h3>
          
          <form onSubmit={handlePasswordSubmit} className="user-profile-form">
            <div className="user-profile-form-group">
              <label htmlFor="currentPassword" className="user-profile-label">
                {t('user.currentPassword')}
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordInputChange}
                className={`user-profile-input ${passwordErrors['currentPassword'] ? 'user-profile-input-error' : ''}`}
              />
              {passwordErrors['currentPassword'] && (
                <span className="user-profile-error">{passwordErrors['currentPassword']}</span>
              )}
            </div>

            <div className="user-profile-form-row">
              <div className="user-profile-form-group">
                <label htmlFor="newPassword" className="user-profile-label">
                  {t('user.newPassword')}
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordInputChange}
                  className={`user-profile-input ${passwordErrors['newPassword'] ? 'user-profile-input-error' : ''}`}
                />
                {passwordErrors['newPassword'] && (
                  <span className="user-profile-error">{passwordErrors['newPassword']}</span>
                )}
              </div>

              <div className="user-profile-form-group">
                <label htmlFor="confirmPassword" className="user-profile-label">
                  {t('user.confirmNewPassword')}
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordInputChange}
                  className={`user-profile-input ${passwordErrors['confirmPassword'] ? 'user-profile-input-error' : ''}`}
                />
                {passwordErrors['confirmPassword'] && (
                  <span className="user-profile-error">{passwordErrors['confirmPassword']}</span>
                )}
              </div>
            </div>

            <div className="user-profile-form-actions">
              <button
                type="submit"
                className="user-profile-button user-profile-button-primary"
                disabled={isLoading}
              >
                {isLoading ? t('user.changingPassword') : t('user.changePassword')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}; 