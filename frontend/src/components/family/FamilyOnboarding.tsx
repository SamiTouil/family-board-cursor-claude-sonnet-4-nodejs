import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreateFamilyForm } from './CreateFamilyForm';
import { JoinFamilyForm } from './JoinFamilyForm';
import './FamilyOnboarding.css';

type OnboardingStep = 'choice' | 'create' | 'join';

export const FamilyOnboarding: React.FC = () => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('choice');

  const handleBack = () => {
    setCurrentStep('choice');
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'create':
        return <CreateFamilyForm onBack={handleBack} />;
      case 'join':
        return <JoinFamilyForm onBack={handleBack} />;
      default:
        return (
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
                <div className="family-onboarding-option-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                </div>
                <h3 className="family-onboarding-option-title">
                  {t('family.onboarding.createFamily')}
                </h3>
                <p className="family-onboarding-option-description">
                  {t('family.onboarding.createFamilyDescription')}
                </p>
              </button>

              <button
                className="family-onboarding-option"
                onClick={() => setCurrentStep('join')}
                type="button"
              >
                <div className="family-onboarding-option-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="m13 7 5 5-5 5" />
                  </svg>
                </div>
                <h3 className="family-onboarding-option-title">
                  {t('family.onboarding.joinFamily')}
                </h3>
                <p className="family-onboarding-option-description">
                  {t('family.onboarding.joinFamilyDescription')}
                </p>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="family-onboarding">
      <div className="family-onboarding-container">
        {renderContent()}
      </div>
    </div>
  );
}; 