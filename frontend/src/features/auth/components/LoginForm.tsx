import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/ui';
import type { LoginData } from '../../../types';
import './AuthForm.css';

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup }) => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string>('');

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginData> = {};

    if (!formData.email.trim()) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('auth.emailInvalid');
    }

    if (!formData.password) {
      newErrors.password = t('auth.passwordRequired');
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
      await login(formData);
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
    if (errors[name as keyof LoginData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Clear API error when user makes changes
    if (apiError) {
      setApiError('');
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form-header">
        <h1 className="auth-form-title">{t('auth.loginTitle')}</h1>
        <p className="auth-form-subtitle">{t('auth.loginSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {apiError && (
          <div className="auth-form-error" role="alert">
            {apiError}
          </div>
        )}

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
            className={`auth-form-input ${errors.email ? 'auth-form-input-error' : ''}`}
            disabled={isLoading}
            autoComplete="email"
            autoFocus
          />
          {errors.email && (
            <span className="auth-form-field-error" role="alert">
              {errors.email}
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
            className={`auth-form-input ${errors.password ? 'auth-form-input-error' : ''}`}
            disabled={isLoading}
            autoComplete="current-password"
          />
          {errors.password && (
            <span className="auth-form-field-error" role="alert">
              {errors.password}
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
          {t('auth.login')}
        </Button>

        <div className="auth-form-footer">
          <p className="auth-form-switch">
            {t('auth.noAccount')}{' '}
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={onSwitchToSignup}
              disabled={isLoading}
            >
              {t('auth.signupLink')}
            </Button>
          </p>
        </div>
      </form>
    </div>
  );
}; 