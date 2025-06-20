import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';
import { CreateFamilyForm } from './CreateFamilyForm';
import { JoinFamilyForm } from './JoinFamilyForm';
import './FamilyOnboarding.css';

type OnboardingStep = 'choice' | 'create' | 'join';

export const FamilyOnboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('choice');
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { pendingJoinRequests } = useFamily();

  // If user has pending join requests, show the join form (which will show pending status)
  useEffect(() => {
    if (pendingJoinRequests && pendingJoinRequests.length > 0) {
      setCurrentStep('join');
    }
  }, [pendingJoinRequests]);

  const handleBack = () => {
    // Don't allow going back if user has pending requests
    if (pendingJoinRequests && pendingJoinRequests.length > 0) {
      return;
    }
    
    if (currentStep === 'choice') {
      // Logout when going back from the main choice screen
      logout();
    } else {
      setCurrentStep('choice');
    }
  };

  const handleRequestCancelled = () => {
    // When request is cancelled, go back to choice screen
    setCurrentStep('choice');
  };



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
            

          </div>
        )}
        
        {currentStep === 'create' && (
          <CreateFamilyForm onBack={handleBack} />
        )}
        
        {currentStep === 'join' && (
          <JoinFamilyForm onBack={handleBack} onRequestCancelled={handleRequestCancelled} />
        )}
      </div>
    </div>
  );
}; 