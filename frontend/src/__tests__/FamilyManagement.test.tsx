import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { FamilyManagement } from '../components/FamilyManagement';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { familyApi } from '../services/api';

// Mock the contexts
vi.mock('../contexts/FamilyContext');
vi.mock('../contexts/AuthContext');
vi.mock('../contexts/WebSocketContext');
vi.mock('../services/api');

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'user.familyManagement': 'Family Management',
        'user.familyMembers': 'Family Members',
        'user.generateInviteCode': 'Generate Invite Code',
        'user.admin': 'Admin',
        'user.member': 'Member',
        'user.you': 'You',
        'user.joinedOn': 'Joined on',
        'user.onlyAdminsCanManage': 'Only family admins can manage family settings',
        'user.loadingMembers': 'Loading family members...',
        'user.noFamilyMembers': 'No family members found',
        'user.generateNewCode': 'Generate New Code',
        'user.generating': 'Generating...',
        'user.inviteCode': 'Invite Code',
        'user.copyInviteCode': 'Copy Invite Code',
        'user.shareInviteCode': 'Share this code with family members to join',
        'user.inviteCodeCopied': 'Invite code copied to clipboard!',
        'user.failedToLoadMembers': 'Failed to load family members',
        'user.failedToGenerateCode': 'Failed to generate invite code'
      };
      return translations[key] || key;
    }
  })
}));

const mockFamily = {
  id: 'family-1',
  name: 'Test Family',
  description: 'Test Description',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  creator: {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com'
  },
  memberCount: 2,
  userRole: 'ADMIN' as const
};

const mockMemberFamily = {
  ...mockFamily,
  userRole: 'MEMBER' as const
};

const mockUser = {
  id: 'user-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  avatarUrl: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const mockMembers = [
  {
    id: 'member-1',
    familyId: 'family-1',
    userId: 'user-1',
    role: 'ADMIN' as const,
    joinedAt: '2024-01-01T00:00:00Z',
    user: mockUser
  },
  {
    id: 'member-2',
    familyId: 'family-1',
    userId: 'user-2',
    role: 'MEMBER' as const,
    joinedAt: '2024-01-02T00:00:00Z',
    user: {
      id: 'user-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      avatarUrl: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  }
];

const mockInvites = [
  {
    id: 'invite-1',
    code: 'ABC123DEF',
    status: 'PENDING' as const,
    expiresAt: '2024-12-31T23:59:59Z',
    createdAt: '2024-01-01T00:00:00Z',
    family: {
      id: 'family-1',
      name: 'Test Family'
    },
    sender: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe'
    }
  }
];

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
});

