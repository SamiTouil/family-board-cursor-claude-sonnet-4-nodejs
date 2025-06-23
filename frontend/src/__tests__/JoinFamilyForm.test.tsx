import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JoinFamilyForm } from '../features/family/components/JoinFamilyForm'
import type { Family, FamilyJoinRequest } from '../types'

// Mock the family context
const mockFamilyContext = {
  families: [] as Family[],
  currentFamily: null as Family | null,
  loading: false,
  hasCompletedOnboarding: false,
  pendingJoinRequests: [] as FamilyJoinRequest[],
  approvalNotification: null,
  createFamily: vi.fn(),
  joinFamily: vi.fn(),
  setCurrentFamily: vi.fn(),
  refreshFamilies: vi.fn(),
  loadPendingJoinRequests: vi.fn(),
  cancelJoinRequest: vi.fn(),
  dismissApprovalNotification: vi.fn(),
}

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'family.join.title': 'Join a Family',
        'family.join.subtitle': 'Enter the invitation code to join an existing family.',
        'family.join.inviteCode': 'Invitation Code',
        'family.join.inviteCodePlaceholder': 'Enter invitation code',
        'family.join.message': 'Message (Optional)',
        'family.join.messagePlaceholder': 'Optional message to family admin',
        'family.join.requestSubmittedTitle': 'Request Submitted!',
        'family.join.requestSubmittedSubtitle': 'Your request has been sent to the family admin.',
        'family.join.requestedOn': 'Requested on',
        'family.join.waitingForApproval': 'Waiting for admin approval...',
        'family.join.cancelRequest': 'Cancel Request',
        'family.join.cancelling': 'Cancelling...',
        'family.common.back': 'Back',
        'family.common.join': 'Join Family',
        'family.join.joining': 'Joining...',
        'family.join.codeRequired': 'Invitation code is required',
      }
      return translations[key] || key
    },
  }),
}))

// Mock the contexts
vi.mock('../contexts/FamilyContext', () => ({
  useFamily: () => mockFamilyContext,
}))

