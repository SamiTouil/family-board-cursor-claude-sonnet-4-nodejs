import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { FamilyManagement } from '../components/FamilyManagement';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { familyApi } from '../services/api';

// Setup jest-dom matchers
import '@testing-library/jest-dom';

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

    mockFamilyApi.getMembers.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });
  });

  it('renders family management header with family name', () => {
    mockUseFamily.mockReturnValue({
      currentFamily: mockFamily,
    });

    render(<FamilyManagement />);
    
    expect(screen.getByText('Test Family Family')).toBeInTheDocument();
  });

  it('renders family members section', () => {
    mockUseFamily.mockReturnValue({
      currentFamily: mockFamily,
    });

    render(<FamilyManagement />);
    
    expect(screen.getByText('family.members')).toBeInTheDocument();
  });

  it('does not render when no current family', () => {
    mockUseFamily.mockReturnValue({
      currentFamily: null,
    });

    render(<FamilyManagement />);

    expect(screen.queryByText('Test Family Family')).not.toBeInTheDocument();
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
}); 