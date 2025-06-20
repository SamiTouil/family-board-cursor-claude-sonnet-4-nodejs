import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { userApi, ChangePasswordData } from '../services/api';
import './UserProfile.css';

interface UserProfileProps {
  onClose: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
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
      await userApi.update(user.id, profileData);
      await refreshUser();
      setMessage({ type: 'success', text: t('user.profileUpdated') });
      // Close dialog after successful save
      setTimeout(() => {
        onClose();
      }, 1500); // Show success message briefly before closing
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || t('user.updateError') 
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

      await userApi.changePassword(user.id, changePasswordData);
      setMessage({ type: 'success', text: t('user.passwordChanged') });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({});
      // Close dialog after successful password change
      setTimeout(() => {
        onClose();
      }, 1500); // Show success message briefly before closing
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || t('user.passwordChangeError') 
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
    <div className="user-profile-overlay">
      <div className="user-profile-modal">
        <div className="user-profile-header">
          <h2 className="user-profile-title">{t('user.profile')}</h2>
          <button
            onClick={onClose}
            className="user-profile-close"
            type="button"
            aria-label={t('common.close')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="user-profile-tabs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`user-profile-tab ${activeTab === 'profile' ? 'user-profile-tab-active' : ''}`}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {t('user.personalInfo')}
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`user-profile-tab ${activeTab === 'password' ? 'user-profile-tab-active' : ''}`}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <circle cx="12" cy="16" r="1" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {t('user.changePassword')}
          </button>
        </div>

        <div className="user-profile-content">
          {message && (
            <div className={`user-profile-message user-profile-message-${message.type}`}>
              {message.text}
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="user-profile-form">
              <div className="user-profile-form-group">
                <label htmlFor="email" className="user-profile-label">
                  {t('user.email')}
                </label>
                <input
                  type="email"
                  id="email"
                  value={user.email}
                  className="user-profile-input user-profile-input-disabled"
                  disabled
                />
                <span className="user-profile-help">
                  {t('user.emailNotEditable')}
                </span>
              </div>

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
                  disabled={isLoading}
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
                  className={`user-profile-input ${profileErrors.lastName ? 'user-profile-input-error' : ''}`}
                  disabled={isLoading}
                />
                {profileErrors.lastName && (
                  <span className="user-profile-error">{profileErrors.lastName}</span>
                )}
              </div>

              <div className="user-profile-form-actions">
                <button
                  type="button"
                  onClick={onClose}
                  className="user-profile-button user-profile-button-secondary"
                  disabled={isLoading}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="user-profile-button user-profile-button-primary"
                  disabled={isLoading}
                >
                  {isLoading ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
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
                  className={`user-profile-input ${passwordErrors.currentPassword ? 'user-profile-input-error' : ''}`}
                  disabled={isLoading}
                />
                {passwordErrors.currentPassword && (
                  <span className="user-profile-error">{passwordErrors.currentPassword}</span>
                )}
              </div>

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
                  className={`user-profile-input ${passwordErrors.newPassword ? 'user-profile-input-error' : ''}`}
                  disabled={isLoading}
                />
                {passwordErrors.newPassword && (
                  <span className="user-profile-error">{passwordErrors.newPassword}</span>
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
                  className={`user-profile-input ${passwordErrors.confirmPassword ? 'user-profile-input-error' : ''}`}
                  disabled={isLoading}
                />
                {passwordErrors.confirmPassword && (
                  <span className="user-profile-error">{passwordErrors.confirmPassword}</span>
                )}
              </div>

              <div className="user-profile-form-actions">
                <button
                  type="button"
                  onClick={onClose}
                  className="user-profile-button user-profile-button-secondary"
                  disabled={isLoading}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="user-profile-button user-profile-button-primary"
                  disabled={isLoading}
                >
                  {isLoading ? t('user.changingPassword') : t('user.changePassword')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}; 