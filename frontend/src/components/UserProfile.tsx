import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { userApi, familyApi, ChangePasswordData, FamilyMember, FamilyInvite, FamilyJoinRequest } from '../services/api';
import { CustomSelect } from './CustomSelect';
import { UserAvatar } from './UserAvatar';
import './UserProfile.css';

interface UserProfileProps {
  onClose: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { currentFamily } = useFamily();
  const { socket } = useWebSocket();
  const modalRef = useRef<HTMLDivElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Family management state
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [joinRequests, setJoinRequests] = useState<FamilyJoinRequest[]>([]);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState(7);

  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const isAdmin = currentFamily?.userRole === 'ADMIN';

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Load family data when component mounts
  useEffect(() => {
    if (currentFamily) {
      loadFamilyData();
    }
  }, [currentFamily]);

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
      // Refresh family data when a new member joins
      if (currentFamily) {
        loadFamilyData();
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

  const loadFamilyData = async () => {
    if (!currentFamily) return;

    try {
      // Always load members for all family members
      const membersResponse = await familyApi.getMembers(currentFamily.id);
      if (membersResponse.data.success) {
        setMembers(membersResponse.data.data);
      }

      // Only load invites and join requests for admins
      if (isAdmin) {
        const [invitesResponse, joinRequestsResponse] = await Promise.all([
          familyApi.getInvites(currentFamily.id),
          familyApi.getJoinRequests(currentFamily.id),
        ]);

        if (invitesResponse.data.success) {
          setInvites(invitesResponse.data.data);
        }
        if (joinRequestsResponse.data.success) {
          setJoinRequests(joinRequestsResponse.data.data);
        }
      }
    } catch (error) {
      // Handle silently
    }
  };

  const validateProfileForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!profileData.firstName.trim()) {
      errors['firstName'] = t('auth.validation.firstNameRequired');
    }

    if (!profileData.lastName.trim()) {
      errors['lastName'] = t('auth.validation.lastNameRequired');
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      errors['currentPassword'] = t('user.validation.currentPasswordRequired');
    }

    if (!passwordData.newPassword) {
      errors['newPassword'] = t('auth.validation.passwordRequired');
    } else if (passwordData.newPassword.length < 6) {
      errors['newPassword'] = t('auth.validation.passwordTooShort');
    }

