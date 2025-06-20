import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationCenter } from '../components/NotificationCenter'

interface WebSocketNotification {
  id: string;
  type: string;
  message: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

// Mock WebSocket context
const mockWebSocketContext = {
  socket: null,
  isConnected: false,
  notifications: [] as WebSocketNotification[],
  unreadCount: 0,
  addNotification: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  clearNotifications: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}

vi.mock('../contexts/WebSocketContext', () => ({
  useWebSocket: () => mockWebSocketContext,
}))

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWebSocketContext.notifications = []
    mockWebSocketContext.unreadCount = 0
  })

  it('renders notification bell', () => {
    render(<NotificationCenter />)
    
    expect(screen.getByRole('button', { name: /notifications/i })).toBeDefined()
  })

  it('shows notification count badge when there are unread notifications', () => {
    mockWebSocketContext.unreadCount = 3
    
    render(<NotificationCenter />)
    
    expect(screen.getByText('3')).toBeDefined()
  })

  it('does not show badge when there are no unread notifications', () => {
    mockWebSocketContext.unreadCount = 0
    
    render(<NotificationCenter />)
    
    expect(screen.queryByText('0')).toBeNull()
  })

  it('opens dropdown when bell is clicked', () => {
    render(<NotificationCenter />)
    
    const bell = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(bell)
    
    expect(screen.getByText('Notifications')).toBeDefined()
  })

  it('shows empty state when no notifications', () => {
    render(<NotificationCenter />)
    
    const bell = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(bell)
    
    expect(screen.getByText('No notifications yet')).toBeDefined()
  })

  it('displays notifications when available', () => {
    mockWebSocketContext.notifications = [
      {
        id: '1',
        type: 'join-request-approved',
        message: 'Your request to join Smith Family has been approved!',
        data: { familyName: 'Smith Family' },
        timestamp: new Date('2023-01-01T10:00:00Z'),
        read: false,
      },
      {
        id: '2',
        type: 'join-request-rejected',
        message: 'Your request to join Johnson Family has been rejected.',
        data: { familyName: 'Johnson Family' },
        timestamp: new Date('2023-01-01T09:00:00Z'),
        read: true,
      },
    ]
    
    render(<NotificationCenter />)
    
    const bell = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(bell)
    
    expect(screen.getByText('Your request to join Smith Family has been approved!')).toBeDefined()
    expect(screen.getByText('Your request to join Johnson Family has been rejected.')).toBeDefined()
  })

  it('calls markNotificationAsRead when clicking on unread notification', () => {
    mockWebSocketContext.notifications = [
      {
        id: '1',
        type: 'join-request-approved',
        message: 'Your request to join Smith Family has been approved!',
        data: { familyName: 'Smith Family' },
        timestamp: new Date('2023-01-01T10:00:00Z'),
        read: false,
      },
    ]
    
    render(<NotificationCenter />)
    
    const bell = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(bell)
    
    const notification = screen.getByText('Your request to join Smith Family has been approved!')
    fireEvent.click(notification)
    
    expect(mockWebSocketContext.markNotificationAsRead).toHaveBeenCalledWith('1')
  })

  it('calls markAllNotificationsAsRead when clicking "Mark all as read"', () => {
    mockWebSocketContext.notifications = [
      {
        id: '1',
        type: 'join-request-approved',
        message: 'Test notification',
        timestamp: new Date(),
        read: false,
      },
    ]
    mockWebSocketContext.unreadCount = 1
    
    render(<NotificationCenter />)
    
    const bell = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(bell)
    
    const markAllButton = screen.getByText('Mark all read')
    fireEvent.click(markAllButton)
    
    expect(mockWebSocketContext.markAllNotificationsAsRead).toHaveBeenCalled()
  })

  it('calls clearNotifications when clicking "Clear all"', () => {
    mockWebSocketContext.notifications = [
      {
        id: '1',
        type: 'join-request-approved',
        message: 'Test notification',
        timestamp: new Date(),
        read: false,
      },
    ]
    
    render(<NotificationCenter />)
    
    const bell = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(bell)
    
    const clearButton = screen.getByText('Clear all')
    fireEvent.click(clearButton)
    
    expect(mockWebSocketContext.clearNotifications).toHaveBeenCalled()
  })

  it('closes dropdown when clicking outside', () => {
    render(<NotificationCenter />)
    
    const bell = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(bell)
    
    // Dropdown should be open
    expect(screen.getByText('Notifications')).toBeDefined()
    
    // Click outside
    fireEvent.mouseDown(document.body)
    
    // Dropdown should be closed
    expect(screen.queryByText('Notifications')).toBeNull()
  })

  it('applies correct CSS classes for unread notifications', () => {
    mockWebSocketContext.notifications = [
      {
        id: '1',
        type: 'join-request-approved',
        message: 'Unread notification',
        timestamp: new Date(),
        read: false,
      },
      {
        id: '2',
        type: 'join-request-approved',
        message: 'Read notification',
        timestamp: new Date(),
        read: true,
      },
    ]
    
    render(<NotificationCenter />)
    
    const bell = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(bell)
    
    const unreadNotification = screen.getByText('Unread notification').closest('.notification-item')
    const readNotification = screen.getByText('Read notification').closest('.notification-item')
    
    expect(unreadNotification).toHaveClass('unread')
    expect(readNotification).not.toHaveClass('unread')
  })
}) 