import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { familyApi, FamilyMember, FamilyInvite, FamilyJoinRequest } from '../services/api';
import './FamilyManagement.css';

export const FamilyManagement: React.FC = () => {
  const { t } = useTranslation();
  const { currentFamily } = useFamily();
  const { user } = useAuth();
  const { socket } = useWebSocket();
  const [activeSection, setActiveSection] = useState<'members' | 'invites' | 'requests'>('members');
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [joinRequests, setJoinRequests] = useState<FamilyJoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isRespondingToRequest, setIsRespondingToRequest] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = currentFamily?.userRole === 'ADMIN';

  useEffect(() => {
    if (currentFamily) {
      loadMembers();
      if (isAdmin) {
        loadInvites();
        loadJoinRequests();
      }
    }
  }, [currentFamily, isAdmin]);

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!socket || !currentFamily || !isAdmin) return;

    const handleJoinRequestCreated = (data: any) => {
      // Only handle requests for the current family
      if (data.familyId === currentFamily.id && data.joinRequest) {
        setJoinRequests(prev => {
          // Check if request already exists to avoid duplicates
          const exists = prev.some(req => req.id === data.joinRequest.id);
          if (exists) return prev;
          
          // Add new request to the beginning of the list
          return [data.joinRequest, ...prev];
        });
      }
    };

    const handleMemberJoined = () => {
      // Refresh members when a new member joins
      if (currentFamily) {
        loadMembers();
      }
    };

    // Register event listeners
    socket.on('join-request-created', handleJoinRequestCreated);
    socket.on('member-joined', handleMemberJoined);

    // Cleanup event listeners
    return () => {
      socket.off('join-request-created', handleJoinRequestCreated);
      socket.off('member-joined', handleMemberJoined);
    };
  }, [socket, currentFamily, isAdmin]);

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
      // Failed to load invites - handle silently
    }
  };

  const loadJoinRequests = async () => {
    if (!currentFamily || !isAdmin) return;

    try {
      const response = await familyApi.getJoinRequests(currentFamily.id);
      if (response.data.success) {
        setJoinRequests(response.data.data);
      }
    } catch (error: any) {
      // Failed to load join requests - handle silently
    }
  };

  const respondToJoinRequest = async (requestId: string, response: 'APPROVED' | 'REJECTED') => {
    setIsRespondingToRequest(requestId);
    setMessage(null);

    try {
      const apiResponse = await familyApi.respondToJoinRequest(requestId, response);
      if (apiResponse.data.success) {
        // Update the join request in state
        setJoinRequests(prev => 
          prev.map(req => 
            req.id === requestId 
              ? { ...req, status: response, respondedAt: new Date().toISOString() }
              : req
          )
        );

        // If approved, reload members to show the new member
        if (response === 'APPROVED') {
          loadMembers();
        }

        setMessage({
          type: 'success',
          text: response === 'APPROVED' 
            ? t('user.joinRequestApproved') 
            : t('user.joinRequestRejected')
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || t('user.failedToRespondToRequest')
      });
    } finally {
      setIsRespondingToRequest(null);
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

  const pendingRequestsCount = joinRequests.filter(req => req.status === 'PENDING').length;

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
            onClick={() => setActiveSection('requests')}
            className={`family-management-tab ${activeSection === 'requests' ? 'family-management-tab-active' : ''}`}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 11h-4l-3 3"/>
              <path d="M16 12l-3-3"/>
            </svg>
            {t('user.joinRequests')}
            {pendingRequestsCount > 0 && (
              <span className="family-management-tab-badge">{pendingRequestsCount}</span>
            )}
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

        {activeSection === 'requests' && isAdmin && (
          <div className="family-management-section">
            <div className="family-management-section-header">
              <h4>{t('user.joinRequests')}</h4>
              <span className="family-management-member-count">
                {pendingRequestsCount} pending
              </span>
            </div>

            {joinRequests.length === 0 ? (
              <div className="family-management-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 11h-4l-3 3"/>
                  <path d="M16 12l-3-3"/>
                </svg>
                <p>{t('user.noJoinRequests')}</p>
              </div>
            ) : (
              <div className="family-management-requests">
                {joinRequests.map((request) => (
                  <div key={request.id} className={`family-request-card family-request-card-${request.status.toLowerCase()}`}>
                    <div className="family-member-avatar">
                      {request.user?.avatarUrl ? (
                        <img src={request.user.avatarUrl} alt={`${request.user.firstName} ${request.user.lastName}`} />
                      ) : (
                        <div className="family-member-avatar-placeholder">
                          {request.user?.firstName?.[0]}{request.user?.lastName?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="family-request-info">
                      <div className="family-member-name">
                        {request.user?.firstName} {request.user?.lastName}
                      </div>
                      <div className="family-member-email">{request.user?.email}</div>
                      {request.message && (
                        <div className="family-request-message">
                          <strong>{t('user.message')}:</strong> {request.message}
                        </div>
                      )}
                      <div className="family-member-meta">
                        <span className={`family-request-status family-request-status-${request.status.toLowerCase()}`}>
                          {request.status === 'PENDING' && t('user.pending')}
                          {request.status === 'APPROVED' && t('user.approved')}
                          {request.status === 'REJECTED' && t('user.rejected')}
                        </span>
                        <span className="family-member-joined">
                          {t('user.requestedOn')} {formatDate(request.createdAt)}
                        </span>
                        {request.respondedAt && (
                          <span className="family-member-joined">
                            {t('user.respondedOn')} {formatDate(request.respondedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    {request.status === 'PENDING' && (
                      <div className="family-request-actions">
                        <button
                          onClick={() => respondToJoinRequest(request.id, 'APPROVED')}
                          disabled={isRespondingToRequest === request.id}
                          className="family-request-approve-btn"
                          type="button"
                        >
                          {isRespondingToRequest === request.id ? (
                            <>
                              <div className="loading-spinner-small"></div>
                              {t('user.approving')}
                            </>
                          ) : (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20,6 9,17 4,12"/>
                              </svg>
                              {t('user.approve')}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => respondToJoinRequest(request.id, 'REJECTED')}
                          disabled={isRespondingToRequest === request.id}
                          className="family-request-reject-btn"
                          type="button"
                        >
                          {isRespondingToRequest === request.id ? (
                            <>
                              <div className="loading-spinner-small"></div>
                              {t('user.rejecting')}
                            </>
                          ) : (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                              {t('user.reject')}
                            </>
                          )}
                        </button>
                      </div>
                    )}
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