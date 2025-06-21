import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { FamilyManagement } from '../components/FamilyManagement';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { familyApi } from '../services/api';

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
const mockFamilyApi = familyApi as any;

const mockUser = {
  id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  avatarUrl: null,
  isVirtual: false,
};

const mockFamily = {
  id: 'family-1',
  name: 'Test Family',
  description: 'Test Description',
  avatarUrl: null,
  userRole: 'ADMIN' as const,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

describe('FamilyManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: mockUser,
    });

    mockUseWebSocket.mockReturnValue({
      on: vi.fn(),
      off: vi.fn(),
    });

    mockFamilyApi.getMembers.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });

    mockFamilyApi.getInvites.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });
  });

  it('renders family management header', () => {
    mockUseFamily.mockReturnValue({
      currentFamily: mockFamily,
      refreshFamilies: vi.fn(),
      pendingJoinRequests: [],
      loadPendingJoinRequests: vi.fn(),
    });

    render(<FamilyManagement />);
    
    expect(screen.getByText('user.familyManagement')).toBeInTheDocument();
    expect(screen.getByText('Test Family')).toBeInTheDocument();
  });

  it('renders family members section', () => {
    mockUseFamily.mockReturnValue({
      currentFamily: mockFamily,
      refreshFamilies: vi.fn(),
      pendingJoinRequests: [],
      loadPendingJoinRequests: vi.fn(),
    });

    render(<FamilyManagement />);
    
    expect(screen.getByText('family.members')).toBeInTheDocument();
  });

  it('does not render when no current family', () => {
    mockUseFamily.mockReturnValue({
      currentFamily: null,
      refreshFamilies: vi.fn(),
      pendingJoinRequests: [],
      loadPendingJoinRequests: vi.fn(),
    });

    render(<FamilyManagement />);

    expect(screen.queryByText('user.familyManagement')).not.toBeInTheDocument();
  });

  it('shows admin controls for admin users', () => {
    mockUseFamily.mockReturnValue({
      currentFamily: mockFamily,
      refreshFamilies: vi.fn(),
      pendingJoinRequests: [],
      loadPendingJoinRequests: vi.fn(),
    });

    render(<FamilyManagement />);
    
    expect(screen.getByText('family.editButton')).toBeInTheDocument();
    expect(screen.getByText('family.createVirtualMember')).toBeInTheDocument();
  });

  it('does not show admin controls for non-admin users', () => {
    const familyWithMemberRole = {
      ...mockFamily,
      userRole: 'MEMBER' as const,
    };

    mockUseFamily.mockReturnValue({
      currentFamily: familyWithMemberRole,
      refreshFamilies: vi.fn(),
      pendingJoinRequests: [],
      loadPendingJoinRequests: vi.fn(),
    });

    render(<FamilyManagement />);

    expect(screen.queryByText('family.editButton')).not.toBeInTheDocument();
    expect(screen.queryByText('family.createVirtualMember')).not.toBeInTheDocument();
  });
}); 