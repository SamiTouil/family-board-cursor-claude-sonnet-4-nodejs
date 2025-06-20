import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserMenu } from '../components/UserMenu'
import type { User } from '../services/api'

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

// Mock the useAuth hook
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}))

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'user.editProfile': 'Edit Profile',
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
  })

  it('renders user information correctly', () => {
    render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    expect(screen.getByText('John Doe')).toBeDefined()
    expect(screen.getByText('john@example.com')).toBeDefined()
  })

  it('renders menu button', () => {
    render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    expect(screen.getByRole('button', { name: 'User menu' })).toBeDefined()
  })

  it('shows dropdown when menu button is clicked', () => {
    render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    const menuButton = screen.getByRole('button', { name: 'User menu' })
    fireEvent.click(menuButton)
    
    expect(screen.getByText('Edit Profile')).toBeDefined()
    expect(screen.getByText('Logout')).toBeDefined()
  })

  it('calls onEditProfile when edit profile is clicked', () => {
    render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    const menuButton = screen.getByRole('button', { name: 'User menu' })
    fireEvent.click(menuButton)
    
    const editProfileButton = screen.getByText('Edit Profile')
    fireEvent.click(editProfileButton)
    
    expect(mockOnEditProfile).toHaveBeenCalledTimes(1)
  })

  it('calls logout when logout button is clicked', () => {
    render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    const menuButton = screen.getByRole('button', { name: 'User menu' })
    fireEvent.click(menuButton)
    
    const logoutButton = screen.getByText('Logout')
    fireEvent.click(logoutButton)
    
    expect(mockAuthContext.logout).toHaveBeenCalledTimes(1)
  })

  it('closes dropdown when edit profile is clicked', () => {
    render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    const menuButton = screen.getByRole('button', { name: 'User menu' })
    fireEvent.click(menuButton)
    
    expect(screen.getByText('Edit Profile')).toBeDefined()
    
    const editProfileButton = screen.getByText('Edit Profile')
    fireEvent.click(editProfileButton)
    
    // Dropdown should be closed after clicking
    expect(screen.queryByText('Edit Profile')).toBeNull()
  })

  it('closes dropdown when logout is clicked', () => {
    render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    const menuButton = screen.getByRole('button', { name: 'User menu' })
    fireEvent.click(menuButton)
    
    expect(screen.getByText('Logout')).toBeDefined()
    
    const logoutButton = screen.getByText('Logout')
    fireEvent.click(logoutButton)
    
    // Dropdown should be closed after clicking
    expect(screen.queryByText('Logout')).toBeNull()
  })

  it('closes dropdown when escape key is pressed', () => {
    render(<UserMenu onEditProfile={mockOnEditProfile} />)
    
    const menuButton = screen.getByRole('button', { name: 'User menu' })
    fireEvent.click(menuButton)
    
    expect(screen.getByText('Edit Profile')).toBeDefined()
    
    fireEvent.keyDown(document, { key: 'Escape' })
    
    // Dropdown should be closed after escape
    expect(screen.queryByText('Edit Profile')).toBeNull()
  })


}) 