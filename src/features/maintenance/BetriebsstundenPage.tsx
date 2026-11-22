import { Gauge, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { FehlerBox, Hinweis, Laden, Leer } from '@/components/Feedback'
import { Eingabe, Feld } from '@/components/Form'
import { Panel, PanelKopf, SeitenKopf, Tabelle } from '@/components/Panel'
import { ART_TEXT } from '@/components/statusTexte'
import { useFlotte, type Flugzeug } from '@/features/aircraft/api'
import { heuteIso, minutenAus, stunden, tag, zeitpunkt } from '@/lib/format'
import { useAktuelleZaehler, useZaehlerErfassen, useZaehlerVerlauf } from './api'

function ErfassenDialog({
  flugzeug,
  onSchliessen,
}: {
  flugzeug: Flugzeug
  onSchliessen: () => void
}) {
  const erfassen = useZaehlerErfassen()
  const verlauf = useZaehlerVerlauf(flugzeug.id)
  const letzter = verlauf.data?.[0]
  const [am, setAm] = useState(heuteIso())
  const [std, setStd] = useState('')
  const [landungen, setLandungen] = useState('')
  const [notiz, setNotiz] = useState('')
  const minuten = minutenAus(std)
  const fehler =
    !am || am > heuteIso()
      ? 'Datum darf nicht in der Zukunft liegen.'
      : minuten === null
        ? 'Stunden bitte als 1234:56 oder 1234,5 angeben.'
        : landungen && !/^\d+$/.test(landungen)
          ? 'Landungen als ganze Zahl angeben.'
          : null

  return (
    <Dialog
      offen
      onSchliessen={onSchliessen}
      titel={`Zählerstand erfassen – ${flugzeug.kennzeichen}`}
      untertitel="Betriebsstunden laut Bordbuch bzw. Betriebsstundenzähler."
      fuss={
        <>
          <Button onClick={onSchliessen}>Abbrechen</Button>
          <Button
            art="primaer"
            disabled={Boolean(fehler)}
            laedt={erfassen.isPending}
            onClick={() =>
              minuten !== null &&
              erfassen.mutate(
                {
                  aircraftId: flugzeug.id,
                  standAm: am,
                  minuten,
                  landungen: landungen ? Number(landungen) : null,
                  notiz: notiz.trim(),
                },
                { onSuccess: onSchliessen },
              )
            }
          >
            Speichern
          </Button>
        </>
      }
    >
      {letzter && (
        <Hinweis>
          Letzter Stand: <span className="font-mono">{stunden(letzter.betriebsminuten)}</span>
          {letzter.landungen != null && <> · {letzter.landungen} Landungen</>} vom{' '}
          <span className="font-mono">{tag(letzter.stand_am)}</span>
        </Hinweis>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Feld label="Stand am" pflicht>
          {(p) => (
            <Eingabe
              {...p}
              type="date"
              max={heuteIso()}
              value={am}
              onChange={(e) => setAm(e.target.value)}
            />
          )}
        </Feld>
        <Feld label="Betriebsstunden" pflicht hinweis="z. B. 1234:56">
          {(p) => (
            <Eingabe
              {...p}
              inputMode="decimal"
              className="font-mono"
              value={std}
              onChange={(e) => setStd(e.target.value)}
              placeholder="hhhh:mm"
            />
          )}
        </Feld>
        <Feld label="Landungen">
          {(p) => (
            <Eingabe
              {...p}
              inputMode="numeric"
              className="font-mono"
              value={landungen}
              onChange={(e) => setLandungen(e.target.value)}
            />
          )}
        </Feld>
      </div>
      <Feld label="Notiz">
        {(p) => (
          <Eingabe
            {...p}
            maxLength={300}
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            placeholder="z. B. nach Flugtag"
          />
        )}
      </Feld>
      {std && fehler && <p className="text-text-3 text-sm">{fehler}</p>}
      {erfassen.isError && <FehlerBox fehler={erfassen.error} />}

      {(verlauf.data?.length ?? 0) > 0 && (
        <div className="border-rand space-y-2 border-t pt-3">
          <p className="text-sm font-semibold">Letzte Einträge</p>
          <ul className="space-y-1 text-sm">
            {verlauf.data!.slice(0, 8).map((z) => (
              <li key={z.id} className="flex flex-wrap gap-x-3 font-mono text-xs">
                <span>{tag(z.stand_am)}</span>
                <span className="font-semibold">{stunden(z.betriebsminuten)}</span>
                {z.landungen != null && <span>{z.landungen} Ldg.</span>}
                <span className="text-text-3">erfasst {zeitpunkt(z.created_at)}</span>
                {z.notiz && <span className="text-text-2 font-sans">{z.notiz}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Dialog>
  )
}

export function BetriebsstundenPage() {
  const flotte = useFlotte()
  const zaehler = useAktuelleZaehler()
  const [dialog, setDialog] = useState<Flugzeug | null>(null)
  const liste = (flotte.data ?? []).filter((f) => f.aktiv)
  const standVon = (id: string) => zaehler.data?.find((z) => z.aircraft_id === id)

  return (
    <div className="space-y-4 lg:space-y-6">
      <SeitenKopf
        titel="Betriebsstunden"
        untertitel="Zählerstände pro Luftfahrzeug. Grundlage für Fristen nach Stunden (z. B. 50-h-Kontrolle)."
      />
      <Hinweis>
        Stände werden derzeit von Hand nachgetragen. Eine automatische Übernahme aus Vereinsflieger
        ist vorbereitet, siehe{' '}
        <Link to="/verwaltung/schnittstellen" className="font-medium underline">
          Schnittstellen
        </Link>
        .
      </Hinweis>
      <Panel>
        <PanelKopf titel="Luftfahrzeuge" zusatz={liste.length} />
        {flotte.isPending || zaehler.isPending ? (
          <Laden />
        ) : flotte.isError || zaehler.isError ? (
          <div className="p-4">
            <FehlerBox fehler={flotte.error ?? zaehler.error} />
          </div>
        ) : liste.length === 0 ? (
          <Leer icon={<Gauge />} titel="Keine Luftfahrzeuge" />
        ) : (
          <>
            <div className="hidden md:block">
              <Tabelle
                kopf={[
                  'Kennzeichen',
                  'Muster',
                  'Betriebsstunden',
                  'Landungen',
                  'Stand vom',
                  'Quelle',
                  '',
                ]}
              >
                {liste.map((f) => {
                  const z = standVon(f.id)
                  return (
                    <tr key={f.id}>
                      <td className="px-4 py-2.5 font-mono font-semibold">
                        <Link to={`/flugzeuge/${f.id}`} className="hover:underline">
                          {f.kennzeichen}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        {f.muster} <span className="text-text-3">· {ART_TEXT[f.art]}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono">
                        {z ? stunden(z.betriebsminuten) : '–'}
                      </td>
                      <td className="px-4 py-2.5 font-mono">{z?.landungen ?? '–'}</td>
                      <td className="px-4 py-2.5 font-mono">{z ? tag(z.stand_am) : '–'}</td>
                      <td className="px-4 py-2.5">
                        {z ? (
                          <Badge ton={z.quelle === 'vereinsflieger' ? 'blau' : 'grau'}>
                            {z.quelle === 'vereinsflieger' ? 'Vereinsflieger' : 'Manuell'}
                          </Badge>
                        ) : (
                          '–'
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          groesse="klein"
                          icon={<Plus aria-hidden="true" className="size-4" />}
                          onClick={() => setDialog(f)}
                        >
                          Erfassen
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </Tabelle>
            </div>
            <ul className="divide-rand divide-y md:hidden">
              {liste.map((f) => {
                const z = standVon(f.id)
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setDialog(f)}
                      className="hover:bg-flaeche flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono font-semibold">{f.kennzeichen}</span>
                        <span className="text-text-2 block text-sm">{f.muster}</span>
                      </span>
                      <span className="text-right">
                        <span className="block font-mono text-sm">
                          {z ? stunden(z.betriebsminuten) : 'kein Stand'}
                        </span>
                        {z && (
                          <span className="text-text-3 block font-mono text-xs">
                            {tag(z.stand_am)}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Panel>
      {dialog && <ErfassenDialog flugzeug={dialog} onSchliessen={() => setDialog(null)} />}
    </div>
  )
}
