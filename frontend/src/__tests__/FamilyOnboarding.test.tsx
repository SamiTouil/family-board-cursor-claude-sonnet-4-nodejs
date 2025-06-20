import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FamilyOnboarding } from '../components/family/FamilyOnboarding'

// Mock the family context
const mockFamilyContext = {
  families: [],
  currentFamily: null,
  loading: false,
  hasCompletedOnboarding: false,
  createFamily: vi.fn(),
  joinFamily: vi.fn(),
  setCurrentFamily: vi.fn(),
  refreshFamilies: vi.fn(),
}

// Mock the FamilyProvider and useFamily hook
vi.mock('../contexts/FamilyContext', () => ({
  useFamily: () => mockFamilyContext,
}))

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'family.onboarding.title': 'Welcome to Family Board!',
        'family.onboarding.subtitle': 'To get started, you need to either create a new family or join an existing one.',
        'family.onboarding.createFamily': 'Create New Family',
        'family.onboarding.joinFamily': 'Join Existing Family',
        'family.onboarding.createFamilyDescription': 'Start a new family board and invite others to join',
        'family.onboarding.joinFamilyDescription': 'Join a family using an invitation code',
        'family.create.title': 'Create Your Family',
        'family.create.name': 'Family Name',
        'family.create.namePlaceholder': 'Enter your family name',
        'family.create.description': 'Description',
        'family.create.descriptionPlaceholder': 'Describe your family (optional)',
        'family.create.creating': 'Creating family...',
        'family.join.title': 'Join a Family',
        'family.join.inviteCode': 'Invitation Code',
        'family.join.inviteCodePlaceholder': 'Enter invitation code',
        'family.join.joining': 'Joining family...',
        'family.common.back': 'Back',
        'family.common.continue': 'Continue',
      }
      return translations[key] || key
    },
  }),
}))

describe('FamilyOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the onboarding choice screen by default', () => {
    render(<FamilyOnboarding />)
    
    expect(screen.getByText('Welcome to Family Board!')).toBeDefined()
    expect(screen.getByText('To get started, you need to either create a new family or join an existing one.')).toBeDefined()
    expect(screen.getByText('Create New Family')).toBeDefined()
    expect(screen.getByText('Join Existing Family')).toBeDefined()
  })

  it('navigates to create family form when create button is clicked', () => {
    render(<FamilyOnboarding />)
    
    const createButton = screen.getByText('Create New Family')
    fireEvent.click(createButton)
    
    expect(screen.getByText('Create Your Family')).toBeDefined()
    expect(screen.getByLabelText('Family Name')).toBeDefined()
    expect(screen.getByLabelText('Description')).toBeDefined()
  })

  it('navigates to join family form when join button is clicked', () => {
    render(<FamilyOnboarding />)
    
    const joinButton = screen.getByText('Join Existing Family')
    fireEvent.click(joinButton)
    
    expect(screen.getByText('Join a Family')).toBeDefined()
    expect(screen.getByLabelText('Invitation Code')).toBeDefined()
  })

  it('can navigate back from create family form', () => {
    render(<FamilyOnboarding />)
    
    // Navigate to create form
    const createButton = screen.getByText('Create New Family')
    fireEvent.click(createButton)
    
    // Click back button
    const backButton = screen.getByText('Back')
    fireEvent.click(backButton)
    
    // Should be back to choice screen
    expect(screen.getByText('Welcome to Family Board!')).toBeDefined()
    expect(screen.getByText('Create New Family')).toBeDefined()
  })

  it('can navigate back from join family form', () => {
    render(<FamilyOnboarding />)
    
    // Navigate to join form
    const joinButton = screen.getByText('Join Existing Family')
    fireEvent.click(joinButton)
    
    // Click back button
    const backButton = screen.getByText('Back')
    fireEvent.click(backButton)
    
    // Should be back to choice screen
    expect(screen.getByText('Welcome to Family Board!')).toBeDefined()
    expect(screen.getByText('Join Existing Family')).toBeDefined()
  })

  it('calls createFamily when create form is submitted', async () => {
    mockFamilyContext.createFamily.mockResolvedValue({
      id: '1',
      name: 'Test Family',
      description: 'Test Description',
      avatarUrl: null,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      createdBy: 'user1',
    })

    render(<FamilyOnboarding />)
    
    // Navigate to create form
    const createButton = screen.getByText('Create New Family')
    fireEvent.click(createButton)
    
    // Fill out form
    const nameInput = screen.getByLabelText('Family Name')
    const descriptionInput = screen.getByLabelText('Description')
    const submitButton = screen.getByText('Continue')
    
    fireEvent.change(nameInput, { target: { value: 'Test Family' } })
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockFamilyContext.createFamily).toHaveBeenCalledWith({
        name: 'Test Family',
        description: 'Test Description',
      })
    })
  })

  it('calls joinFamily when join form is submitted', async () => {
    mockFamilyContext.joinFamily.mockResolvedValue({
      id: '1',
      name: 'Test Family',
      description: 'Test Description',
      avatarUrl: null,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      createdBy: 'user1',
    })

    render(<FamilyOnboarding />)
    
    // Navigate to join form
    const joinButton = screen.getByText('Join Existing Family')
    fireEvent.click(joinButton)
    
    // Fill out form
    const codeInput = screen.getByLabelText('Invitation Code')
    const submitButton = screen.getByText('Continue')
    
    fireEvent.change(codeInput, { target: { value: 'ABC123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockFamilyContext.joinFamily).toHaveBeenCalledWith({
        inviteCode: 'ABC123',
      })
    })
  })
}) 