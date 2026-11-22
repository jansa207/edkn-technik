import { Badge } from '@/components/Badge'
import { fristStand, type Frist, type FristStand } from './api'

const STAND_TEXT: Record<FristStand, string> = {
  ueberfaellig: 'Überfällig',
  bald: 'Bald fällig',
  ok: 'In Ordnung',
  abgeschlossen: 'Abgeschlossen',
}

const STAND_TON = {
  ueberfaellig: 'rot',
  bald: 'gelb',
  ok: 'gruen',
  abgeschlossen: 'grau',
} as const

export function FristStandBadge({ f }: { f: Pick<Frist, 'stand'> }) {
  const s = fristStand(f)
  return <Badge ton={STAND_TON[s]}>{STAND_TEXT[s]}</Badge>
}
