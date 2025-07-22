import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useFamily } from '../../../contexts/FamilyContext';
import { CreateFamilyForm } from './CreateFamilyForm';
import { JoinFamilyForm } from './JoinFamilyForm';
import './FamilyOnboarding.css';

type OnboardingStep = 'choice' | 'create' | 'join';

export const FamilyOnboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('choice');
  const { t, ready } = useTranslation();
  const { logout } = useAuth();
  const { pendingJoinRequests } = useFamily();

  // Wait for i18n to be ready before rendering
  if (!ready) {
    return (
      <div className="family-onboarding">
        <div className="family-onboarding-container">
          <div className="family-onboarding-choice">
            <div className="family-onboarding-header">
              <h1 className="family-onboarding-title">Loading...</h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user has pending join requests, show the join form (which will show pending status)
  useEffect(() => {
    const actualPendingRequests = pendingJoinRequests?.filter(req => req.status === 'PENDING') || [];
    if (actualPendingRequests.length > 0) {
      setCurrentStep('join');
    }
  }, [pendingJoinRequests]);

  const handleBack = () => {
    // Don't allow going back if user has actual pending requests
    const actualPendingRequests = pendingJoinRequests?.filter(req => req.status === 'PENDING') || [];
    if (actualPendingRequests.length > 0) {
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
                {t('family.onboarding.title', 'Welcome to Family Board!')}
              </h1>
              <p className="family-onboarding-subtitle">
                {t('family.onboarding.subtitle', 'To get started, you need to either create a new family or join an existing one.')}
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
                  {t('family.onboarding.createOption', 'Create New Family')}
                </h3>
                <p className="family-onboarding-option-description">
                  {t('family.onboarding.createDescription', 'Start your own family and invite others to join.')}
                </p>
              </button>
              
              <button
                className="family-onboarding-option"
                onClick={() => setCurrentStep('join')}
                type="button"
              >
                <div className="family-onboarding-option-icon">🤝</div>
                <h3 className="family-onboarding-option-title">
                  {t('family.onboarding.joinOption', 'Join Existing Family')}
                </h3>
                <p className="family-onboarding-option-description">
                  {t('family.onboarding.joinDescription', 'Use an invitation code to join an existing family.')}
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