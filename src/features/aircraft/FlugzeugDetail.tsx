import { ArrowLeft, ListTodo, Lock, LockOpen, PlaneTakeoff } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { AmpelSymbol } from '@/components/Ampel'
import { AMPEL_ERKLAERUNG, AMPEL_TEXT } from '@/components/ampelStatus'
import {
  AufgabeStatusBadge,
  Badge,
  FristBadge,
  KatBadge,
  MeldungStatusBadge,
} from '@/components/Badge'
import { Button, ButtonLink } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { FehlerBox, Hinweis, Laden, Leer } from '@/components/Feedback'
import { Feld, Textfeld } from '@/components/Form'
import { DatenFeld, DatenFelder, Panel, PanelKopf } from '@/components/Panel'
import { ART_TEXT } from '@/components/statusTexte'
import { useIstWart } from '@/features/auth/useAuth'
import { istOffen, useAufgaben, useWerkstattMeldungen } from '@/features/workshop/api'
import { aufgabenNr, datum, meldungsNr, zeitpunkt } from '@/lib/format'
import {
  hinweiseVon,
  useEntsperren,
  useFlugzeug,
  useSperren,
  useVerlauf,
  type Flugzeug,
} from './api'
import { VerlaufListe } from './Verlauf'

const BAND: Record<string, string> = {
  gruen: 'bg-ampel-gruen text-white',
  gelb: 'bg-ampel-gelb text-ampel-gelb-text',
  rot: 'bg-ampel-rot text-white',
}

interface SperrZeile {
  typ: string
  text: string
  wer?: string | null
  wann?: string | null
}

function sperrZeilen(f: Flugzeug): SperrZeile[] {
  const zeilen: SperrZeile[] = []
  if (f.gesperrt && f.sperrgrund) {
    zeilen.push({
      typ: 'Sperre',
      text: f.sperrgrund,
      wer: f.gesperrt_von_name,
      wann: f.gesperrt_am,
    })
  }
  for (const hinweis of hinweiseVon(f).filter((x) => x.kategorie === 1)) {
    zeilen.push({ typ: 'Kat 1', text: hinweis.pilotenhinweis, wann: hinweis.eingestuft_am })
  }
  if (f.vorlaeufig_gesperrt) {
    zeilen.push({
      typ: 'Vorläufig',
      text: 'Vorläufig nicht flugklar – Meldung wird von der Werkstatt geprüft',
    })
  }
  return zeilen
}

function SperrDialog({ f, onSchliessen }: { f: Flugzeug; onSchliessen: () => void }) {
  const sperren = useSperren()
  const entsperren = useEntsperren()
  const [grund, setGrund] = useState('')
  const aufheben = f.gesperrt
  const aktion = aufheben ? entsperren : sperren

  return (
    <Dialog
      offen
      onSchliessen={onSchliessen}
      titel={aufheben ? `Sperre von ${f.kennzeichen} aufheben` : `${f.kennzeichen} sperren`}
      untertitel={
        aufheben
          ? 'Hebt nur die manuelle Sperre auf. Offene Kat-1-Meldungen bleiben bestehen.'
          : 'Internes Signal an alle Piloten: nicht fliegen. Keine offizielle Stilllegung.'
      }
      fuss={
        <>
          <Button onClick={onSchliessen}>Abbrechen</Button>
          <Button
            art={aufheben ? 'primaer' : 'gefahr'}
            laedt={aktion.isPending}
            disabled={!grund.trim()}
            onClick={() =>
              aktion.mutate({ id: f.id, grund: grund.trim() }, { onSuccess: onSchliessen })
            }
          >
            {aufheben ? 'Sperre aufheben' : 'Sperren'}
          </Button>
        </>
      }
    >
      {aufheben && f.sperrgrund && (
        <DatenFeld label="Aktueller Sperrgrund">{f.sperrgrund}</DatenFeld>
      )}
      <Feld
        label={aufheben ? 'Grund für die Aufhebung' : 'Sperrgrund (sehen alle Piloten)'}
        pflicht
        zaehler={`${grund.length}/500`}
      >
        {(p) => (
          <Textfeld
            {...p}
            maxLength={500}
            value={grund}
            onChange={(e) => setGrund(e.target.value)}
            placeholder={aufheben ? 'z. B. Prüfung abgeschlossen' : 'z. B. Jahresnachprüfung läuft'}
          />
        )}
      </Feld>
    </Dialog>
  )
}

