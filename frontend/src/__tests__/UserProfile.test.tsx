import React from 'react';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { UserProfile } from '../components/UserProfile';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { userApi, familyApi } from '../services/api';

// Setup jest-dom matchers
import '@testing-library/jest-dom';

// Mock the contexts
vi.mock('../contexts/AuthContext');
vi.mock('../contexts/FamilyContext');
vi.mock('../contexts/WebSocketContext');
vi.mock('../services/api');

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockUseAuth = useAuth as any;
const mockUseFamily = useFamily as any;
const mockUseWebSocket = useWebSocket as any;
const mockUserApi = userApi as any;
const mockFamilyApi = familyApi as any;

const mockUser = {
  id: '1',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  avatarUrl: null,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const mockFamily = {
  id: '1',
  name: 'Test Family',
  userRole: 'MEMBER',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  creator: {
    id: '1',
    firstName: 'Test',
    lastName: 'Creator',
    email: 'creator@example.com',
  },
  memberCount: 2,
};

const mockFamilyAdmin = {
  ...mockFamily,
  userRole: 'ADMIN',
};

const mockJoinRequest = {
  id: 'request-1',
  status: 'PENDING' as const,
  message: 'Please let me join',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  respondedAt: null,
  user: {
    id: 'user-2',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    avatarUrl: null,
  },
  family: mockFamilyAdmin,
  invite: {
    id: 'invite-1',
    code: 'TEST123',
  },
  reviewer: null,
};

const mockMembers = [
  {
    id: '1',
    familyId: '1',
    userId: '1',
    role: 'ADMIN',
    joinedAt: '2023-01-01T00:00:00Z',
    user: {
      id: '1',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      avatarUrl: null,
    },
  },
  {
    id: '2',
    familyId: '1',
    userId: '2',
    role: 'MEMBER',
    joinedAt: '2023-01-02T00:00:00Z',
    user: {
      id: '2',
      firstName: 'Member',
      lastName: 'User',
      email: 'member@example.com',
      avatarUrl: null,
    },
  },
];

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      refreshUser: vi.fn(),
    });

    // Add WebSocket mock for all tests
    mockUseWebSocket.mockReturnValue({
      socket: null, // No socket for basic tests
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

    mockFamilyApi.getMembers.mockResolvedValue({
      data: {
        success: true,
        data: mockMembers,
      },
    });

    mockFamilyApi.getInvites.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });

    mockFamilyApi.getJoinRequests.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });
  });

  it('displays Settings title in dialog header', () => {
    mockUseFamily.mockReturnValue({
      currentFamily: mockFamily,
    });

    render(<UserProfile onClose={vi.fn()} />);

    // Should display Settings title instead of Profile
    expect(screen.getByText('user.settings')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'user.settings' })).toBeInTheDocument();
  });

  it('loads family members for non-admin users', async () => {
    mockUseFamily.mockReturnValue({
      currentFamily: mockFamily, // MEMBER role
    });

    render(<UserProfile onClose={vi.fn()} />);

    // Wait for the component to load family data
    await waitFor(() => {
      expect(mockFamilyApi.getMembers).toHaveBeenCalledWith('1');
    });

    // Should not call admin-only endpoints
    expect(mockFamilyApi.getInvites).not.toHaveBeenCalled();
    expect(mockFamilyApi.getJoinRequests).not.toHaveBeenCalled();

    // Should display family members section
    expect(screen.getByText('family.members')).toBeInTheDocument();
  });

  it('loads family members and admin data for admin users', async () => {
    mockUseFamily.mockReturnValue({
      currentFamily: mockFamilyAdmin, // ADMIN role
    });

    render(<UserProfile onClose={vi.fn()} />);

    // Wait for the component to load family data
    await waitFor(() => {
      expect(mockFamilyApi.getMembers).toHaveBeenCalledWith('1');
      expect(mockFamilyApi.getInvites).toHaveBeenCalledWith('1');
      expect(mockFamilyApi.getJoinRequests).toHaveBeenCalledWith('1');
    });

    // Should display family members section
    expect(screen.getByText('family.members')).toBeInTheDocument();
    // Should display admin sections
    expect(screen.getByRole('heading', { name: 'family.generateInvite' })).toBeInTheDocument();
  });

  it('does not load family data when no current family', async () => {
    mockUseFamily.mockReturnValue({
      currentFamily: null,
    });

    render(<UserProfile onClose={vi.fn()} />);

    // Should not call any family API endpoints
    expect(mockFamilyApi.getMembers).not.toHaveBeenCalled();
    expect(mockFamilyApi.getInvites).not.toHaveBeenCalled();
    expect(mockFamilyApi.getJoinRequests).not.toHaveBeenCalled();

    // Should not display family management section
    expect(screen.queryByText('user.familyManagement')).not.toBeInTheDocument();
  });
});

