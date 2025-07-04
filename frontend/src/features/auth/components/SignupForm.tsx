import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/ui';
import './AuthForm.css';

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const [formData, setFormData] = useState<SignupData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string>('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string | undefined> = {};

    if (!formData.firstName.trim()) {
      newErrors['firstName'] = t('auth.firstNameRequired');
    }

    if (!formData.lastName.trim()) {
      newErrors['lastName'] = t('auth.lastNameRequired');
    }

    if (!formData.email.trim()) {
      newErrors['email'] = t('auth.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors['email'] = t('auth.emailInvalid');
    }

    if (!formData.password) {
      newErrors['password'] = t('auth.passwordRequired');
    } else if (formData.password.length < 6) {
      newErrors['password'] = t('auth.passwordTooShort');
    }

    if (!formData.confirmPassword) {
      newErrors['confirmPassword'] = t('auth.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors['confirmPassword'] = t('auth.passwordsDoNotMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Remove confirmPassword from the data sent to the API
      const { confirmPassword, ...signupData } = formData;
      await signup(signupData);
      // Redirect will be handled by the parent component/router
    } catch (error: any) {
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Clear confirm password error if password fields now match
    if (name === 'password' || name === 'confirmPassword') {
      if (name === 'password' && formData.confirmPassword && value === formData.confirmPassword) {
        setErrors(prev => ({ ...prev, ['confirmPassword']: undefined }));
      } else if (name === 'confirmPassword' && formData.password && value === formData.password) {
        setErrors(prev => ({ ...prev, ['confirmPassword']: undefined }));
      }
    }
    
    // Clear API error when user makes changes
    if (apiError) {
      setApiError('');
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form-header">
        <h1 className="auth-form-title">{t('auth.signupTitle')}</h1>
        <p className="auth-form-subtitle">{t('auth.signupSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {apiError && (
          <div className="auth-form-error" role="alert">
            {apiError}
          </div>
        )}

        <div className="auth-form-row">
          <div className="auth-form-field">
            <label htmlFor="firstName" className="auth-form-label">
              {t('auth.firstName')}
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              className={`auth-form-input ${errors['firstName'] ? 'auth-form-input-error' : ''}`}
              disabled={isLoading}
              autoComplete="given-name"
              autoFocus
            />
            {errors['firstName'] && (
              <span className="auth-form-field-error" role="alert">
                {errors['firstName']}
              </span>
            )}
          </div>

          <div className="auth-form-field">
            <label htmlFor="lastName" className="auth-form-label">
              {t('auth.lastName')}
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              className={`auth-form-input ${errors['lastName'] ? 'auth-form-input-error' : ''}`}
              disabled={isLoading}
              autoComplete="family-name"
            />
            {errors['lastName'] && (
              <span className="auth-form-field-error" role="alert">
                {errors['lastName']}
              </span>
            )}
          </div>
        </div>

        <div className="auth-form-field">
          <label htmlFor="email" className="auth-form-label">
            {t('auth.email')}
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`auth-form-input ${errors['email'] ? 'auth-form-input-error' : ''}`}
            disabled={isLoading}
            autoComplete="email"
          />
          {errors['email'] && (
            <span className="auth-form-field-error" role="alert">
              {errors['email']}
            </span>
          )}
        </div>

        <div className="auth-form-field">
          <label htmlFor="password" className="auth-form-label">
            {t('auth.password')}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`auth-form-input ${errors['password'] ? 'auth-form-input-error' : ''}`}
            disabled={isLoading}
            autoComplete="new-password"
            minLength={6}
          />
          {errors['password'] && (
            <span className="auth-form-field-error" role="alert">
              {errors['password']}
            </span>
          )}
        </div>

        <div className="auth-form-field">
          <label htmlFor="confirmPassword" className="auth-form-label">
            {t('auth.confirmPassword')}
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={`auth-form-input ${errors['confirmPassword'] ? 'auth-form-input-error' : ''}`}
            disabled={isLoading}
            autoComplete="new-password"
            minLength={6}
          />
          {errors['confirmPassword'] && (
            <span className="auth-form-field-error" role="alert">
              {errors['confirmPassword']}
            </span>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isLoading}
          loading={isLoading}
        >
          {t('auth.signup')}
        </Button>

        <div className="auth-form-footer">
          <p className="auth-form-switch">
            {t('auth.hasAccount')}{' '}
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={onSwitchToLogin}
              disabled={isLoading}
            >
              {t('auth.loginLink')}
            </Button>
          </p>
        </div>
      </form>
    </div>
  );
}; 