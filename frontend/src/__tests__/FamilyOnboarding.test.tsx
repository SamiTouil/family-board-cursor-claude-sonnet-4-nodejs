import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FamilyOnboarding } from '../components/family/FamilyOnboarding'
import type { Family, User } from '../services/api'

// Mock the family context
const mockFamilyContext = {
  families: [] as Family[],
  currentFamily: null as Family | null,
  loading: false,
  hasCompletedOnboarding: false,
  createFamily: vi.fn(),
  joinFamily: vi.fn(),
  setCurrentFamily: vi.fn(),
  refreshFamilies: vi.fn(),
}

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
  isAuthenticated: true,
}

// Mock the contexts
vi.mock('../contexts/FamilyContext', () => ({
  useFamily: () => mockFamilyContext,
  FamilyProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'family.onboarding.title': 'Welcome to Family Board!',
        'family.onboarding.subtitle': 'To get started, you need to either create a new family or join an existing one.',
        'family.onboarding.createOption': 'Create New Family',
        'family.onboarding.createDescription': 'Start your own family and invite others to join.',
        'family.onboarding.joinOption': 'Join Existing Family',
        'family.onboarding.joinDescription': 'Use an invitation code to join an existing family.',
        'family.create.title': 'Create Your Family',
        'family.create.subtitle': 'Start your family board and invite others to join.',
        'family.create.name': 'Family Name',
        'family.create.namePlaceholder': 'Enter your family name',
        'family.create.description': 'Description (Optional)',
        'family.create.descriptionPlaceholder': 'Describe your family (optional)',
        'family.join.title': 'Join a Family',
        'family.join.subtitle': 'Enter the invitation code to join an existing family.',
        'family.join.inviteCode': 'Invitation Code',
        'family.join.inviteCodePlaceholder': 'Enter invitation code',
        'family.common.back': 'Back',
        'family.common.continue': 'Create Family',
        'common.back': 'Back',
        'common.loading': 'Loading...',
      }
      return translations[key] || key
    },
  }),
}))

describe('FamilyOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFamilyContext.createFamily.mockClear()
    mockFamilyContext.joinFamily.mockClear()
    mockAuthContext.logout.mockClear()
  })

  it('renders the onboarding choice screen by default', () => {
    render(<FamilyOnboarding />)
    
    expect(screen.getByText('Welcome to Family Board!')).toBeDefined()
    expect(screen.getByText('Create New Family')).toBeDefined()
    expect(screen.getByText('Join Existing Family')).toBeDefined()
  })

  it('navigates to create family form when create button is clicked', () => {
    render(<FamilyOnboarding />)
    
    const createButton = screen.getByText('Create New Family')
    fireEvent.click(createButton)
    
    expect(screen.getByText('Create Your Family')).toBeDefined()
    expect(screen.getByText('Family Name')).toBeDefined()
  })

  it('navigates to join family form when join button is clicked', () => {
    render(<FamilyOnboarding />)
    
    const joinButton = screen.getByText('Join Existing Family')
    fireEvent.click(joinButton)
    
    expect(screen.getByText('Join a Family')).toBeDefined()
    expect(screen.getByText('Invitation Code')).toBeDefined()
  })

  it('can navigate back from create family form', () => {
    render(<FamilyOnboarding />)
    
    // Go to create form
    fireEvent.click(screen.getByText('Create New Family'))
    expect(screen.getByText('Create Your Family')).toBeDefined()
    
    // Go back using the main back button (not the form's back button)
    const backButtons = screen.getAllByText('Back')
    fireEvent.click(backButtons[0]!) // Use the first back button (main onboarding back)
    expect(screen.getByText('Welcome to Family Board!')).toBeDefined()
  })

  it('can navigate back from join family form', () => {
    render(<FamilyOnboarding />)
    
    // Go to join form
    fireEvent.click(screen.getByText('Join Existing Family'))
    expect(screen.getByText('Join a Family')).toBeDefined()
    
    // Go back using the main back button (not the form's back button)
    const backButtons = screen.getAllByText('Back')
    fireEvent.click(backButtons[0]!) // Use the first back button (main onboarding back)
    expect(screen.getByText('Welcome to Family Board!')).toBeDefined()
  })

  it('calls createFamily when create form is submitted', async () => {
    const mockFamily: Family = {
      id: 'family-1',
      name: 'Test Family',
      description: 'A test family',
      avatarUrl: null,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      createdBy: '1',
    }
    
    mockFamilyContext.createFamily.mockResolvedValue(mockFamily)
    
    render(<FamilyOnboarding />)
    
    // Navigate to create form
    fireEvent.click(screen.getByText('Create New Family'))
    
    // Fill and submit form
    fireEvent.change(screen.getByLabelText('Family Name'), { target: { value: 'Test Family' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Family' }))
    
    await waitFor(() => {
      expect(mockFamilyContext.createFamily).toHaveBeenCalledWith({
        name: 'Test Family',
      })
    })
  })

  it('calls joinFamily when join form is submitted', async () => {
    const mockFamily: Family = {
      id: 'family-1',
      name: 'Joined Family',
      description: 'A joined family',
      avatarUrl: null,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      createdBy: '2',
    }
    
    mockFamilyContext.joinFamily.mockResolvedValue(mockFamily)
    
    render(<FamilyOnboarding />)
    
    // Navigate to join form
    fireEvent.click(screen.getByText('Join Existing Family'))
    
    // Fill and submit form
    fireEvent.change(screen.getByLabelText('Invitation Code'), { target: { value: 'INVITE123' } })
    // The button shows the translation key instead of translated text in tests
    fireEvent.click(screen.getByRole('button', { name: 'family.common.join' }))
    
    await waitFor(() => {
      expect(mockFamilyContext.joinFamily).toHaveBeenCalledWith({
        inviteCode: 'INVITE123',
      })
    })
  })


}) 