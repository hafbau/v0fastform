import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GradientMesh } from './gradient-mesh'

describe('GradientMesh', () => {
  it('renders with default props', () => {
    render(<GradientMesh />)
    const mesh = screen.getByTestId('gradient-mesh')
    expect(mesh).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<GradientMesh className="fixed inset-0" />)
    const mesh = screen.getByTestId('gradient-mesh')
    expect(mesh).toHaveClass('fixed', 'inset-0')
  })

  it('applies subtle intensity by default', () => {
    render(<GradientMesh />)
    const mesh = screen.getByTestId('gradient-mesh')
    expect(mesh).toHaveClass('opacity-40')
  })

  it('applies medium intensity when specified', () => {
    render(<GradientMesh intensity="medium" />)
    const mesh = screen.getByTestId('gradient-mesh')
    expect(mesh).toHaveClass('opacity-60')
  })

  it('applies vibrant intensity when specified', () => {
    render(<GradientMesh intensity="vibrant" />)
    const mesh = screen.getByTestId('gradient-mesh')
    expect(mesh).toHaveClass('opacity-80')
  })

  it('is hidden from screen readers', () => {
    render(<GradientMesh />)
    const mesh = screen.getByTestId('gradient-mesh')
    expect(mesh).toHaveAttribute('aria-hidden', 'true')
  })

  it('has pointer-events-none to not interfere with interactions', () => {
    render(<GradientMesh />)
    const mesh = screen.getByTestId('gradient-mesh')
    expect(mesh).toHaveClass('pointer-events-none')
  })

  it('contains gradient blob elements', () => {
    render(<GradientMesh />)
    const mesh = screen.getByTestId('gradient-mesh')
    // Should have 4 child divs (3 gradient blobs + 1 overlay)
    expect(mesh.children.length).toBe(4)
  })
})