describe('JoinFamilyForm', () => {
  const mockOnBack = vi.fn()
  const mockOnRequestCancelled = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFamilyContext.joinFamily.mockClear()
    mockFamilyContext.cancelJoinRequest.mockClear()
    mockOnBack.mockClear()
    mockOnRequestCancelled.mockClear()
    
    // Reset context state
    mockFamilyContext.families = []
    mockFamilyContext.pendingJoinRequests = []
    mockFamilyContext.hasCompletedOnboarding = false
  })

  it('renders join form by default when no pending requests', () => {
    render(<JoinFamilyForm onBack={mockOnBack} onRequestCancelled={mockOnRequestCancelled} />)
    
    expect(screen.getByText('Join a Family')).toBeDefined()
    expect(screen.getByText('Invitation Code')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Join Family' })).toBeDefined()
  })

  it('shows pending request screen when user has pending requests', () => {
    const mockPendingRequest: FamilyJoinRequest = {
      id: 'request-1',
      status: 'PENDING',
      message: 'Please let me join',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      family: {
        id: 'family-1',
        name: 'Test Family',
      },
      invite: {
        id: 'invite-1',
        code: 'INVITE123',
      },
      user: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      }
    }

    mockFamilyContext.pendingJoinRequests = [mockPendingRequest]

    render(<JoinFamilyForm onBack={mockOnBack} onRequestCancelled={mockOnRequestCancelled} />)
    
    expect(screen.getByText('Request Submitted!')).toBeDefined()
    expect(screen.getByText('Test Family')).toBeDefined()
    expect(screen.getByText('Cancel Request')).toBeDefined()
  })

  it('calls onRequestCancelled when request is rejected (no families)', async () => {
    const mockJoinRequest: FamilyJoinRequest = {
      id: 'request-1',
      status: 'PENDING',
      message: 'Please let me join',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      family: {
        id: 'family-1',
        name: 'Test Family',
      },
      invite: {
        id: 'invite-1',
        code: 'INVITE123',
      },
      user: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      }
    }

    // Mock the joinFamily to return a request and set pendingJoinRequests
    mockFamilyContext.joinFamily.mockResolvedValue(mockJoinRequest)
    mockFamilyContext.families = [] // No families initially

    const { rerender } = render(<JoinFamilyForm onBack={mockOnBack} onRequestCancelled={mockOnRequestCancelled} />)
    
    // Submit a join request first to get to the "Request Submitted" screen
    fireEvent.change(screen.getByLabelText('Invitation Code'), { target: { value: 'INVITE123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Join Family' }))

    // Wait for the form submission to complete and set isSubmitted to true
    await waitFor(() => {
      expect(mockFamilyContext.joinFamily).toHaveBeenCalled()
    })

    // Now simulate having a pending request (which would happen after joinFamily call)
    mockFamilyContext.pendingJoinRequests = [mockJoinRequest]
    rerender(<JoinFamilyForm onBack={mockOnBack} onRequestCancelled={mockOnRequestCancelled} />)
    
    // Verify we're on the pending request screen
    expect(screen.getByText('Request Submitted!')).toBeDefined()
    expect(mockOnRequestCancelled).not.toHaveBeenCalled()

    // Simulate request being rejected (pendingJoinRequests becomes empty, families stays empty)
    mockFamilyContext.pendingJoinRequests = []
    mockFamilyContext.families = [] // Still no families - this indicates rejection
    
    rerender(<JoinFamilyForm onBack={mockOnBack} onRequestCancelled={mockOnRequestCancelled} />)

    // Should call onRequestCancelled because families.length === 0 (rejection scenario)
    await waitFor(() => {
      expect(mockOnRequestCancelled).toHaveBeenCalled()
    })
  })

  it('does NOT call onRequestCancelled when request is approved (has families)', async () => {
    // Start with a submitted request
    const mockPendingRequest: FamilyJoinRequest = {
      id: 'request-1',
      status: 'PENDING',
      message: 'Please let me join',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      family: {
        id: 'family-1',
        name: 'Test Family',
      },
      invite: {
        id: 'invite-1',
        code: 'INVITE123',
      },
      user: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      }
    }

    const mockFamily: Family = {
      id: 'family-1',
      name: 'Test Family',
      description: 'A test family',
      avatarUrl: undefined,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      creator: {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      },
      memberCount: 2,
      userRole: 'MEMBER',
    }

    mockFamilyContext.pendingJoinRequests = [mockPendingRequest]
    mockFamilyContext.families = [] // Start with no families

    const { rerender } = render(<JoinFamilyForm onBack={mockOnBack} onRequestCancelled={mockOnRequestCancelled} />)
    
    // Verify we're on the pending request screen
    expect(screen.getByText('Request Submitted!')).toBeDefined()
    expect(mockOnRequestCancelled).not.toHaveBeenCalled()

    // Simulate request being approved (pendingJoinRequests becomes empty, families gets populated)
    mockFamilyContext.pendingJoinRequests = []
    mockFamilyContext.families = [mockFamily] // Now has families - this indicates approval
    
    rerender(<JoinFamilyForm onBack={mockOnBack} onRequestCancelled={mockOnRequestCancelled} />)

    // Should NOT call onRequestCancelled because families.length > 0 (approval scenario)
    // The main app will handle the redirect via hasCompletedOnboarding
    await waitFor(() => {
      expect(mockOnRequestCancelled).not.toHaveBeenCalled()
    })
  })

  it('submits join request successfully', async () => {
    const mockJoinRequest: FamilyJoinRequest = {
      id: 'request-1',
      status: 'PENDING',
      message: 'Please let me join',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      family: {
        id: 'family-1',
        name: 'Test Family',
      },
      invite: {
        id: 'invite-1',
        code: 'INVITE123',
      },
      user: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      }
    }

    mockFamilyContext.joinFamily.mockResolvedValue(mockJoinRequest)

    render(<JoinFamilyForm onBack={mockOnBack} onRequestCancelled={mockOnRequestCancelled} />)
    
    // Fill and submit form
    fireEvent.change(screen.getByLabelText('Invitation Code'), { target: { value: 'INVITE123' } })
    fireEvent.change(screen.getByLabelText('Message (Optional)'), { target: { value: 'Please let me join' } })
    fireEvent.click(screen.getByRole('button', { name: 'Join Family' }))
    
    await waitFor(() => {
      expect(mockFamilyContext.joinFamily).toHaveBeenCalledWith({
        code: 'INVITE123',
        message: 'Please let me join',
      })
    })
  })

  it('cancels join request successfully', async () => {
    const mockPendingRequest: FamilyJoinRequest = {
      id: 'request-1',
      status: 'PENDING',
      message: 'Please let me join',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      family: {
        id: 'family-1',
        name: 'Test Family',
      },
      invite: {
        id: 'invite-1',
        code: 'INVITE123',
      },
      user: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      }
    }

    mockFamilyContext.pendingJoinRequests = [mockPendingRequest]
    mockFamilyContext.cancelJoinRequest.mockResolvedValue(undefined)

    render(<JoinFamilyForm onBack={mockOnBack} onRequestCancelled={mockOnRequestCancelled} />)
    
    // Should be on pending request screen
    expect(screen.getByText('Request Submitted!')).toBeDefined()
    
    // Click cancel request
    fireEvent.click(screen.getByText('Cancel Request'))
    
    await waitFor(() => {
      expect(mockFamilyContext.cancelJoinRequest).toHaveBeenCalledWith('request-1')
      expect(mockOnRequestCancelled).toHaveBeenCalled()
    })
  })
}) 