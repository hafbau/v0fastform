import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
} from './glass-card'

describe('GlassCard', () => {
  it('renders with glassmorphism class', () => {
    render(<GlassCard>Content</GlassCard>)
    const card = screen.getByTestId('glass-card')
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('glass-card')
  })

  it('applies custom className', () => {
    render(<GlassCard className="max-w-md">Content</GlassCard>)
    const card = screen.getByTestId('glass-card')
    expect(card).toHaveClass('max-w-md')
  })

  it('renders children correctly', () => {
    render(<GlassCard>Test content</GlassCard>)
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })
})

describe('GlassCardHeader', () => {
  it('renders header content', () => {
    render(
      <GlassCard>
        <GlassCardHeader>Header content</GlassCardHeader>
      </GlassCard>
    )
    expect(screen.getByText('Header content')).toBeInTheDocument()
  })
})

describe('GlassCardTitle', () => {
  it('renders as h3 element', () => {
    render(
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle>Card Title</GlassCardTitle>
        </GlassCardHeader>
      </GlassCard>
    )
    const title = screen.getByText('Card Title')
    expect(title.tagName).toBe('H3')
  })

  it('has proper styling', () => {
    render(
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle>Card Title</GlassCardTitle>
        </GlassCardHeader>
      </GlassCard>
    )
    const title = screen.getByText('Card Title')
    expect(title).toHaveClass('text-xl', 'font-semibold')
  })
})

describe('GlassCardDescription', () => {
  it('renders description text', () => {
    render(
      <GlassCard>
        <GlassCardHeader>
          <GlassCardDescription>Card description</GlassCardDescription>
        </GlassCardHeader>
      </GlassCard>
    )
    expect(screen.getByText('Card description')).toBeInTheDocument()
  })

  it('has muted foreground styling', () => {
    render(
      <GlassCard>
        <GlassCardHeader>
          <GlassCardDescription>Card description</GlassCardDescription>
        </GlassCardHeader>
      </GlassCard>
    )
    const desc = screen.getByText('Card description')
    expect(desc).toHaveClass('text-muted-foreground')
  })
})

describe('GlassCardContent', () => {
  it('renders content with padding', () => {
    render(
      <GlassCard>
        <GlassCardContent data-testid="content">Main content</GlassCardContent>
      </GlassCard>
    )
    const content = screen.getByTestId('content')
    expect(content).toHaveClass('px-6')
  })
})

describe('GlassCardFooter', () => {
  it('renders footer content', () => {
    render(
      <GlassCard>
        <GlassCardFooter>Footer content</GlassCardFooter>
      </GlassCard>
    )
    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })

  it('has flex layout', () => {
    render(
      <GlassCard>
        <GlassCardFooter data-testid="footer">Footer content</GlassCardFooter>
      </GlassCard>
    )
    const footer = screen.getByTestId('footer')
    expect(footer).toHaveClass('flex', 'items-center')
  })
})

describe('GlassCard composition', () => {
  it('renders full card composition correctly', () => {
    render(
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle>Welcome</GlassCardTitle>
          <GlassCardDescription>Sign in to continue</GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <p>Form content here</p>
        </GlassCardContent>
        <GlassCardFooter>
          <button>Submit</button>
        </GlassCardFooter>
      </GlassCard>
    )

    expect(screen.getByText('Welcome')).toBeInTheDocument()
    expect(screen.getByText('Sign in to continue')).toBeInTheDocument()
    expect(screen.getByText('Form content here')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })
})
