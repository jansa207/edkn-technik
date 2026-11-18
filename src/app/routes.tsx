import { Navigate, type RouteObject } from 'react-router'
import { FlugzeugVerwaltungPage } from '@/features/admin/FlugzeugVerwaltungPage'
import { NutzerPage } from '@/features/admin/NutzerPage'
import { FlottePage, FlugzeugPlatzhalter } from '@/features/aircraft/FlottePage'
import { FlugzeugDetail } from '@/features/aircraft/FlugzeugDetail'
import { FreigabePage } from '@/features/auth/FreigabePage'
import { RequireFreigabe, RequireRolle, RequireSession } from '@/features/auth/guards'
import { LoginPage } from '@/features/auth/LoginPage'
import { PasswortNeuPage, PasswortVergessenPage } from '@/features/auth/PasswortPages'
import { ProfilPage } from '@/features/auth/ProfilPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import {
  MeineMeldungDetail,
  MeineMeldungenPage,
  MeineMeldungPlatzhalter,
} from '@/features/reports/MeineMeldungenPage'
import { MeldenPage } from '@/features/reports/MeldenPage'
import { AufgabeDetail } from '@/features/workshop/AufgabeDetail'
import { AufgabenPage, AufgabePlatzhalter } from '@/features/workshop/AufgabenPage'
import { MeldungBearbeiten } from '@/features/workshop/MeldungBearbeiten'
import { MeldungPlatzhalter, MeldungseingangPage } from '@/features/workshop/MeldungseingangPage'
import { ErrorPage } from './ErrorPage'
import { HilfePage } from './HilfePage'
import { Layout } from './Layout'
import type { RoutenHandle } from './navigation'
import { NotFoundPage } from './NotFoundPage'

const h = (titel: string, bereich?: string): { handle: RoutenHandle } => ({
  handle: { titel, bereich },
})

// Zentrale Routen. Die Guards sind Komfort; die echte Sperre liegt in RLS und RPCs.
export const routes: RouteObject[] = [
  {
    errorElement: <ErrorPage />,
    children: [
      { path: '/anmelden', element: <LoginPage /> },
      { path: '/registrieren', element: <RegisterPage /> },
      { path: '/passwort-vergessen', element: <PasswortVergessenPage /> },
      {
        element: <RequireSession />,
        children: [
          { path: '/passwort-neu', element: <PasswortNeuPage /> },
          { path: '/freigabe', element: <FreigabePage /> },
          {
            element: <RequireFreigabe />,
            children: [
              {
                element: <Layout />,
                children: [
                  {
                    path: '/',
                    element: <FlottePage />,
                    ...h('Flottenstatus', 'Betrieb'),
                    children: [
                      { index: true, element: <FlugzeugPlatzhalter /> },
                      {
                        path: 'flugzeuge/:id',
                        element: <FlugzeugDetail />,
                        ...h('Flugzeug', 'Flottenstatus'),
                      },
                    ],
                  },
                  { path: '/melden', element: <MeldenPage />, ...h('Mangel melden', 'Betrieb') },
                  {
                    path: '/meine-meldungen',
                    element: <MeineMeldungenPage />,
                    ...h('Meine Meldungen', 'Betrieb'),
                    children: [
                      { index: true, element: <MeineMeldungPlatzhalter /> },
                      {
                        path: ':id',
                        element: <MeineMeldungDetail />,
                        ...h('Meldung', 'Meine Meldungen'),
                      },
                    ],
                  },
                  { path: '/profil', element: <ProfilPage />, ...h('Mein Profil', 'Support') },
                  { path: '/hilfe', element: <HilfePage />, ...h('Hilfe', 'Support') },
                  {
                    path: '/werkstatt',
                    element: <RequireRolle rollen={['wart', 'admin']} />,
                    children: [
                      { index: true, element: <Navigate to="/werkstatt/meldungen" replace /> },
                      {
                        path: 'meldungen',
                        element: <MeldungseingangPage />,
                        ...h('Meldungseingang', 'Werkstatt'),
                        children: [
                          { index: true, element: <MeldungPlatzhalter /> },
                          {
                            path: ':id',
                            element: <MeldungBearbeiten />,
                            ...h('Meldung', 'Meldungseingang'),
                          },
                        ],
                      },
                      {
                        path: 'aufgaben',
                        element: <AufgabenPage />,
                        ...h('Aufgaben', 'Werkstatt'),
                        children: [
                          { index: true, element: <AufgabePlatzhalter /> },
                          { path: ':id', element: <AufgabeDetail />, ...h('Aufgabe', 'Aufgaben') },
                        ],
                      },
                    ],
                  },
                  {
                    path: '/verwaltung',
                    element: <RequireRolle rollen={['admin']} />,
                    children: [
                      { index: true, element: <Navigate to="/verwaltung/nutzer" replace /> },
                      { path: 'nutzer', element: <NutzerPage />, ...h('Nutzer', 'Verwaltung') },
                      {
                        path: 'flugzeuge',
                        element: <FlugzeugVerwaltungPage />,
                        ...h('Flugzeuge', 'Verwaltung'),
                      },
                    ],
                  },
                  { path: '*', element: <NotFoundPage />, ...h('Nicht gefunden') },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]
