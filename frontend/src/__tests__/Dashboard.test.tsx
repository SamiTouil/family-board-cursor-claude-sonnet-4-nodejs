import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Dashboard } from '../components/Dashboard'
import type { User, Family } from '../services/api'

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

  it('displays default title when no current family', () => {
    mockFamilyContext.currentFamily = null
    
    render(<Dashboard />)
    
    expect(screen.getByText('Family Board')).toBeDefined()
    expect(document.title).toBe('Family Board')
  })

  it('displays family name in title when current family exists', () => {
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
    
    render(<Dashboard />)
    
    expect(screen.getByText('Smith Family Board')).toBeDefined()
    expect(document.title).toBe('Smith Family Board')
  })

  it('displays family-specific title and content', () => {
    const mockFamily: Family = {
      id: 'family-1',
      name: 'Johnson Family',
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
    
    render(<Dashboard />)
    
    // Check for family name in title
    expect(screen.getByText('Johnson Family Board')).toBeDefined()
    // Check for family name in UserSummaryCard
    expect(screen.getByText('Johnson Family')).toBeDefined()
    // Check for family description in UserSummaryCard
    expect(screen.getByText('A test family')).toBeDefined()
  })

  it('displays Coming Soon placeholder', () => {
    mockFamilyContext.currentFamily = null
    
    render(<Dashboard />)
    
    // Check for the Coming Soon placeholder
    expect(screen.getByText('Coming Soon')).toBeDefined()
    expect(screen.getByText('Family board features will be implemented here.')).toBeDefined()
  })

  it('displays user information in UserSummaryCard and UserMenu', () => {
    render(<Dashboard />)
    
    // Check for user name in both UserMenu and UserSummaryCard
    expect(screen.getAllByText('John Doe')).toHaveLength(2) // UserMenu + UserSummaryCard
    // Check for email in both UserMenu and UserSummaryCard
    expect(screen.getAllByText('john@example.com')).toHaveLength(2) // UserMenu + UserSummaryCard
  })

  it('displays clickable user avatar', () => {
    render(<Dashboard />)
    
    // Check for the clickable avatar with user initials
    expect(screen.getByRole('button', { name: 'JD' })).toBeDefined()
  })
}) 