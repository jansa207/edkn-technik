// Anzeige-Helfer. Alle Zeiten in deutscher Zeit und absolut (keine „vor 3 Std.“),
// damit man in der Halle eindeutig über Zeitpunkte reden kann.

const ZONE = 'Europe/Berlin'

const datumFmt = new Intl.DateTimeFormat('de-DE', {
  timeZone: ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const uhrFmt = new Intl.DateTimeFormat('de-DE', {
  timeZone: ZONE,
  hour: '2-digit',
  minute: '2-digit',
})

/** 18.11.2026 */
export function datum(wert: string | Date): string {
  return datumFmt.format(typeof wert === 'string' ? new Date(wert) : wert)
}

/** 14:05 */
export function uhrzeit(wert: string | Date | number): string {
  return uhrFmt.format(typeof wert === 'string' ? new Date(wert) : wert)
}

/** 18.11.2026 14:05 */
export function zeitpunkt(wert: string | Date): string {
  return `${datum(wert)} ${uhrzeit(wert)}`
}

/** Reines Datum aus der DB (YYYY-MM-DD) → 18.11.2026, ohne Zeitzonen-Verschiebung */
export function tag(isoDatum: string): string {
  const [j, m, t] = isoDatum.split('-')
  return `${t}.${m}.${j}`
}

/** Heute als YYYY-MM-DD in deutscher Zeit */
export function heuteIso(jetzt: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(jetzt)
}

/** Ganze Tage von heute bis zum Datum (negativ = vorbei) */
export function tageBis(isoDatum: string, jetzt: Date = new Date()): number {
  const heute = Date.parse(heuteIso(jetzt))
  return Math.round((Date.parse(isoDatum) - heute) / 86_400_000)
}

/** Kurztext zur Frist: „überfällig seit 3 Tagen“, „heute“, „morgen“, „in 5 Tagen“ */
export function fristText(isoDatum: string, jetzt: Date = new Date()): string {
  const d = tageBis(isoDatum, jetzt)
  if (d < -1) return `überfällig seit ${-d} Tagen`
  if (d === -1) return 'überfällig seit gestern'
  if (d === 0) return 'heute fällig'
  if (d === 1) return 'morgen fällig'
  return `in ${d} Tagen`
}

/** M-0012 */
export function meldungsNr(nr: number | null | undefined): string {
  return nr == null ? 'M-····' : `M-${String(nr).padStart(4, '0')}`
}

/** A-0003 */
export function aufgabenNr(nr: number | null | undefined): string {
  return nr == null ? 'A-····' : `A-${String(nr).padStart(4, '0')}`
}

/** „Vorname Nachname“ ohne doppelte Leerzeichen */
export function name(vorname?: string | null, nachname?: string | null): string {
  return [vorname, nachname].filter(Boolean).join(' ').trim()
}

/** 1 Meldung / 3 Meldungen */
export function anzahl(n: number, einzahl: string, mehrzahl: string): string {
  return `${n} ${n === 1 ? einzahl : mehrzahl}`
}
