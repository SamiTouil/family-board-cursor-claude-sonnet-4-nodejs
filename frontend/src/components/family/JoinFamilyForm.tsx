import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../contexts/FamilyContext';
import { LoadingSpinner } from '../LoadingSpinner';

interface JoinFamilyFormProps {
  onBack: () => void;
}

export const JoinFamilyForm: React.FC<JoinFamilyFormProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { joinFamily } = useFamily();
  
  const [formData, setFormData] = useState({
    inviteCode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.inviteCode.trim()) {
      newErrors['inviteCode'] = t('family.join.codeRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await joinFamily({
        inviteCode: formData.inviteCode.trim(),
      });
      // Success! The family context will handle navigation
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="join-family-form">
      <div className="join-family-header">
        <button
          onClick={onBack}
          className="join-family-back-button"
          type="button"
          disabled={isSubmitting}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
          {t('family.common.back')}
        </button>
        <h1 className="join-family-title">{t('family.join.title')}</h1>
        <p className="join-family-subtitle">{t('family.join.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="join-family-form-content">
        <div className="form-group">
          <label htmlFor="inviteCode" className="form-label">
            {t('family.join.inviteCode')}
          </label>
          <input
            type="text"
            id="inviteCode"
            name="inviteCode"
            value={formData.inviteCode}
            onChange={handleInputChange}
            placeholder={t('family.join.inviteCodePlaceholder')}
            className={`form-input ${errors['inviteCode'] ? 'form-input-error' : ''}`}
            disabled={isSubmitting}
            autoComplete="off"
          />
          {errors['inviteCode'] && <span className="form-error">{errors['inviteCode']}</span>}
        </div>

        {errors['submit'] && (
          <div className="form-error-message">
            {errors['submit']}
          </div>
        )}

        <button
          type="submit"
          className="join-family-submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="small" />
              {t('family.join.joining')}
            </>
          ) : (
            t('family.common.join')
          )}
        </button>
      </form>
    </div>
  );
}; 