/** Werkstatt-Sicht: offene Meldungen und Aufgaben zu diesem Flugzeug */
function WerkstattBlock({ aircraftId }: { aircraftId: string }) {
  const meldungen = useWerkstattMeldungen()
  const aufgaben = useAufgaben()
  const offeneMeldungen = (meldungen.data ?? []).filter(
    (m) =>
      m.aircraft_id === aircraftId && ['neu', 'zurueckgestellt', 'in_arbeit'].includes(m.status),
  )
  const offeneAufgaben = (aufgaben.data ?? []).filter(
    (a) => a.aircraft_id === aircraftId && istOffen(a),
  )

  return (
    <Panel>
      <PanelKopf
        titel="Werkstatt"
        zusatz={`${offeneMeldungen.length + offeneAufgaben.length} offen`}
        aktionen={
          <ButtonLink
            to={`/werkstatt/aufgaben?neu=1&flugzeug=${aircraftId}`}
            groesse="klein"
            icon={<ListTodo aria-hidden="true" className="size-4" />}
          >
            Aufgabe anlegen
          </ButtonLink>
        }
      />
      {offeneMeldungen.length + offeneAufgaben.length === 0 ? (
        <p className="text-text-2 px-4 py-4 text-sm">Keine offenen Meldungen oder Aufgaben.</p>
      ) : (
        <ul className="divide-rand divide-y">
          {offeneMeldungen.map((m) => (
            <li key={m.id}>
              <Link
                to={`/werkstatt/meldungen/${m.id}`}
                className="hover:bg-flaeche flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
              >
                <span className="text-text-2 font-mono text-xs">{meldungsNr(m.nr)}</span>
                <KatBadge kategorie={m.kategorie} />
                <span className="min-w-0 flex-1 truncate text-sm">{m.text}</span>
                <MeldungStatusBadge status={m.status} />
              </Link>
            </li>
          ))}
          {offeneAufgaben.map((a) => (
            <li key={a.id}>
              <Link
                to={`/werkstatt/aufgaben/${a.id}`}
                className="hover:bg-flaeche flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
              >
                <span className="text-text-2 font-mono text-xs">{aufgabenNr(a.nr)}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.titel}</span>
                <FristBadge faellig={a.faellig_am} />
                <AufgabeStatusBadge status={a.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export function FlugzeugDetail() {
  const { id } = useParams()
  const wart = useIstWart()
  const flugzeug = useFlugzeug(id)
  const verlauf = useVerlauf(id)
  const [sperrDialog, setSperrDialog] = useState(false)

  if (flugzeug.isPending)
    return (
      <Panel>
        <Laden />
      </Panel>
    )
  if (flugzeug.isError)
    return <FehlerBox fehler={flugzeug.error} nochmal={() => void flugzeug.refetch()} />
  const f = flugzeug.data
  if (!f || !f.ampel) {
    return (
      <Panel>
        <Leer titel="Flugzeug nicht gefunden">
          <Link to="/" className="text-primaer hover:underline">
            Zur Übersicht
          </Link>
        </Leer>
      </Panel>
    )
  }

  const gruende = sperrZeilen(f)
  const kat2 = hinweiseVon(f).filter((h) => h.kategorie === 2)
  const inPruefung = f.anzahl_in_pruefung ?? 0

  return (
    <div className="space-y-4">
      <Link
        to="/"
        className="text-primaer inline-flex min-h-11 items-center gap-2 text-sm font-medium lg:hidden"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Alle Flugzeuge
      </Link>

      <Panel className="overflow-hidden">
        {/* Statusband: Farbe + Symbol + Text */}
        <div className={`flex items-center gap-3 px-4 py-3 ${BAND[f.ampel]}`} data-ampel={f.ampel}>
          <AmpelSymbol status={f.ampel} className="size-6" />
          <div>
            <p className="text-lg font-bold tracking-wide uppercase">{AMPEL_TEXT[f.ampel]}</p>
            <p className="text-sm opacity-90">{AMPEL_ERKLAERUNG[f.ampel]}</p>
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-mono text-2xl font-semibold">{f.kennzeichen}</h1>
              <p className="text-text-2">{f.muster}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink
                to={`/melden?flugzeug=${f.id}`}
                art="primaer"
                icon={<PlaneTakeoff aria-hidden="true" className="size-4" />}
              >
                Mangel melden
              </ButtonLink>
              {wart && (
                <Button
                  art={f.gesperrt ? 'sekundaer' : 'gefahr'}
                  onClick={() => setSperrDialog(true)}
                  icon={
                    f.gesperrt ? (
                      <LockOpen aria-hidden="true" className="size-4" />
                    ) : (
                      <Lock aria-hidden="true" className="size-4" />
                    )
                  }
                >
                  {f.gesperrt ? 'Sperre aufheben' : 'Sperren'}
                </Button>
              )}
            </div>
          </div>
          <DatenFelder>
            <DatenFeld label="Muster">{f.muster}</DatenFeld>
            <DatenFeld label="Art">{ART_TEXT[f.art]}</DatenFeld>
            <DatenFeld label="WK" mono>
              {f.wettbewerbskennzeichen ?? '–'}
            </DatenFeld>
            <DatenFeld label="In Prüfung" mono>
              {inPruefung}
            </DatenFeld>
          </DatenFelder>
          {inPruefung > 0 && (
            <Hinweis>
              {inPruefung === 1 ? '1 Meldung ist' : `${inPruefung} Meldungen sind`} in Prüfung durch
              die Werkstatt. Bei Unsicherheit vor dem Flug einen Wart fragen.
            </Hinweis>
          )}
        </div>
      </Panel>

      {gruende.length > 0 && (
        <Panel>
          <PanelKopf titel="Sperrgründe" zusatz={gruende.length} />
          <ul className="divide-rand divide-y">
            {gruende.map((g, i) => (
              <li key={i} className="flex gap-3 px-4 py-3">
                <span className="bg-ampel-rot h-fit rounded-sm px-1.5 py-0.5 font-mono text-xs font-bold whitespace-nowrap text-white uppercase">
                  {g.typ}
                </span>
                <div className="min-w-0 space-y-0.5 text-sm">
                  <p className="font-medium">{g.text}</p>
                  {(g.wer || g.wann) && (
                    <p className="text-text-3 font-mono text-xs">
                      {[g.wer, g.wann && zeitpunkt(g.wann)].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel>
        <PanelKopf titel="Pilotenhinweise" zusatz={kat2.length} />
        {kat2.length === 0 ? (
          <p className="text-text-2 px-4 py-4 text-sm">Keine offenen Hinweise.</p>
        ) : (
          <ul className="divide-rand divide-y">
            {kat2.map((h) => (
              <li key={h.report_id} className="flex gap-3 px-4 py-3">
                <KatBadge kategorie={2} />
                <div className="min-w-0 space-y-0.5 text-sm">
                  <p>{h.pilotenhinweis}</p>
                  <p className="text-text-3 text-xs">
                    {h.ziel && <>Behebung: {h.ziel}</>}
                    {h.eingestuft_am && (
                      <span className="font-mono"> · seit {datum(h.eingestuft_am)}</span>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {wart && <WerkstattBlock aircraftId={f.id} />}

      <Panel>
        <PanelKopf
          titel="Verlauf"
          zusatz={verlauf.data?.length}
          aktionen={wart ? <Badge ton="gelb">inkl. intern</Badge> : undefined}
        />
        {verlauf.isPending ? (
          <Laden />
        ) : verlauf.isError ? (
          <div className="p-4">
            <FehlerBox fehler={verlauf.error} />
          </div>
        ) : (
          <VerlaufListe
            eintraege={verlauf.data}
            meldungsLink={wart ? (rid) => `/werkstatt/meldungen/${rid}` : undefined}
          />
        )}
      </Panel>

      {sperrDialog && <SperrDialog f={f} onSchliessen={() => setSperrDialog(false)} />}
    </div>
  )
}
