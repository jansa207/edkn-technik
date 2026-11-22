import {
  Archive,
  CalendarClock,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Gauge,
  Inbox,
  LayoutGrid,
  ListTodo,
  Plane,
  PlaneTakeoff,
  Plug,
  TriangleAlert,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Rolle } from '@/components/statusTexte'

export type ZaehlerArt =
  | 'neueMeldungen'
  | 'aufgabenUeberfaellig'
  | 'nutzerAusstehend'
  | 'meineAufgaben'
  | 'fristenUeberfaellig'

/**
 * Warte und Admins sind auch Piloten. Sie sehen standardmäßig den Flugbetrieb
 * und schalten in die Instandhaltung um. Piloten haben nur den Flugbetrieb.
 */
export type Modus = 'flugbetrieb' | 'instandhaltung'

export const MODUS_TEXT: Record<Modus, string> = {
  flugbetrieb: 'Flugbetrieb',
  instandhaltung: 'Instandhaltung',
}

/** Startseite je Modus (beim Umschalten) */
export const MODUS_START: Record<Modus, string> = {
  flugbetrieb: '/',
  instandhaltung: '/werkstatt/meldungen',
}

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
  /** In welchem Modus die Gruppe erscheint (`beide` = immer) */
  modus: Modus | 'beide'
  punkte: NavPunkt[]
}

const INSTANDHALTUNG: Rolle[] = ['wart', 'admin']
const ADMIN: Rolle[] = ['admin']

export const NAVIGATION: NavGruppe[] = [
  {
    titel: 'Flugbetrieb',
    modus: 'flugbetrieb',
    punkte: [
      { to: '/', label: 'Flottenstatus', icon: Plane, exakt: true },
      { to: '/beanstandungen', label: 'Offene Punkte', icon: TriangleAlert },
      { to: '/melden', label: 'Beanstandung melden', icon: PlaneTakeoff },
      { to: '/meine-meldungen', label: 'Meine Beanstandungen', icon: FileText },
    ],
  },
  {
    titel: 'Instandhaltung',
    modus: 'instandhaltung',
    punkte: [
      { to: '/', label: 'Flottenstatus', icon: Plane, exakt: true, rollen: INSTANDHALTUNG },
      {
        to: '/werkstatt/meldungen',
        label: 'Beanstandungseingang',
        icon: Inbox,
        rollen: INSTANDHALTUNG,
        zaehler: 'neueMeldungen',
      },
      {
        to: '/werkstatt/aufgaben',
        label: 'Aufgaben',
        icon: ListTodo,
        rollen: INSTANDHALTUNG,
        zaehler: 'aufgabenUeberfaellig',
      },
      {
        to: '/werkstatt/fristen',
        label: 'Fristen',
        icon: CalendarClock,
        rollen: INSTANDHALTUNG,
        zaehler: 'fristenUeberfaellig',
      },
      {
        to: '/werkstatt/betriebsstunden',
        label: 'Betriebsstunden',
        icon: Gauge,
        rollen: INSTANDHALTUNG,
      },
      { to: '/werkstatt/archiv', label: 'Archiv', icon: Archive, rollen: INSTANDHALTUNG },
    ],
  },
  {
    titel: 'Verwaltung',
    modus: 'instandhaltung',
    punkte: [
      {
        to: '/verwaltung',
        label: 'Übersicht',
        icon: LayoutGrid,
        rollen: INSTANDHALTUNG,
        exakt: true,
      },
      { to: '/verwaltung/flugzeuge', label: 'Luftfahrzeuge', icon: ClipboardList, rollen: ADMIN },
      {
        to: '/verwaltung/wartungsprogramme',
        label: 'Wartungsprogramme',
        icon: ClipboardCheck,
        rollen: INSTANDHALTUNG,
      },
      {
        to: '/verwaltung/nutzer',
        label: 'Nutzer und Freigaben',
        icon: Users,
        rollen: ADMIN,
        zaehler: 'nutzerAusstehend',
      },
      { to: '/verwaltung/schnittstellen', label: 'Schnittstellen', icon: Plug, rollen: ADMIN },
    ],
  },
  {
    titel: 'Support',
    modus: 'beide',
    punkte: [
      { to: '/profil', label: 'Mein Profil', icon: UserRound },
      { to: '/hilfe', label: 'Hilfe', icon: CircleHelp },
    ],
  },
]

/** Darf diese Rolle zwischen den Modi umschalten? */
export function hatInstandhaltung(rolle: Rolle): boolean {
  return INSTANDHALTUNG.includes(rolle)
}

export function sichtbareNavigation(rolle: Rolle, modus: Modus = 'flugbetrieb'): NavGruppe[] {
  const m: Modus = hatInstandhaltung(rolle) ? modus : 'flugbetrieb'
  return NAVIGATION.filter((g) => g.modus === 'beide' || g.modus === m)
    .map((g) => ({
      ...g,
      punkte: g.punkte.filter((p) => !p.rollen || p.rollen.includes(rolle)),
    }))
    .filter((g) => g.punkte.length > 0)
}

/** Manche Adressen gehören fest zu einem Modus, z. B. ein Link in die Instandhaltung */
export function modusFuerPfad(pfad: string): Modus | null {
  if (pfad.startsWith('/werkstatt') || pfad.startsWith('/verwaltung')) return 'instandhaltung'
  if (
    pfad.startsWith('/melden') ||
    pfad.startsWith('/meine-meldungen') ||
    pfad.startsWith('/beanstandungen')
  ) {
    return 'flugbetrieb'
  }
  return null
}

/** Daten aus `handle` einer Route für Titel und Pfadangabe */
export interface RoutenHandle {
  titel: string
  bereich?: string
}
