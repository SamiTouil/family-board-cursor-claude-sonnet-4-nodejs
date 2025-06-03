import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../App'

describe('App', () => {
  it('renders the app title', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /family board/i })).toBeInTheDocument()
  })

  it('renders the main content area', () => {
    render(<App />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
}) 