import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { FamilyManagement } from '../features/family/components/FamilyManagement';
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
  id: 'user1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
};

const mockFamily = {
  id: 'family1',
  name: 'Test Family',
  description: 'A test family',
  userRole: 'ADMIN',
};

const mockMembers = [
  {
    id: 'member1',
    familyId: 'family1',
    userId: 'user1',
    role: 'ADMIN',
    user: mockUser,
  },
  {
    id: 'member2',
    familyId: 'family1',
    userId: 'user2',
    role: 'MEMBER',
    user: {
      id: 'user2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    },
  },
];

describe('FamilyManagement', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
    });

    mockUseFamily.mockReturnValue({
      currentFamily: mockFamily,
      refreshFamilies: vi.fn(),
    });

    mockUseWebSocket.mockReturnValue({
      socket: null,
      on: vi.fn(),
      off: vi.fn(),
    });

    // Mock API responses
    mockFamilyApi.getMembers.mockResolvedValue({
      data: { success: true, data: mockMembers },
    });
    mockFamilyApi.getInvites.mockResolvedValue({
      data: { success: true, data: [] },
    });
    mockFamilyApi.getJoinRequests.mockResolvedValue({
      data: { success: true, data: [] },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the family name in header', async () => {
    render(<FamilyManagement />);
    
    expect(screen.getByText('Test Family Family')).toBeInTheDocument();
  });

  it('shows admin controls when user is admin', async () => {
    render(<FamilyManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('family.editButton')).toBeInTheDocument();
      expect(screen.getByText('family.createVirtualMember')).toBeInTheDocument();
    });
  });

  it('hides admin controls when user is not admin', async () => {
    mockUseFamily.mockReturnValue({
      currentFamily: { ...mockFamily, userRole: 'MEMBER' },
      refreshFamilies: vi.fn(),
    });

    render(<FamilyManagement />);
    
    await waitFor(() => {
      expect(screen.queryByText('family.editButton')).not.toBeInTheDocument();
      expect(screen.queryByText('family.createVirtualMember')).not.toBeInTheDocument();
    });
  });

  it('shows family edit form when edit button is clicked', async () => {
    render(<FamilyManagement />);
    
    await waitFor(() => {
      const editButton = screen.getByText('family.editButton');
      fireEvent.click(editButton);
    });

    expect(screen.getByText('family.edit.title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Family')).toBeInTheDocument();
  });

  it('shows virtual member creation form when create button is clicked', async () => {
    render(<FamilyManagement />);
    
    await waitFor(() => {
      const createButton = screen.getByText('family.createVirtualMember');
      fireEvent.click(createButton);
    });

    expect(screen.getByLabelText('user.firstName')).toBeInTheDocument();
    expect(screen.getByLabelText('user.lastName')).toBeInTheDocument();
  });

  it('displays family members correctly', async () => {
    render(<FamilyManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe (family.you)')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('shows member actions for admin users (except for self)', async () => {
    render(<FamilyManagement />);
    
    await waitFor(() => {
      // Should not show actions for current user
      const currentUserSection = screen.getByText('John Doe (family.you)').closest('.family-management-member');
      expect(currentUserSection?.querySelector('.family-management-member-actions')).not.toBeInTheDocument();
      
      // Should show actions for other members
      const otherUserSection = screen.getByText('Jane Smith').closest('.family-management-member');
      expect(otherUserSection?.querySelector('.family-management-member-actions')).toBeInTheDocument();
    });
  });

  it('renders basic component structure', () => {
    mockUseFamily.mockReturnValue({
      currentFamily: mockFamily,
    });

    render(<FamilyManagement />);
    
    // Check for main container by class name
    const container = document.querySelector('.family-management');
    expect(container).toBeInTheDocument();
    
    // Check for members section
    expect(screen.getByText('family.members')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockFamilyApi.getMembers.mockRejectedValue(new Error('API Error'));

    render(<FamilyManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('family.loadError')).toBeInTheDocument();
    });
  });

  it('calls API to update family when edit form is submitted', async () => {
    mockFamilyApi.update.mockResolvedValue({
      data: { success: true, data: mockFamily },
    });

    render(<FamilyManagement />);
    
    // Open edit form
    await waitFor(() => {
      const editButton = screen.getByText('family.editButton');
      fireEvent.click(editButton);
    });

    // Update family name
    const nameInput = screen.getByDisplayValue('Test Family');
    fireEvent.change(nameInput, { target: { value: 'Updated Family' } });

    // Submit form via modal Apply button
    const applyButton = screen.getByText('Apply');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockFamilyApi.update).toHaveBeenCalledWith('family1', {
        name: 'Updated Family',
        description: 'A test family',
      });
    });
  });

  it('calls API to create virtual member when form is submitted', async () => {
    mockFamilyApi.createVirtualMember.mockResolvedValue({
      data: { success: true, data: {} },
    });

    render(<FamilyManagement />);
    
    // Open create virtual member form
    await waitFor(() => {
      const createButton = screen.getByText('family.createVirtualMember');
      fireEvent.click(createButton);
    });

    // Fill form
    const firstNameInput = screen.getByLabelText('user.firstName');
    const lastNameInput = screen.getByLabelText('user.lastName');
    
    fireEvent.change(firstNameInput, { target: { value: 'Virtual' } });
    fireEvent.change(lastNameInput, { target: { value: 'Member' } });

    // Submit form via modal Apply button
    const applyButton = screen.getByText('Apply');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockFamilyApi.createVirtualMember).toHaveBeenCalledWith('family1', {
        firstName: 'Virtual',
        lastName: 'Member',
        familyId: 'family1',
      });
    });
  });
}); 