import { useEffect, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router'
import { useProfil } from '@/features/auth/useAuth'
import { hatInstandhaltung, modusFuerPfad, type Modus } from './navigation'

// Gewählter Modus (Flugbetrieb/Instandhaltung) pro Gerät. Nur Komfort, darum
// localStorage mit try/catch: ohne Speicher startet die App im Flugbetrieb.
const SCHLUESSEL = 'edkn-modus'

function lesen(): Modus {
  try {
    return localStorage.getItem(SCHLUESSEL) === 'instandhaltung' ? 'instandhaltung' : 'flugbetrieb'
  } catch {
    return 'flugbetrieb'
  }
}

let aktuell: Modus = lesen()
const hoerer = new Set<() => void>()

export function setModus(modus: Modus) {
  if (modus === aktuell) return
  aktuell = modus
  try {
    localStorage.setItem(SCHLUESSEL, modus)
  } catch {
    // Speicher nicht verfügbar, Modus gilt bis zum Neuladen
  }
  for (const h of hoerer) h()
}

function abonnieren(h: () => void) {
  hoerer.add(h)
  return () => hoerer.delete(h)
}

/**
 * Aktueller Modus. Piloten sind immer im Flugbetrieb. Adressen der
 * Instandhaltung bzw. des Flugbetriebs schalten automatisch um und merken sich das.
 */
export function useModus(): Modus {
  const profil = useProfil()
  const { pathname } = useLocation()
  const gespeichert = useSyncExternalStore(
    abonnieren,
    () => aktuell,
    () => 'flugbetrieb' as Modus,
  )
  const erlaubt = hatInstandhaltung(profil.rolle)
  const vomPfad = erlaubt ? modusFuerPfad(pathname) : null

  useEffect(() => {
    if (vomPfad) setModus(vomPfad)
  }, [vomPfad])

  if (!erlaubt) return 'flugbetrieb'
  return vomPfad ?? gespeichert
}
