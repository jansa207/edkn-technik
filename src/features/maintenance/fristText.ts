import { fristText, stunden, tag } from '@/lib/format'
import type { Frist } from './api'

/** „22.12.2026 (in 30 Tagen) · bei 1235:00 h (noch 4:30 h)“ */
export function faelligkeitText(f: Frist): string {
  const teile: string[] = []
  if (f.faellig_am) {
    teile.push(f.aktiv ? `${tag(f.faellig_am)} (${fristText(f.faellig_am)})` : tag(f.faellig_am))
  }
  if (f.faellig_bei_minuten != null) {
    let t = `bei ${stunden(f.faellig_bei_minuten)}`
    if (f.aktiv && f.rest_minuten != null) {
      t +=
        f.rest_minuten < 0
          ? ` (${stunden(-f.rest_minuten)} überzogen)`
          : ` (noch ${stunden(f.rest_minuten)})`
    } else if (f.aktiv) {
      t += ' (kein Zählerstand)'
    }
    teile.push(t)
  }
  return teile.join(' · ')
}

/** „alle 12 Monate · alle 50:00 h“ oder „einmalig“ */
export function intervallText(f: Pick<Frist, 'intervall_monate' | 'intervall_minuten'>): string {
  const teile: string[] = []
  if (f.intervall_monate) teile.push(`alle ${f.intervall_monate} Monate`)
  if (f.intervall_minuten) teile.push(`alle ${stunden(f.intervall_minuten)}`)
  return teile.length ? teile.join(' · ') : 'einmalig'
}
