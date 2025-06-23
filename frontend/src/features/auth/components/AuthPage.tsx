import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { useTranslation } from 'react-i18next';
import LogoReversed from '../../../components/layout/LogoReversed';
import './AuthPage.css';

type AuthMode = 'login' | 'signup';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const { t } = useTranslation();

  const switchToSignup = () => setMode('signup');
  const switchToLogin = () => setMode('login');

  return (
    <div className="auth-page">
      <div className="auth-page-background">
        <div className="auth-page-content">
          <div className="auth-page-brand">
            <div className="auth-page-brand-header">
              <LogoReversed size={52} className="auth-page-logo" />
              <h1 className="auth-page-brand-title">{t('app.title')}</h1>
            </div>
            <p className="auth-page-brand-subtitle">
              {mode === 'login' 
                ? t('auth.loginSubtitle')
                : t('auth.signupSubtitle')
              }
            </p>
          </div>
          
          <div className="auth-page-form">
            {mode === 'login' ? (
              <LoginForm onSwitchToSignup={switchToSignup} />
            ) : (
              <SignupForm onSwitchToLogin={switchToLogin} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 