import { Plug } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { DatenFeld, DatenFelder, Panel, PanelKopf, SeitenKopf } from '@/components/Panel'

/**
 * Übersicht der Schnittstellen. Vereinsflieger ist vorbereitet (profiles.vf_uid,
 * aircraft_counters.quelle), aber noch nicht verbunden: Dafür braucht der Verein
 * einen App-Key, und der Abruf läuft später serverseitig (Edge Function), nie im Browser.
 */
export function SchnittstellenPage() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <SeitenKopf titel="Schnittstellen" untertitel="Anbindung an andere Systeme des Vereins." />
      <Panel>
        <PanelKopf
          titel={
            <span className="flex items-center gap-2">
              <Plug aria-hidden="true" className="size-4" />
              Vereinsflieger
            </span>
          }
          aktionen={<Badge>Nicht verbunden</Badge>}
        />
        <div className="space-y-4 p-4 text-sm">
          <p>
            Über die Vereinsflieger-Schnittstelle sollen später Betriebsstunden und Landungen aus
            dem Hauptflugbuch automatisch übernommen werden. Fristen nach Stunden (z. B.
            50-h-Kontrolle) rechnen dann ohne Nachtragen. Außerdem ist ein Login mit dem
            Vereinsflieger-Konto vorgesehen.
          </p>
          <DatenFelder>
            <DatenFeld label="Betriebsstunden">Derzeit manuell unter „Betriebsstunden“</DatenFeld>
            <DatenFeld label="Login">E-Mail und Passwort mit Freigabe</DatenFeld>
            <DatenFeld label="Voraussetzung" breit>
              App-Key des Vereins für die Vereinsflieger-API (beim Vorstand anfragen). Der Abruf
              läuft serverseitig, Zugangsdaten kommen nie in die App.
            </DatenFeld>
          </DatenFelder>
        </div>
      </Panel>
    </div>
  )
}