    if (!passwordData.confirmPassword) {
      errors['confirmPassword'] = t('auth.validation.confirmPasswordRequired');
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors['confirmPassword'] = t('auth.validation.passwordsDoNotMatch');
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateProfileForm() || !user) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await userApi.update(user.id, profileData);
      await refreshUser();
      setMessage({ type: 'success', text: t('user.profileUpdated') });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || t('user.updateError') 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm() || !user) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const changePasswordData: ChangePasswordData = {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      };

      await userApi.changePassword(user.id, changePasswordData);
      setMessage({ type: 'success', text: t('user.passwordChanged') });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({});
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || t('user.passwordChangeError') 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFamily) return;

    setIsCreatingInvite(true);
    try {
      const inviteData: { receiverEmail?: string; expiresIn?: number } = {
        expiresIn: inviteExpiry,
      };
      
      if (inviteEmail.trim()) {
        inviteData.receiverEmail = inviteEmail;
      }
      
      const response = await familyApi.createInvite(currentFamily.id, inviteData);

      if (response.data.success) {
        setInvites(prev => [response.data.data, ...prev]);
        setInviteEmail('');
        setMessage({ type: 'success', text: t('family.inviteCreated') });
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || t('family.inviteError') 
      });
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleJoinRequestResponse = async (requestId: string, response: 'APPROVED' | 'REJECTED') => {
    setIsLoading(true);
    setMessage(null);

    try {
      await familyApi.respondToJoinRequest(requestId, response);
      setMessage({ 
        type: 'success', 
        text: response === 'APPROVED' 
          ? t('family.joinRequestApproved') 
          : t('family.joinRequestRejected')
      });
      
      // Refresh family data to update the lists
      await loadFamilyData();
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || t('family.joinRequestError') 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!currentFamily) return;
    
    // Confirm removal
    if (!window.confirm(t('family.confirmRemoveMember', { memberName }))) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await familyApi.removeMember(currentFamily.id, memberId);
      setMessage({ 
        type: 'success', 
        text: t('family.memberRemovedSuccessfully', { memberName })
      });
      
      // Refresh family data to update the member list
      await loadFamilyData();
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || t('family.removeMemberError') 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (profileErrors[name]) {
      setProfileErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!user) {
    return null;
  }

  const pendingJoinRequests = joinRequests.filter(req => req.status === 'PENDING');

  return (
    <div className="user-profile-overlay">
      <div className="user-profile-modal" ref={modalRef}>
        <div className="user-profile-header">
          <h2 className="user-profile-title">{t('user.profile')}</h2>
          <button
            onClick={onClose}
            className="user-profile-close"
            type="button"
            aria-label={t('common.close')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="user-profile-content">
          {message && (
            <div className={`user-profile-message user-profile-message-${message.type}`}>
              {message.text}
            </div>
          )}

          {/* Personal Information Section */}
          <section className="user-profile-section">
            <div className="user-profile-section-header">
              <div className="user-profile-section-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3 className="user-profile-section-title">{t('user.personalInfo')}</h3>
            </div>

            <form onSubmit={handleProfileSubmit} className="user-profile-form">
              <div className="user-profile-form-row">
                <div className="user-profile-form-group">
                  <label htmlFor="email" className="user-profile-label">
                    {t('user.email')}
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={user.email}
                    className="user-profile-input user-profile-input-disabled"
                    disabled
                  />
                  <span className="user-profile-help">
                    {t('user.emailNotEditable')}
                  </span>
                </div>
              </div>

              <div className="user-profile-form-row">
                <div className="user-profile-form-group">
                  <label htmlFor="firstName" className="user-profile-label">
                    {t('user.firstName')}
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleProfileInputChange}
                    className={`user-profile-input ${profileErrors['firstName'] ? 'user-profile-input-error' : ''}`}
                    disabled={isLoading}
                  />
                  {profileErrors['firstName'] && (
                    <span className="user-profile-error">{profileErrors['firstName']}</span>
                  )}
                </div>

                <div className="user-profile-form-group">
                  <label htmlFor="lastName" className="user-profile-label">
                    {t('user.lastName')}
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={profileData.lastName}
                    onChange={handleProfileInputChange}
                    className={`user-profile-input ${profileErrors['lastName'] ? 'user-profile-input-error' : ''}`}
                    disabled={isLoading}
                  />
                  {profileErrors['lastName'] && (
                    <span className="user-profile-error">{profileErrors['lastName']}</span>
                  )}
                </div>
              </div>

              <div className="user-profile-form-actions">
                <button
                  type="submit"
                  className="user-profile-button user-profile-button-primary"
                  disabled={isLoading}
                >
                  {isLoading ? t('common.saving') : t('user.updateProfile')}
                </button>
              </div>
            </form>
          </section>

          {/* Change Password Section */}
          <section className="user-profile-section">
            <div className="user-profile-section-header">
              <div className="user-profile-section-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <circle cx="12" cy="16" r="1" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 className="user-profile-section-title">{t('user.changePassword')}</h3>
            </div>

            <form onSubmit={handlePasswordSubmit} className="user-profile-form">
              <div className="user-profile-form-row">
                <div className="user-profile-form-group">
                  <label htmlFor="currentPassword" className="user-profile-label">
                    {t('user.currentPassword')}
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordInputChange}
                    className={`user-profile-input ${passwordErrors['currentPassword'] ? 'user-profile-input-error' : ''}`}
                    disabled={isLoading}
                  />
                  {passwordErrors['currentPassword'] && (
                    <span className="user-profile-error">{passwordErrors['currentPassword']}</span>
                  )}
                </div>
              </div>

              <div className="user-profile-form-row">
                <div className="user-profile-form-group">
                  <label htmlFor="newPassword" className="user-profile-label">
                    {t('user.newPassword')}
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordInputChange}
                    className={`user-profile-input ${passwordErrors['newPassword'] ? 'user-profile-input-error' : ''}`}
                    disabled={isLoading}
                  />
                  {passwordErrors['newPassword'] && (
                    <span className="user-profile-error">{passwordErrors['newPassword']}</span>
                  )}
                </div>

                <div className="user-profile-form-group">
                  <label htmlFor="confirmPassword" className="user-profile-label">
                    {t('user.confirmNewPassword')}
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordInputChange}
                    className={`user-profile-input ${passwordErrors['confirmPassword'] ? 'user-profile-input-error' : ''}`}
                    disabled={isLoading}
                  />
                  {passwordErrors['confirmPassword'] && (
                    <span className="user-profile-error">{passwordErrors['confirmPassword']}</span>
                  )}
                </div>
              </div>

              <div className="user-profile-form-actions">
                <button
                  type="submit"
                  className="user-profile-button user-profile-button-primary"
                  disabled={isLoading}
                >
                  {isLoading ? t('user.changingPassword') : t('user.changePassword')}
                </button>
              </div>
            </form>
          </section>

          {/* Family Management Section - Only for family members */}
          {currentFamily && (
            <section className="user-profile-section">
              <div className="user-profile-section-header">
                <div className="user-profile-section-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <h3 className="user-profile-section-title">{t('user.familyManagement')}</h3>
                <span className="user-profile-family-name">{currentFamily.name}</span>
              </div>

              {/* Family Members */}
              <div className="user-profile-subsection">
                <h4 className="user-profile-subsection-title">{t('family.members')}</h4>
                <div className="user-profile-members-list">
                  {members.map((member) => (
                    <div key={member.id} className="user-profile-member-card">
                      <UserAvatar
                        firstName={member.user?.firstName || ''}
                        lastName={member.user?.lastName || ''}
                        avatarUrl={member.user?.avatarUrl || null}
                        size="medium"
                      />
                      <div className="user-profile-member-info">
                        <div className="user-profile-member-name">
                          {member.user?.firstName} {member.user?.lastName}
                        </div>
                        <div className="user-profile-member-email">{member.user?.email}</div>
                      </div>
                      <div className="user-profile-member-role">
                        <span className={`user-profile-role-badge user-profile-role-${member.role.toLowerCase()}`}>
                          {t(`family.role.${member.role.toLowerCase()}`)}
                        </span>
                      </div>
                      {/* Remove member button - only for admins and not for self */}
                      {isAdmin && member.userId !== user?.id && (
                        <div className="user-profile-member-actions">
                          <button
                            onClick={() => handleRemoveMember(member.id, `${member.user?.firstName} ${member.user?.lastName}`)}
                            className="user-profile-button user-profile-button-danger user-profile-button-sm"
                            disabled={isLoading}
                            title={t('family.removeMember')}
                          >
                            {t('family.remove')}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin-only sections */}
              {isAdmin && (
                <>
                  {/* Pending Join Requests */}
                  {pendingJoinRequests.length > 0 && (
                    <div className="user-profile-subsection">
                      <h4 className="user-profile-subsection-title">
                        {t('family.joinRequests')} 
                        <span className="user-profile-count-badge">{pendingJoinRequests.length}</span>
                      </h4>
                      <div className="user-profile-requests-list">
                        {pendingJoinRequests.map((request) => (
                          <div key={request.id} className="user-profile-request-card">
                            <UserAvatar
                              firstName={request.user.firstName || ''}
                              lastName={request.user.lastName || ''}
                              avatarUrl={request.user.avatarUrl || null}
                              size="medium"
                            />
                            <div className="user-profile-request-info">
                              <div className="user-profile-request-name">
                                {request.user.firstName} {request.user.lastName}
                              </div>
                              <div className="user-profile-request-email">{request.user.email}</div>
                              {request.message && (
                                <div className="user-profile-request-message">"{request.message}"</div>
                              )}
                              <div className="user-profile-request-date">
                                {new Date(request.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="user-profile-request-actions">
                              <button
                                onClick={() => handleJoinRequestResponse(request.id, 'APPROVED')}
                                className="user-profile-button user-profile-button-success user-profile-button-sm"
                              >
                                {t('family.approve')}
                              </button>
                              <button
                                onClick={() => handleJoinRequestResponse(request.id, 'REJECTED')}
                                className="user-profile-button user-profile-button-danger user-profile-button-sm"
                              >
                                {t('family.reject')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generate Invite */}
                  <div className="user-profile-subsection">
                    <h4 className="user-profile-subsection-title">{t('family.generateInvite')}</h4>
                    <form onSubmit={handleCreateInvite} className="user-profile-invite-form">
                      <div className="user-profile-form-row">
                        <div className="user-profile-form-group">
                          <label htmlFor="inviteEmail" className="user-profile-label">
                            {t('family.inviteEmail')} ({t('common.optional')})
                          </label>
                          <input
                            type="email"
                            id="inviteEmail"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="user-profile-input"
                            placeholder={t('family.inviteEmailPlaceholder')}
                            disabled={isCreatingInvite}
                          />
                        </div>
                        <div className="user-profile-form-group">
                          <label htmlFor="inviteExpiry" className="user-profile-label">
                            {t('family.expiresIn')}
                          </label>
                          <CustomSelect
                            id="inviteExpiry"
                            value={inviteExpiry}
                            onChange={(value) => setInviteExpiry(Number(value))}
                            options={[
                              { value: 1, label: t('family.expiry.1day') },
                              { value: 3, label: t('family.expiry.3days') },
                              { value: 7, label: t('family.expiry.7days') },
                              { value: 14, label: t('family.expiry.14days') },
                              { value: 30, label: t('family.expiry.30days') },
                            ]}
                            disabled={isCreatingInvite}
                          />
                        </div>
                      </div>
                      <div className="user-profile-form-actions">
                        <button
                          type="submit"
                          className="user-profile-button user-profile-button-primary"
                          disabled={isCreatingInvite}
                        >
                          {isCreatingInvite ? t('family.generatingInvite') : t('family.generateInvite')}
                        </button>
                      </div>
                    </form>

                    {/* Active Invites */}
                    {invites.length > 0 && (
                      <div className="user-profile-invites-list">
                        <h5 className="user-profile-invites-title">{t('family.activeInvites')}</h5>
                        {invites.filter(invite => invite.status === 'PENDING').map((invite) => (
                          <div key={invite.id} className="user-profile-invite-card">
                            <div className="user-profile-invite-info">
                              <div className="user-profile-invite-code">{invite.code}</div>
                              {invite.receiver && (
                                <div className="user-profile-invite-email">{invite.receiver.email}</div>
                              )}
                              <div className="user-profile-invite-expiry">
                                {t('family.expiresOn')}: {new Date(invite.expiresAt).toLocaleDateString()}
                              </div>
                            </div>
                            <button
                              onClick={() => navigator.clipboard.writeText(invite.code)}
                              className="user-profile-button user-profile-button-secondary user-profile-button-sm"
                              title={t('family.copyInviteCode')}
                            >
                              {t('family.copy')}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}; 