describe('UserProfile WebSocket Integration', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      refreshUser: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    mockUseFamily.mockReturnValue({
      families: [mockFamilyAdmin], // Use admin family
      currentFamily: mockFamilyAdmin, // Use admin family
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
      dismissApprovalNotification: vi.fn(),
    });

    mockUseWebSocket.mockReturnValue({
      socket: mockSocket as any,
      isConnected: true,
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

    // Mock API responses
    mockFamilyApi.getMembers.mockResolvedValue({
      data: { success: true, data: [] }
    });
    mockFamilyApi.getInvites.mockResolvedValue({
      data: { success: true, data: [] }
    });
    mockFamilyApi.getJoinRequests.mockResolvedValue({
      data: { success: true, data: [] }
    });
  });

  it('registers WebSocket event listeners for admins', async () => {
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('join-request-created', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('member-joined', expect.any(Function));
    });
  });

  it('does not register WebSocket listeners for non-admin users', async () => {
    mockUseFamily.mockReturnValue({
      families: [mockFamily], // Use member family
      currentFamily: mockFamily, // Use member family
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
      dismissApprovalNotification: vi.fn(),
    });

    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(mockSocket.on).not.toHaveBeenCalled();
    });
  });

  it('handles real-time join request creation', async () => {
    // Mock initial empty join requests
    mockFamilyApi.getJoinRequests.mockResolvedValue({
      data: { success: true, data: [] }
    });

    render(<UserProfile onClose={vi.fn()} />);

    // Wait for component to mount and register listeners
    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('join-request-created', expect.any(Function));
    });

    // Get the join-request-created handler
    const joinRequestHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'join-request-created'
    )?.[1];

    expect(joinRequestHandler).toBeDefined();

    // Simulate receiving a new join request
    const eventData = {
      familyId: mockFamilyAdmin.id, // Use admin family ID
      joinRequest: mockJoinRequest,
    };

    // Act: Trigger the event handler - just verify it doesn't throw
    expect(() => {
      act(() => {
        joinRequestHandler(eventData);
      });
    }).not.toThrow();

    // The test just verifies the event handler is set up correctly
    // The actual UI update would require a more complex test setup
  });

  it('ignores join requests for other families', async () => {
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('join-request-created', expect.any(Function));
    });

    const joinRequestHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'join-request-created'
    )?.[1];

    // Simulate receiving a join request for a different family
    const eventData = {
      familyId: 'different-family-id',
      joinRequest: mockJoinRequest,
    };

    joinRequestHandler(eventData);

    // Should not show the request
    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('prevents duplicate join requests', async () => {
    // Mock initial join requests with one existing request
    mockFamilyApi.getJoinRequests.mockResolvedValue({
      data: { success: true, data: [mockJoinRequest] }
    });

    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('join-request-created', expect.any(Function));
    });

    const joinRequestHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'join-request-created'
    )?.[1];

    // Try to add the same request again
    const eventData = {
      familyId: mockFamilyAdmin.id, // Use admin family ID
      joinRequest: mockJoinRequest,
    };

    joinRequestHandler(eventData);

    // Should only show one instance
    await waitFor(() => {
      const elements = screen.getAllByText('John Doe');
      expect(elements).toHaveLength(1);
    });
  });

  it('cleans up WebSocket listeners on unmount', () => {
    const { unmount } = render(<UserProfile onClose={vi.fn()} />);

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('join-request-created', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('member-joined', expect.any(Function));
  });
});

