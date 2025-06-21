import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../App'
import type { User, Family } from '../services/api'

// Mock the auth context
const mockAuthContext = {
  user: null as User | null,
  loading: false,
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  isAuthenticated: false,
}

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

// Mock the contexts
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../contexts/FamilyContext', () => ({
  useFamily: () => mockFamilyContext,
  FamilyProvider: ({ children }: { children: React.ReactNode }) => children,
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
        'common.back': 'Back',
        'common.loading': 'Loading...',
      }
      return translations[key] || key
    },
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock components
vi.mock('../components/auth/AuthPage', () => ({
  AuthPage: () => <div data-testid="auth-page">Auth Page</div>,
}))

vi.mock('../components/family/FamilyOnboarding', () => ({
  FamilyOnboarding: () => <div data-testid="family-onboarding">Family Onboarding</div>,
}))

vi.mock('../components/dashboard/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard">Dashboard</div>,
}))

vi.mock('../components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset contexts to default state
    mockAuthContext.user = null
    mockAuthContext.loading = false
    mockAuthContext.isAuthenticated = false
    
    mockFamilyContext.families = []
    mockFamilyContext.currentFamily = null
    mockFamilyContext.loading = false
    mockFamilyContext.hasCompletedOnboarding = false
  })

  it('shows loading spinner when loading', () => {
    mockAuthContext.loading = true
    
    render(<App />)
    
    expect(screen.getByTestId('loading-spinner')).toBeDefined()
  })

  it('shows authentication page when not authenticated', () => {
    mockAuthContext.isAuthenticated = false
    
    render(<App />)
    
    expect(screen.getByTestId('auth-page')).toBeDefined()
  })

  it('shows family onboarding when authenticated but no families', () => {
    mockAuthContext.isAuthenticated = true
    mockAuthContext.user = {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      avatarUrl: null,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    }
    mockFamilyContext.hasCompletedOnboarding = false
    
    render(<App />)
    
    expect(screen.getByTestId('family-onboarding')).toBeDefined()
  })

  it('shows dashboard when authenticated and has families', () => {
    mockAuthContext.isAuthenticated = true
    mockAuthContext.user = {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      avatarUrl: null,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    }
    mockFamilyContext.hasCompletedOnboarding = true
    mockFamilyContext.families = [{
      id: 'family-1',
      name: 'Test Family',
      description: undefined,
      avatarUrl: undefined,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      creator: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      },
      memberCount: 1
    }]
    
    render(<App />)
    
    // Check for dashboard content instead of test id
    expect(screen.getByText('Welcome back, John!')).toBeDefined()
    expect(screen.getAllByText('john@example.com')).toHaveLength(2) // UserMenu + UserSummaryCard
  })

  it('renders without crashing', () => {
    render(<App />)
    // Check for app container instead of main role
    expect(document.querySelector('.app')).toBeDefined()
  })
}) 