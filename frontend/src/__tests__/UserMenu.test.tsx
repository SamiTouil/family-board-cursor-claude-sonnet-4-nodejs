import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserMenu } from '../features/auth/components/UserMenu'
import type { User } from '../types'

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

// Mock the WebSocket context
const mockWebSocketContext = {
  notifications: [],
  unreadCount: 0,
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  clearNotifications: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  isConnected: false,
}

// Mock the useAuth hook
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}))

// Mock the useWebSocket hook
vi.mock('../contexts/WebSocketContext', () => ({
  useWebSocket: () => mockWebSocketContext,
}))

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'user.editProfile': 'Edit Profile',
        'user.openSettings': 'Settings',
        'auth.logout': 'Logout',
      }
      return translations[key] || key
    },
  }),
}))

describe('UserMenu', () => {
  const mockOnEditProfile = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock context
    mockWebSocketContext.notifications = []
    mockWebSocketContext.unreadCount = 0
  })

  it('renders user information correctly', () => {
    render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    expect(screen.getByText('John Doe')).toBeDefined()
    expect(screen.getByText('john@example.com')).toBeDefined()
  })

  it('renders clickable avatar', () => {
    const { container } = render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    expect(container.querySelector('.user-avatar-clickable')).toBeDefined()
  })

  it('shows dropdown when avatar is clicked', () => {
    const { container } = render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    const avatar = container.querySelector('.user-avatar')!
    fireEvent.click(avatar)
    
    expect(screen.getByText('Notifications')).toBeDefined()
    expect(screen.getByText('Settings')).toBeDefined()
    expect(screen.getByText('Logout')).toBeDefined()
  })

  it('shows notification badge when there are unread notifications', () => {
    mockWebSocketContext.unreadCount = 3
    const { container } = render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    expect(container.querySelector('.user-menu-notification-badge')).toBeDefined()
    expect(screen.getByText('3')).toBeDefined()
  })

  it('does not show notification badge when there are no unread notifications', () => {
    mockWebSocketContext.unreadCount = 0
    const { container } = render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    expect(container.querySelector('.user-menu-notification-badge')).toBeNull()
  })

  it('displays notifications in dropdown', () => {
    mockWebSocketContext.notifications = [
      {
        id: '1',
        type: 'join-request-created',
        message: 'New join request',
        timestamp: new Date(),
        read: false,
      },
      {
        id: '2',
        type: 'member-joined',
        message: 'User joined family',
        timestamp: new Date(),
        read: true,
      },
    ] as any
    
    const { container } = render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    const avatar = container.querySelector('.user-avatar')!
    fireEvent.click(avatar)
    
    expect(screen.getByText('New join request')).toBeDefined()
    expect(screen.getByText('User joined family')).toBeDefined()
  })

  it('shows no notifications message when notifications list is empty', () => {
    mockWebSocketContext.notifications = []
    
    const { container } = render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    const avatar = container.querySelector('.user-avatar')!
    fireEvent.click(avatar)
    
    expect(screen.getByText('No notifications')).toBeDefined()
  })

  it('calls onEditProfile when settings is clicked', () => {
    const { container } = render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    const avatar = container.querySelector('.user-avatar')!
    fireEvent.click(avatar)
    
    const settingsButton = screen.getByText('Settings')
    fireEvent.click(settingsButton)
    
    expect(mockOnEditProfile).toHaveBeenCalledTimes(1)
  })

  it('calls logout when logout button is clicked', () => {
    const { container } = render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    const avatar = container.querySelector('.user-avatar')!
    fireEvent.click(avatar)
    
    const logoutButton = screen.getByText('Logout')
    fireEvent.click(logoutButton)
    
    expect(mockAuthContext.logout).toHaveBeenCalledTimes(1)
  })

  it('closes dropdown when settings is clicked', () => {
    const { container } = render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    const avatar = container.querySelector('.user-avatar')!
    fireEvent.click(avatar)
    
    expect(screen.getByText('Settings')).toBeDefined()
    
    const settingsButton = screen.getByText('Settings')
    fireEvent.click(settingsButton)
    
    // Dropdown should be closed after clicking
    expect(screen.queryByText('Settings')).toBeNull()
  })

  it('closes dropdown when logout is clicked', () => {
    const { container } = render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    const avatar = container.querySelector('.user-avatar')!
    fireEvent.click(avatar)
    
    expect(screen.getByText('Logout')).toBeDefined()
    
    const logoutButton = screen.getByText('Logout')
    fireEvent.click(logoutButton)
    
    // Dropdown should be closed after clicking
    expect(screen.queryByText('Logout')).toBeNull()
  })

  it('closes dropdown when escape key is pressed', () => {
    const { container } = render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    const avatar = container.querySelector('.user-avatar')!
    fireEvent.click(avatar)
    
    expect(screen.getByText('Settings')).toBeDefined()
    
    fireEvent.keyDown(document, { key: 'Escape' })
    
    // Dropdown should be closed after pressing escape
    expect(screen.queryByText('Settings')).toBeNull()
  })
}); 