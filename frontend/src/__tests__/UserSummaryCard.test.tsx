import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserSummaryCard } from '../components/UserSummaryCard';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';

// Mock the contexts
vi.mock('../contexts/AuthContext');
vi.mock('../contexts/FamilyContext');

// Mock the UserAvatar component
vi.mock('../components/UserAvatar', () => ({
  UserAvatar: ({ firstName, lastName, size }: any) => (
    <div data-testid="user-avatar" data-size={size}>
      Avatar: {firstName} {lastName}
    </div>
  )
}));

const mockUseAuth = vi.mocked(useAuth);
const mockUseFamily = vi.mocked(useFamily);

describe('UserSummaryCard', () => {
  const mockUser = {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  };

  const mockFamily = {
    id: '1',
    name: 'Test Family',
    description: 'A wonderful family board for testing',
    userRole: 'ADMIN' as const,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    creator: {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com'
    },
    memberCount: 2
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user information correctly', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: true
    });

    mockUseFamily.mockReturnValue({
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

    render(<UserSummaryCard />);

    // Check if user name is displayed in the name element
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('John Doe');
    
    // Check if email is displayed
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    
    // Check if family name is displayed
    expect(screen.getByText('Test Family')).toBeInTheDocument();
    
    // Check if family description is displayed
    expect(screen.getByText('A wonderful family board for testing')).toBeInTheDocument();
    
    // Check if role is displayed
    expect(screen.getByText('family.admin')).toBeInTheDocument();
    
    // Check if UserAvatar is rendered with correct props
    const avatar = screen.getByTestId('user-avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('data-size', 'large');
    expect(avatar).toHaveTextContent('Avatar: John Doe');
  });

  it('displays Member role when userRole is not available', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: true
    });

    const familyWithoutRole = { ...mockFamily, userRole: undefined };
    mockUseFamily.mockReturnValue({
      currentFamily: familyWithoutRole,
      families: [familyWithoutRole],
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

    render(<UserSummaryCard />);

    expect(screen.getByText('family.member')).toBeInTheDocument();
  });

  it('does not display role when no current family', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: true
    });

    mockUseFamily.mockReturnValue({
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

    render(<UserSummaryCard />);

    // User info should still be displayed
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('John Doe');
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    
    // Role should not be displayed
    expect(screen.queryByText('family.admin')).not.toBeInTheDocument();
    expect(screen.queryByText('family.member')).not.toBeInTheDocument();
  });

  it('handles user with null avatarUrl', () => {
    const userWithoutAvatar = { ...mockUser, avatarUrl: null };
    
    mockUseAuth.mockReturnValue({
      user: userWithoutAvatar,
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: true
    });

    mockUseFamily.mockReturnValue({
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

    render(<UserSummaryCard />);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('John Doe');
    expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
  });

  it('returns null when no user is available', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: false
    });

    mockUseFamily.mockReturnValue({
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

    const { container } = render(<UserSummaryCard />);
    expect(container.firstChild).toBeNull();
  });

  it('applies correct CSS classes', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: true
    });

    mockUseFamily.mockReturnValue({
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

    const { container } = render(<UserSummaryCard />);

    // Check main container
    const card = container.querySelector('.user-summary-card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('user-summary-card');

    // Check header section
    const header = card?.querySelector('.user-summary-card-header');
    expect(header).toBeInTheDocument();

    // Check content section
    const content = card?.querySelector('.user-summary-card-content');
    expect(content).toBeInTheDocument();

    // Check avatar section
    const avatarSection = card?.querySelector('.user-summary-card-avatar');
    expect(avatarSection).toBeInTheDocument();

    // Check info section
    const infoSection = card?.querySelector('.user-summary-card-info');
    expect(infoSection).toBeInTheDocument();
  });

  it('displays family information correctly', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: true
    });

    mockUseFamily.mockReturnValue({
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

    render(<UserSummaryCard />);

    // Check if family name is displayed
    expect(screen.getByText('Test Family')).toBeInTheDocument();
    
    // Check if family description is displayed
    expect(screen.getByText('A wonderful family board for testing')).toBeInTheDocument();
  });

  it('handles family without description', () => {
    const familyWithoutDescription = { ...mockFamily, description: undefined };
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: true
    });

    mockUseFamily.mockReturnValue({
      currentFamily: familyWithoutDescription,
      families: [familyWithoutDescription],
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

    render(<UserSummaryCard />);

    // Check if family name is displayed
    expect(screen.getByText('Test Family')).toBeInTheDocument();
    
    // Check if family description is not displayed
    expect(screen.queryByText('A wonderful family board for testing')).not.toBeInTheDocument();
  });
}); 