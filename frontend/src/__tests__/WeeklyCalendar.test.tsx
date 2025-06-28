import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { WeeklyCalendar } from '../components/calendar/WeeklyCalendar';
import { FamilyProvider } from '../contexts/FamilyContext';
import { AuthProvider } from '../contexts/AuthContext';
import '@testing-library/jest-dom';

// Mock the API
vi.mock('../services/api', () => ({
  weekScheduleApi: {
    getWeekSchedule: vi.fn().mockResolvedValue({
      data: {
        weekStartDate: '2024-01-01',
        familyId: 'test-family',
        baseTemplate: null,
        hasOverrides: false,
        days: []
      }
    })
  }
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
}));

// Mock WebSocket context
vi.mock('../contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    socket: null,
    isConnected: false,
  }),
}));

const mockFamily = {
  id: 'test-family-id',
  name: 'Test Family',
  userRole: 'ADMIN' as const,
  members: [],
  inviteCode: 'TEST123'
};

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User'
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <FamilyProvider>
      {children}
    </FamilyProvider>
  </AuthProvider>
);

describe('WeeklyCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <TestWrapper>
        <WeeklyCalendar />
      </TestWrapper>
    );
    
    expect(screen.getByText('Please select a family to view the calendar.')).toBeInTheDocument();
  });

  it('displays the calendar component structure', () => {
    const { container } = render(
      <TestWrapper>
        <WeeklyCalendar />
      </TestWrapper>
    );
    
    // Should render the main calendar container
    expect(container.querySelector('.weekly-calendar')).toBeTruthy();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <TestWrapper>
        <WeeklyCalendar className="custom-class" />
      </TestWrapper>
    );
    
    expect(container.firstChild).toHaveClass('weekly-calendar', 'custom-class');
  });
}); 