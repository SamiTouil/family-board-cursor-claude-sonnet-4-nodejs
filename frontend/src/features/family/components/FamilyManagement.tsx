import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../../contexts/FamilyContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useWebSocket } from '../../../contexts/WebSocketContext';
import { UserAvatar, RoleTag, CustomSelect, Modal, Button } from '../../../components/ui';
import { familyApi } from '../../../services/api';
import { useMessage } from '../../../hooks';
import type { FamilyMember, FamilyJoinRequest, FamilyInvite, UpdateFamilyData, UpdateVirtualMemberData, CreateVirtualMemberData } from '../../../types';
import './FamilyManagement.css';

// Helper function to validate URL
const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

export const FamilyManagement: React.FC = () => {
  const { t } = useTranslation();
  const { currentFamily, refreshFamilies } = useFamily();
  const { user } = useAuth();
  const { socket, on, off } = useWebSocket();

  // State for family members and invites
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [joinRequests, setJoinRequests] = useState<FamilyJoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useMessage();

  // Family editing form state
  const [familyData, setFamilyData] = useState({
    name: currentFamily?.name || '',
    description: currentFamily?.description || '',
    avatarUrl: currentFamily?.avatarUrl || '',
  });
  const [familyErrors, setFamilyErrors] = useState<Record<string, string>>({});

  // Virtual member form state
  const [virtualMemberData, setVirtualMemberData] = useState({
    firstName: '',
    lastName: '',
    avatarUrl: '',
  });
  const [virtualMemberErrors, setVirtualMemberErrors] = useState<Record<string, string>>({});

  // Virtual member editing state
  const [editingVirtualMember, setEditingVirtualMember] = useState<FamilyMember | null>(null);
  const [editVirtualMemberData, setEditVirtualMemberData] = useState({
    firstName: '',
    lastName: '',
    avatarUrl: '',
  });
  const [editVirtualMemberErrors, setEditVirtualMemberErrors] = useState<Record<string, string>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Modal state for forms
  const [isEditFamilyModalOpen, setIsEditFamilyModalOpen] = useState(false);
  const [isAddVirtualMemberModalOpen, setIsAddVirtualMemberModalOpen] = useState(false);

  // Invite creation state
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState(7);

  const isAdmin = currentFamily?.userRole === 'ADMIN';

  // Load family data when component mounts
  useEffect(() => {
    if (currentFamily) {
      loadFamilyData();
    }
  }, [currentFamily]);

  // Update family form data when currentFamily changes
  useEffect(() => {
    if (currentFamily) {
      setFamilyData({
        name: currentFamily.name || '',
        description: currentFamily.description || '',
        avatarUrl: currentFamily.avatarUrl || '',
      });
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
    on('join-request-created', handleJoinRequestCreated);
    on('member-joined', handleMemberJoined);

    // Cleanup event listeners
    return () => {
      off('join-request-created', handleJoinRequestCreated);
      off('member-joined', handleMemberJoined);
    };
  }, [socket, currentFamily, isAdmin, on, off]);

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
      setMessage({ type: 'error', text: t('family.loadError') });
    }
  };

  // Family editing functions
  const validateFamilyForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!familyData.name.trim()) {
      errors['name'] = t('family.validation.nameRequired');
    } else if (familyData.name.trim().length < 2) {
      errors['name'] = t('family.validation.nameMinLength');
    } else if (familyData.name.trim().length > 50) {
      errors['name'] = t('family.validation.nameMaxLength');
    }

    if (familyData.description.trim().length > 500) {
      errors['description'] = t('family.validation.descriptionMaxLength');
    }

    if (familyData.avatarUrl.trim() && !isValidUrl(familyData.avatarUrl.trim())) {
      errors['avatarUrl'] = t('family.validation.invalidAvatarUrl');
    }

    setFamilyErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditFamily = () => {
    setFamilyErrors({});
    setIsEditFamilyModalOpen(true);
  };

  const handleCancelEditFamily = () => {
    setFamilyErrors({});
    setIsEditFamilyModalOpen(false);
    // Reset form data to current family data
    if (currentFamily) {
      setFamilyData({
        name: currentFamily.name || '',
        description: currentFamily.description || '',
        avatarUrl: currentFamily.avatarUrl || '',
      });
    }
  };

  const handleFamilyInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFamilyData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error for this field
    if (familyErrors[name]) {
      setFamilyErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleUpdateFamily = async () => {
    if (!validateFamilyForm() || !currentFamily) return;

    setIsLoading(true);
    try {
      const updateData: UpdateFamilyData = {
        name: familyData.name.trim(),
        ...(familyData.description.trim() && { description: familyData.description.trim() }),
        ...(familyData.avatarUrl.trim() && { avatarUrl: familyData.avatarUrl.trim() }),
      };

      const response = await familyApi.update(currentFamily.id, updateData);
      if (response.data.success) {
        setMessage({ type: 'success', text: t('family.updateSuccess') });
        setIsEditFamilyModalOpen(false);
        await refreshFamilies();
      } else {
        setMessage({ type: 'error', text: response.data.message || t('family.updateError') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('family.updateError') });
    } finally {
      setIsLoading(false);
    }
  };

  // Virtual member functions
  const validateVirtualMemberForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!virtualMemberData.firstName.trim()) {
      errors['firstName'] = t('auth.validation.firstNameRequired');
    }

    if (!virtualMemberData.lastName.trim()) {
      errors['lastName'] = t('auth.validation.lastNameRequired');
    }

    if (virtualMemberData.avatarUrl.trim() && !isValidUrl(virtualMemberData.avatarUrl.trim())) {
      errors['avatarUrl'] = t('user.validation.invalidAvatarUrl');
    }

    setVirtualMemberErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddVirtualMember = () => {
    setVirtualMemberData({
      firstName: '',
      lastName: '',
      avatarUrl: '',
    });
    setVirtualMemberErrors({});
    setIsAddVirtualMemberModalOpen(true);
  };

  const handleCancelAddVirtualMember = () => {
    setVirtualMemberData({
      firstName: '',
      lastName: '',
      avatarUrl: '',
    });
    setVirtualMemberErrors({});
    setIsAddVirtualMemberModalOpen(false);
  };

  const handleVirtualMemberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVirtualMemberData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error for this field
    if (virtualMemberErrors[name]) {
      setVirtualMemberErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleCreateVirtualMember = async () => {
    if (!validateVirtualMemberForm() || !currentFamily) return;

    setIsLoading(true);
    try {
      const createData: CreateVirtualMemberData = {
        firstName: virtualMemberData.firstName.trim(),
        lastName: virtualMemberData.lastName.trim(),
        familyId: currentFamily.id,
        ...(virtualMemberData.avatarUrl.trim() && { avatarUrl: virtualMemberData.avatarUrl.trim() }),
      };

      const response = await familyApi.createVirtualMember(currentFamily.id, createData);
      if (response.data.success) {
        setMessage({ type: 'success', text: t('family.virtualMemberCreated') });
        setIsAddVirtualMemberModalOpen(false);
        setVirtualMemberData({
          firstName: '',
          lastName: '',
          avatarUrl: '',
        });
        await loadFamilyData();
      } else {
        setMessage({ type: 'error', text: response.data.message || t('family.virtualMemberCreateError') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('family.virtualMemberCreateError') });
    } finally {
      setIsLoading(false);
    }
  };

  // Virtual member editing functions
  const handleEditVirtualMember = (member: FamilyMember) => {
    if (!member.user) return;
    
    setEditingVirtualMember(member);
    setEditVirtualMemberData({
      firstName: member.user.firstName || '',
      lastName: member.user.lastName || '',
      avatarUrl: member.user.avatarUrl || '',
    });
    setEditVirtualMemberErrors({});
    setIsEditModalOpen(true);
  };

  const handleCancelEditVirtualMember = () => {
    setEditingVirtualMember(null);
    setEditVirtualMemberData({
      firstName: '',
      lastName: '',
      avatarUrl: '',
    });
    setEditVirtualMemberErrors({});
    setIsEditModalOpen(false);
  };

  const handleEditVirtualMemberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditVirtualMemberData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error for this field
    if (editVirtualMemberErrors[name]) {
      setEditVirtualMemberErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateEditVirtualMemberForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editVirtualMemberData.firstName.trim()) {
      errors['firstName'] = t('auth.validation.firstNameRequired');
    }

    if (!editVirtualMemberData.lastName.trim()) {
      errors['lastName'] = t('auth.validation.lastNameRequired');
    }

    if (editVirtualMemberData.avatarUrl.trim() && !isValidUrl(editVirtualMemberData.avatarUrl.trim())) {
      errors['avatarUrl'] = t('user.validation.invalidAvatarUrl');
    }

    setEditVirtualMemberErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateVirtualMember = async () => {
    if (!validateEditVirtualMemberForm() || !editingVirtualMember?.user?.id || !currentFamily) return;

    setIsLoading(true);
    try {
      const updateData: UpdateVirtualMemberData = {
        firstName: editVirtualMemberData.firstName.trim(),
        lastName: editVirtualMemberData.lastName.trim(),
        ...(editVirtualMemberData.avatarUrl.trim() && { avatarUrl: editVirtualMemberData.avatarUrl.trim() }),
      };

      const response = await familyApi.updateVirtualMember(currentFamily.id, editingVirtualMember.user.id, updateData);
      if (response.data.success) {
        setMessage({ type: 'success', text: t('family.virtualMemberUpdated') });
        setEditingVirtualMember(null);
        setIsEditModalOpen(false);
        await loadFamilyData();
      } else {
        setMessage({ type: 'error', text: response.data.message || t('family.virtualMemberUpdateError') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('family.virtualMemberUpdateError') });
    } finally {
      setIsLoading(false);
    }
  };

  // Member removal function
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(t('family.confirmRemoveMember', { name: memberName }))) {
      return;
    }

    if (!currentFamily) return;

    setIsLoading(true);
    try {
      const response = await familyApi.removeMember(currentFamily.id, memberId);
      if (response.data.success) {
        setMessage({ type: 'success', text: t('family.memberRemoved', { name: memberName }) });
        await loadFamilyData();
      } else {
        setMessage({ type: 'error', text: response.data.message || t('family.removeError') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('family.removeError') });
    } finally {
      setIsLoading(false);
    }
  };

  // Update member role function
  const handleUpdateMemberRole = async (memberId: string, memberName: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    const action = newRole === 'ADMIN' ? t('family.promoteToAdmin') : t('family.demoteToMember');

    if (!confirm(t('family.confirmRoleChange', { name: memberName, action }))) {
      return;
    }

    if (!currentFamily) return;

    setIsLoading(true);
    try {
      const response = await familyApi.updateMemberRole(currentFamily.id, memberId, newRole);
      if (response.data.success) {
        setMessage({ type: 'success', text: t('family.roleUpdated', { name: memberName, role: newRole }) });
        await loadFamilyData();
      } else {
        setMessage({ type: 'error', text: response.data.message || t('family.roleUpdateError') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('family.roleUpdateError') });
    } finally {
      setIsLoading(false);
    }
  };

  // Join request functions
  const handleJoinRequestResponse = async (requestId: string, response: 'APPROVED' | 'REJECTED') => {
    setIsLoading(true);
    try {
      const apiResponse = await familyApi.respondToJoinRequest(requestId, response === 'APPROVED');
      if (apiResponse.data.success) {
        const action = response === 'APPROVED' ? t('family.approved') : t('family.rejected');
        setMessage({ type: 'success', text: t('family.joinRequestProcessed', { action }) });
        await loadFamilyData();
      } else {
        setMessage({ type: 'error', text: apiResponse.data.message || t('family.joinRequestError') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('family.joinRequestError') });
    } finally {
      setIsLoading(false);
    }
  };

  // Invite creation function
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentFamily) return;

    setIsCreatingInvite(true);
    try {
      const inviteData = {
        expiresIn: inviteExpiry,
        ...(inviteEmail.trim() && { receiverEmail: inviteEmail.trim() }),
      };

      const response = await familyApi.createInvite(currentFamily.id, inviteData);

      if (response.data.success) {
        setMessage({ type: 'success', text: t('family.inviteCreated') });
        setInviteEmail('');
        await loadFamilyData();
      } else {
        setMessage({ type: 'error', text: response.data.message || t('family.inviteCreateError') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('family.inviteCreateError') });
    } finally {
      setIsCreatingInvite(false);
    }
  };

  if (!currentFamily) {
    return null;
  }

  const pendingJoinRequestsList = joinRequests.filter(req => req.status === 'PENDING');

  return (
    <div className="family-management">
      <div className="family-management-header">
        <h2 className="family-management-title">{currentFamily.name} Family</h2>
        {isAdmin && (
          <div className="family-management-header-buttons">
            <button
              onClick={handleEditFamily}
              className="family-management-header-button"
              disabled={isLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              {t('family.editButton')}
            </button>
            <button
              onClick={handleAddVirtualMember}
              className="family-management-header-button"
              disabled={isLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <line x1="20" y1="9" x2="20" y2="15"></line>
                <line x1="17" y1="12" x2="23" y2="12"></line>
              </svg>
              {t('family.createVirtualMember')}
            </button>
          </div>
        )}
      </div>
      
      <div className="family-management-content">
        {/* Content starts here */}
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className={`family-management-message family-management-message-${message.type}`}>
          {message.text}
        </div>
      )}



      {/* Family Members */}
      <div className="family-management-subsection">



        <div className="family-management-members-list">
          {members.map((member) => {
            const isCurrentUser = member.userId === user?.id;
            const memberName = `${member.user?.firstName} ${member.user?.lastName}`;
            
            return (
              <React.Fragment key={member.id}>
                <div className="family-management-member">
                  <div className="family-management-member-info">
                    <div className="family-management-member-avatar">
                      {member.user?.avatarUrl ? (
                        <img 
                          src={member.user.avatarUrl} 
                          alt={memberName}
                          className="family-management-avatar-img"
                        />
                      ) : (
                        <div className="family-management-avatar-placeholder">
                          {member.user?.firstName?.[0]}{member.user?.lastName?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="family-management-member-details">
                      <div className="family-management-member-name">
                        {memberName}
                        {isCurrentUser && ` (${t('family.you')})`}
                        <RoleTag 
                          role={member.user?.isVirtual ? 'VIRTUAL' : member.role} 
                        />
                      </div>
                      {member.user?.email && (
                        <div className="family-management-member-email">
                          {member.user.email}
                        </div>
                      )}
                    </div>
                  </div>

                  {isAdmin && !isCurrentUser && (
                    <div className="family-management-member-actions">
                      {member.user?.isVirtual && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditVirtualMember(member)}
                          disabled={isLoading}
                          title={t('family.editVirtualMember')}
                        >
                          {t('common.edit')}
                        </Button>
                      )}
                      {!member.user?.isVirtual && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleUpdateMemberRole(member.id, memberName, member.role)}
                          disabled={isLoading}
                          title={member.role === 'ADMIN' ? t('family.demoteToMember') : t('family.promoteToAdmin')}
                        >
                          {member.role === 'ADMIN' ? t('family.demote') : t('family.promote')}
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id, memberName)}
                        disabled={isLoading}
                        title={t('family.removeMember')}
                      >
                        {t('family.remove')}
                      </Button>
                    </div>
                  )}
                </div>


              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Admin-only sections */}
      {isAdmin && (
        <>
          {/* Pending Join Requests */}
          {pendingJoinRequestsList.length > 0 && (
            <div className="family-management-subsection">
              <h4 className="family-management-subsection-title">
                {t('family.joinRequests')} 
                <span className="family-management-count-badge">{pendingJoinRequestsList.length}</span>
              </h4>
              <div className="family-management-requests-list">
                {pendingJoinRequestsList.map((request) => (
                  <div key={request.id} className="family-management-request-card">
                    <UserAvatar
                      firstName={request.user.firstName || ''}
                      lastName={request.user.lastName || ''}
                      avatarUrl={request.user.avatarUrl || null}
                      size="medium"
                    />
                    <div className="family-management-request-info">
                      <div className="family-management-request-name">
                        {request.user.firstName} {request.user.lastName}
                      </div>
                      <div className="family-management-request-email">{request.user.email}</div>
                      {request.message && (
                        <div className="family-management-request-message">"{request.message}"</div>
                      )}
                      <div className="family-management-request-date">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="family-management-request-actions">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleJoinRequestResponse(request.id, 'APPROVED')}
                      >
                        {t('family.approve')}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleJoinRequestResponse(request.id, 'REJECTED')}
                      >
                        {t('family.reject')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate Invite */}
          <div className="family-management-subsection">
            <h4 className="family-management-subsection-title">{t('family.generateInvite')}</h4>
            <form onSubmit={handleCreateInvite} className="family-management-invite-form">
              <div className="family-management-form-row">
                <div className="family-management-form-group">
                  <label htmlFor="inviteEmail" className="family-management-label">
                    {t('family.inviteEmail')} ({t('common.optional')})
                  </label>
                  <input
                    type="email"
                    id="inviteEmail"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="family-management-input"
                    placeholder={t('family.inviteEmailPlaceholder')}
                    disabled={isCreatingInvite}
                  />
                </div>
                <div className="family-management-form-group">
                  <label htmlFor="inviteExpiry" className="family-management-label">
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
              <div className="family-management-form-actions">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isCreatingInvite}
                  loading={isCreatingInvite}
                >
                  {t('family.generateInvite')}
                </Button>
              </div>
            </form>

            {/* Active Invites */}
            {invites.length > 0 && (
              <div className="family-management-invites-list">
                <h5 className="family-management-invites-title">{t('family.activeInvites')}</h5>
                {invites.filter(invite => invite.status === 'PENDING').map((invite) => (
                  <div key={invite.id} className="family-management-invite-card">
                    <div className="family-management-invite-info">
                      <div className="family-management-invite-code">{invite.code}</div>
                      {invite.receiver && (
                        <div className="family-management-invite-email">{invite.receiver.email}</div>
                      )}
                      <div className="family-management-invite-expiry">
                        {t('family.expiresOn')}: {new Date(invite.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(invite.code)}
                      title={t('family.copyInviteCode')}
                    >
                      {t('family.copy')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Family Modal */}
      <Modal
        title={t('family.edit.title')}
        isOpen={isEditFamilyModalOpen}
        onClose={handleCancelEditFamily}
        onApply={handleUpdateFamily}
        variant="standard"
      >
        <div className="family-management-modal-content">
          <p className="family-management-help-text">{t('family.edit.subtitle')}</p>
          <div className="family-management-form-group">
            <label htmlFor="familyName" className="family-management-label">
              {t('family.name')}
            </label>
            <input
              type="text"
              id="familyName"
              name="name"
              value={familyData.name}
              onChange={handleFamilyInputChange}
              className={`family-management-input ${familyErrors['name'] ? 'family-management-input-error' : ''}`}
              placeholder={t('family.create.namePlaceholder')}
              disabled={isLoading}
              autoFocus
            />
            {familyErrors['name'] && (
              <span className="family-management-error">{familyErrors['name']}</span>
            )}
          </div>

          <div className="family-management-form-group">
            <label htmlFor="familyDescription" className="family-management-label">
              {t('family.description')} ({t('common.optional')})
            </label>
            <textarea
              id="familyDescription"
              name="description"
              value={familyData.description}
              onChange={handleFamilyInputChange}
              className={`family-management-input ${familyErrors['description'] ? 'family-management-input-error' : ''}`}
              placeholder={t('family.create.descriptionPlaceholder')}
              rows={3}
              disabled={isLoading}
            />
            {familyErrors['description'] && (
              <span className="family-management-error">{familyErrors['description']}</span>
            )}
          </div>

          <div className="family-management-form-group">
            <label htmlFor="familyAvatarUrl" className="family-management-label">
              {t('family.avatar')} ({t('common.optional')})
            </label>
            <input
              type="url"
              id="familyAvatarUrl"
              name="avatarUrl"
              value={familyData.avatarUrl}
              onChange={handleFamilyInputChange}
              className={`family-management-input ${familyErrors['avatarUrl'] ? 'family-management-input-error' : ''}`}
              placeholder="https://example.com/family-avatar.jpg"
              disabled={isLoading}
            />
            {familyErrors['avatarUrl'] && (
              <span className="family-management-error">{familyErrors['avatarUrl']}</span>
            )}
          </div>
        </div>
      </Modal>

      {/* Add Virtual Member Modal */}
      <Modal
        title={t('family.createVirtualMember')}
        isOpen={isAddVirtualMemberModalOpen}
        onClose={handleCancelAddVirtualMember}
        onApply={handleCreateVirtualMember}
        variant="standard"
      >
        <div className="family-management-modal-content">
          <div className="family-management-form-row">
            <div className="family-management-form-group">
              <label htmlFor="virtualFirstName" className="family-management-label">
                {t('user.firstName')}
              </label>
              <input
                type="text"
                id="virtualFirstName"
                name="firstName"
                value={virtualMemberData.firstName}
                onChange={handleVirtualMemberInputChange}
                className={`family-management-input ${virtualMemberErrors['firstName'] ? 'family-management-input-error' : ''}`}
                disabled={isLoading}
                autoFocus
              />
              {virtualMemberErrors['firstName'] && (
                <span className="family-management-error">{virtualMemberErrors['firstName']}</span>
              )}
            </div>

            <div className="family-management-form-group">
              <label htmlFor="virtualLastName" className="family-management-label">
                {t('user.lastName')}
              </label>
              <input
                type="text"
                id="virtualLastName"
                name="lastName"
                value={virtualMemberData.lastName}
                onChange={handleVirtualMemberInputChange}
                className={`family-management-input ${virtualMemberErrors['lastName'] ? 'family-management-input-error' : ''}`}
                disabled={isLoading}
              />
              {virtualMemberErrors['lastName'] && (
                <span className="family-management-error">{virtualMemberErrors['lastName']}</span>
              )}
            </div>
          </div>

          <div className="family-management-form-group">
            <label htmlFor="virtualAvatarUrl" className="family-management-label">
              {t('user.avatar')} URL ({t('common.optional')})
            </label>
            <input
              type="url"
              id="virtualAvatarUrl"
              name="avatarUrl"
              value={virtualMemberData.avatarUrl}
              onChange={handleVirtualMemberInputChange}
              className={`family-management-input ${virtualMemberErrors['avatarUrl'] ? 'family-management-input-error' : ''}`}
              placeholder="https://example.com/avatar.jpg"
              disabled={isLoading}
            />
            {virtualMemberErrors['avatarUrl'] && (
              <span className="family-management-error">{virtualMemberErrors['avatarUrl']}</span>
            )}
          </div>
        </div>
      </Modal>

      {/* Edit Virtual Member Modal */}
      <Modal
        title={t('family.editVirtualMember')}
        isOpen={isEditModalOpen}
        onClose={handleCancelEditVirtualMember}
        onApply={handleUpdateVirtualMember}
        variant="standard"
      >
        <div className="family-management-modal-content">
          <div className="family-management-form-row">
            <div className="family-management-form-group">
              <label htmlFor="editVirtualFirstName" className="family-management-label">
                {t('user.firstName')}
              </label>
              <input
                type="text"
                id="editVirtualFirstName"
                name="firstName"
                value={editVirtualMemberData.firstName}
                onChange={handleEditVirtualMemberInputChange}
                className={`family-management-input ${editVirtualMemberErrors['firstName'] ? 'family-management-input-error' : ''}`}
                disabled={isLoading}
                autoFocus
              />
              {editVirtualMemberErrors['firstName'] && (
                <span className="family-management-error">{editVirtualMemberErrors['firstName']}</span>
              )}
            </div>

            <div className="family-management-form-group">
              <label htmlFor="editVirtualLastName" className="family-management-label">
                {t('user.lastName')}
              </label>
              <input
                type="text"
                id="editVirtualLastName"
                name="lastName"
                value={editVirtualMemberData.lastName}
                onChange={handleEditVirtualMemberInputChange}
                className={`family-management-input ${editVirtualMemberErrors['lastName'] ? 'family-management-input-error' : ''}`}
                disabled={isLoading}
              />
              {editVirtualMemberErrors['lastName'] && (
                <span className="family-management-error">{editVirtualMemberErrors['lastName']}</span>
              )}
            </div>
          </div>

          <div className="family-management-form-group">
            <label htmlFor="editVirtualAvatarUrl" className="family-management-label">
              {t('user.avatar')} URL ({t('common.optional')})
            </label>
            <input
              type="url"
              id="editVirtualAvatarUrl"
              name="avatarUrl"
              value={editVirtualMemberData.avatarUrl}
              onChange={handleEditVirtualMemberInputChange}
              className={`family-management-input ${editVirtualMemberErrors['avatarUrl'] ? 'family-management-input-error' : ''}`}
              placeholder="https://example.com/avatar.jpg"
              disabled={isLoading}
            />
            {editVirtualMemberErrors['avatarUrl'] && (
              <span className="family-management-error">{editVirtualMemberErrors['avatarUrl']}</span>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
