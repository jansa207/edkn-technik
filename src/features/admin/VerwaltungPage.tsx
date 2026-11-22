import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { NAVIGATION } from '@/app/navigation'
import { useZaehler } from '@/app/useZaehler'
import { Panel, SeitenKopf } from '@/components/Panel'
import { useProfil } from '@/features/auth/useAuth'

const BESCHREIBUNG: Record<string, string> = {
  '/verwaltung/flugzeuge':
    'Stammdaten der Flotte: Kennzeichen, Muster, Art. Selten nötig – nur bei Zugang, Abgang oder Korrektur.',
  '/verwaltung/wartungsprogramme':
    'Gespeicherte Checklisten (z. B. Winterwartung, 50-h-Kontrolle) für „Wartung beginnen“.',
  '/verwaltung/nutzer': 'Neue Konten freigeben, Rollen vergeben, Konten deaktivieren.',
  '/verwaltung/schnittstellen':
    'Anbindung an andere Systeme, z. B. Vereinsflieger für Login und Betriebsstunden.',
}

/** Einstieg in die Verwaltung: alle Unterpunkte, die die Rolle sehen darf */
export function VerwaltungPage() {
  const profil = useProfil()
  const zaehler = useZaehler()
  const punkte =
    NAVIGATION.find((g) => g.titel === 'Verwaltung')?.punkte.filter(
      (p) => p.to !== '/verwaltung' && (!p.rollen || p.rollen.includes(profil.rolle)),
    ) ?? []

  return (
    <div className="space-y-4 lg:space-y-6">
      <SeitenKopf
        titel="Verwaltung"
        untertitel="Einstellungen und Stammdaten, die im Alltag selten gebraucht werden."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {punkte.map((p) => (
          <Link key={p.to} to={p.to} className="group">
            <Panel className="group-hover:border-primaer flex h-full items-start gap-4 p-4">
              <span className="bg-flaeche text-text-2 flex size-10 shrink-0 items-center justify-center rounded-md">
                <p.icon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex items-center gap-2 font-semibold">
                  {p.label}
                  {p.zaehler && zaehler[p.zaehler] > 0 && (
                    <span className="bg-akzent rounded-sm px-1.5 py-0.5 font-mono text-xs text-white">
                      {zaehler[p.zaehler]}
                    </span>
                  )}
                </span>
                <span className="text-text-2 block text-sm">{BESCHREIBUNG[p.to]}</span>
              </span>
              <ChevronRight aria-hidden="true" className="text-text-3 mt-2 size-4 shrink-0" />
            </Panel>
          </Link>
        ))}
      </div>
    </div>
  )
}
