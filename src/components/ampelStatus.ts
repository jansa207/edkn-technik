import type { Database } from '@/lib/database.types'

// Werte der Spalte `ampel` der View `aircraft_overview` (Enum public.ampel)
export type AmpelStatus = Database['public']['Enums']['ampel']

export const AMPEL_TEXT: Record<AmpelStatus, string> = {
  gruen: 'Klar',
  gelb: 'Klar mit Hinweisen',
  rot: 'Gesperrt',
}

export const AMPEL_ERKLAERUNG: Record<AmpelStatus, string> = {
  gruen: 'Keine offenen Punkte, die du vor dem Flug wissen musst.',
  gelb: 'Fliegbar. Ein Wart hat bekannte Punkte geprüft und Hinweise für Piloten freigegeben.',
  rot: 'Nicht flugklar – gesperrt durch einen Wart oder vorläufig durch einen Melder.',
}
