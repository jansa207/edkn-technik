import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { FOOTER_HINWEIS } from './Layout'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

describe('Routen', () => {
  it('zeigt die Startseite mit Footer-Hinweis', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('EDKN Technik')
    expect(screen.getByText(FOOTER_HINWEIS)).toBeInTheDocument()
  })

  it('zeigt bei unbekannter Adresse „Seite nicht gefunden“', () => {
    renderAt('/gibt-es-nicht')
    expect(screen.getByRole('heading', { name: 'Seite nicht gefunden' })).toBeInTheDocument()
  })
})
