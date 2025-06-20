import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
import { familyApi, FamilyMember, FamilyInvite } from '../services/api';
import './FamilyManagement.css';

export const FamilyManagement: React.FC = () => {
  const { t } = useTranslation();
  const { currentFamily } = useFamily();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<'members' | 'invites'>('members');
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = currentFamily?.userRole === 'ADMIN';

  useEffect(() => {
    if (currentFamily) {
      loadMembers();
      if (isAdmin) {
        loadInvites();
      }
    }
  }, [currentFamily, isAdmin]);

  const loadMembers = async () => {
    if (!currentFamily) return;
    
    setIsLoading(true);
    try {
      const response = await familyApi.getMembers(currentFamily.id);
      if (response.data.success) {
        setMembers(response.data.data);
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || t('user.failedToLoadMembers')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadInvites = async () => {
    if (!currentFamily || !isAdmin) return;

    try {
      const response = await familyApi.getInvites(currentFamily.id);
      if (response.data.success) {
        setInvites(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to load invites:', error);
    }
  };

  const generateInviteCode = async () => {
    if (!currentFamily || !isAdmin) return;

    setIsGeneratingCode(true);
    setMessage(null);

    try {
      const response = await familyApi.createInvite(currentFamily.id, {
        expiresIn: 7 // 7 days
      });
      
      if (response.data.success) {
        const newInvite = response.data.data;
        setInvites(prev => [newInvite, ...prev]);
        
        // Copy to clipboard
        await navigator.clipboard.writeText(newInvite.code);
        setMessage({
          type: 'success',
          text: t('user.inviteCodeCopied')
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || t('user.failedToGenerateCode')
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const copyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setMessage({
        type: 'success',
        text: t('user.inviteCodeCopied')
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to copy invite code'
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!currentFamily) {
    return null;
  }

  return (
    <div className="family-management">
      <div className="family-management-header">
        <h3 className="family-management-title">{currentFamily.name}</h3>
        <p className="family-management-subtitle">
          {isAdmin ? t('user.familyManagement') : t('user.familyMembers')}
        </p>
      </div>

      {message && (
        <div className={`family-management-message family-management-message-${message.type}`}>
          {message.text}
        </div>
      )}

      {!isAdmin && (
        <div className="family-management-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {t('user.onlyAdminsCanManage')}
        </div>
      )}

      {isAdmin && (
        <div className="family-management-tabs">
          <button
            onClick={() => setActiveSection('members')}
            className={`family-management-tab ${activeSection === 'members' ? 'family-management-tab-active' : ''}`}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            {t('user.familyMembers')}
          </button>
          <button
            onClick={() => setActiveSection('invites')}
            className={`family-management-tab ${activeSection === 'invites' ? 'family-management-tab-active' : ''}`}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            {t('user.generateInviteCode')}
          </button>
        </div>
      )}

      <div className="family-management-content">
        {(activeSection === 'members' || !isAdmin) && (
          <div className="family-management-section">
            <div className="family-management-section-header">
              <h4>{t('user.familyMembers')}</h4>
              <span className="family-management-member-count">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
            </div>

            {isLoading ? (
              <div className="family-management-loading">
                <div className="loading-spinner"></div>
                {t('user.loadingMembers')}
              </div>
            ) : members.length === 0 ? (
              <div className="family-management-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <p>{t('user.noFamilyMembers')}</p>
              </div>
            ) : (
              <div className="family-management-members">
                {members.map((member) => (
                  <div key={member.id} className="family-member-card">
                    <div className="family-member-avatar">
                      {member.user?.avatarUrl ? (
                        <img src={member.user.avatarUrl} alt={`${member.user.firstName} ${member.user.lastName}`} />
                      ) : (
                        <div className="family-member-avatar-placeholder">
                          {member.user?.firstName?.[0]}{member.user?.lastName?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="family-member-info">
                      <div className="family-member-name">
                        {member.user?.firstName} {member.user?.lastName}
                        {member.user?.id === user?.id && (
                          <span className="family-member-you"> ({t('user.you')})</span>
                        )}
                      </div>
                      <div className="family-member-email">{member.user?.email}</div>
                      <div className="family-member-meta">
                        <span className={`family-member-role family-member-role-${member.role.toLowerCase()}`}>
                          {member.role === 'ADMIN' ? t('user.admin') : t('user.member')}
                        </span>
                        <span className="family-member-joined">
                          {t('user.joinedOn')} {formatDate(member.joinedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'invites' && isAdmin && (
          <div className="family-management-section">
            <div className="family-management-section-header">
              <h4>{t('user.generateInviteCode')}</h4>
              <button
                onClick={generateInviteCode}
                disabled={isGeneratingCode}
                className="family-management-generate-btn"
                type="button"
              >
                {isGeneratingCode ? (
                  <>
                    <div className="loading-spinner-small"></div>
                    {t('user.generating')}
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    {t('user.generateNewCode')}
                  </>
                )}
              </button>
            </div>

            <div className="family-management-invite-info">
              <p>{t('user.shareInviteCode')}</p>
            </div>

            <div className="family-management-invites">
              {invites
                .filter(invite => invite.status === 'PENDING' && new Date(invite.expiresAt) > new Date())
                .map((invite) => (
                  <div key={invite.id} className="family-invite-card">
                    <div className="family-invite-code-section">
                      <label className="family-invite-label">{t('user.inviteCode')}</label>
                      <div className="family-invite-code-container">
                        <code className="family-invite-code">{invite.code}</code>
                        <button
                          onClick={() => copyInviteCode(invite.code)}
                          className="family-invite-copy-btn"
                          type="button"
                          title={t('user.copyInviteCode')}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="family-invite-meta">
                      <span>Expires: {formatDate(invite.expiresAt)}</span>
                      <span>Created: {formatDate(invite.createdAt)}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 