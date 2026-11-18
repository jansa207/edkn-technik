import { QueryClient } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FOOTER_HINWEIS } from './hinweise'
import { Providers } from './Providers'
import { routes } from './routes'

// Kleiner Ersatz für den Supabase-Client: Sitzung und Tabellen pro Test einstellbar
const fake = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  tabellen: {} as Record<string, unknown[]>,
}))

vi.mock('@/lib/supabase', () => {
  function abfrage(tabelle: string) {
    const ergebnis = () => ({ data: fake.tabellen[tabelle] ?? [], error: null })
    const kette: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'in', 'order', 'limit', 'neq', 'or']) kette[m] = () => kette
    kette.single = kette.maybeSingle = () =>
      Promise.resolve({ data: (fake.tabellen[tabelle] ?? [])[0] ?? null, error: null })
    kette.then = (ok: (v: unknown) => unknown) => Promise.resolve(ergebnis()).then(ok)
    return kette
  }
  return {
    supabaseKonfiguriert: true,
    FOTO_BUCKET: 'report-photos',
    supabase: {
      from: abfrage,
      rpc: () => Promise.resolve({ data: null, error: null }),
      auth: {
        getSession: () => Promise.resolve({ data: { session: fake.session } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: () => Promise.resolve({ error: null }),
      },
    },
  }
})

const PROFIL = {
  id: 'u1',
  vorname: 'Paula',
  nachname: 'Pilot',
  email: 'pilot@test.local',
  rolle: 'pilot',
  freigabe: 'freigegeben',
  freigegeben_am: null,
  freigegeben_von: null,
  vf_uid: null,
  created_at: '2026-11-18T10:00:00Z',
}

const FLUGZEUG = {
  id: 'f1',
  kennzeichen: 'D-9001',
  wettbewerbskennzeichen: 'T1',
  muster: 'ASK 21',
  art: 'segler',
  aktiv: true,
  gesperrt: false,
  sperrgrund: null,
  gesperrt_am: null,
  gesperrt_von_name: null,
  kat1_offen: false,
  vorlaeufig_gesperrt: false,
  ampel: 'gruen',
  sperrgruende: [],
  anzahl_in_pruefung: 0,
  hinweise: [],
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <Providers client={client}>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

describe('Routen und Freigabe', () => {
  beforeEach(() => {
    fake.session = null
    fake.tabellen = {}
  })

  it('schickt ohne Anmeldung zur Anmeldeseite', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Anmelden' })).toBeInTheDocument()
    expect(screen.getAllByText(FOOTER_HINWEIS).length).toBeGreaterThan(0)
  })

  it('zeigt ausstehenden Konten nur die Warteseite', async () => {
    fake.session = { user: { id: 'u1' } }
    fake.tabellen.profiles = [{ ...PROFIL, freigabe: 'ausstehend' }]
    renderAt('/')
    expect(
      await screen.findByRole('heading', { name: 'Dein Konto wartet auf Freigabe' }),
    ).toBeInTheDocument()
  })

  it('zeigt abgelehnten Konten einen Hinweis', async () => {
    fake.session = { user: { id: 'u1' } }
    fake.tabellen.profiles = [{ ...PROFIL, freigabe: 'abgelehnt' }]
    renderAt('/meine-meldungen')
    expect(
      await screen.findByRole('heading', { name: 'Konto nicht freigegeben' }),
    ).toBeInTheDocument()
  })

  it('zeigt Piloten den Flottenstatus mit Ampel und Footer-Hinweis', async () => {
    fake.session = { user: { id: 'u1' } }
    fake.tabellen.profiles = [PROFIL]
    fake.tabellen.aircraft_overview = [FLUGZEUG]
    renderAt('/')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Flottenstatus' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('D-9001')).toBeInTheDocument()
    expect(screen.getByText(FOOTER_HINWEIS)).toBeInTheDocument()
    // Werkstatt ist für Piloten nicht im Menü
    expect(screen.queryByRole('link', { name: /Meldungseingang/ })).not.toBeInTheDocument()
  })

  it('leitet Piloten von der Werkstatt zur Startseite um', async () => {
    fake.session = { user: { id: 'u1' } }
    fake.tabellen.profiles = [PROFIL]
    const router = renderAt('/werkstatt/aufgaben')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Flottenstatus' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('zeigt Warten die Werkstatt im Menü', async () => {
    fake.session = { user: { id: 'u1' } }
    fake.tabellen.profiles = [{ ...PROFIL, rolle: 'wart' }]
    renderAt('/werkstatt/aufgaben')
    expect(await screen.findByRole('heading', { level: 1, name: 'Aufgaben' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Meldungseingang/ }).length).toBeGreaterThan(0)
  })

  it('zeigt bei unbekannter Adresse „Seite nicht gefunden“', async () => {
    fake.session = { user: { id: 'u1' } }
    fake.tabellen.profiles = [PROFIL]
    renderAt('/gibt-es-nicht')
    expect(await screen.findByRole('heading', { name: 'Seite nicht gefunden' })).toBeInTheDocument()
  })
})
