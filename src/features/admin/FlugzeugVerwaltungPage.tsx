import { Plane, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Ampel } from '@/components/Ampel'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { FehlerBox, Laden, Leer } from '@/components/Feedback'
import { Auswahl, Eingabe, Feld, Haken } from '@/components/Form'
import { Panel, PanelKopf, SeitenKopf, Tabelle } from '@/components/Panel'
import { ART_TEXT, type FlugzeugArt } from '@/components/statusTexte'
import { useFlotte, type Flugzeug } from '@/features/aircraft/api'
import { useFlugzeugSpeichern, type FlugzeugDaten } from './api'

function FlugzeugDialog({
  flugzeug,
  onSchliessen,
}: {
  flugzeug: Flugzeug | null
  onSchliessen: () => void
}) {
  const speichern = useFlugzeugSpeichern()
  const [d, setD] = useState<FlugzeugDaten>({
    kennzeichen: flugzeug?.kennzeichen ?? '',
    wettbewerbskennzeichen: flugzeug?.wettbewerbskennzeichen ?? null,
    muster: flugzeug?.muster ?? '',
    art: flugzeug?.art ?? 'segler',
    aktiv: flugzeug?.aktiv ?? true,
  })
  const [versucht, setVersucht] = useState(false)
  const fehlt = d.kennzeichen.trim().length < 2 || !d.muster.trim()

  function absenden(e: FormEvent) {
    e.preventDefault()
    setVersucht(true)
    if (fehlt) return
    speichern.mutate(
      {
        id: flugzeug?.id ?? null,
        daten: {
          ...d,
          kennzeichen: d.kennzeichen.trim().toUpperCase(),
          wettbewerbskennzeichen: d.wettbewerbskennzeichen?.trim() || null,
          muster: d.muster.trim(),
        },
      },
      { onSuccess: onSchliessen },
    )
  }

  return (
    <Dialog
      offen
      onSchliessen={onSchliessen}
      titel={flugzeug ? `${flugzeug.kennzeichen} bearbeiten` : 'Flugzeug anlegen'}
      untertitel="Stammdaten. Status und Sperren laufen über die Werkstatt."
      fuss={
        <>
          <Button onClick={onSchliessen}>Abbrechen</Button>
          <Button art="primaer" type="submit" form="flugzeug-form" laedt={speichern.isPending}>
            Speichern
          </Button>
        </>
      }
    >
      <form id="flugzeug-form" onSubmit={absenden} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld
            label="Kennzeichen"
            pflicht
            fehler={
              versucht && d.kennzeichen.trim().length < 2 ? 'Bitte Kennzeichen angeben.' : null
            }
          >
            {(p) => (
              <Eingabe
                {...p}
                className="font-mono uppercase"
                maxLength={20}
                value={d.kennzeichen}
                onChange={(e) => setD({ ...d, kennzeichen: e.target.value })}
                placeholder="D-1234"
              />
            )}
          </Feld>
          <Feld label="Wettbewerbskennzeichen">
            {(p) => (
              <Eingabe
                {...p}
                className="font-mono"
                maxLength={10}
                value={d.wettbewerbskennzeichen ?? ''}
                onChange={(e) => setD({ ...d, wettbewerbskennzeichen: e.target.value })}
              />
            )}
          </Feld>
          <Feld
            label="Muster"
            pflicht
            fehler={versucht && !d.muster.trim() ? 'Bitte Muster angeben.' : null}
          >
            {(p) => (
              <Eingabe
                {...p}
                maxLength={100}
                value={d.muster}
                onChange={(e) => setD({ ...d, muster: e.target.value })}
                placeholder="z. B. ASK 21"
              />
            )}
          </Feld>
          <Feld label="Art">
            {(p) => (
              <Auswahl
                {...p}
                value={d.art}
                onChange={(e) => setD({ ...d, art: e.target.value as FlugzeugArt })}
              >
                {(Object.keys(ART_TEXT) as FlugzeugArt[]).map((a) => (
                  <option key={a} value={a}>
                    {ART_TEXT[a]}
                  </option>
                ))}
              </Auswahl>
            )}
          </Feld>
        </div>
        <Haken
          label="In Dienst"
          hinweis="Außer Dienst gestellte Flugzeuge erscheinen nicht mehr im Flottenstatus und können nicht gemeldet werden. Verlauf und Meldungen bleiben erhalten."
          checked={d.aktiv}
          onChange={(e) => setD({ ...d, aktiv: e.target.checked })}
        />
        {speichern.isError && <FehlerBox fehler={speichern.error} />}
      </form>
    </Dialog>
  )
}

export function FlugzeugVerwaltungPage() {
  const flotte = useFlotte()
  const [dialog, setDialog] = useState<{ flugzeug: Flugzeug | null } | null>(null)
  const liste = flotte.data ?? []

  return (
    <div className="space-y-4 lg:space-y-6">
      <SeitenKopf
        titel="Flugzeuge"
        untertitel="Stammdaten der Vereinsflugzeuge verwalten."
        aktionen={
          <Button
            art="primaer"
            icon={<Plus aria-hidden="true" className="size-4" />}
            onClick={() => setDialog({ flugzeug: null })}
          >
            Flugzeug anlegen
          </Button>
        }
      />
      <Panel>
        <PanelKopf titel="Flotte" zusatz={liste.length} />
        {flotte.isPending ? (
          <Laden />
        ) : flotte.isError ? (
          <div className="p-4">
            <FehlerBox fehler={flotte.error} nochmal={() => void flotte.refetch()} />
          </div>
        ) : liste.length === 0 ? (
          <Leer icon={<Plane />} titel="Noch keine Flugzeuge" />
        ) : (
          <>
            {/* Desktop: Tabelle */}
            <div className="hidden md:block">
              <Tabelle kopf={['Kennzeichen', 'WK', 'Muster', 'Art', 'Status', 'Dienst', '']}>
                {liste.map((f) => (
                  <tr key={f.id} className={f.aktiv ? '' : 'bg-flaeche/60 text-text-2'}>
                    <td className="px-4 py-2.5 font-mono font-semibold">
                      <Link to={`/flugzeuge/${f.id}`} className="hover:underline">
                        {f.kennzeichen}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-mono">{f.wettbewerbskennzeichen ?? '–'}</td>
                    <td className="px-4 py-2.5">{f.muster}</td>
                    <td className="px-4 py-2.5">{ART_TEXT[f.art]}</td>
                    <td className="px-4 py-2.5">
                      {f.ampel && <Ampel status={f.ampel} groesse="klein" />}
                    </td>
                    <td className="px-4 py-2.5">
                      {f.aktiv ? <Badge ton="gruen">In Dienst</Badge> : <Badge>Außer Dienst</Badge>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button groesse="klein" onClick={() => setDialog({ flugzeug: f })}>
                        Bearbeiten
                      </Button>
                    </td>
                  </tr>
                ))}
              </Tabelle>
            </div>
            {/* Handy: Liste */}
            <ul className="divide-rand divide-y md:hidden">
              {liste.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setDialog({ flugzeug: f })}
                    className="hover:bg-flaeche flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono font-semibold">{f.kennzeichen}</span>
                      <span className="text-text-2 block text-sm">
                        {f.muster} · {ART_TEXT[f.art]}
                      </span>
                    </span>
                    {f.aktiv ? (
                      f.ampel && <Ampel status={f.ampel} groesse="klein" />
                    ) : (
                      <Badge>Außer Dienst</Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
      {dialog && <FlugzeugDialog flugzeug={dialog.flugzeug} onSchliessen={() => setDialog(null)} />}
    </div>
  )
}
