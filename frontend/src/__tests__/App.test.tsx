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

// Mock the AuthProvider and useAuth hook
vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext,
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

  it('shows dashboard when authenticated', () => {
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
    
    render(<App />)
    
    // Should show dashboard instead of auth form
    expect(screen.queryByRole('button', { name: /login/i })).toBeNull()
    // Note: Dashboard content would be tested separately
  })

  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /family board/i })).toBeDefined()
  })
}) 