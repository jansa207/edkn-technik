import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Ampel } from './Ampel'
import { AMPEL_TEXT, type AmpelStatus } from './ampelStatus'

describe('Ampel', () => {
  it.each<AmpelStatus>(['gruen', 'gelb', 'rot'])('zeigt für "%s" immer einen Text', (status) => {
    const { container } = render(<Ampel status={status} />)
    expect(screen.getByText(AMPEL_TEXT[status])).toBeVisible()
    // Symbol vorhanden, aber für Screenreader ausgeblendet (der Text reicht)
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
  })
})
