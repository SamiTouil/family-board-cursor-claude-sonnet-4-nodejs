import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { UserProfile } from '../components/UserProfile';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { familyApi } from '../services/api';

// Mock the contexts
vi.mock('../contexts/AuthContext');
vi.mock('../contexts/FamilyContext');
vi.mock('../services/api');

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockUseAuth = useAuth as any;
const mockUseFamily = useFamily as any;
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