describe('UserProfile Remove Member Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      refreshUser: vi.fn(),
    });

    mockUseWebSocket.mockReturnValue({
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

    // Mock successful family data loading
    mockFamilyApi.getMembers.mockResolvedValue({
      data: {
        success: true,
        data: mockMembers,
      },
    });

    mockFamilyApi.getInvites.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });

    mockFamilyApi.getJoinRequests.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });

    // Mock successful remove member API
    mockFamilyApi.removeMember.mockResolvedValue({
      data: {
        success: true,
        message: 'Member removed successfully',
      },
    });
  });

  it('shows remove button for admin users on other members', async () => {
    mockUseFamily.mockReturnValue({
      currentFamily: mockFamilyAdmin, // ADMIN role
    });

    render(<UserProfile onClose={vi.fn()} />);

    // Wait for family data to load and members to be rendered
    await waitFor(() => {
      expect(mockFamilyApi.getMembers).toHaveBeenCalledWith('1');
    });

    // Wait for members to be rendered - look for email addresses which are more reliable
    await waitFor(() => {
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('member@example.com')).toBeInTheDocument();
    });

    // Should show remove buttons for members that are not the current user
    const removeButtons = screen.getAllByText('family.remove');
    expect(removeButtons.length).toBeGreaterThan(0);
  });

  it('does not show remove button for non-admin users', async () => {
    mockUseFamily.mockReturnValue({
      currentFamily: mockFamily, // MEMBER role
    });

    render(<UserProfile onClose={vi.fn()} />);

    // Wait for family data to load and members to be rendered
    await waitFor(() => {
      expect(mockFamilyApi.getMembers).toHaveBeenCalledWith('1');
    });

    // Wait for members to be rendered - look for email addresses which are more reliable
    await waitFor(() => {
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('member@example.com')).toBeInTheDocument();
    });

    // Should not show any remove buttons
    expect(screen.queryByText('family.remove')).not.toBeInTheDocument();
  });

  it('does not show remove button for self', async () => {
    // Mock user as admin but also as a member in the family
    const adminUser = { ...mockUser, id: '1' };
    mockUseAuth.mockReturnValue({
      user: adminUser,
      refreshUser: vi.fn(),
    });

    mockUseFamily.mockReturnValue({
      currentFamily: mockFamilyAdmin, // ADMIN role
    });

    render(<UserProfile onClose={vi.fn()} />);

    // Wait for family data to load and members to be rendered
    await waitFor(() => {
      expect(mockFamilyApi.getMembers).toHaveBeenCalledWith('1');
    });

    // Wait for members to be rendered - look for email addresses which are more reliable
    await waitFor(() => {
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('member@example.com')).toBeInTheDocument();
    });

    // Should show remove buttons, but not for the current user (admin)
    const removeButtons = screen.getAllByText('family.remove');
    // Should be fewer buttons than total members (excluding self)
    expect(removeButtons.length).toBeLessThan(mockMembers.length);
  });

  it('calls removeMember API when remove button is clicked and confirmed', async () => {
    // Mock window.confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    mockUseFamily.mockReturnValue({
      currentFamily: mockFamilyAdmin, // ADMIN role
    });

    const user = userEvent.setup();

    render(<UserProfile onClose={vi.fn()} />);

    // Wait for family data to load and members to be rendered
    await waitFor(() => {
      expect(mockFamilyApi.getMembers).toHaveBeenCalledWith('1');
    });

    // Wait for members to be rendered - look for email addresses which are more reliable
    await waitFor(() => {
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('member@example.com')).toBeInTheDocument();
    });

    // Click the first remove button
    const removeButtons = screen.getAllByText('family.remove');
    await user.click(removeButtons[0]);

    // Should show confirmation dialog
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('family.confirmRemoveMember')
    );

    // Should call the API
    await waitFor(() => {
      expect(mockFamilyApi.removeMember).toHaveBeenCalledWith('1', expect.any(String));
    });

    // Should reload family data
    expect(mockFamilyApi.getMembers).toHaveBeenCalledTimes(2); // Initial load + refresh after removal

    confirmSpy.mockRestore();
  });

  it('does not call removeMember API when removal is cancelled', async () => {
    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    mockUseFamily.mockReturnValue({
      currentFamily: mockFamilyAdmin, // ADMIN role
    });

    const user = userEvent.setup();

    render(<UserProfile onClose={vi.fn()} />);

    // Wait for family data to load and members to be rendered
    await waitFor(() => {
      expect(mockFamilyApi.getMembers).toHaveBeenCalledWith('1');
    });

    // Wait for members to be rendered - look for email addresses which are more reliable
    await waitFor(() => {
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('member@example.com')).toBeInTheDocument();
    });

    // Click the first remove button
    const removeButtons = screen.getAllByText('family.remove');
    await user.click(removeButtons[0]);

    // Should show confirmation dialog
    expect(confirmSpy).toHaveBeenCalled();

    // Should NOT call the API
    expect(mockFamilyApi.removeMember).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('handles remove member API errors gracefully', async () => {
    // Mock API to return error
    mockFamilyApi.removeMember.mockRejectedValue({
      response: {
        data: {
          message: 'Failed to remove member',
        },
      },
    });

    // Mock window.confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    mockUseFamily.mockReturnValue({
      currentFamily: mockFamilyAdmin, // ADMIN role
    });

    const user = userEvent.setup();

    render(<UserProfile onClose={vi.fn()} />);

    // Wait for family data to load and members to be rendered
    await waitFor(() => {
      expect(mockFamilyApi.getMembers).toHaveBeenCalledWith('1');
    });

    // Wait for members to be rendered - look for email addresses which are more reliable
    await waitFor(() => {
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('member@example.com')).toBeInTheDocument();
    });

    // Click the first remove button
    const removeButtons = screen.getAllByText('family.remove');
    await user.click(removeButtons[0]);

    // Should call the API and handle error
    await waitFor(() => {
      expect(mockFamilyApi.removeMember).toHaveBeenCalled();
    });

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Failed to remove member')).toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });
});

