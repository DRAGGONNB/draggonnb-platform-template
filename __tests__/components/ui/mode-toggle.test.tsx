/** @vitest-environment jsdom */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModeToggle } from '@/components/ui/mode-toggle'

describe('ModeToggle', () => {
  it('renders 2 buttons with default labels', () => {
    render(<ModeToggle value="autopilot" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Autopilot' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Hands-on' })).toBeInTheDocument()
  })

  it('clicking the inactive button calls onChange with the other value', () => {
    const onChange = vi.fn()
    render(<ModeToggle value="autopilot" onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Hands-on' }))
    expect(onChange).toHaveBeenCalledWith('hands-on')
  })

  it('clicking the already-active button calls onChange with that same value', () => {
    const onChange = vi.fn()
    render(<ModeToggle value="autopilot" onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Autopilot' }))
    expect(onChange).toHaveBeenCalledWith('autopilot')
  })

  it('aria-selected reflects current value', () => {
    render(<ModeToggle value="hands-on" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Hands-on' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Autopilot' })).toHaveAttribute('aria-selected', 'false')
  })

  it('custom labels render instead of defaults', () => {
    render(
      <ModeToggle
        value="autopilot"
        onChange={vi.fn()}
        labels={{ autopilot: 'Easy', handsOn: 'Advanced' }}
      />
    )
    expect(screen.getByRole('tab', { name: 'Easy' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Advanced' })).toBeInTheDocument()
    expect(screen.queryByText('Autopilot')).not.toBeInTheDocument()
    expect(screen.queryByText('Hands-on')).not.toBeInTheDocument()
  })

  it('tablist has the correct aria-label', () => {
    render(<ModeToggle value="autopilot" onChange={vi.fn()} ariaLabel="Dashboard mode" />)
    expect(screen.getByRole('tablist', { name: 'Dashboard mode' })).toBeInTheDocument()
  })
})
