import {
  ArrowLeft,
  Ban,
  Check,
  Hourglass,
  MessageSquare,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { AufgabeStatusBadge, FristBadge, PrioritaetBadge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { FehlerBox, Hinweis, Laden, Leer } from '@/components/Feedback'
import { Eingabe, Feld, Textfeld } from '@/components/Form'
import { DatenFeld, DatenFelder, Panel, PanelKopf } from '@/components/Panel'
import { PRIORITAET_TEXT, type AufgabeStatus } from '@/components/statusTexte'
import { aufgabenNr, meldungsNr, zeitpunkt } from '@/lib/format'
import {
  istOffen,
  useAufgabe,
  useAufgabeKommentieren,
  useAufgabenVerlauf,
  useAufgabeStatus,
  useTeilschritte,
  useTeilschrittAnlegen,
  useTeilschrittLoeschen,
  useTeilschrittSetzen,
  type Aufgabe,
  type AufgabenEreignis,
  type Teilschritt,
} from './api'
import { AufgabeDialog } from './AufgabeDialog'

// ---------------------------------------------------------------------------
// Statuswechsel
// ---------------------------------------------------------------------------

interface StatusWunsch {
  status: AufgabeStatus
  titel: string
  textLabel?: string
  textPflicht?: boolean
  platzhalter?: string
  knopf: string
}

const WUNSCH: Record<'wartet' | 'erledigt' | 'verworfen' | 'oeffnen', StatusWunsch> = {
  wartet: {
    status: 'wartet',
    titel: 'Aufgabe wartet',
    textLabel: 'Worauf wird gewartet?',
    textPflicht: true,
    platzhalter: 'z. B. Ersatzteil bestellt, Lieferung ca. Freitag',
    knopf: 'Auf „Wartet“ setzen',
  },
  erledigt: {
    status: 'erledigt',
    titel: 'Aufgabe erledigt',
    textLabel: 'Abschlussbemerkung (optional)',
    platzhalter: 'z. B. Funktionsprüfung i. O., Material verbraucht: …',
    knopf: 'Als erledigt abschließen',
  },
  verworfen: {
    status: 'verworfen',
    titel: 'Aufgabe verwerfen',
    textLabel: 'Warum wird die Aufgabe nicht gemacht?',
    textPflicht: true,
    platzhalter: 'z. B. doppelt angelegt, siehe A-0012',
    knopf: 'Verwerfen',
  },
  oeffnen: {
    status: 'in_arbeit',
    titel: 'Aufgabe wieder öffnen',
    textLabel: 'Warum wird die Aufgabe wieder geöffnet?',
    textPflicht: true,
    platzhalter: 'z. B. Problem tritt wieder auf',
    knopf: 'Wieder öffnen',
  },
}

function StatusDialog({
  a,
  wunsch,
  offeneSchritte,
  onSchliessen,
}: {
  a: Aufgabe
  wunsch: StatusWunsch
  offeneSchritte: Teilschritt[]
  onSchliessen: () => void
}) {
  const status = useAufgabeStatus()
  const [text, setText] = useState('')
  const blockiert = wunsch.status === 'erledigt' && offeneSchritte.length > 0
  const fehlt = wunsch.textPflicht && !text.trim()

  return (
    <Dialog
      offen
      onSchliessen={onSchliessen}
      titel={wunsch.titel}
      untertitel={`${aufgabenNr(a.nr)} · ${a.titel}`}
      fuss={
        <>
          <Button onClick={onSchliessen}>Abbrechen</Button>
          <Button
            art={wunsch.status === 'verworfen' ? 'gefahr' : 'primaer'}
            laedt={status.isPending}
            disabled={Boolean(fehlt) || blockiert}
            onClick={() =>
              status.mutate(
                { taskId: a.id, status: wunsch.status, text: text.trim() || undefined },
                { onSuccess: onSchliessen },
              )
            }
          >
            {wunsch.knopf}
          </Button>
        </>
      }
    >
      {blockiert ? (
        <Hinweis ton="warnung" titel={`Noch ${offeneSchritte.length} offene Teilschritte`}>
          <ul className="list-disc pl-4">
            {offeneSchritte.map((s) => (
              <li key={s.id}>{s.text}</li>
            ))}
          </ul>
          <p className="pt-1">
            Abhaken, entfernen oder die Aufgabe auf „Wartet“ setzen und den Arbeitsstand festhalten.
          </p>
        </Hinweis>
      ) : (
        wunsch.textLabel && (
          <Feld
            label={wunsch.textLabel}
            pflicht={wunsch.textPflicht}
            zaehler={`${text.length}/300`}
          >
            {(p) => (
              <Textfeld
                {...p}
                rows={3}
                maxLength={wunsch.status === 'wartet' ? 300 : 2000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={wunsch.platzhalter}
              />
            )}
          </Feld>
        )
      )}
      {wunsch.status === 'erledigt' && a.report_id && !blockiert && (
        <Hinweis>
          Die zugehörige Meldung {meldungsNr(a.report_nr)} bleibt offen. Sie wird im Meldungseingang
          mit der Maßnahme abgeschlossen{a.kennzeichen ? ` (bei Kat 1 mit „wieder flugklar“)` : ''}.
        </Hinweis>
      )}
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Teilschritte
// ---------------------------------------------------------------------------

function Checkliste({ a, schritte }: { a: Aufgabe; schritte: Teilschritt[] }) {
  const setzen = useTeilschrittSetzen()
  const anlegen = useTeilschrittAnlegen()
  const loeschen = useTeilschrittLoeschen()
  const [neu, setNeu] = useState('')
  // Haken sofort anzeigen, bis der Server bestätigt hat
  const [lokal, setLokal] = useState<Record<string, boolean>>({})
  const istErledigt = (s: Teilschritt) => lokal[s.id] ?? s.erledigt

  function haken(s: Teilschritt, erledigt: boolean) {
    setLokal((l) => ({ ...l, [s.id]: erledigt }))
    setzen.mutate(
      { itemId: s.id, erledigt },
      {
        onSettled: () =>
          setLokal((l) => {
            const rest = { ...l }
            delete rest[s.id]
            return rest
          }),
      },
    )
  }
  const offen = istOffen(a)
  const fertig = schritte.filter((s) => lokal[s.id] ?? s.erledigt).length

  function hinzufuegen(e: FormEvent) {
    e.preventDefault()
    if (!neu.trim()) return
    anlegen.mutate({ taskId: a.id, text: neu.trim() }, { onSuccess: () => setNeu('') })
  }

  return (
    <Panel>
      <PanelKopf
        titel="Teilschritte"
        zusatz={schritte.length ? `${fertig}/${schritte.length}` : undefined}
      />
      {schritte.length > 0 && (
        <div className="px-4 pt-3">
          <div
            className="bg-rand h-2 overflow-hidden rounded-full"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={schritte.length}
            aria-valuenow={fertig}
            aria-label="Fortschritt"
          >
            <div
              className="bg-ampel-gruen h-full transition-all"
              style={{ width: `${(fertig / schritte.length) * 100}%` }}
            />
          </div>
        </div>
      )}
      <ul className="divide-rand divide-y">
        {schritte.map((s) => (
          <li key={s.id} className="flex items-start gap-1 px-2 py-1">
            <label
              className={`flex min-h-12 flex-1 items-start gap-3 rounded-md px-2 py-2 lg:min-h-10 ${offen ? 'hover:bg-flaeche cursor-pointer' : ''}`}
            >
              <input
                type="checkbox"
                checked={istErledigt(s)}
                disabled={!offen}
                onChange={(e) => haken(s, e.target.checked)}
                className="accent-ampel-gruen mt-0.5 size-5 shrink-0"
              />
              <span className="min-w-0 space-y-0.5">
                <span
                  className={`block text-sm ${istErledigt(s) ? 'text-text-2 line-through' : 'font-medium'}`}
                >
                  {s.text}
                </span>
                {s.erledigt && s.erledigt_am && (
                  <span className="text-text-3 block font-mono text-xs">
                    erledigt {zeitpunkt(s.erledigt_am)}
                  </span>
                )}
              </span>
            </label>
            {offen && (
              <button
                type="button"
                onClick={() => loeschen.mutate({ itemId: s.id })}
                className="text-text-3 hover:text-ampel-rot flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-red-50 lg:size-9"
                aria-label={`Teilschritt „${s.text}“ entfernen`}
                title="Entfernen"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {schritte.length === 0 && (
        <p className="text-text-2 px-4 py-3 text-sm">Keine Teilschritte.</p>
      )}
      {offen && (
        <form onSubmit={hinzufuegen} className="border-rand flex gap-2 border-t p-3">
          <Eingabe
            aria-label="Neuer Teilschritt"
            maxLength={300}
            value={neu}
            onChange={(e) => setNeu(e.target.value)}
            placeholder="Teilschritt hinzufügen …"
          />
          <Button
            type="submit"
            laedt={anlegen.isPending}
            disabled={!neu.trim()}
            icon={<Plus aria-hidden="true" className="size-4" />}
          >
            <span className="sr-only sm:not-sr-only">Hinzufügen</span>
          </Button>
        </form>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Arbeitsstand und Aktivität
// ---------------------------------------------------------------------------

const UEBERGABE = 'Erledigt:\n- \n\nOffen:\n- \n\nNächster Schritt:\n- '

function Arbeitsstand({ a, verlauf }: { a: Aufgabe; verlauf: AufgabenEreignis[] }) {
  const kommentieren = useAufgabeKommentieren()
  const [text, setText] = useState('')

  function speichern(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    kommentieren.mutate({ taskId: a.id, text: text.trim() }, { onSuccess: () => setText('') })
  }

  return (
    <Panel>
      <PanelKopf titel="Arbeitsstand und Aktivität" zusatz={a.anzahl_kommentare || undefined} />
      <div className="space-y-5 p-4">
        <ol className="before:bg-rand relative space-y-4 before:absolute before:inset-y-2 before:left-[7px] before:w-px">
          {verlauf.map((e) => {
            const kommentar = e.typ === 'kommentar'
            return (
              <li key={e.id} className="relative flex gap-3">
                <span
                  aria-hidden="true"
                  className={`relative mt-1.5 size-[15px] shrink-0 rounded-full border-2 border-white ${kommentar ? 'bg-primaer' : e.typ === 'status' ? 'bg-violet-500' : 'bg-rand-stark'}`}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-text-2 flex flex-wrap items-center gap-x-2 text-xs">
                    <span className="text-text font-semibold">{e.user_name ?? 'Unbekannt'}</span>
                    <span>
                      {kommentar
                        ? 'Arbeitsstand'
                        : e.typ === 'status'
                          ? 'Status'
                          : e.typ === 'teilschritt'
                            ? 'Teilschritt'
                            : e.typ === 'geaendert'
                              ? 'Geändert'
                              : 'Angelegt'}
                    </span>
                    <span className="font-mono">{zeitpunkt(e.created_at)}</span>
                  </p>
                  <p
                    className={`text-sm break-words whitespace-pre-line ${kommentar ? 'border-rand rounded-md border bg-white p-3' : 'text-text-2'}`}
                  >
                    {e.text}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>

        <form
          onSubmit={speichern}
          className="border-rand bg-flaeche/60 space-y-2 rounded-md border p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={`arbeitsstand-${a.id}`} className="text-sm font-semibold">
              Arbeitsstand festhalten
            </label>
            {!text && (
              <button
                type="button"
                onClick={() => setText(UEBERGABE)}
                className="text-primaer min-h-9 text-sm font-medium hover:underline"
              >
                Übergabe-Vorlage einfügen
              </button>
            )}
          </div>
          <Textfeld
            id={`arbeitsstand-${a.id}`}
            rows={text.includes('\n') ? 8 : 3}
            maxLength={4000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Was wurde gemacht? Was fehlt noch? Wo liegt das Material? So kann der Nächste weitermachen."
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-text-3 text-xs">Nur für Warte sichtbar.</p>
            <Button
              type="submit"
              art="primaer"
              laedt={kommentieren.isPending}
              disabled={!text.trim()}
              icon={<MessageSquare aria-hidden="true" className="size-4" />}
            >
              Speichern
            </Button>
          </div>
        </form>
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------

export function AufgabeDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const aufgabe = useAufgabe(id)
  const schritte = useTeilschritte(id)
  const verlauf = useAufgabenVerlauf(id)
  const status = useAufgabeStatus()
  const [wunsch, setWunsch] = useState<StatusWunsch | null>(null)
  const [bearbeiten, setBearbeiten] = useState(false)

  if (aufgabe.isPending)
    return (
      <Panel>
        <Laden />
      </Panel>
    )
  if (aufgabe.isError)
    return <FehlerBox fehler={aufgabe.error} nochmal={() => void aufgabe.refetch()} />
  const a = aufgabe.data
  if (!a)
    return (
      <Panel>
        <Leer titel="Aufgabe nicht gefunden" />
      </Panel>
    )

  const offen = istOffen(a)
  const offeneSchritte = (schritte.data ?? []).filter((s) => !s.erledigt)
  const zurueck = `/werkstatt/aufgaben${params.size ? `?${params}` : ''}`

  return (
    <div className="space-y-4">
      <Link
        to={zurueck}
        className="text-primaer inline-flex min-h-11 items-center gap-2 text-sm font-medium lg:hidden"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Alle Aufgaben
      </Link>

      <Panel>
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-text-2 font-mono text-sm">{aufgabenNr(a.nr)}</span>
              <AufgabeStatusBadge status={a.status} />
              <PrioritaetBadge prioritaet={a.prioritaet} />
              <FristBadge faellig={a.faellig_am} abgeschlossen={!offen} />
            </p>
            <h1 className="text-xl font-semibold">{a.titel}</h1>
          </div>

          {/* Aktionen je nach Status */}
          <div className="flex flex-wrap gap-2">
            {a.status === 'offen' && (
              <Button
                art="primaer"
                laedt={status.isPending}
                icon={<Play aria-hidden="true" className="size-4" />}
                onClick={() => status.mutate({ taskId: a.id, status: 'in_arbeit' })}
              >
                Beginnen
              </Button>
            )}
            {a.status === 'wartet' && (
              <Button
                art="primaer"
                laedt={status.isPending}
                icon={<Play aria-hidden="true" className="size-4" />}
                onClick={() => status.mutate({ taskId: a.id, status: 'in_arbeit' })}
              >
                Weiterarbeiten
              </Button>
            )}
            {offen && (
              <>
                {a.status !== 'wartet' && (
                  <Button
                    icon={<Hourglass aria-hidden="true" className="size-4" />}
                    onClick={() => setWunsch(WUNSCH.wartet)}
                  >
                    Wartet …
                  </Button>
                )}
                <Button
                  art={a.status === 'in_arbeit' ? 'primaer' : 'sekundaer'}
                  icon={<Check aria-hidden="true" className="size-4" />}
                  onClick={() => setWunsch(WUNSCH.erledigt)}
                >
                  Erledigt
                </Button>
                <Button
                  icon={<Pencil aria-hidden="true" className="size-4" />}
                  onClick={() => setBearbeiten(true)}
                >
                  Bearbeiten
                </Button>
                <Button
                  art="leise"
                  icon={<Ban aria-hidden="true" className="size-4" />}
                  onClick={() => setWunsch(WUNSCH.verworfen)}
                >
                  Verwerfen
                </Button>
              </>
            )}
            {!offen && (
              <Button
                icon={<RotateCcw aria-hidden="true" className="size-4" />}
                onClick={() => setWunsch(WUNSCH.oeffnen)}
              >
                Wieder öffnen
              </Button>
            )}
          </div>

          {a.status === 'wartet' && a.wartet_auf && (
            <Hinweis ton="lila" titel="Wartet auf">
              {a.wartet_auf}
            </Hinweis>
          )}
          {a.status === 'erledigt' && (
            <Hinweis ton="erfolg" titel="Erledigt">
              <span className="font-mono">{a.erledigt_am && zeitpunkt(a.erledigt_am)}</span>
            </Hinweis>
          )}

          <DatenFelder>
            <DatenFeld label="Zuständig">{a.zustaendig_name ?? 'Nicht zugewiesen'}</DatenFeld>
            <DatenFeld label="Priorität">{PRIORITAET_TEXT[a.prioritaet]}</DatenFeld>
            <DatenFeld label="Flugzeug" mono>
              {a.aircraft_id ? (
                <Link to={`/flugzeuge/${a.aircraft_id}`} className="text-primaer hover:underline">
                  {a.kennzeichen}
                </Link>
              ) : (
                <span className="font-sans">Allgemein</span>
              )}
            </DatenFeld>
            <DatenFeld label="Meldung" mono>
              {a.report_id ? (
                <Link
                  to={`/werkstatt/meldungen/${a.report_id}`}
                  className="text-primaer hover:underline"
                >
                  {meldungsNr(a.report_nr)}
                </Link>
              ) : (
                '–'
              )}
            </DatenFeld>
            <DatenFeld label="Angelegt">
              <span className="font-mono">{zeitpunkt(a.created_at)}</span>
              {a.erstellt_von_name && (
                <span className="text-text-2 block">{a.erstellt_von_name}</span>
              )}
            </DatenFeld>
            <DatenFeld label="Letzte Aktivität" mono>
              {a.letzte_aktivitaet ? zeitpunkt(a.letzte_aktivitaet) : '–'}
            </DatenFeld>
          </DatenFelder>

          {a.beschreibung && (
            <div>
              <p className="text-text-3 text-xs font-medium tracking-wide uppercase">
                Beschreibung
              </p>
              <p className="mt-1 text-sm whitespace-pre-line">{a.beschreibung}</p>
            </div>
          )}
        </div>
      </Panel>

      {schritte.isPending ? (
        <Panel>
          <Laden />
        </Panel>
      ) : schritte.isError ? (
        <FehlerBox fehler={schritte.error} />
      ) : (
        <Checkliste a={a} schritte={schritte.data} />
      )}

      {verlauf.isPending ? (
        <Panel>
          <Laden />
        </Panel>
      ) : verlauf.isError ? (
        <FehlerBox fehler={verlauf.error} />
      ) : (
        <Arbeitsstand a={a} verlauf={verlauf.data} />
      )}

      {wunsch && (
        <StatusDialog
          a={a}
          wunsch={wunsch}
          offeneSchritte={offeneSchritte}
          onSchliessen={() => setWunsch(null)}
        />
      )}
      {bearbeiten && <AufgabeDialog aufgabe={a} onSchliessen={() => setBearbeiten(false)} />}
    </div>
  )
}
