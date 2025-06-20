import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../contexts/FamilyContext';
import { LoadingSpinner } from '../LoadingSpinner';

interface JoinFamilyFormProps {
  onBack: () => void;
  onRequestCancelled: () => void;
}

export const JoinFamilyForm: React.FC<JoinFamilyFormProps> = ({ onBack, onRequestCancelled }) => {
  const { t } = useTranslation();
  const { joinFamily, pendingJoinRequests, cancelJoinRequest, families } = useFamily();
  
  const [formData, setFormData] = useState({
    inviteCode: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Check if user has pending join requests
  const actualPendingRequests = pendingJoinRequests?.filter(req => req.status === 'PENDING') || [];
  const hasPendingRequests = actualPendingRequests.length > 0;
  const pendingRequest = actualPendingRequests[0]; // Get the first pending request

  // Handle when user's request gets rejected - redirect back to choice screen
  useEffect(() => {
    // If user was on the "Request Submitted" screen (isSubmitted = true) 
    // but now has no pending requests, check if it was rejection or approval
    if (isSubmitted && !hasPendingRequests) {
      // If user still has no families, it means the request was rejected
      // If user now has families, it means the request was approved (handled by hasCompletedOnboarding redirect)
      if (families.length === 0) {
        // Request was rejected - reset the submitted state and redirect back to choice
        setIsSubmitted(false);
        onRequestCancelled();
      }
      // If families.length > 0, the request was approved and the main app will handle the redirect
    }
  }, [isSubmitted, hasPendingRequests, families.length, onRequestCancelled]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.inviteCode.trim()) {
      newErrors['inviteCode'] = t('family.join.codeRequired');
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
      const joinData: any = {
        code: formData.inviteCode.trim(),
      };
      if (formData.message.trim()) {
        joinData.message = formData.message.trim();
      }
      await joinFamily(joinData);
      setIsSubmitted(true);
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!pendingRequest) return;
    
    setIsCancelling(true);
    try {
      await cancelJoinRequest(pendingRequest.id);
      onRequestCancelled();
    } catch (error: any) {
      setErrors({ cancel: error.message });
    } finally {
      setIsCancelling(false);
    }
  };

  // Show pending request screen if user has pending requests or just submitted
  if (hasPendingRequests || isSubmitted) {
    const request = pendingRequest || { family: { name: '' }, createdAt: new Date().toISOString() };
    
    return (
      <div className="join-family-form">
        <div className="join-family-header">
          <h1 className="join-family-title">{t('family.join.requestSubmittedTitle')}</h1>
          <p className="join-family-subtitle">{t('family.join.requestSubmittedSubtitle')}</p>
        </div>
        
        <div className="join-family-pending-content">
          <div className="join-family-pending-info">
            <div className="join-family-pending-icon">⏳</div>
            <h3 className="join-family-pending-family">{request.family.name}</h3>
            <p className="join-family-pending-date">
              {t('family.join.requestedOn')} {new Date(request.createdAt).toLocaleDateString()}
            </p>
            <p className="join-family-pending-message">
              {t('family.join.waitingForApproval')}
            </p>
          </div>
          
          {errors['cancel'] && (
            <div className="form-error-message">
              {errors['cancel']}
            </div>
          )}
          
          <div className="join-family-pending-actions">
            <button
              onClick={handleCancelRequest}
              className="join-family-cancel-button"
              disabled={isCancelling}
              type="button"
            >
              {isCancelling ? (
                <>
                  <LoadingSpinner size="small" />
                  {t('family.join.cancelling')}
                </>
              ) : (
                t('family.join.cancelRequest')
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="form-group">
          <label htmlFor="message" className="form-label">
            {t('family.join.message')}
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            placeholder={t('family.join.messagePlaceholder')}
            className="form-input"
            disabled={isSubmitting}
            rows={3}
          />
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