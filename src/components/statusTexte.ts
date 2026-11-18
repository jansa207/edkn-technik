import type { Enums } from '@/lib/supabase'

export type MeldungStatus = Enums<'meldung_status'>
export type AufgabeStatus = Enums<'aufgabe_status'>
export type Prioritaet = Enums<'aufgabe_prioritaet'>
export type Rolle = Enums<'rolle'>
export type Freigabe = Enums<'freigabe'>
export type FlugzeugArt = Enums<'flugzeug_art'>

export const MELDUNG_STATUS_TEXT: Record<MeldungStatus, string> = {
  neu: 'Neu',
  zurueckgestellt: 'Zurückgestellt',
  in_arbeit: 'In Arbeit',
  erledigt: 'Erledigt',
  abgelegt: 'Abgelegt',
}

export const AUFGABE_STATUS_TEXT: Record<AufgabeStatus, string> = {
  offen: 'Offen',
  in_arbeit: 'In Arbeit',
  wartet: 'Wartet',
  erledigt: 'Erledigt',
  verworfen: 'Verworfen',
}

export const PRIORITAET_TEXT: Record<Prioritaet, string> = {
  hoch: 'Hoch',
  normal: 'Normal',
  niedrig: 'Niedrig',
}

export const ROLLE_TEXT: Record<Rolle, string> = {
  pilot: 'Pilot',
  wart: 'Wart',
  admin: 'Admin',
}

export const FREIGABE_TEXT: Record<Freigabe, string> = {
  ausstehend: 'Ausstehend',
  freigegeben: 'Freigegeben',
  abgelehnt: 'Abgelehnt',
  deaktiviert: 'Deaktiviert',
}

export const ART_TEXT: Record<FlugzeugArt, string> = {
  segler: 'Segelflugzeug',
  motorsegler: 'Motorsegler',
  ul: 'Ultraleicht',
  schlepp: 'Schleppflugzeug',
}

export const KAT_TEXT: Record<1 | 2 | 3, string> = {
  1: 'Sofort reparieren – nicht flugklar',
  2: 'Später erledigen – fliegbar',
  3: 'Keine Maßnahme – ablegen',
}
