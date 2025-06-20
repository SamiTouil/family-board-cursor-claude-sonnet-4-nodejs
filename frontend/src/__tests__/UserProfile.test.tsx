import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { UserProfile } from '../components/UserProfile';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { userApi, familyApi } from '../services/api';

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
      on: vi.fn(),
      off: vi.fn(),
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
      on: vi.fn(),
      off: vi.fn(),
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

    joinRequestHandler(eventData);

    // Wait for the UI to update
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
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