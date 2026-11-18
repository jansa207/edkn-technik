import {
  CircleHelp,
  ClipboardList,
  FileText,
  Inbox,
  ListTodo,
  Plane,
  PlaneTakeoff,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Rolle } from '@/components/statusTexte'

export type ZaehlerArt =
  'neueMeldungen' | 'aufgabenUeberfaellig' | 'nutzerAusstehend' | 'meineAufgaben'

export interface NavPunkt {
  to: string
  label: string
  icon: LucideIcon
  rollen?: Rolle[]
  zaehler?: ZaehlerArt
  /** Nur exakt diese Adresse markieren */
  exakt?: boolean
}

export interface NavGruppe {
  titel: string
  punkte: NavPunkt[]
}

const WERKSTATT: Rolle[] = ['wart', 'admin']

export const NAVIGATION: NavGruppe[] = [
  {
    titel: 'Betrieb',
    punkte: [
      { to: '/', label: 'Flottenstatus', icon: Plane, exakt: true },
      { to: '/melden', label: 'Mangel melden', icon: PlaneTakeoff },
      { to: '/meine-meldungen', label: 'Meine Meldungen', icon: FileText },
    ],
  },
  {
    titel: 'Werkstatt',
    punkte: [
      {
        to: '/werkstatt/meldungen',
        label: 'Meldungseingang',
        icon: Inbox,
        rollen: WERKSTATT,
        zaehler: 'neueMeldungen',
      },
      {
        to: '/werkstatt/aufgaben',
        label: 'Aufgaben',
        icon: ListTodo,
        rollen: WERKSTATT,
        zaehler: 'aufgabenUeberfaellig',
      },
    ],
  },
  {
    titel: 'Verwaltung',
    punkte: [
      {
        to: '/verwaltung/nutzer',
        label: 'Nutzer',
        icon: Users,
        rollen: ['admin'],
        zaehler: 'nutzerAusstehend',
      },
      { to: '/verwaltung/flugzeuge', label: 'Flugzeuge', icon: ClipboardList, rollen: ['admin'] },
    ],
  },
  {
    titel: 'Support',
    punkte: [
      { to: '/profil', label: 'Mein Profil', icon: UserRound },
      { to: '/hilfe', label: 'Hilfe', icon: CircleHelp },
    ],
  },
]

export function sichtbareNavigation(rolle: Rolle): NavGruppe[] {
  return NAVIGATION.map((g) => ({
    ...g,
    punkte: g.punkte.filter((p) => !p.rollen || p.rollen.includes(rolle)),
  })).filter((g) => g.punkte.length > 0)
}

/** Daten aus `handle` einer Route für Titel und Pfadangabe */
export interface RoutenHandle {
  titel: string
  bereich?: string
}
