import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { UserAvatar } from './UserAvatar';
import { RoleTag } from './RoleTag';
import { CustomSelect } from './CustomSelect';
import { familyApi, FamilyMember, FamilyJoinRequest, FamilyInvite, UpdateFamilyData, UpdateVirtualMemberData, CreateVirtualMemberData } from '../services/api';
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Family editing form state
  const [familyData, setFamilyData] = useState({
    name: currentFamily?.name || '',
    description: currentFamily?.description || '',
    avatarUrl: currentFamily?.avatarUrl || '',
  });
  const [familyErrors, setFamilyErrors] = useState<Record<string, string>>({});
  const [editingFamily, setEditingFamily] = useState(false);

  // Virtual member form state
  const [virtualMemberData, setVirtualMemberData] = useState({
    firstName: '',
    lastName: '',
    avatarUrl: '',
  });
  const [virtualMemberErrors, setVirtualMemberErrors] = useState<Record<string, string>>({});
  const [addingVirtualMember, setAddingVirtualMember] = useState(false);

  // Virtual member editing state
  const [editingVirtualMember, setEditingVirtualMember] = useState<string | null>(null);
  const [editVirtualMemberData, setEditVirtualMemberData] = useState({
    firstName: '',
    lastName: '',
    avatarUrl: '',
  });
  const [editVirtualMemberErrors, setEditVirtualMemberErrors] = useState<Record<string, string>>({});

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
    setEditingFamily(true);
    setFamilyErrors({});
  };

  const handleCancelEditFamily = () => {
    setEditingFamily(false);
    setFamilyErrors({});
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

  const handleUpdateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        setEditingFamily(false);
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
    setAddingVirtualMember(true);
    setVirtualMemberData({
      firstName: '',
      lastName: '',
      avatarUrl: '',
    });
    setVirtualMemberErrors({});
  };

  const handleCancelAddVirtualMember = () => {
    setAddingVirtualMember(false);
    setVirtualMemberData({
      firstName: '',
      lastName: '',
      avatarUrl: '',
    });
    setVirtualMemberErrors({});
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

  const handleCreateVirtualMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        setAddingVirtualMember(false);
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
    
    setEditingVirtualMember(member.user.id);
    setEditVirtualMemberData({
      firstName: member.user.firstName || '',
      lastName: member.user.lastName || '',
      avatarUrl: member.user.avatarUrl || '',
    });
    setEditVirtualMemberErrors({});
  };

  const handleCancelEditVirtualMember = () => {
    setEditingVirtualMember(null);
    setEditVirtualMemberData({
      firstName: '',
      lastName: '',
      avatarUrl: '',
    });
    setEditVirtualMemberErrors({});
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

  const handleUpdateVirtualMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEditVirtualMemberForm() || !editingVirtualMember || !currentFamily) return;

    setIsLoading(true);
    try {
      const updateData: UpdateVirtualMemberData = {
        firstName: editVirtualMemberData.firstName.trim(),
        lastName: editVirtualMemberData.lastName.trim(),
        ...(editVirtualMemberData.avatarUrl.trim() && { avatarUrl: editVirtualMemberData.avatarUrl.trim() }),
      };

      const response = await familyApi.updateVirtualMember(currentFamily.id, editingVirtualMember, updateData);
      if (response.data.success) {
        setMessage({ type: 'success', text: t('family.virtualMemberUpdated') });
        setEditingVirtualMember(null);
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

  // Join request functions
  const handleJoinRequestResponse = async (requestId: string, response: 'APPROVED' | 'REJECTED') => {
    setIsLoading(true);
    try {
      const apiResponse = await familyApi.respondToJoinRequest(requestId, response);
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
        <div className="family-management-avatar">
          <UserAvatar
            firstName={currentFamily.name}
            lastName=""
            avatarUrl={currentFamily.avatarUrl || null}
            size="large"
          />
        </div>
        <h2 className="family-management-title">{currentFamily.name} Family</h2>
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

      {/* Inline Family Edit Form */}
      {isAdmin && editingFamily && (
        <div className="family-management-edit-inline">
          <h4 className="family-management-form-title">{t('family.edit.title')}</h4>
          <p className="family-management-help-text">{t('family.edit.subtitle')}</p>
          <form onSubmit={handleUpdateFamily} className="family-management-form">
            <div className="family-management-form-group">
              <label htmlFor="familyNameInline" className="family-management-label">
                {t('family.name')}
              </label>
              <input
                type="text"
                id="familyNameInline"
                name="name"
                value={familyData.name}
                onChange={handleFamilyInputChange}
                className={`family-management-input ${familyErrors['name'] ? 'family-management-input-error' : ''}`}
                placeholder={t('family.create.namePlaceholder')}
                disabled={isLoading}
              />
              {familyErrors['name'] && (
                <span className="family-management-error">{familyErrors['name']}</span>
              )}
            </div>

            <div className="family-management-form-group">
              <label htmlFor="familyDescriptionInline" className="family-management-label">
                {t('family.description')} ({t('common.optional')})
              </label>
              <textarea
                id="familyDescriptionInline"
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
              <label htmlFor="familyAvatarUrlInline" className="family-management-label">
                {t('family.avatar')} ({t('common.optional')})
              </label>
              <input
                type="url"
                id="familyAvatarUrlInline"
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

            <div className="family-management-form-actions">
              <button
                type="submit"
                className="family-management-button family-management-button-primary"
                disabled={isLoading}
              >
                {isLoading ? t('family.edit.updating') : t('common.save')}
              </button>
              <button
                type="button"
                onClick={handleCancelEditFamily}
                className="family-management-button family-management-button-secondary"
                disabled={isLoading}
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Family Members */}
      <div className="family-management-subsection">
        <div className="family-management-subsection-header">
          <h4 className="family-management-subsection-title">{t('family.members')}</h4>
          {isAdmin && (
            <div className="family-management-button-group">
              <button
                onClick={editingFamily ? handleCancelEditFamily : handleEditFamily}
                className="family-management-button family-management-button-secondary family-management-button-sm"
                disabled={isLoading}
              >
                {editingFamily ? t('common.cancel') : t('family.editButton')}
              </button>
              <button
                onClick={addingVirtualMember ? handleCancelAddVirtualMember : handleAddVirtualMember}
                className="family-management-button family-management-button-secondary family-management-button-sm"
                disabled={isLoading}
              >
                {addingVirtualMember ? t('common.cancel') : t('family.createVirtualMember')}
              </button>
            </div>
          )}
        </div>

        {/* Virtual Member Creation Form - Inline */}
        {isAdmin && addingVirtualMember && (
          <div className="family-management-virtual-member-add-inline">
            <h5 className="family-management-form-title">{t('family.createVirtualMember')}</h5>
            <form onSubmit={handleCreateVirtualMember} className="family-management-form">
              <div className="family-management-form-row">
                <div className="family-management-form-group">
                  <label htmlFor="virtualFirstNameInline" className="family-management-label">
                    {t('user.firstName')}
                  </label>
                  <input
                    type="text"
                    id="virtualFirstNameInline"
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
                  <label htmlFor="virtualLastNameInline" className="family-management-label">
                    {t('user.lastName')}
                  </label>
                  <input
                    type="text"
                    id="virtualLastNameInline"
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
                <label htmlFor="virtualAvatarUrlInline" className="family-management-label">
                  {t('user.avatar')} URL ({t('common.optional')})
                </label>
                <input
                  type="url"
                  id="virtualAvatarUrlInline"
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

              <div className="family-management-form-actions">
                <button
                  type="button"
                  onClick={handleCancelAddVirtualMember}
                  className="family-management-button family-management-button-secondary"
                  disabled={isLoading}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="family-management-button family-management-button-primary"
                  disabled={isLoading}
                >
                  {isLoading ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        )}

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
                        <button
                          onClick={() => handleEditVirtualMember(member)}
                          className="family-management-button family-management-button-secondary family-management-button-sm"
                          disabled={isLoading}
                          title={t('family.editVirtualMember')}
                        >
                          {t('common.edit')}
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveMember(member.id, memberName)}
                        className="family-management-button family-management-button-danger family-management-button-sm"
                        disabled={isLoading}
                        title={t('family.removeMember')}
                      >
                        {t('family.remove')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Virtual Member Edit Form - Appears right below the member being edited */}
                {isAdmin && member.user?.isVirtual && editingVirtualMember === member.user.id && (
                  <div className="family-management-virtual-member-edit-inline">
                    <h5 className="family-management-form-title">{t('family.editVirtualMember')}</h5>
                    <form onSubmit={handleUpdateVirtualMember} className="family-management-form">
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

                      <div className="family-management-form-actions">
                        <button
                          type="submit"
                          className="family-management-button family-management-button-primary"
                          disabled={isLoading}
                        >
                          {isLoading ? t('common.loading') : t('common.save')}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditVirtualMember}
                          className="family-management-button family-management-button-secondary"
                          disabled={isLoading}
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
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
                      <button
                        onClick={() => handleJoinRequestResponse(request.id, 'APPROVED')}
                        className="family-management-button family-management-button-success family-management-button-sm"
                      >
                        {t('family.approve')}
                      </button>
                      <button
                        onClick={() => handleJoinRequestResponse(request.id, 'REJECTED')}
                        className="family-management-button family-management-button-danger family-management-button-sm"
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
                <button
                  type="submit"
                  className="family-management-button family-management-button-primary"
                  disabled={isCreatingInvite}
                >
                  {isCreatingInvite ? t('family.generatingInvite') : t('family.generateInvite')}
                </button>
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
                    <button
                      onClick={() => navigator.clipboard.writeText(invite.code)}
                      className="family-management-button family-management-button-secondary family-management-button-sm"
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
    </div>
  );
};
