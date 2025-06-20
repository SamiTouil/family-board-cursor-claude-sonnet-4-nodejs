import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../App'
import type { User } from '../services/api'

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
  families: [],
  currentFamily: null,
  loading: false,
  hasCompletedOnboarding: false,
  createFamily: vi.fn(),
  joinFamily: vi.fn(),
  setCurrentFamily: vi.fn(),
  refreshFamilies: vi.fn(),
}

// Mock the AuthProvider and useAuth hook
vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext,
}))

// Mock the FamilyProvider and useFamily hook
vi.mock('../contexts/FamilyContext', () => ({
  FamilyProvider: ({ children }: { children: React.ReactNode }) => children,
  useFamily: () => mockFamilyContext,
}))

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'app.title': 'Family Board',
        'auth.loginTitle': 'Welcome Back',
        'auth.loginSubtitle': 'Sign in to your account',
        'auth.login': 'Login',
        'auth.email': 'Email Address',
        'auth.password': 'Password',
        'auth.noAccount': "Don't have an account?",
        'auth.signupLink': 'Sign up here',
        'common.loading': 'Loading...',
        'family.onboarding.title': 'Welcome to Family Board!',
        'family.onboarding.createFamily': 'Create New Family',
        'family.onboarding.joinFamily': 'Join Existing Family',
      }
      return translations[key] || key
    },
  }),
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    
    expect(screen.getByText('Loading...')).toBeDefined()
  })

  it('shows authentication page when not authenticated', () => {
    render(<App />)
    
    expect(screen.getByRole('heading', { name: /family board/i })).toBeDefined()
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /login/i })).toBeDefined()
  })

  it('shows family onboarding when authenticated but no families', () => {
    mockAuthContext.user = {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      avatarUrl: null,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    }
    mockAuthContext.isAuthenticated = true
    mockFamilyContext.hasCompletedOnboarding = false
    
    render(<App />)
    
    // Should show family onboarding instead of auth form or dashboard
    expect(screen.queryByRole('button', { name: /login/i })).toBeNull()
    expect(screen.getByText('Welcome to Family Board!')).toBeDefined()
    expect(screen.getByText('Create New Family')).toBeDefined()
    expect(screen.getByText('Join Existing Family')).toBeDefined()
  })

  it('shows dashboard when authenticated and has families', () => {
    mockAuthContext.user = {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      avatarUrl: null,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    }
    mockAuthContext.isAuthenticated = true
    mockFamilyContext.hasCompletedOnboarding = true
    
    render(<App />)
    
    // Should show dashboard
    expect(screen.queryByRole('button', { name: /login/i })).toBeNull()
    expect(screen.queryByText('Welcome to Family Board!')).toBeNull()
    // Note: Dashboard content would be tested separately
  })

  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /family board/i })).toBeDefined()
  })
}) 