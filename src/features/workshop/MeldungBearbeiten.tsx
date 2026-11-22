import { ArrowLeft, EyeOff, ListTodo, Play } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { AufgabeStatusBadge, FristBadge, KatBadge, MeldungStatusBadge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { FehlerBox, Hinweis, Laden, Leer } from '@/components/Feedback'
import { Eingabe, Feld } from '@/components/Form'
import { DatenFeld, DatenFelder, Panel, PanelKopf } from '@/components/Panel'
import { useMeldung, useMeldungVerlauf, type Meldung } from '@/features/reports/api'
import { FotoGalerie, KommentarForm, MeldungFeed } from '@/features/reports/MeldungTeile'
import { aufgabenNr, meldungsNr, zeitpunkt } from '@/lib/format'
import { istOffen, useAufgaben, useBeobachtungBeenden, useMeldungStatus } from './api'
import { AufgabeDialog } from './AufgabeDialog'
import { EinstufenForm, ErledigenForm } from './Einstufung'

/** Abgeschlossen: Maßnahme bzw. Befund, bei Kat 3 Beobachtung beenden oder umstufen */
function Abgeschlossen({ m }: { m: Meldung }) {
  const beenden = useBeobachtungBeenden()
  const [ergebnis, setErgebnis] = useState('')
  const [umstufen, setUmstufen] = useState(false)
  const titel =
    m.status === 'erledigt'
      ? 'Erledigt'
      : m.beobachten
        ? 'Kat 3 – unter Beobachtung'
        : 'Abgelegt (Kat 3)'

  return (
    <Panel>
      <PanelKopf titel={titel} />
      <div className="space-y-4 p-4">
        <DatenFelder>
          <DatenFeld label={m.status === 'erledigt' ? 'Maßnahme' : 'Befund / Begründung'} breit>
            {m.massnahme ?? 'Steht in der Aktivität.'}
          </DatenFeld>
          {m.erledigt_am && (
            <DatenFeld label="Erledigt am" mono>
              {zeitpunkt(m.erledigt_am)}
            </DatenFeld>
          )}
        </DatenFelder>

        {m.beobachten && (
          <form
            className="space-y-3 rounded-md border border-violet-300 bg-violet-50 p-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (ergebnis.trim()) beenden.mutate({ reportId: m.id, text: ergebnis.trim() })
            }}
          >
            <p className="text-sm">
              <span className="font-semibold">Hinweis für Piloten:</span> {m.pilotenhinweis}
            </p>
            <Feld label="Ergebnis der Beobachtung" pflicht>
              {(p) => (
                <Eingabe
                  {...p}
                  maxLength={500}
                  value={ergebnis}
                  onChange={(e) => setErgebnis(e.target.value)}
                  placeholder="z. B. seit 10 Flügen unauffällig"
                />
              )}
            </Feld>
            <div className="flex justify-end">
              <Button
                type="submit"
                icon={<EyeOff aria-hidden="true" className="size-4" />}
                disabled={!ergebnis.trim()}
                laedt={beenden.isPending}
              >
                Beobachtung beenden
              </Button>
            </div>
          </form>
        )}

        {m.status === 'abgelegt' && (
          <div className="border-rand border-t pt-3">
            <button
              type="button"
              onClick={() => setUmstufen(!umstufen)}
              aria-expanded={umstufen}
              className="text-primaer min-h-10 text-sm font-medium hover:underline"
            >
              {umstufen ? 'Umstufen schließen' : 'Umstufen oder Angaben ändern'}
            </button>
            {umstufen && (
              <div className="pt-3">
                <EinstufenForm m={m} onEingestuft={() => setUmstufen(false)} />
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}

function Bearbeitung({
  m,
  offeneAufgaben,
  onAufgabe,
}: {
  m: Meldung
  offeneAufgaben: number
  onAufgabe: () => void
}) {
  const status = useMeldungStatus()
  const [umstufen, setUmstufen] = useState(false)

  if (m.status === 'neu') {
    return (
      <Panel>
        <PanelKopf titel="Einstufen" />
        <div className="p-4">
          <EinstufenForm m={m} onEingestuft={(_, aufgabe) => aufgabe && onAufgabe()} />
        </div>
      </Panel>
    )
  }

  if (m.status === 'erledigt' || m.status === 'abgelegt') {
    return <Abgeschlossen m={m} />
  }

  return (
    <Panel>
      <PanelKopf
        titel={m.status === 'zurueckgestellt' ? 'Zurückgestellt' : 'In Arbeit'}
        aktionen={
          m.status === 'zurueckgestellt' && (
            <Button
              groesse="klein"
              icon={<Play aria-hidden="true" className="size-4" />}
              laedt={status.isPending}
              onClick={() => status.mutate({ reportId: m.id, status: 'in_arbeit' })}
            >
              In Arbeit nehmen
            </Button>
          )
        }
      />
      <div className="space-y-4 p-4">
        <ErledigenForm m={m} offeneAufgaben={offeneAufgaben} />
        <div className="border-rand border-t pt-3">
          <button
            type="button"
            onClick={() => setUmstufen(!umstufen)}
            aria-expanded={umstufen}
            className="text-primaer min-h-10 text-sm font-medium hover:underline"
          >
            {umstufen ? 'Umstufen schließen' : 'Umstufen oder Angaben ändern'}
          </button>
          {umstufen && (
            <div className="pt-3">
              <EinstufenForm m={m} onEingestuft={() => setUmstufen(false)} />
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}

export function MeldungBearbeiten() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const meldung = useMeldung(id)
  const verlauf = useMeldungVerlauf(id)
  const aufgaben = useAufgaben()
  const [aufgabeDialog, setAufgabeDialog] = useState(false)

  if (meldung.isPending)
    return (
      <Panel>
        <Laden />
      </Panel>
    )
  if (meldung.isError)
    return <FehlerBox fehler={meldung.error} nochmal={() => void meldung.refetch()} />
  const m = meldung.data
  if (!m)
    return (
      <Panel>
        <Leer titel="Beanstandung nicht gefunden" />
      </Panel>
    )

  const zugehoerig = (aufgaben.data ?? []).filter((a) => a.report_id === m.id)
  const offen = zugehoerig.filter(istOffen).length
  const zurueck = `/werkstatt/meldungen${params.size ? `?${params}` : ''}`

  return (
    <div className="space-y-4">
      <Link
        to={zurueck}
        className="text-primaer inline-flex min-h-11 items-center gap-2 text-sm font-medium lg:hidden"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Meldungseingang
      </Link>

      <Panel>
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-semibold">{meldungsNr(m.nr)}</h1>
            <Link
              to={`/flugzeuge/${m.aircraft_id}`}
              className="text-primaer font-mono text-xl font-semibold hover:underline"
            >
              {m.kennzeichen}
            </Link>
            <KatBadge kategorie={m.kategorie} />
            <MeldungStatusBadge status={m.status} />
          </div>
          {m.vorlaeufig_nicht_flugklar && m.status === 'neu' && (
            <Hinweis ton="gefahr" titel="Vorläufig nicht flugklar">
              Der Melder hält das Luftfahrzeug für nicht flugklar. Es ist rot, bis du die
              Beanstandung einstufst.
            </Hinweis>
          )}
          <DatenFelder>
            <DatenFeld label="Melder">{m.melder_name ?? '–'}</DatenFeld>
            <DatenFeld label="Gemeldet" mono>
              {zeitpunkt(m.created_at)}
            </DatenFeld>
            <DatenFeld label="Eingestuft">
              {m.eingestuft_am ? (
                <>
                  <span className="font-mono">{zeitpunkt(m.eingestuft_am)}</span>
                  {m.eingestuft_von_name && (
                    <span className="text-text-2 block">{m.eingestuft_von_name}</span>
                  )}
                </>
              ) : (
                '–'
              )}
            </DatenFeld>
            <DatenFeld label="Muster">{m.muster}</DatenFeld>
            {m.ziel && <DatenFeld label="Ziel">{m.ziel}</DatenFeld>}
            {m.pilotenhinweis && (
              <DatenFeld
                label={
                  m.pilotenhinweis_sichtbar
                    ? 'Pilotenhinweis (sichtbar)'
                    : 'Pilotenhinweis (nicht sichtbar)'
                }
                breit
              >
                {m.pilotenhinweis}
              </DatenFeld>
            )}
          </DatenFelder>
          <div>
            <p className="text-text-3 text-xs font-medium tracking-wide uppercase">Beschreibung</p>
            <p className="mt-1 whitespace-pre-line">{m.text}</p>
          </div>
          <FotoGalerie reportId={m.id} anzahl={m.anzahl_fotos} />
        </div>
      </Panel>

      <Bearbeitung m={m} offeneAufgaben={offen} onAufgabe={() => setAufgabeDialog(true)} />

      <Panel>
        <PanelKopf
          titel="Aufgaben"
          zusatz={zugehoerig.length}
          aktionen={
            m.status !== 'abgelegt' && (
              <Button
                groesse="klein"
                icon={<ListTodo aria-hidden="true" className="size-4" />}
                onClick={() => setAufgabeDialog(true)}
              >
                Aufgabe anlegen
              </Button>
            )
          }
        />
        {zugehoerig.length === 0 ? (
          <p className="text-text-2 px-4 py-4 text-sm">
            Noch keine Aufgaben zu dieser Beanstandung.
          </p>
        ) : (
          <ul className="divide-rand divide-y">
            {zugehoerig.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/werkstatt/aufgaben/${a.id}`}
                  className="hover:bg-flaeche flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
                >
                  <span className="text-text-2 font-mono text-xs">{aufgabenNr(a.nr)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.titel}</span>
                  {(a.anzahl_schritte ?? 0) > 0 && (
                    <span className="text-text-2 font-mono text-xs">
                      {a.anzahl_schritte_erledigt}/{a.anzahl_schritte}
                    </span>
                  )}
                  <FristBadge faellig={a.faellig_am} abgeschlossen={!istOffen(a)} />
                  <AufgabeStatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelKopf titel="Aktivität und Kommentare" />
        <div className="space-y-5 p-4">
          {verlauf.isPending ? (
            <Laden />
          ) : verlauf.isError ? (
            <FehlerBox fehler={verlauf.error} />
          ) : (
            <MeldungFeed eintraege={verlauf.data} />
          )}
          <KommentarForm reportId={m.id} wart />
        </div>
      </Panel>

      {aufgabeDialog && (
        <AufgabeDialog
          onSchliessen={() => setAufgabeDialog(false)}
          onAngelegt={(aid) => void navigate(`/werkstatt/aufgaben/${aid}`)}
          vorlage={{
            reportId: m.id,
            reportNr: m.nr,
            aircraftId: m.aircraft_id,
            titel: m.text.split('\n')[0]?.slice(0, 150),
            beschreibung: `Aus Beanstandung ${meldungsNr(m.nr)}: ${m.text}`.slice(0, 4000),
            prioritaet: m.kategorie === 1 || m.vorlaeufig_nicht_flugklar ? 'hoch' : 'normal',
          }}
        />
      )}
    </div>
  )
}
