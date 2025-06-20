import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import { CreateFamilyForm } from './CreateFamilyForm';
import { JoinFamilyForm } from './JoinFamilyForm';
import { LoadingSpinner } from '../LoadingSpinner';
import './FamilyOnboarding.css';

type OnboardingStep = 'choice' | 'create' | 'join';

export const FamilyOnboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('choice');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { createFamily, joinFamily } = useFamily();
  const { logout } = useAuth();

  const handleCreateFamily = async (data: { name: string; description?: string }) => {
    setLoading(true);
    try {
      await createFamily(data);
      // Success - the context will update hasCompletedOnboarding
    } catch (error) {
      // Error handling is done in the form component
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async (data: { inviteCode: string }) => {
    setLoading(true);
    try {
      await joinFamily(data);
      // Success - the context will update hasCompletedOnboarding
    } catch (error) {
      // Error handling is done in the form component
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'choice') {
      // Logout when going back from the main choice screen
      logout();
    } else {
      setCurrentStep('choice');
    }
  };

  if (loading) {
    return (
      <div className="family-onboarding-loading">
        <LoadingSpinner size="large" message={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="family-onboarding">
      <div className="family-onboarding-container">
        {currentStep === 'choice' && (
          <div className="family-onboarding-choice">
            <div className="family-onboarding-header">
              <h1 className="family-onboarding-title">
                {t('family.onboarding.title')}
              </h1>
              <p className="family-onboarding-subtitle">
                {t('family.onboarding.subtitle')}
              </p>
            </div>
            
            <div className="family-onboarding-options">
              <button
                className="family-onboarding-option"
                onClick={() => setCurrentStep('create')}
                type="button"
              >
                <div className="family-onboarding-option-icon">👨‍👩‍👧‍👦</div>
                <h3 className="family-onboarding-option-title">
                  {t('family.onboarding.createOption')}
                </h3>
                <p className="family-onboarding-option-description">
                  {t('family.onboarding.createDescription')}
                </p>
              </button>
              
              <button
                className="family-onboarding-option"
                onClick={() => setCurrentStep('join')}
                type="button"
              >
                <div className="family-onboarding-option-icon">🤝</div>
                <h3 className="family-onboarding-option-title">
                  {t('family.onboarding.joinOption')}
                </h3>
                <p className="family-onboarding-option-description">
                  {t('family.onboarding.joinDescription')}
                </p>
              </button>
            </div>
            
            <button
              className="family-onboarding-back-button"
              onClick={handleBack}
              type="button"
            >
              {t('common.back')}
            </button>
          </div>
        )}
        
        {currentStep === 'create' && (
          <div className="family-onboarding-form">
            <button
              className="family-onboarding-back-button"
              onClick={handleBack}
              type="button"
            >
              {t('common.back')}
            </button>
            <CreateFamilyForm onSubmit={handleCreateFamily} />
          </div>
        )}
        
        {currentStep === 'join' && (
          <div className="family-onboarding-form">
            <button
              className="family-onboarding-back-button"
              onClick={handleBack}
              type="button"
            >
              {t('common.back')}
            </button>
            <JoinFamilyForm onSubmit={handleJoinFamily} />
          </div>
        )}
      </div>
    </div>
  );
}; 