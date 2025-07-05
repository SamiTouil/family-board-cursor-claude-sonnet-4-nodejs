import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  Modal,
  RefreshControl,
} from 'react-native';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
import { familyApi } from '../services/api';
import { UserAvatar, Button, LoadingSpinner } from '../components/ui';
import type { FamilyMember, FamilyJoinRequest, FamilyInvite } from '../types';

interface MessageState {
  type: 'success' | 'error';
  text: string;
}

export const FamilyScreen: React.FC = () => {
  const { currentFamily, refreshFamilies } = useFamily();
  const { user } = useAuth();

  // State for family data
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [joinRequests, setJoinRequests] = useState<FamilyJoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [messageTimeout, setMessageTimeout] = useState<NodeJS.Timeout | null>(null);

  // Modal states
  const [isEditFamilyModalOpen, setIsEditFamilyModalOpen] = useState(false);
  const [isAddVirtualMemberModalOpen, setIsAddVirtualMemberModalOpen] = useState(false);
  const [isEditVirtualMemberModalOpen, setIsEditVirtualMemberModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Form states
  const [familyData, setFamilyData] = useState({
    name: currentFamily?.name || '',
    description: currentFamily?.description || '',
    avatarUrl: currentFamily?.avatarUrl || '',
  });

  const [virtualMemberData, setVirtualMemberData] = useState({
    firstName: '',
    lastName: '',
    avatarUrl: '',
  });

  const [editingVirtualMember, setEditingVirtualMember] = useState<FamilyMember | null>(null);
  const [editVirtualMemberData, setEditVirtualMemberData] = useState({
    firstName: '',
    lastName: '',
    avatarUrl: '',
  });

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState(7);

  const isAdmin = currentFamily?.userRole === 'ADMIN';

  // Helper function to set message with auto-dismiss
  const setMessageWithAutoDismiss = (newMessage: MessageState | null) => {
    if (messageTimeout) {
      clearTimeout(messageTimeout);
      setMessageTimeout(null);
    }

    setMessage(newMessage);

    if (newMessage) {
      const timeout = setTimeout(() => {
        setMessage(null);
        setMessageTimeout(null);
      }, newMessage.type === 'success' ? 3000 : 5000);
      setMessageTimeout(timeout);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (messageTimeout) {
        clearTimeout(messageTimeout);
      }
    };
  }, [messageTimeout]);

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

  const loadFamilyData = async () => {
    if (!currentFamily) return;

    setIsLoading(true);
    try {
      // Always load members
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
      setMessageWithAutoDismiss({ type: 'error', text: 'Failed to load family data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadFamilyData();
    setIsRefreshing(false);
  };

  // Family editing functions
  const handleEditFamily = () => {
    setIsEditFamilyModalOpen(true);
  };

  const handleUpdateFamily = async () => {
    if (!currentFamily || !familyData.name.trim()) {
      Alert.alert('Error', 'Family name is required');
      return;
    }

    setIsLoading(true);
    try {
      const updateData = {
        name: familyData.name.trim(),
        ...(familyData.description.trim() && { description: familyData.description.trim() }),
        ...(familyData.avatarUrl.trim() && { avatarUrl: familyData.avatarUrl.trim() }),
      };

      const response = await familyApi.update(currentFamily.id, updateData);
      if (response.data.success) {
        setMessageWithAutoDismiss({ type: 'success', text: 'Family updated successfully' });
        setIsEditFamilyModalOpen(false);
        await refreshFamilies();
      } else {
        setMessageWithAutoDismiss({ type: 'error', text: response.data.message || 'Failed to update family' });
      }
    } catch (error) {
      setMessageWithAutoDismiss({ type: 'error', text: 'Failed to update family' });
    } finally {
      setIsLoading(false);
    }
  };

  // Virtual member functions
  const handleAddVirtualMember = () => {
    setVirtualMemberData({ firstName: '', lastName: '', avatarUrl: '' });
    setIsAddVirtualMemberModalOpen(true);
  };

  const handleCreateVirtualMember = async () => {
    if (!currentFamily || !virtualMemberData.firstName.trim() || !virtualMemberData.lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    setIsLoading(true);
    try {
      const createData = {
        firstName: virtualMemberData.firstName.trim(),
        lastName: virtualMemberData.lastName.trim(),
        familyId: currentFamily.id,
        ...(virtualMemberData.avatarUrl.trim() && { avatarUrl: virtualMemberData.avatarUrl.trim() }),
      };

      const response = await familyApi.createVirtualMember(currentFamily.id, createData);
      if (response.data.success) {
        setMessageWithAutoDismiss({ type: 'success', text: 'Virtual member created successfully' });
        setIsAddVirtualMemberModalOpen(false);
        await loadFamilyData();
      } else {
        setMessageWithAutoDismiss({ type: 'error', text: response.data.message || 'Failed to create virtual member' });
      }
    } catch (error) {
      setMessageWithAutoDismiss({ type: 'error', text: 'Failed to create virtual member' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditVirtualMember = (member: FamilyMember) => {
    if (!member.user) return;
    
    setEditingVirtualMember(member);
    setEditVirtualMemberData({
      firstName: member.user.firstName || '',
      lastName: member.user.lastName || '',
      avatarUrl: member.user.avatarUrl || '',
    });
    setIsEditVirtualMemberModalOpen(true);
  };

  const handleUpdateVirtualMember = async () => {
    if (!editingVirtualMember?.user?.id || !currentFamily || !editVirtualMemberData.firstName.trim() || !editVirtualMemberData.lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    setIsLoading(true);
    try {
      const updateData = {
        firstName: editVirtualMemberData.firstName.trim(),
        lastName: editVirtualMemberData.lastName.trim(),
        ...(editVirtualMemberData.avatarUrl.trim() && { avatarUrl: editVirtualMemberData.avatarUrl.trim() }),
      };

      const response = await familyApi.updateVirtualMember(currentFamily.id, editingVirtualMember.user.id, updateData);
      if (response.data.success) {
        setMessageWithAutoDismiss({ type: 'success', text: 'Virtual member updated successfully' });
        setIsEditVirtualMemberModalOpen(false);
        setEditingVirtualMember(null);
        await loadFamilyData();
      } else {
        setMessageWithAutoDismiss({ type: 'error', text: response.data.message || 'Failed to update virtual member' });
      }
    } catch (error) {
      setMessageWithAutoDismiss({ type: 'error', text: 'Failed to update virtual member' });
    } finally {
      setIsLoading(false);
    }
  };

  // Member removal function
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from the family?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!currentFamily) return;

            setIsLoading(true);
            try {
              const response = await familyApi.removeMember(currentFamily.id, memberId);
              if (response.data.success) {
                setMessageWithAutoDismiss({ type: 'success', text: `${memberName} removed successfully` });
                await loadFamilyData();
              } else {
                setMessageWithAutoDismiss({ type: 'error', text: response.data.message || 'Failed to remove member' });
              }
            } catch (error) {
              setMessageWithAutoDismiss({ type: 'error', text: 'Failed to remove member' });
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // Join request functions
  const handleJoinRequestResponse = async (requestId: string, response: 'APPROVED' | 'REJECTED') => {
    setIsLoading(true);
    try {
      const apiResponse = await familyApi.respondToJoinRequest(requestId, response === 'APPROVED');
      if (apiResponse.data.success) {
        const action = response === 'APPROVED' ? 'approved' : 'rejected';
        setMessageWithAutoDismiss({ type: 'success', text: `Join request ${action} successfully` });
        await loadFamilyData();
      } else {
        setMessageWithAutoDismiss({ type: 'error', text: apiResponse.data.message || 'Failed to process join request' });
      }
    } catch (error) {
      setMessageWithAutoDismiss({ type: 'error', text: 'Failed to process join request' });
    } finally {
      setIsLoading(false);
    }
  };

  // Invite creation function
  const handleCreateInvite = async () => {
    if (!currentFamily) return;

    setIsLoading(true);
    try {
      const inviteData = {
        expiresIn: inviteExpiry,
        ...(inviteEmail.trim() && { receiverEmail: inviteEmail.trim() }),
      };

      const response = await familyApi.createInvite(currentFamily.id, inviteData);

      if (response.data.success) {
        setMessageWithAutoDismiss({ type: 'success', text: 'Invite created successfully' });
        setInviteEmail('');
        setIsInviteModalOpen(false);
        await loadFamilyData();
      } else {
        setMessageWithAutoDismiss({ type: 'error', text: response.data.message || 'Failed to create invite' });
      }
    } catch (error) {
      setMessageWithAutoDismiss({ type: 'error', text: 'Failed to create invite' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderMemberCard = (member: FamilyMember) => {
    const isCurrentUser = member.userId === user?.id;
    const memberName = `${member.user?.firstName} ${member.user?.lastName}`;
    
    return (
      <View key={member.id} style={styles.memberCard}>
        <View style={styles.memberInfo}>
          <UserAvatar
            firstName={member.user?.firstName || ''}
            lastName={member.user?.lastName || ''}
            avatarUrl={member.user?.avatarUrl}
            size="medium"
          />
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>
              {memberName}
              {isCurrentUser && ' (You)'}
            </Text>
            {member.user?.email && (
              <Text style={styles.memberEmail}>{member.user.email}</Text>
            )}
            <View style={styles.memberRole}>
              <Text style={[
                styles.roleTag,
                member.user?.isVirtual ? styles.roleVirtual : 
                member.role === 'ADMIN' ? styles.roleAdmin : styles.roleMember
              ]}>
                {member.user?.isVirtual ? 'Virtual' : member.role}
              </Text>
            </View>
          </View>
        </View>

        {isAdmin && !isCurrentUser && (
          <View style={styles.memberActions}>
            {member.user?.isVirtual && (
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => handleEditVirtualMember(member)}
                disabled={isLoading}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.removeButton]}
              onPress={() => handleRemoveMember(member.id, memberName)}
              disabled={isLoading}
            >
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderJoinRequestCard = (request: FamilyJoinRequest) => (
    <View key={request.id} style={styles.requestCard}>
      <View style={styles.requestInfo}>
        <UserAvatar
          firstName={request.user.firstName || ''}
          lastName={request.user.lastName || ''}
          avatarUrl={request.user.avatarUrl}
          size="medium"
        />
        <View style={styles.requestDetails}>
          <Text style={styles.requestName}>
            {request.user.firstName} {request.user.lastName}
          </Text>
          <Text style={styles.requestEmail}>{request.user.email}</Text>
          {request.message && (
            <Text style={styles.requestMessage}>"{request.message}"</Text>
          )}
          <Text style={styles.requestDate}>
            {new Date(request.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleJoinRequestResponse(request.id, 'APPROVED')}
          disabled={isLoading}
        >
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleJoinRequestResponse(request.id, 'REJECTED')}
          disabled={isLoading}
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInviteCard = (invite: FamilyInvite) => (
    <View key={invite.id} style={styles.inviteCard}>
      <View style={styles.inviteInfo}>
        <Text style={styles.inviteCode}>{invite.code}</Text>
        {invite.receiver && (
          <Text style={styles.inviteEmail}>{invite.receiver.email}</Text>
        )}
        <Text style={styles.inviteExpiry}>
          Expires: {new Date(invite.expiresAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.actionButton, styles.copyButton]}
        onPress={() => {
          // Note: Clipboard API would need to be imported for React Native
          Alert.alert('Invite Code', invite.code);
        }}
      >
        <Text style={styles.copyButtonText}>Copy</Text>
      </TouchableOpacity>
    </View>
  );

  if (!currentFamily) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No family selected</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pendingJoinRequests = joinRequests.filter(req => req.status === 'PENDING');
  const activeInvites = invites.filter(invite => invite.status === 'PENDING');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <UserAvatar
          firstName={currentFamily.name}
          lastName=""
          avatarUrl={currentFamily.avatarUrl}
          size="large"
        />
        <Text style={styles.headerTitle}>{currentFamily.name}</Text>
        {isAdmin && (
          <TouchableOpacity
            style={styles.editFamilyButton}
            onPress={handleEditFamily}
          >
            <Text style={styles.editFamilyButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      {message && (
        <View style={[styles.message, styles[`message${message.type}`]]}>
          <Text style={styles.messageText}>{message.text}</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Family Members */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Family Members</Text>
            {isAdmin && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddVirtualMember}
              >
                <Text style={styles.addButtonText}>+ Add Virtual</Text>
              </TouchableOpacity>
            )}
          </View>
          {members.map(renderMemberCard)}
        </View>

        {/* Admin-only sections */}
        {isAdmin && (
          <>
            {/* Pending Join Requests */}
            {pendingJoinRequests.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Join Requests ({pendingJoinRequests.length})
                  </Text>
                </View>
                {pendingJoinRequests.map(renderJoinRequestCard)}
              </View>
            )}

            {/* Invites */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Invites</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setIsInviteModalOpen(true)}
                >
                  <Text style={styles.addButtonText}>+ Generate</Text>
                </TouchableOpacity>
              </View>
              {activeInvites.length > 0 ? (
                activeInvites.map(renderInviteCard)
              ) : (
                <Text style={styles.emptyText}>No active invites</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Edit Family Modal */}
      <Modal
        visible={isEditFamilyModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditFamilyModalOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditFamilyModalOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Family</Text>
            <TouchableOpacity onPress={handleUpdateFamily} disabled={isLoading}>
              <Text style={[styles.modalSaveText, isLoading && styles.disabledText]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Family Name</Text>
              <TextInput
                style={styles.input}
                value={familyData.name}
                onChangeText={(text) => setFamilyData(prev => ({ ...prev, name: text }))}
                placeholder="Enter family name"
                editable={!isLoading}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={familyData.description}
                onChangeText={(text) => setFamilyData(prev => ({ ...prev, description: text }))}
                placeholder="Enter family description"
                multiline
                numberOfLines={3}
                editable={!isLoading}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Avatar URL (Optional)</Text>
              <TextInput
                style={styles.input}
                value={familyData.avatarUrl}
                onChangeText={(text) => setFamilyData(prev => ({ ...prev, avatarUrl: text }))}
                placeholder="https://example.com/avatar.jpg"
                editable={!isLoading}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Virtual Member Modal */}
      <Modal
        visible={isAddVirtualMemberModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAddVirtualMemberModalOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsAddVirtualMemberModalOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Virtual Member</Text>
            <TouchableOpacity onPress={handleCreateVirtualMember} disabled={isLoading}>
              <Text style={[styles.modalSaveText, isLoading && styles.disabledText]}>
                Add
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={virtualMemberData.firstName}
                onChangeText={(text) => setVirtualMemberData(prev => ({ ...prev, firstName: text }))}
                placeholder="Enter first name"
                editable={!isLoading}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={virtualMemberData.lastName}
                onChangeText={(text) => setVirtualMemberData(prev => ({ ...prev, lastName: text }))}
                placeholder="Enter last name"
                editable={!isLoading}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Avatar URL (Optional)</Text>
              <TextInput
                style={styles.input}
                value={virtualMemberData.avatarUrl}
                onChangeText={(text) => setVirtualMemberData(prev => ({ ...prev, avatarUrl: text }))}
                placeholder="https://example.com/avatar.jpg"
                editable={!isLoading}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Virtual Member Modal */}
      <Modal
        visible={isEditVirtualMemberModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditVirtualMemberModalOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditVirtualMemberModalOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Virtual Member</Text>
            <TouchableOpacity onPress={handleUpdateVirtualMember} disabled={isLoading}>
              <Text style={[styles.modalSaveText, isLoading && styles.disabledText]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={editVirtualMemberData.firstName}
                onChangeText={(text) => setEditVirtualMemberData(prev => ({ ...prev, firstName: text }))}
                placeholder="Enter first name"
                editable={!isLoading}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={editVirtualMemberData.lastName}
                onChangeText={(text) => setEditVirtualMemberData(prev => ({ ...prev, lastName: text }))}
                placeholder="Enter last name"
                editable={!isLoading}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Avatar URL (Optional)</Text>
              <TextInput
                style={styles.input}
                value={editVirtualMemberData.avatarUrl}
                onChangeText={(text) => setEditVirtualMemberData(prev => ({ ...prev, avatarUrl: text }))}
                placeholder="https://example.com/avatar.jpg"
                editable={!isLoading}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Create Invite Modal */}
      <Modal
        visible={isInviteModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsInviteModalOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsInviteModalOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Generate Invite</Text>
            <TouchableOpacity onPress={handleCreateInvite} disabled={isLoading}>
              <Text style={[styles.modalSaveText, isLoading && styles.disabledText]}>
                Create
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email (Optional)</Text>
              <TextInput
                style={styles.input}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="recipient@example.com"
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Expires In</Text>
              <View style={styles.expiryButtons}>
                {[1, 3, 7, 14, 30].map((days) => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.expiryButton,
                      inviteExpiry === days && styles.expiryButtonSelected
                    ]}
                    onPress={() => setInviteExpiry(days)}
                  >
                    <Text style={[
                      styles.expiryButtonText,
                      inviteExpiry === days && styles.expiryButtonTextSelected
                    ]}>
                      {days} day{days > 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <LoadingSpinner />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  editFamilyButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editFamilyButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  message: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  messagesuccess: {
    backgroundColor: '#d1fae5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
  },
  messageerror: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  memberRole: {
    flexDirection: 'row',
  },
  roleTag: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    textTransform: 'uppercase',
  },
  roleAdmin: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  roleMember: {
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
  },
  roleVirtual: {
    backgroundColor: '#f3e8ff',
    color: '#6b21a8',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButton: {
    backgroundColor: '#f3f4f6',
  },
  editButtonText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: '#fee2e2',
  },
  removeButtonText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  requestCard: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  requestDetails: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  requestEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  requestMessage: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#d1fae5',
  },
  approveButtonText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#fee2e2',
  },
  rejectButtonText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  inviteInfo: {
    flex: 1,
  },
  inviteCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  inviteEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  inviteExpiry: {
    fontSize: 12,
    color: '#9ca3af',
  },
  copyButton: {
    backgroundColor: '#f3f4f6',
  },
  copyButtonText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    fontStyle: 'italic',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalCloseText: {
    color: '#6b7280',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalSaveText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    color: '#9ca3af',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#374151',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  expiryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  expiryButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  expiryButtonSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  expiryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  expiryButtonTextSelected: {
    color: '#ffffff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 