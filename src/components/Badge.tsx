import { CalendarClock, Hourglass } from 'lucide-react'
import type { ReactNode } from 'react'
import { fristText, tag, tageBis } from '@/lib/format'
import {
  AUFGABE_STATUS_TEXT,
  FREIGABE_TEXT,
  MELDUNG_STATUS_TEXT,
  PRIORITAET_TEXT,
  type AufgabeStatus,
  type Freigabe,
  type MeldungStatus,
  type Prioritaet,
} from './statusTexte'

type Ton = 'grau' | 'blau' | 'gruen' | 'gelb' | 'rot' | 'lila' | 'orange'

const TON: Record<Ton, { box: string; punkt: string }> = {
  grau: { box: 'bg-gray-100 text-gray-700 ring-gray-300', punkt: 'bg-gray-500' },
  blau: { box: 'bg-blue-50 text-blue-800 ring-blue-200', punkt: 'bg-blue-600' },
  gruen: { box: 'bg-green-50 text-green-800 ring-green-200', punkt: 'bg-green-600' },
  gelb: { box: 'bg-amber-50 text-amber-900 ring-amber-300', punkt: 'bg-amber-500' },
  rot: { box: 'bg-red-50 text-red-800 ring-red-200', punkt: 'bg-red-600' },
  lila: { box: 'bg-violet-50 text-violet-800 ring-violet-200', punkt: 'bg-violet-600' },
  orange: { box: 'bg-orange-50 text-orange-900 ring-orange-200', punkt: 'bg-orange-500' },
}

/** Dezentes Etikett mit Farbpunkt (Bearbeitungsstand, Rolle …) */
export function Badge({
  ton = 'grau',
  children,
  punkt = true,
  icon,
}: {
  ton?: Ton
  children: ReactNode
  punkt?: boolean
  icon?: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${TON[ton].box}`}
    >
      {icon ??
        (punkt && (
          <span aria-hidden="true" className={`size-1.5 rounded-full ${TON[ton].punkt}`} />
        ))}
      {children}
    </span>
  )
}

const MELDUNG_TON: Record<MeldungStatus, Ton> = {
  neu: 'blau',
  zurueckgestellt: 'lila',
  in_arbeit: 'orange',
  erledigt: 'gruen',
  abgelegt: 'grau',
}

export function MeldungStatusBadge({ status }: { status: MeldungStatus }) {
  return <Badge ton={MELDUNG_TON[status]}>{MELDUNG_STATUS_TEXT[status]}</Badge>
}

const AUFGABE_TON: Record<AufgabeStatus, Ton> = {
  offen: 'blau',
  in_arbeit: 'orange',
  wartet: 'lila',
  erledigt: 'gruen',
  verworfen: 'grau',
}

export function AufgabeStatusBadge({ status }: { status: AufgabeStatus }) {
  return (
    <Badge
      ton={AUFGABE_TON[status]}
      icon={status === 'wartet' ? <Hourglass aria-hidden="true" className="size-3" /> : undefined}
    >
      {AUFGABE_STATUS_TEXT[status]}
    </Badge>
  )
}

export function PrioritaetBadge({ prioritaet }: { prioritaet: Prioritaet }) {
  if (prioritaet === 'normal') return null
  return (
    <Badge ton={prioritaet === 'hoch' ? 'rot' : 'grau'} punkt={false}>
      {prioritaet === 'hoch' ? '▲ ' : '▼ '}
      {PRIORITAET_TEXT[prioritaet]}
    </Badge>
  )
}

const FREIGABE_TON: Record<Freigabe, Ton> = {
  ausstehend: 'gelb',
  freigegeben: 'gruen',
  abgelehnt: 'rot',
  deaktiviert: 'grau',
}

export function FreigabeBadge({ freigabe }: { freigabe: Freigabe }) {
  return <Badge ton={FREIGABE_TON[freigabe]}>{FREIGABE_TEXT[freigabe]}</Badge>
}

/** Kategorie kräftig gefüllt, damit sie in Listen sofort auffällt */
export function KatBadge({ kategorie }: { kategorie: number | null }) {
  if (kategorie == null) {
    return (
      <span className="border-rand-stark text-text-3 inline-flex min-w-12 items-center justify-center rounded-sm border border-dashed px-1.5 py-0.5 font-mono text-xs font-semibold">
        KAT –
      </span>
    )
  }
  const stil =
    kategorie === 1
      ? 'bg-ampel-rot text-white'
      : kategorie === 2
        ? 'bg-ampel-gelb text-ampel-gelb-text'
        : 'bg-gray-500 text-white'
  return (
    <span
      className={`inline-flex min-w-12 items-center justify-center rounded-sm px-1.5 py-0.5 font-mono text-xs font-bold ${stil}`}
    >
      KAT {kategorie}
    </span>
  )
}

/** Frist mit Farbe nach Dringlichkeit, immer mit Datum als Text */
export function FristBadge({
  faellig,
  abgeschlossen = false,
}: {
  faellig: string | null
  abgeschlossen?: boolean
}) {
  if (!faellig) return <span className="text-text-3 text-sm">keine Frist</span>
  const tage = tageBis(faellig)
  const ton: Ton = abgeschlossen ? 'grau' : tage < 0 ? 'rot' : tage <= 2 ? 'gelb' : 'grau'
  return (
    <Badge ton={ton} punkt={false} icon={<CalendarClock aria-hidden="true" className="size-3" />}>
      <span className="font-mono">{tag(faellig)}</span>
      {!abgeschlossen && <span className="font-sans">· {fristText(faellig)}</span>}
    </Badge>
  )
}
