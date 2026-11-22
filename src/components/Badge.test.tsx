import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FristBadge, KatBadge, MeldungStatusBadge } from './Badge'

describe('Etiketten', () => {
  it('zeigt die Kategorie als Text', () => {
    render(<KatBadge kategorie={1} />)
    expect(screen.getByText('KAT 1')).toBeVisible()
  })

  it('zeigt nicht eingestufte Beanstandungen als „KAT –“', () => {
    render(<KatBadge kategorie={null} />)
    expect(screen.getByText('KAT –')).toBeVisible()
  })

  it('zeigt den Meldungsstatus auf Deutsch', () => {
    render(<MeldungStatusBadge status="zurueckgestellt" />)
    expect(screen.getByText('Zurückgestellt')).toBeVisible()
  })

  it('zeigt die Frist immer mit Datum', () => {
    render(<FristBadge faellig="2020-01-05" />)
    expect(screen.getByText('05.01.2020')).toBeVisible()
    expect(screen.getByText(/überfällig/)).toBeVisible()
  })
})