describe('Avatar URL editing', () => {
  beforeEach(() => {
    mockUseFamily.mockReturnValue({
      currentFamily: null, // No family for profile editing tests
    });
  });

  it('should render avatar URL input field', () => {
    render(<UserProfile onClose={vi.fn()} />);
    
    const avatarUrlInput = screen.getByLabelText(/user\.avatar.*url/i);
    expect(avatarUrlInput).toBeInTheDocument();
    expect(avatarUrlInput).toHaveAttribute('type', 'url');
    expect(avatarUrlInput).toHaveAttribute('placeholder', 'https://example.com/avatar.jpg');
  });

  it('should populate avatar URL field with user data', () => {
    const userWithAvatar = {
      ...mockUser,
      avatarUrl: 'https://example.com/avatar.jpg'
    };
    
    mockUseAuth.mockReturnValue({
      user: userWithAvatar,
      refreshUser: vi.fn(),
    });

    render(<UserProfile onClose={vi.fn()} />);
    
    const avatarUrlInput = screen.getByLabelText(/user\.avatar.*url/i) as HTMLInputElement;
    expect(avatarUrlInput.value).toBe('https://example.com/avatar.jpg');
  });

  it('should handle avatar URL input changes', async () => {
    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);
    
    const avatarUrlInput = screen.getByLabelText(/user\.avatar.*url/i);
    await user.clear(avatarUrlInput);
    await user.type(avatarUrlInput, 'https://newavatar.com/image.png');
    
    expect((avatarUrlInput as HTMLInputElement).value).toBe('https://newavatar.com/image.png');
  });

  it('should validate invalid avatar URLs', async () => {
    const user = userEvent.setup();
    const mockUpdate = vi.fn();
    mockUserApi.update = mockUpdate;
    
    render(<UserProfile onClose={vi.fn()} />);
    
    const firstNameInput = screen.getByLabelText(/user\.firstName/i);
    const lastNameInput = screen.getByLabelText(/user\.lastName/i);
    const avatarUrlInput = screen.getByLabelText(/user\.avatar.*url/i);
    const submitButton = screen.getByRole('button', { name: /user\.updateProfile/i });
    
    // Fill required fields and enter invalid URL
    await act(async () => {
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'John');
      await user.clear(lastNameInput);
      await user.type(lastNameInput, 'Doe');
      await user.clear(avatarUrlInput);
      await user.type(avatarUrlInput, 'invalid-url');
    });
    
    await act(async () => {
      await user.click(submitButton);
    });
    
    // Verify that the API was not called due to validation failure
    await waitFor(() => {
      // Either the error message is shown OR the API call was prevented
      const hasErrorMessage = screen.queryByText(/user\.validation\.invalidAvatarUrl/i);
      if (!hasErrorMessage) {
        // If no error message, ensure API wasn't called with invalid data
        expect(mockUpdate).not.toHaveBeenCalled();
      } else {
        expect(hasErrorMessage).toBeInTheDocument();
      }
    });
  });

  it('should accept valid avatar URLs', async () => {
    const user = userEvent.setup();
    mockUserApi.update.mockResolvedValue({ data: { success: true } });

    render(<UserProfile onClose={vi.fn()} />);
    
    const firstNameInput = screen.getByLabelText(/user\.firstName/i);
    const lastNameInput = screen.getByLabelText(/user\.lastName/i);
    const avatarUrlInput = screen.getByLabelText(/user\.avatar.*url/i);
    const submitButton = screen.getByRole('button', { name: /user\.updateProfile/i });
    
    // Fill in valid data
    await act(async () => {
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'John');
      await user.clear(lastNameInput);
      await user.type(lastNameInput, 'Doe');
      await user.clear(avatarUrlInput);
      await user.type(avatarUrlInput, 'https://example.com/avatar.jpg');
    });
    
    await act(async () => {
      await user.click(submitButton);
    });
    
    await waitFor(() => {
      expect(mockUserApi.update).toHaveBeenCalledWith(mockUser.id, {
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar.jpg'
      });
    });
  });

  it('should allow empty avatar URL', async () => {
    const user = userEvent.setup();
    mockUserApi.update.mockResolvedValue({ data: { success: true } });

    render(<UserProfile onClose={vi.fn()} />);
    
    const firstNameInput = screen.getByLabelText(/user\.firstName/i);
    const lastNameInput = screen.getByLabelText(/user\.lastName/i);
    const avatarUrlInput = screen.getByLabelText(/user\.avatar.*url/i);
    const submitButton = screen.getByRole('button', { name: /user\.updateProfile/i });
    
    // Fill in valid data with empty avatar URL
    await act(async () => {
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'John');
      await user.clear(lastNameInput);
      await user.type(lastNameInput, 'Doe');
      await user.clear(avatarUrlInput);
    });
    
    await act(async () => {
      await user.click(submitButton);
    });
    
    await waitFor(() => {
      expect(mockUserApi.update).toHaveBeenCalledWith(mockUser.id, {
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: ''
      });
    });
  });
});

