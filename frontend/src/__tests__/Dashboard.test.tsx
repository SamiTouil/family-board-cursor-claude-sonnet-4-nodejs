import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Dashboard } from '../components/layout/Dashboard'
import { CurrentWeekProvider } from '../contexts/CurrentWeekContext'
import type { User, Family } from '../types'

// Mock the auth context
const mockAuthContext = {
  user: {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    avatarUrl: null,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  } as User,
  loading: false,
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  isAuthenticated: true,
}

// Mock the family context
const mockFamilyContext = {
  families: [] as Family[],
  currentFamily: null as Family | null,
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
}

// Mock the WebSocket context
const mockWebSocketContext = {
  socket: null,
  isConnected: false,
  notifications: [],
  unreadCount: 0,
  addNotification: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  clearNotifications: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}

// Mock the contexts
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}))

vi.mock('../contexts/FamilyContext', () => ({
  useFamily: () => mockFamilyContext,
}))

vi.mock('../contexts/WebSocketContext', () => ({
  useWebSocket: () => mockWebSocketContext,
}))

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'app.title': 'Family Board',
        'auth.logout': 'Logout',
      }
      return translations[key] || key
    },
  }),
}))

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset family context to default state
    mockFamilyContext.currentFamily = null
    
    // Reset document title
    document.title = 'Family Board'
  })

  it('sets default document title when no current family', () => {
    mockFamilyContext.currentFamily = null
    
    render(
      <CurrentWeekProvider>
        <Dashboard />
      </CurrentWeekProvider>
    )
    
    expect(document.title).toBe('Family Board')
  })

  it('sets family-specific document title when current family exists', () => {
    const mockFamily: Family = {
      id: 'family-1',
      name: 'Smith Family',
      description: 'A test family',
      avatarUrl: undefined,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      creator: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      memberCount: 1,
      userRole: 'ADMIN',
    }
    
    mockFamilyContext.currentFamily = mockFamily
    
    render(
      <CurrentWeekProvider>
        <Dashboard />
      </CurrentWeekProvider>
    )
    
    expect(document.title).toBe('Smith Family Board')
  })

  it('renders the WeeklyCalendar component', () => {
    const mockFamily: Family = {
      id: 'family-1',
      name: 'Test Family',
      description: 'A test family',
      avatarUrl: undefined,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      creator: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      memberCount: 1,
      userRole: 'ADMIN',
    }
    
    mockFamilyContext.currentFamily = mockFamily
    
    render(
      <CurrentWeekProvider>
        <Dashboard />
      </CurrentWeekProvider>
    )
    
    // Check that the WeeklyCalendar component is rendered
    expect(screen.getByText('Weekly Schedule')).toBeDefined()
  })

  it('shows family selection message when no family is selected', () => {
    mockFamilyContext.currentFamily = null
    
    render(
      <CurrentWeekProvider>
        <Dashboard />
      </CurrentWeekProvider>
    )
    
    // Check that the family selection message is shown
    expect(screen.getByText('Please select a family to view the calendar.')).toBeDefined()
  })
}) 