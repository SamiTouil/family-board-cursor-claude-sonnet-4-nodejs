import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../../contexts/FamilyContext';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';

interface CreateFamilyFormProps {
  onBack: () => void;
}

export const CreateFamilyForm: React.FC<CreateFamilyFormProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { createFamily } = useFamily();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors['name'] = t('family.create.nameRequired');
    } else if (formData.name.trim().length < 2) {
      newErrors['name'] = t('family.create.nameMinLength');
    } else if (formData.name.trim().length > 50) {
      newErrors['name'] = t('family.create.nameMaxLength');
    }

    if (formData.description.trim().length > 200) {
      newErrors['description'] = t('family.create.descriptionMaxLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      const createData: { name: string; description?: string } = {
        name: formData.name.trim(),
      };
      
      if (formData.description.trim()) {
        createData.description = formData.description.trim();
      }
      
      await createFamily(createData);
      // Success! The family context will handle navigation
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-family-form">
      <div className="create-family-header">
        <button
          onClick={onBack}
          className="create-family-back-button"
          type="button"
          disabled={isSubmitting}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
          {t('family.common.back')}
        </button>
        <h1 className="create-family-title">{t('family.create.title')}</h1>
        <p className="create-family-subtitle">{t('family.create.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="create-family-form-content">
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            {t('family.create.name')}
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder={t('family.create.namePlaceholder')}
            className={`form-input ${errors['name'] ? 'form-input-error' : ''}`}
            disabled={isSubmitting}
            maxLength={50}
          />
          {errors['name'] && <span className="form-error">{errors['name']}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            {t('family.create.description')}
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder={t('family.create.descriptionPlaceholder')}
            className={`form-textarea ${errors['description'] ? 'form-input-error' : ''}`}
            disabled={isSubmitting}
            maxLength={200}
            rows={3}
          />
          {errors['description'] && <span className="form-error">{errors['description']}</span>}
        </div>

        {errors['submit'] && (
          <div className="form-error-message">
            {errors['submit']}
          </div>
        )}

        <button
          type="submit"
          className="create-family-submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="small" />
              {t('family.create.creating')}
            </>
          ) : (
            t('family.common.continue')
          )}
        </button>
      </form>
    </div>
  );
}; 