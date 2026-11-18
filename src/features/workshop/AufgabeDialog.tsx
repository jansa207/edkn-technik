import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { FehlerBox } from '@/components/Feedback'
import { Auswahl, Eingabe, Feld, Textfeld } from '@/components/Form'
import { PRIORITAET_TEXT, ROLLE_TEXT, type Prioritaet } from '@/components/statusTexte'
import { useFlotte } from '@/features/aircraft/api'
import { aufgabenNr, heuteIso, meldungsNr, name } from '@/lib/format'
import {
  useAufgabeAnlegen,
  useAufgabeBearbeiten,
  useWarte,
  type Aufgabe,
  type AufgabenDaten,
} from './api'

function plusTage(tage: number): string {
  const d = new Date(`${heuteIso()}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + tage)
  return d.toISOString().slice(0, 10)
}

const SCHNELL_FRIST: { text: string; tage: number }[] = [
  { text: 'Heute', tage: 0 },
  { text: 'Morgen', tage: 1 },
  { text: '1 Woche', tage: 7 },
  { text: '1 Monat', tage: 30 },
]

export interface AufgabeVorlage {
  reportId?: string | null
  reportNr?: number | null
  aircraftId?: string | null
  titel?: string
  beschreibung?: string
  faelligAm?: string | null
  prioritaet?: Prioritaet
}

/**
 * Aufgabe anlegen (mit Vorlage, z. B. aus einer Meldung) oder bearbeiten.
 * Teilschritte werden beim Anlegen erfasst, danach in der Checkliste der Aufgabe.
 */
export function AufgabeDialog({
  onSchliessen,
  onAngelegt,
  vorlage,
  aufgabe,
}: {
  onSchliessen: () => void
  onAngelegt?: (id: string) => void
  vorlage?: AufgabeVorlage
  aufgabe?: Aufgabe
}) {
  const flotte = useFlotte()
  const warte = useWarte()
  const anlegen = useAufgabeAnlegen()
  const bearbeiten = useAufgabeBearbeiten()
  const bearbeitung = Boolean(aufgabe)
  const reportId = aufgabe?.report_id ?? vorlage?.reportId ?? null
  const reportNr = aufgabe?.report_nr ?? vorlage?.reportNr ?? null

  const [d, setD] = useState<AufgabenDaten>({
    titel: aufgabe?.titel ?? vorlage?.titel ?? '',
    beschreibung: aufgabe?.beschreibung ?? vorlage?.beschreibung ?? '',
    aircraftId: aufgabe ? aufgabe.aircraft_id : (vorlage?.aircraftId ?? null),
    prioritaet: aufgabe?.prioritaet ?? vorlage?.prioritaet ?? 'normal',
    faelligAm: aufgabe ? aufgabe.faellig_am : (vorlage?.faelligAm ?? null),
    zustaendigId: aufgabe ? aufgabe.zustaendig_id : null,
  })
  const [schritte, setSchritte] = useState<string[]>([''])
  const [versucht, setVersucht] = useState(false)
  const aktion = bearbeitung ? bearbeiten : anlegen

  const setze = <K extends keyof AufgabenDaten>(k: K, v: AufgabenDaten[K]) =>
    setD((x) => ({ ...x, [k]: v }))

  function speichern(e: FormEvent) {
    e.preventDefault()
    setVersucht(true)
    if (!d.titel.trim()) return
    const daten = { ...d, titel: d.titel.trim(), beschreibung: d.beschreibung.trim() }
    if (aufgabe) {
      bearbeiten.mutate({ ...daten, taskId: aufgabe.id }, { onSuccess: onSchliessen })
    } else {
      anlegen.mutate(
        { ...daten, reportId, teilschritte: schritte.map((s) => s.trim()).filter(Boolean) },
        {
          onSuccess: (r) => {
            onSchliessen()
            onAngelegt?.(r.id)
          },
        },
      )
    }
  }

  const flugzeuge = (flotte.data ?? []).filter((f) => f.aktiv || f.id === d.aircraftId)

  return (
    <Dialog
      offen
      breit
      onSchliessen={onSchliessen}
      titel={bearbeitung ? `${aufgabenNr(aufgabe?.nr)} bearbeiten` : 'Neue Aufgabe'}
      untertitel={
        reportId
          ? `Zu Meldung ${meldungsNr(reportNr)} – erscheint intern im Verlauf der Meldung.`
          : 'Interne To-do der Werkstatt. Kein Einfluss auf die Ampel.'
      }
      fuss={
        <>
          <Button onClick={onSchliessen}>Abbrechen</Button>
          <Button art="primaer" type="submit" form="aufgabe-form" laedt={aktion.isPending}>
            {bearbeitung ? 'Speichern' : 'Aufgabe anlegen'}
          </Button>
        </>
      }
    >
      <form id="aufgabe-form" onSubmit={speichern} className="space-y-4" noValidate>
        <Feld
          label="Titel"
          pflicht
          fehler={versucht && !d.titel.trim() ? 'Bitte einen Titel angeben.' : null}
          zaehler={`${d.titel.length}/150`}
        >
          {(p) => (
            <Eingabe
              {...p}
              maxLength={150}
              value={d.titel}
              onChange={(e) => setze('titel', e.target.value)}
              placeholder="z. B. Spornrad tauschen"
            />
          )}
        </Feld>

        <div className="grid gap-4 sm:grid-cols-2">
          <Feld label="Flugzeug" hinweis={reportId ? 'Durch die Meldung festgelegt' : undefined}>
            {(p) => (
              <Auswahl
                {...p}
                value={d.aircraftId ?? ''}
                disabled={Boolean(reportId)}
                onChange={(e) => setze('aircraftId', e.target.value || null)}
              >
                <option value="">Kein Flugzeug (allgemein)</option>
                {flugzeuge.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.kennzeichen} · {f.muster}
                  </option>
                ))}
              </Auswahl>
            )}
          </Feld>
          <Feld label="Zuständig">
            {(p) => (
              <Auswahl
                {...p}
                value={d.zustaendigId ?? ''}
                onChange={(e) => setze('zustaendigId', e.target.value || null)}
              >
                <option value="">Nicht zugewiesen</option>
                {(warte.data ?? []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {name(w.vorname, w.nachname)} ({ROLLE_TEXT[w.rolle]})
                  </option>
                ))}
              </Auswahl>
            )}
          </Feld>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Feld label="Frist">
            {(p) => (
              <div className="space-y-2">
                <Eingabe
                  {...p}
                  type="date"
                  value={d.faelligAm ?? ''}
                  onChange={(e) => setze('faelligAm', e.target.value || null)}
                />
                <div className="flex flex-wrap gap-1.5">
                  {SCHNELL_FRIST.map((s) => (
                    <button
                      key={s.text}
                      type="button"
                      onClick={() => setze('faelligAm', plusTage(s.tage))}
                      className="border-rand-stark hover:bg-flaeche min-h-9 rounded-sm border bg-white px-2.5 text-xs font-medium lg:min-h-7"
                    >
                      {s.text}
                    </button>
                  ))}
                  {d.faelligAm && (
                    <button
                      type="button"
                      onClick={() => setze('faelligAm', null)}
                      className="text-text-2 hover:bg-flaeche min-h-9 rounded-sm px-2.5 text-xs font-medium lg:min-h-7"
                    >
                      Keine Frist
                    </button>
                  )}
                </div>
              </div>
            )}
          </Feld>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-semibold">Priorität</legend>
            <div className="bg-flaeche flex gap-1 rounded-md p-1">
              {(['niedrig', 'normal', 'hoch'] as const).map((pr) => (
                <label
                  key={pr}
                  className="text-text-2 has-checked:text-text flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-sm text-sm font-medium has-checked:bg-white has-checked:shadow-sm lg:min-h-8"
                >
                  <input
                    type="radio"
                    name="prioritaet"
                    value={pr}
                    checked={d.prioritaet === pr}
                    onChange={() => setze('prioritaet', pr)}
                    className="sr-only"
                  />
                  {PRIORITAET_TEXT[pr]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <Feld label="Beschreibung" zaehler={`${d.beschreibung.length}/4000`}>
          {(p) => (
            <Textfeld
              {...p}
              rows={3}
              maxLength={4000}
              value={d.beschreibung}
              onChange={(e) => setze('beschreibung', e.target.value)}
              placeholder="Was ist zu tun? Material, Werkzeug, Hinweise …"
            />
          )}
        </Feld>

        {!bearbeitung && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">
              Teilschritte{' '}
              <span className="text-text-3 font-normal">(optional, später ergänzbar)</span>
            </legend>
            {schritte.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-text-3 w-6 text-right font-mono text-xs">{i + 1}.</span>
                <Eingabe
                  aria-label={`Teilschritt ${i + 1}`}
                  maxLength={300}
                  value={s}
                  onChange={(e) =>
                    setSchritte(schritte.map((x, j) => (j === i ? e.target.value : x)))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (s.trim()) setSchritte([...schritte, ''])
                    }
                  }}
                  placeholder="z. B. Ersatzteil bestellen"
                />
                {schritte.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSchritte(schritte.filter((_, j) => j !== i))}
                    className="text-text-2 hover:bg-flaeche flex size-11 shrink-0 items-center justify-center rounded-md lg:size-9"
                    aria-label={`Teilschritt ${i + 1} entfernen`}
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                )}
              </div>
            ))}
            <Button
              groesse="klein"
              art="leise"
              onClick={() => setSchritte([...schritte, ''])}
              icon={<Plus aria-hidden="true" className="size-4" />}
            >
              Teilschritt hinzufügen
            </Button>
          </fieldset>
        )}

        {aktion.isError && <FehlerBox fehler={aktion.error} />}
      </form>
    </Dialog>
  )
}
