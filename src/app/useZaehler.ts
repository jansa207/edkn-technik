import { useNutzer } from '@/features/admin/api'
import { useIstAdmin, useIstWart, useProfil } from '@/features/auth/useAuth'
import { useFristen } from '@/features/maintenance/api'
import { istOffen, useAufgaben, useWerkstattMeldungen } from '@/features/workshop/api'
import type { ZaehlerArt } from './navigation'

/** Zähler für die Navigation (nur für Rollen, die den Bereich sehen) */
export function useZaehler(): Record<ZaehlerArt, number> {
  const profil = useProfil()
  const wart = useIstWart()
  const admin = useIstAdmin()
  const meldungen = useWerkstattMeldungen(wart)
  const aufgaben = useAufgaben(wart)
  const nutzer = useNutzer(admin)
  const fristen = useFristen(wart)

  return {
    neueMeldungen: meldungen.data?.filter((m) => m.status === 'neu').length ?? 0,
    aufgabenUeberfaellig: aufgaben.data?.filter((a) => a.ueberfaellig).length ?? 0,
    meineAufgaben:
      aufgaben.data?.filter((a) => istOffen(a) && a.zustaendig_id === profil.id).length ?? 0,
    nutzerAusstehend: nutzer.data?.filter((n) => n.freigabe === 'ausstehend').length ?? 0,
    fristenUeberfaellig: fristen.data?.filter((f) => f.stand === 'ueberfaellig').length ?? 0,
  }
}