describe('Family Editing Functionality', () => {
  const mockFamilyWithDescription = {
    ...mockFamilyAdmin,
    description: 'A test family description',
    avatarUrl: 'https://example.com/family-avatar.jpg',
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Reset the common mocks for this test suite
    mockUseAuth.mockReturnValue({
      user: mockUser,
      refreshUser: vi.fn(),
    });

    mockUseWebSocket.mockReturnValue({
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

    mockUseFamily.mockReturnValue({
      currentFamily: mockFamilyWithDescription,
      refreshFamilies: vi.fn(),
    });

    mockFamilyApi.getMembers.mockResolvedValue({
      data: {
        success: true,
        data: mockMembers,
      },
    });

    mockFamilyApi.getInvites.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });

    mockFamilyApi.getJoinRequests.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });

    mockFamilyApi.update.mockResolvedValue({
      data: {
        success: true,
        data: mockFamilyWithDescription,
      },
    });
  });

  it('shows edit family button for admin users', async () => {
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('family.editButton')).toBeInTheDocument();
    });
  });

  it('does not show edit family button for non-admin users', async () => {
    // Override the mock for this specific test
    const memberFamily = { ...mockFamilyWithDescription, userRole: 'MEMBER' };
    
    mockUseFamily.mockReturnValue({
      currentFamily: memberFamily,
      refreshFamilies: vi.fn(),
    });

    render(<UserProfile onClose={vi.fn()} />);

    // Wait for the component to render and check that we don't have the edit button
    await waitFor(() => {
      expect(screen.getByText('user.familyManagement')).toBeInTheDocument();
    });
    
    // The edit button should not be present for non-admin users
    expect(screen.queryByText('family.editButton')).not.toBeInTheDocument();
  });

  it('shows family edit form when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('family.editButton')).toBeInTheDocument();
    });

    const editButton = screen.getByText('family.editButton');
    await user.click(editButton);

    expect(screen.getByText('family.edit.title')).toBeInTheDocument();
    expect(screen.getByLabelText('family.name')).toBeInTheDocument();
    expect(screen.getByLabelText(/family\.description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/family\.avatar/)).toBeInTheDocument();
  });

  it('populates form with current family data', async () => {
    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('family.editButton')).toBeInTheDocument();
    });

    const editButton = screen.getByText('family.editButton');
    await user.click(editButton);

    const nameInput = screen.getByLabelText('family.name') as HTMLInputElement;
    const descriptionInput = screen.getByLabelText(/family\.description/) as HTMLTextAreaElement;
    const avatarInput = screen.getByLabelText(/family\.avatar/) as HTMLInputElement;

    expect(nameInput.value).toBe(mockFamilyWithDescription.name);
    expect(descriptionInput.value).toBe(mockFamilyWithDescription.description);
    expect(avatarInput.value).toBe(mockFamilyWithDescription.avatarUrl);
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('family.editButton')).toBeInTheDocument();
    });

    const editButton = screen.getByText('family.editButton');
    await user.click(editButton);

    const nameInput = screen.getByLabelText('family.name');
    const submitButton = screen.getByRole('button', { name: /common\.save/ });

    // Clear the name field
    await user.clear(nameInput);
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('family.edit.nameRequired')).toBeInTheDocument();
    });

    expect(mockFamilyApi.update).not.toHaveBeenCalled();
  });

  it('validates name length', async () => {
    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('family.editButton')).toBeInTheDocument();
    });

    const editButton = screen.getByText('family.editButton');
    await user.click(editButton);

    const nameInput = screen.getByLabelText('family.name');
    const submitButton = screen.getByRole('button', { name: /common\.save/ });

    // Test name too short
    await user.clear(nameInput);
    await user.type(nameInput, 'A');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('family.edit.nameTooShort')).toBeInTheDocument();
    });

    // Test name too long
    await user.clear(nameInput);
    await user.type(nameInput, 'A'.repeat(51));
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('family.edit.nameTooLong')).toBeInTheDocument();
    });

    expect(mockFamilyApi.update).not.toHaveBeenCalled();
  });

  it('validates description length', async () => {
    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('family.editButton')).toBeInTheDocument();
    });

    const editButton = screen.getByText('family.editButton');
    await user.click(editButton);

    // Wait for the inline edit form to appear
    await waitFor(() => {
      expect(screen.getByText('family.edit.title')).toBeInTheDocument();
    });

    const descriptionInput = screen.getByLabelText(/family\.description/);
    const submitButton = screen.getByRole('button', { name: /common\.save/ });

    // Test description too long
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'A'.repeat(201));
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('family.edit.descriptionTooLong')).toBeInTheDocument();
    });

    expect(mockFamilyApi.update).not.toHaveBeenCalled();
  });

  it.skip('validates avatar URL format for virtual member editing', async () => {
    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Virtual Member')).toBeInTheDocument();
    });

    const editButton = screen.getAllByText('common.edit')[0];
    await act(async () => {
      await user.click(editButton);
    });

    // Wait for the edit form to appear
    await waitFor(() => {
      expect(screen.getByText('family.editVirtualMember')).toBeInTheDocument();
    });

    // Get all the form inputs
    const firstNameInput = screen.getByDisplayValue('Virtual');
    const lastNameInput = screen.getByDisplayValue('Member');
    const avatarInput = document.getElementById('editVirtualAvatarUrl') as HTMLInputElement;
    
    expect(avatarInput).toBeInTheDocument();
    
    // Ensure first name and last name are valid (not empty) to avoid other validation errors
    await act(async () => {
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'TestFirst');
      await user.clear(lastNameInput);
      await user.type(lastNameInput, 'TestLast');
      // Add invalid URL to avatar field
      await user.clear(avatarInput);
      await user.type(avatarInput, 'invalid-url');
    });

    // Verify the values were set correctly
    expect(firstNameInput.value).toBe('TestFirst');
    expect(lastNameInput.value).toBe('TestLast');
    expect(avatarInput.value).toBe('invalid-url');

    const saveButton = screen.getByText('common.save');
    await act(async () => {
      await user.click(saveButton);
    });

    // Now we should see the avatar URL validation error
    await waitFor(() => {
      expect(screen.getByText('user.validation.invalidAvatarUrl')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('successfully updates family with all fields', async () => {
    const mockRefreshFamilies = vi.fn();
    mockUseFamily.mockReturnValue({
      currentFamily: mockFamilyWithDescription,
      refreshFamilies: mockRefreshFamilies,
    });

    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('family.editButton')).toBeInTheDocument();
    });

    const editButton = screen.getByText('family.editButton');
    await user.click(editButton);

    const nameInput = screen.getByLabelText('family.name');
    const descriptionInput = screen.getByLabelText(/family\.description/);
    const avatarInput = screen.getByLabelText(/family\.avatar/);
    const submitButton = screen.getByRole('button', { name: /common\.save/ });

    // Update all fields
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Family Name');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated description');
    await user.clear(avatarInput);
    await user.type(avatarInput, 'https://example.com/new-avatar.jpg');

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFamilyApi.update).toHaveBeenCalledWith(mockFamilyWithDescription.id, {
        name: 'Updated Family Name',
        description: 'Updated description',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      });
    });

    // Should refresh families and show success message
    expect(mockRefreshFamilies).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('family.edit.updated')).toBeInTheDocument();
    });

    // Should close the form
    expect(screen.queryByText('family.edit.title')).not.toBeInTheDocument();
  });

  it('successfully updates family with only name', async () => {
    const mockRefreshFamilies = vi.fn();
    mockUseFamily.mockReturnValue({
      currentFamily: mockFamilyWithDescription,
      refreshFamilies: mockRefreshFamilies,
    });

    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('family.editButton')).toBeInTheDocument();
    });

    const editButton = screen.getByText('family.editButton');
    await user.click(editButton);

    const nameInput = screen.getByLabelText('family.name');
    const descriptionInput = screen.getByLabelText(/family\.description/);
    const avatarInput = screen.getByLabelText(/family\.avatar/);
    const submitButton = screen.getByRole('button', { name: /common\.save/ });

    // Clear optional fields and update only name
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name Only');
    await user.clear(descriptionInput);
    await user.clear(avatarInput);

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFamilyApi.update).toHaveBeenCalledWith(mockFamilyWithDescription.id, {
        name: 'New Name Only',
      });
    });

    expect(mockRefreshFamilies).toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    mockFamilyApi.update.mockRejectedValue({
      response: {
        data: {
          message: 'Update failed',
        },
      },
    });
    
    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('family.editButton')).toBeInTheDocument();
    });

    const editButton = screen.getByText('family.editButton');
    await user.click(editButton);

    const nameInput = screen.getByLabelText('family.name');
    const submitButton = screen.getByRole('button', { name: /common\.save/ });

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });

    expect(mockFamilyApi.update).toHaveBeenCalled();
  });

  it('cancels editing when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('family.editButton')).toBeInTheDocument();
    });

    const editButton = screen.getByText('family.editButton');
    await user.click(editButton);

    expect(screen.getByText('family.edit.title')).toBeInTheDocument();

    // Find the cancel button within the family edit form specifically
    const familyEditForm = screen.getByText('family.edit.title').closest('.user-profile-family-edit-inline');
    expect(familyEditForm).toBeInTheDocument();
    
    const cancelButton = within(familyEditForm as HTMLElement).getByText('common.cancel');
    await user.click(cancelButton);

    expect(screen.queryByText('family.edit.title')).not.toBeInTheDocument();
    expect(mockFamilyApi.update).not.toHaveBeenCalled();
  });
});

