import { Navigate, type RouteObject } from 'react-router'
import { FlugzeugVerwaltungPage } from '@/features/admin/FlugzeugVerwaltungPage'
import { NutzerPage } from '@/features/admin/NutzerPage'
import { SchnittstellenPage } from '@/features/admin/SchnittstellenPage'
import { VerwaltungPage } from '@/features/admin/VerwaltungPage'
import { FlottePage, FlugzeugPlatzhalter } from '@/features/aircraft/FlottePage'
import { FlugzeugDetail } from '@/features/aircraft/FlugzeugDetail'
import { OffenePunktePage } from '@/features/aircraft/OffenePunkte'
import { FreigabePage } from '@/features/auth/FreigabePage'
import { RequireFreigabe, RequireRolle, RequireSession } from '@/features/auth/guards'
import { LoginPage } from '@/features/auth/LoginPage'
import { PasswortNeuPage, PasswortVergessenPage } from '@/features/auth/PasswortPages'
import { ProfilPage } from '@/features/auth/ProfilPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { BetriebsstundenPage } from '@/features/maintenance/BetriebsstundenPage'
import { FristenPage } from '@/features/maintenance/FristenPage'
import { WartungsprogrammePage } from '@/features/maintenance/WartungsprogrammePage'
import {
  MeineMeldungDetail,
  MeineMeldungenPage,
  MeineMeldungPlatzhalter,
} from '@/features/reports/MeineMeldungenPage'
import { MeldenPage } from '@/features/reports/MeldenPage'
import { ArchivPage } from '@/features/workshop/ArchivPage'
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
                    ...h('Flottenstatus', 'Flugbetrieb'),
                    children: [
                      { index: true, element: <FlugzeugPlatzhalter /> },
                      {
                        path: 'flugzeuge/:id',
                        element: <FlugzeugDetail />,
                        ...h('Luftfahrzeug', 'Flottenstatus'),
                      },
                    ],
                  },
                  {
                    path: '/beanstandungen',
                    element: <OffenePunktePage />,
                    ...h('Offene Punkte', 'Flugbetrieb'),
                  },
                  {
                    path: '/melden',
                    element: <MeldenPage />,
                    ...h('Beanstandung melden', 'Flugbetrieb'),
                  },
                  {
                    path: '/meine-meldungen',
                    element: <MeineMeldungenPage />,
                    ...h('Meine Beanstandungen', 'Flugbetrieb'),
                    children: [
                      { index: true, element: <MeineMeldungPlatzhalter /> },
                      {
                        path: ':id',
                        element: <MeineMeldungDetail />,
                        ...h('Beanstandung', 'Meine Beanstandungen'),
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
                        ...h('Beanstandungseingang', 'Instandhaltung'),
                        children: [
                          { index: true, element: <MeldungPlatzhalter /> },
                          {
                            path: ':id',
                            element: <MeldungBearbeiten />,
                            ...h('Beanstandung', 'Beanstandungseingang'),
                          },
                        ],
                      },
                      {
                        path: 'aufgaben',
                        element: <AufgabenPage />,
                        ...h('Aufgaben', 'Instandhaltung'),
                        children: [
                          { index: true, element: <AufgabePlatzhalter /> },
                          { path: ':id', element: <AufgabeDetail />, ...h('Aufgabe', 'Aufgaben') },
                        ],
                      },
                      {
                        path: 'fristen',
                        element: <FristenPage />,
                        ...h('Fristen', 'Instandhaltung'),
                      },
                      {
                        path: 'betriebsstunden',
                        element: <BetriebsstundenPage />,
                        ...h('Betriebsstunden', 'Instandhaltung'),
                      },
                      { path: 'archiv', element: <ArchivPage />, ...h('Archiv', 'Instandhaltung') },
                    ],
                  },
                  {
                    path: '/verwaltung',
                    element: <RequireRolle rollen={['wart', 'admin']} />,
                    children: [
                      { index: true, element: <VerwaltungPage />, ...h('Übersicht', 'Verwaltung') },
                      {
                        path: 'wartungsprogramme',
                        element: <WartungsprogrammePage />,
                        ...h('Wartungsprogramme', 'Verwaltung'),
                      },
                      {
                        element: <RequireRolle rollen={['admin']} />,
                        children: [
                          {
                            path: 'nutzer',
                            element: <NutzerPage />,
                            ...h('Nutzer und Freigaben', 'Verwaltung'),
                          },
                          {
                            path: 'flugzeuge',
                            element: <FlugzeugVerwaltungPage />,
                            ...h('Luftfahrzeuge', 'Verwaltung'),
                          },
                          {
                            path: 'schnittstellen',
                            element: <SchnittstellenPage />,
                            ...h('Schnittstellen', 'Verwaltung'),
                          },
                        ],
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