describe('FamilyManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn()
    });

    // Mock WebSocket context
    vi.mocked(useWebSocket).mockReturnValue({
      socket: null,
      isConnected: false,
      notifications: [],
      unreadCount: 0,
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      addNotification: vi.fn(),
      markNotificationAsRead: vi.fn(),
      markAllNotificationsAsRead: vi.fn(),
      clearNotifications: vi.fn()
    });

    vi.mocked(familyApi.getMembers).mockResolvedValue({
      data: { success: true, data: mockMembers }
    });

    vi.mocked(familyApi.getInvites).mockResolvedValue({
      data: { success: true, data: mockInvites }
    });
  });

  describe('Admin User', () => {
    beforeEach(() => {
      vi.mocked(useFamily).mockReturnValue({
        currentFamily: mockFamily,
        families: [mockFamily],
        loading: false,
        hasCompletedOnboarding: true,
        pendingJoinRequests: [],
        approvalNotification: null,
        createFamily: vi.fn(),
        joinFamily: vi.fn(),
        setCurrentFamily: vi.fn(),
        refreshFamilies: vi.fn(),
        loadPendingJoinRequests: vi.fn(),
        cancelJoinRequest: vi.fn(),
        dismissApprovalNotification: vi.fn()
      });
    });

    it('renders family management interface for admin', async () => {
      render(<FamilyManagement />);

      expect(screen.getByText('Test Family')).toBeInTheDocument();
      expect(screen.getByText('Family Management')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Family Members/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate Invite Code/i })).toBeInTheDocument();
    });

    it('displays family members correctly', async () => {
      render(<FamilyManagement />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Member')).toBeInTheDocument();
      expect(screen.getByText('(You)')).toBeInTheDocument();
    });

    it('switches between tabs correctly', async () => {
      render(<FamilyManagement />);

      // Initially on members tab
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Switch to invites tab
      const invitesTab = screen.getByRole('button', { name: /Generate Invite Code/i });
      fireEvent.click(invitesTab);

      expect(screen.getByText('Share this code with family members to join')).toBeInTheDocument();
    });

    it('generates invite code successfully', async () => {
      const mockCreateInvite = vi.mocked(familyApi.createInvite).mockResolvedValue({
        data: { success: true, data: mockInvites[0] }
      });

      render(<FamilyManagement />);

      // Switch to invites tab
      const invitesTab = screen.getByRole('button', { name: /Generate Invite Code/i });
      fireEvent.click(invitesTab);

      // Click generate button
      const generateButton = screen.getByRole('button', { name: /Generate New Code/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockCreateInvite).toHaveBeenCalledWith('family-1', { expiresIn: 7 });
      });

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABC123DEF');
      });

      expect(screen.getByText('Invite code copied to clipboard!')).toBeInTheDocument();
    });

    it('shows invite section when switching to invites tab', async () => {
      render(<FamilyManagement />);

      // Switch to invites tab
      const invitesTab = screen.getByRole('button', { name: /Generate Invite Code/i });
      fireEvent.click(invitesTab);

      expect(screen.getByText('Share this code with family members to join')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate New Code/i })).toBeInTheDocument();
    });

    it('handles generate invite code error', async () => {
      vi.mocked(familyApi.createInvite).mockRejectedValue({
        response: { data: { message: 'Failed to create invite' } }
      });

      render(<FamilyManagement />);

      // Switch to invites tab
      const invitesTab = screen.getByRole('button', { name: /Generate Invite Code/i });
      fireEvent.click(invitesTab);

      // Click generate button
      const generateButton = screen.getByRole('button', { name: /Generate New Code/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create invite')).toBeInTheDocument();
      });
    });
  });

  describe('Member User', () => {
    beforeEach(() => {
      vi.mocked(useFamily).mockReturnValue({
        currentFamily: mockMemberFamily,
        families: [mockMemberFamily],
        loading: false,
        hasCompletedOnboarding: true,
        pendingJoinRequests: [],
        approvalNotification: null,
        createFamily: vi.fn(),
        joinFamily: vi.fn(),
        setCurrentFamily: vi.fn(),
        refreshFamilies: vi.fn(),
        loadPendingJoinRequests: vi.fn(),
        cancelJoinRequest: vi.fn(),
        dismissApprovalNotification: vi.fn()
      });
    });

    it('renders limited interface for member', async () => {
      render(<FamilyManagement />);

      expect(screen.getByText('Test Family')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Family Members/i })).toBeInTheDocument();
      expect(screen.getByText('Only family admins can manage family settings')).toBeInTheDocument();
      
      // Should not show tabs or generate invite button
      expect(screen.queryByRole('button', { name: /Generate Invite Code/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Generate New Code/i })).not.toBeInTheDocument();
    });

    it('displays family members for member user', async () => {
      render(<FamilyManagement />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Member')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(useFamily).mockReturnValue({
        currentFamily: mockFamily,
        families: [mockFamily],
        loading: false,
        hasCompletedOnboarding: true,
        pendingJoinRequests: [],
        approvalNotification: null,
        createFamily: vi.fn(),
        joinFamily: vi.fn(),
        setCurrentFamily: vi.fn(),
        refreshFamilies: vi.fn(),
        loadPendingJoinRequests: vi.fn(),
        cancelJoinRequest: vi.fn(),
        dismissApprovalNotification: vi.fn()
      });
    });

    it('handles members loading error', async () => {
      vi.mocked(familyApi.getMembers).mockRejectedValue({
        response: { data: { message: 'Failed to load members' } }
      });

      render(<FamilyManagement />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load members')).toBeInTheDocument();
      });
    });

    it('shows loading state while fetching members', () => {
      vi.mocked(familyApi.getMembers).mockReturnValue(new Promise(() => {})); // Never resolves

      render(<FamilyManagement />);

      expect(screen.getByText('Loading family members...')).toBeInTheDocument();
    });

    it('shows empty state when no members found', async () => {
      vi.mocked(familyApi.getMembers).mockResolvedValue({
        data: { success: true, data: [] }
      });

      render(<FamilyManagement />);

      await waitFor(() => {
        expect(screen.getByText('No family members found')).toBeInTheDocument();
      });
    });
  });

  describe('No Family', () => {
    it('returns null when no current family', () => {
      vi.mocked(useFamily).mockReturnValue({
        currentFamily: null,
        families: [],
        loading: false,
        hasCompletedOnboarding: false,
        pendingJoinRequests: [],
        approvalNotification: null,
        createFamily: vi.fn(),
        joinFamily: vi.fn(),
        setCurrentFamily: vi.fn(),
        refreshFamilies: vi.fn(),
        loadPendingJoinRequests: vi.fn(),
        cancelJoinRequest: vi.fn(),
        dismissApprovalNotification: vi.fn()
      });

      const { container } = render(<FamilyManagement />);
      expect(container.firstChild).toBeNull();
    });
  });
}); 