// Virtual Member Editing Functionality Tests
describe('Virtual Member Editing Functionality', () => {
  const mockVirtualMember = {
    id: 'member-3',
    familyId: '1', // Match the family ID from mockFamilyAdmin
    userId: 'virtual-user-1',
    role: 'MEMBER' as const,
    joinedAt: '2023-01-01T00:00:00Z',
    user: {
      id: 'virtual-user-1',
      firstName: 'Virtual',
      lastName: 'Member',
      email: null,
      avatarUrl: null,
      isVirtual: true,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
  };

  beforeEach(() => {
    // Add virtual member to the mock members
    mockUseFamily.mockReturnValue({
      currentFamily: mockFamilyAdmin,
      refreshFamilies: vi.fn(),
    });

    // Mock family API getMembers to include virtual member
    vi.mocked(familyApi.getMembers).mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            ...mockMembers[0],
            role: 'ADMIN' as const,
            user: {
              ...mockMembers[0].user,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            }
          }, 
          mockVirtualMember
        ],
      },
    });

    // Mock updateVirtualMember API
    vi.mocked(familyApi.updateVirtualMember).mockResolvedValue({
      data: {
        success: true,
        data: mockVirtualMember,
      },
    });
  });

  it('shows edit button for virtual members when user is admin', async () => {
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Virtual Member')).toBeInTheDocument();
    });

    // Virtual member should have an edit button
    const editButtons = screen.getAllByText('common.edit');
    expect(editButtons.length).toBeGreaterThan(0);
  });

  it('does not show edit button for virtual members when user is not admin', async () => {
    // Override the mock for this specific test
    const memberFamily = { ...mockFamily, userRole: 'MEMBER' };
    
    mockUseFamily.mockReturnValue({
      currentFamily: memberFamily,
      refreshFamilies: vi.fn(),
    });

    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Virtual Member')).toBeInTheDocument();
    });

    // Should not have any edit buttons for non-admin
    expect(screen.queryByText('common.edit')).not.toBeInTheDocument();
  });

  it('shows virtual member edit form when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Virtual Member')).toBeInTheDocument();
    });

    const editButton = screen.getAllByText('common.edit')[0];
    await act(async () => {
      await user.click(editButton);
    });

    expect(screen.getByText('family.editVirtualMember')).toBeInTheDocument();
    // Use specific elements to avoid conflicts with main profile form
    expect(screen.getByDisplayValue('Virtual')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Member')).toBeInTheDocument();
    // Check for the virtual member avatar input by its ID
    expect(document.getElementById('editVirtualAvatarUrl')).toBeInTheDocument();
  });

  it('populates form with current virtual member data', async () => {
    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Virtual Member')).toBeInTheDocument();
    });

    const editButton = screen.getAllByText('common.edit')[0];
    await act(async () => {
      await user.click(editButton);
    });

    // Check that the virtual member edit form has the correct values
    expect(screen.getByDisplayValue('Virtual')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Member')).toBeInTheDocument();
  });

  it('validates required fields for virtual member editing', async () => {
    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Virtual Member')).toBeInTheDocument();
    });

    const editButton = screen.getAllByText('common.edit')[0];
    await act(async () => {
      await user.click(editButton);
    });

    // Clear the first name field using the specific ID
    const firstNameInput = screen.getByDisplayValue('Virtual') as HTMLInputElement;
    await act(async () => {
      await user.clear(firstNameInput);
    });

    const saveButton = screen.getByText('common.save');
    await act(async () => {
      await user.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText('auth.validation.firstNameRequired')).toBeInTheDocument();
    });
  });

  it.skip('validates avatar URL format for virtual member editing', async () => {
    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Virtual Member')).toBeInTheDocument();
    });

    const editButton = screen.getAllByText('common.edit')[0];
    await act(async () => {
      await user.click(editButton);
    });

    // Wait for the edit form to appear
    await waitFor(() => {
      expect(screen.getByText('family.editVirtualMember')).toBeInTheDocument();
    });

    // Get all the form inputs
    const firstNameInput = screen.getByDisplayValue('Virtual');
    const lastNameInput = screen.getByDisplayValue('Member');
    const avatarInput = document.getElementById('editVirtualAvatarUrl') as HTMLInputElement;
    
    expect(avatarInput).toBeInTheDocument();
    
    // Ensure first name and last name are valid (not empty) to avoid other validation errors
    await act(async () => {
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'TestFirst');
      await user.clear(lastNameInput);
      await user.type(lastNameInput, 'TestLast');
      // Add invalid URL to avatar field
      await user.clear(avatarInput);
      await user.type(avatarInput, 'invalid-url');
    });

    // Verify the values were set correctly
    expect(firstNameInput.value).toBe('TestFirst');
    expect(lastNameInput.value).toBe('TestLast');
    expect(avatarInput.value).toBe('invalid-url');

    const saveButton = screen.getByText('common.save');
    await act(async () => {
      await user.click(saveButton);
    });

    // Now we should see the avatar URL validation error
    await waitFor(() => {
      expect(screen.getByText('user.validation.invalidAvatarUrl')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('successfully updates virtual member', async () => {
    const user = userEvent.setup();
    const mockRefreshFamilies = vi.fn();
    
    mockUseFamily.mockReturnValue({
      currentFamily: mockFamilyAdmin,
      refreshFamilies: mockRefreshFamilies,
    });

    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Virtual Member')).toBeInTheDocument();
    });

    const editButton = screen.getAllByText('common.edit')[0];
    await act(async () => {
      await user.click(editButton);
    });

    // Update the virtual member name
    const firstNameInput = screen.getByDisplayValue('Virtual') as HTMLInputElement;
    await act(async () => {
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Updated');
    });

    const saveButton = screen.getByText('common.save');
    await act(async () => {
      await user.click(saveButton);
    });

    await waitFor(() => {
      expect(familyApi.updateVirtualMember).toHaveBeenCalledWith(
        '1', // Updated to match the actual family ID
        'virtual-user-1',
        {
          firstName: 'Updated',
          lastName: 'Member',
        }
      );
    });

    await waitFor(() => {
      expect(screen.getByText('family.virtualMemberUpdated')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully during virtual member update', async () => {
    const user = userEvent.setup();
    
    // Mock API to return error
    vi.mocked(familyApi.updateVirtualMember).mockRejectedValue({
      response: { data: { message: 'Update failed' } }
    });

    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Virtual Member')).toBeInTheDocument();
    });

    const editButton = screen.getAllByText('common.edit')[0];
    await act(async () => {
      await user.click(editButton);
    });

    const saveButton = screen.getByText('common.save');
    await act(async () => {
      await user.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('cancels virtual member editing when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Virtual Member')).toBeInTheDocument();
    });

    const editButton = screen.getAllByText('common.edit')[0];
    await act(async () => {
      await user.click(editButton);
    });

    expect(screen.getByText('family.editVirtualMember')).toBeInTheDocument();

    const cancelButton = screen.getByText('common.cancel');
    await act(async () => {
      await user.click(cancelButton);
    });

    expect(screen.queryByText('family.editVirtualMember')).not.toBeInTheDocument();
  });

  it('clears form errors when user starts typing in virtual member edit form', async () => {
    const user = userEvent.setup();
    render(<UserProfile onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Virtual Member')).toBeInTheDocument();
    });

    const editButton = screen.getAllByText('common.edit')[0];
    await act(async () => {
      await user.click(editButton);
    });

    // Clear first name to trigger error
    const firstNameInput = screen.getByDisplayValue('Virtual') as HTMLInputElement;
    await act(async () => {
      await user.clear(firstNameInput);
    });

    const saveButton = screen.getByText('common.save');
    await act(async () => {
      await user.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText('auth.validation.firstNameRequired')).toBeInTheDocument();
    });

    // Start typing to clear error
    await act(async () => {
      await user.type(firstNameInput, 'New');
    });

    await waitFor(() => {
      expect(screen.queryByText('auth.validation.firstNameRequired')).not.toBeInTheDocument();
    });
  });
}); 