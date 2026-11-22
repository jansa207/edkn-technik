import { Archive, ArrowLeft, ListTodo, Lock, LockOpen, PlaneTakeoff, Wrench } from 'lucide-react'
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
import { FehlerBox, Laden, Leer } from '@/components/Feedback'
import { Feld, Textfeld } from '@/components/Form'
import { DatenFeld, DatenFelder, Panel, PanelKopf } from '@/components/Panel'
import { ART_TEXT } from '@/components/statusTexte'
import { useModus } from '@/app/modus'
import { useIstWart } from '@/features/auth/useAuth'
import { FristStandBadge } from '@/features/maintenance/FristTeile'
import { useAktuelleZaehler, useFristen } from '@/features/maintenance/api'
import { WartungStartenDialog } from '@/features/maintenance/WartungStartenDialog'
import { istOffen, useAufgaben, useWerkstattMeldungen } from '@/features/workshop/api'
import { aufgabenNr, datum, meldungsNr, stunden } from '@/lib/format'
import { useEntsperren, useFlugzeug, useSperren, useVerlauf, type Flugzeug } from './api'
import { FlugzeugPunkte } from './OffenePunkte'
import { VerlaufListe } from './Verlauf'

const BAND: Record<string, string> = {
  gruen: 'bg-ampel-gruen text-white',
  gelb: 'bg-ampel-gelb text-ampel-gelb-text',
  rot: 'bg-ampel-rot text-white',
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
          ? 'Hebt nur die manuelle Sperre auf. Offene Kat-1-Beanstandungen bleiben bestehen.'
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

/** Instandhaltung: Betriebsstunden und Fristen dieses Luftfahrzeugs */
function TechnikBlock({ aircraftId }: { aircraftId: string }) {
  const fristen = useFristen()
  const zaehler = useAktuelleZaehler()
  const stand = zaehler.data?.find((z) => z.aircraft_id === aircraftId)
  const offen = (fristen.data ?? [])
    .filter((d) => d.aircraft_id === aircraftId && d.aktiv)
    .sort((a, b) => rang(a.stand) - rang(b.stand))

  return (
    <Panel>
      <PanelKopf
        titel="Technischer Stand"
        aktionen={
          <ButtonLink to={`/werkstatt/fristen?flugzeug=${aircraftId}`} groesse="klein">
            Fristen
          </ButtonLink>
        }
      />
      <div className="border-rand grid grid-cols-2 gap-4 border-b p-4 sm:grid-cols-3">
        <div>
          <p className="text-text-3 text-xs font-medium tracking-wide uppercase">Betriebsstunden</p>
          <p className="mt-0.5 font-mono text-sm">{stand ? stunden(stand.betriebsminuten) : '–'}</p>
        </div>
        <div>
          <p className="text-text-3 text-xs font-medium tracking-wide uppercase">Landungen</p>
          <p className="mt-0.5 font-mono text-sm">{stand?.landungen ?? '–'}</p>
        </div>
        <div>
          <p className="text-text-3 text-xs font-medium tracking-wide uppercase">Stand vom</p>
          <p className="mt-0.5 font-mono text-sm">
            {stand ? (
              datum(stand.stand_am)
            ) : (
              <Link
                to="/werkstatt/betriebsstunden"
                className="text-primaer font-sans hover:underline"
              >
                erfassen
              </Link>
            )}
          </p>
        </div>
      </div>
      {offen.length === 0 ? (
        <p className="text-text-2 px-4 py-4 text-sm">Keine offenen Fristen.</p>
      ) : (
        <ul className="divide-rand divide-y">
          {offen.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.titel}</span>
              <FristStandBadge f={d} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function rang(stand: string | null) {
  return stand === 'ueberfaellig' ? 0 : stand === 'bald' ? 1 : 2
}

/** Instandhaltung: offene Beanstandungen und Aufgaben zu diesem Luftfahrzeug */
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
        titel="Instandhaltung"
        zusatz={`${offeneMeldungen.length + offeneAufgaben.length} offen`}
        aktionen={
          <>
            <ButtonLink
              to={`/werkstatt/archiv?flugzeug=${aircraftId}`}
              groesse="klein"
              icon={<Archive aria-hidden="true" className="size-4" />}
            >
              Archiv
            </ButtonLink>
            <ButtonLink
              to={`/werkstatt/aufgaben?neu=1&flugzeug=${aircraftId}`}
              groesse="klein"
              icon={<ListTodo aria-hidden="true" className="size-4" />}
            >
              Aufgabe anlegen
            </ButtonLink>
          </>
        }
      />
      {offeneMeldungen.length + offeneAufgaben.length === 0 ? (
        <p className="text-text-2 px-4 py-4 text-sm">Keine offenen Beanstandungen oder Aufgaben.</p>
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
  const modus = useModus()
  // Warte sehen im Flugbetrieb die normale Piloten-Ansicht, Werkzeuge nur in der Instandhaltung
  const technik = wart && modus === 'instandhaltung'
  const flugzeug = useFlugzeug(id)
  const verlauf = useVerlauf(id)
  const [sperrDialog, setSperrDialog] = useState(false)
  const [wartungDialog, setWartungDialog] = useState(false)

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
        <Leer titel="Luftfahrzeug nicht gefunden">
          <Link to="/" className="text-primaer hover:underline">
            Zur Übersicht
          </Link>
        </Leer>
      </Panel>
    )
  }

  const inPruefung = f.anzahl_in_pruefung ?? 0

  return (
    <div className="space-y-4">
      <Link
        to="/"
        className="text-primaer inline-flex min-h-11 items-center gap-2 text-sm font-medium lg:hidden"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Alle Luftfahrzeuge
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
                Beanstandung melden
              </ButtonLink>
              {technik && (
                <Button
                  onClick={() => setWartungDialog(true)}
                  icon={<Wrench aria-hidden="true" className="size-4" />}
                >
                  Wartung beginnen
                </Button>
              )}
              {technik && (
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
        </div>
      </Panel>

      <FlugzeugPunkte f={f} />

      {technik && <WerkstattBlock aircraftId={f.id} />}
      {technik && <TechnikBlock aircraftId={f.id} />}

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
            meldungsLink={technik ? (rid) => `/werkstatt/meldungen/${rid}` : undefined}
          />
        )}
      </Panel>

      {sperrDialog && <SperrDialog f={f} onSchliessen={() => setSperrDialog(false)} />}
      {wartungDialog && (
        <WartungStartenDialog flugzeug={f} onSchliessen={() => setWartungDialog(false)} />
      )}
    </div>
  )
}
