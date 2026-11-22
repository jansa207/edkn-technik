import { CalendarClock, CheckCheck, Pencil, Plus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { FehlerBox, Hinweis, Laden, Leer } from '@/components/Feedback'
import { Auswahl, Eingabe, Feld, Haken, Textfeld } from '@/components/Form'
import { Kennzahl, Panel, PanelKopf, SeitenKopf } from '@/components/Panel'
import { useFlotte } from '@/features/aircraft/api'
import { heuteIso, minutenAus, plusMonate, stunden, tag, zeitpunkt } from '@/lib/format'
import {
  fristStand,
  useAktuelleZaehler,
  useFristAbschliessen,
  useFristen,
  useFristErledigen,
  useFristSpeichern,
  useFristVerlauf,
  type Frist,
  type FristDaten,
  type FristStand,
} from './api'
import { FristStandBadge } from './FristTeile'
import { faelligkeitText, intervallText } from './fristText'

const VORSCHLAEGE = [
  '50-h-Kontrolle',
  '100-h-Kontrolle',
  'Jahresnachprüfung',
  'Anschnallgurte tauschen',
  'ELT-Batterie tauschen',
  'Feuerlöscher prüfen',
]

const GRUPPEN: { stand: FristStand; titel: string }[] = [
  { stand: 'ueberfaellig', titel: 'Überfällig' },
  { stand: 'bald', titel: 'Bald fällig' },
  { stand: 'ok', titel: 'In Ordnung' },
  { stand: 'abgeschlossen', titel: 'Abgeschlossen' },
]

/** Stundenfeld: Text „hh:mm“, leer = null */
function stundenWert(text: string): number | null | 'ungueltig' {
  if (!text.trim()) return null
  return minutenAus(text) ?? 'ungueltig'
}

function FristDialog({
  frist,
  aircraftId,
  onSchliessen,
}: {
  frist: Frist | null
  aircraftId: string | null
  onSchliessen: () => void
}) {
  const flotte = useFlotte()
  const zaehler = useAktuelleZaehler()
  const speichern = useFristSpeichern()
  const abschliessen = useFristAbschliessen()
  const verlauf = useFristVerlauf(frist?.id)
  const [flugzeug, setFlugzeug] = useState(frist?.aircraft_id ?? aircraftId ?? '')
  const [titel, setTitel] = useState(frist?.titel ?? '')
  const [beschreibung, setBeschreibung] = useState(frist?.beschreibung ?? '')
  const [faelligAm, setFaelligAm] = useState(frist?.faellig_am ?? '')
  const [faelligBei, setFaelligBei] = useState(
    frist?.faellig_bei_minuten != null ? stunden(frist.faellig_bei_minuten).replace(' h', '') : '',
  )
  const [monate, setMonate] = useState(frist?.intervall_monate?.toString() ?? '')
  const [intervallStd, setIntervallStd] = useState(
    frist?.intervall_minuten != null ? stunden(frist.intervall_minuten).replace(' h', '') : '',
  )
  const [vorlaufTage, setVorlaufTage] = useState(String(frist?.vorlauf_tage ?? 30))
  const [vorlaufStd, setVorlaufStd] = useState(
    stunden(frist?.vorlauf_minuten ?? 600).replace(' h', ''),
  )
  const [versucht, setVersucht] = useState(false)
  const [abschlussText, setAbschlussText] = useState('')
  const [abschluss, setAbschluss] = useState(false)

  const stand = zaehler.data?.find((z) => z.aircraft_id === flugzeug)
  const bei = stundenWert(faelligBei)
  const intStd = stundenWert(intervallStd)
  const vStd = stundenWert(vorlaufStd)
  const mon = monate.trim() ? Number(monate) : null

  const fehler = !flugzeug
    ? 'Bitte ein Luftfahrzeug wählen.'
    : !titel.trim()
      ? 'Bitte einen Titel angeben.'
      : !faelligAm && bei === null
        ? 'Bitte ein Datum oder einen Stundenstand für die Fälligkeit angeben.'
        : bei === 'ungueltig' || intStd === 'ungueltig' || vStd === 'ungueltig'
          ? 'Stunden bitte als 123:45 oder 123,5 angeben.'
          : mon !== null && !(Number.isInteger(mon) && mon >= 1 && mon <= 600)
            ? 'Intervall in Monaten muss eine ganze Zahl sein.'
            : null

  function absenden(e: FormEvent) {
    e.preventDefault()
    setVersucht(true)
    if (fehler) return
    const d: FristDaten = {
      aircraftId: flugzeug,
      titel: titel.trim(),
      beschreibung: beschreibung.trim(),
      faelligAm: faelligAm || null,
      faelligBeiMinuten: bei as number | null,
      intervallMonate: mon,
      intervallMinuten: intStd as number | null,
      vorlaufTage: Number(vorlaufTage) || 0,
      vorlaufMinuten: (vStd as number | null) ?? 0,
    }
    speichern.mutate({ id: frist?.id ?? null, d }, { onSuccess: onSchliessen })
  }

  return (
    <Dialog
      offen
      breit
      onSchliessen={onSchliessen}
      titel={frist ? `Frist bearbeiten – ${frist.kennzeichen}` : 'Frist anlegen'}
      untertitel="Orientierung für die Instandhaltung. Kein Einfluss auf die Ampel, ersetzt nicht Bordbuch oder CAMO."
      fuss={
        <>
          <Button onClick={onSchliessen}>Abbrechen</Button>
          {(!frist || frist.aktiv) && (
            <Button art="primaer" type="submit" form="frist-form" laedt={speichern.isPending}>
              Speichern
            </Button>
          )}
        </>
      }
    >
      <form id="frist-form" onSubmit={absenden} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld label="Luftfahrzeug" pflicht>
            {(p) => (
              <Auswahl
                {...p}
                value={flugzeug}
                disabled={Boolean(frist)}
                onChange={(e) => setFlugzeug(e.target.value)}
              >
                <option value="">Bitte wählen</option>
                {(flotte.data ?? [])
                  .filter((f) => f.aktiv)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.kennzeichen} · {f.muster}
                    </option>
                  ))}
              </Auswahl>
            )}
          </Feld>
          <Feld
            label="Aktueller Stand"
            hinweis={stand ? `vom ${tag(stand.stand_am)}` : 'Noch kein Zählerstand erfasst'}
          >
            {(p) => (
              <Eingabe
                {...p}
                disabled
                className="font-mono"
                value={stand ? stunden(stand.betriebsminuten) : '–'}
              />
            )}
          </Feld>
        </div>
        <Feld label="Titel" pflicht zaehler={`${titel.length}/150`}>
          {(p) => (
            <div className="space-y-2">
              <Eingabe
                {...p}
                maxLength={150}
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                placeholder="z. B. 50-h-Kontrolle"
              />
              {!frist && (
                <div className="flex flex-wrap gap-1.5">
                  {VORSCHLAEGE.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTitel(v)}
                      className="border-rand-stark hover:bg-flaeche min-h-9 rounded-sm border bg-white px-2.5 text-xs font-medium lg:min-h-7"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Feld>
        <fieldset className="border-rand space-y-3 rounded-md border p-3">
          <legend className="px-1 text-sm font-semibold">Fällig (Datum und/oder Stunden)</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Feld label="Fällig am">
              {(p) => (
                <Eingabe
                  {...p}
                  type="date"
                  value={faelligAm}
                  onChange={(e) => setFaelligAm(e.target.value)}
                />
              )}
            </Feld>
            <Feld label="Fällig bei Stunden" hinweis="z. B. 1250:00">
              {(p) => (
                <Eingabe
                  {...p}
                  inputMode="decimal"
                  className="font-mono"
                  value={faelligBei}
                  onChange={(e) => setFaelligBei(e.target.value)}
                  placeholder="hhhh:mm"
                />
              )}
            </Feld>
            <Feld label="Wiederholen alle … Monate" hinweis="leer = einmalig">
              {(p) => (
                <Eingabe
                  {...p}
                  type="number"
                  min={1}
                  max={600}
                  value={monate}
                  onChange={(e) => setMonate(e.target.value)}
                />
              )}
            </Feld>
            <Feld label="Wiederholen alle … Stunden" hinweis="z. B. 50:00">
              {(p) => (
                <Eingabe
                  {...p}
                  inputMode="decimal"
                  className="font-mono"
                  value={intervallStd}
                  onChange={(e) => setIntervallStd(e.target.value)}
                />
              )}
            </Feld>
            <Feld label="Vorwarnung (Tage)">
              {(p) => (
                <Eingabe
                  {...p}
                  type="number"
                  min={0}
                  value={vorlaufTage}
                  onChange={(e) => setVorlaufTage(e.target.value)}
                />
              )}
            </Feld>
            <Feld label="Vorwarnung (Stunden)">
              {(p) => (
                <Eingabe
                  {...p}
                  inputMode="decimal"
                  className="font-mono"
                  value={vorlaufStd}
                  onChange={(e) => setVorlaufStd(e.target.value)}
                />
              )}
            </Feld>
          </div>
        </fieldset>
        <Feld label="Beschreibung" zaehler={`${beschreibung.length}/2000`}>
          {(p) => (
            <Textfeld
              {...p}
              rows={2}
              maxLength={2000}
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              placeholder="z. B. Teilenummer, Quelle der Frist (Handbuch, Hersteller)"
            />
          )}
        </Feld>
        {versucht && fehler && <p className="text-ampel-rot text-sm font-medium">{fehler}</p>}
        {speichern.isError && <FehlerBox fehler={speichern.error} />}
      </form>

      {frist && (
        <div className="border-rand space-y-3 border-t pt-4">
          <p className="text-sm font-semibold">Verlauf</p>
          {verlauf.data?.length ? (
            <ul className="space-y-1.5 text-sm">
              {verlauf.data.map((e) => (
                <li key={e.id}>
                  <span className="text-text-3 font-mono text-xs">{zeitpunkt(e.created_at)}</span>{' '}
                  {e.user_name && <span className="text-text-2">{e.user_name}: </span>}
                  {e.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-2 text-sm">Noch keine Einträge.</p>
          )}
          {frist.aktiv && (
            <div className="space-y-2">
              <Haken
                label="Frist ohne Durchführung abschließen"
                hinweis="z. B. Bauteil ausgebaut. Die Frist bleibt im Verlauf erhalten."
                checked={abschluss}
                onChange={(e) => setAbschluss(e.target.checked)}
              />
              {abschluss && (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Feld label="Begründung" pflicht>
                      {(p) => (
                        <Eingabe
                          {...p}
                          value={abschlussText}
                          onChange={(e) => setAbschlussText(e.target.value)}
                        />
                      )}
                    </Feld>
                  </div>
                  <Button
                    art="gefahr"
                    disabled={!abschlussText.trim()}
                    laedt={abschliessen.isPending}
                    onClick={() =>
                      abschliessen.mutate(
                        { id: frist.id, text: abschlussText.trim() },
                        { onSuccess: onSchliessen },
                      )
                    }
                  >
                    Abschließen
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Dialog>
  )
}

function ErledigenDialog({ frist, onSchliessen }: { frist: Frist; onSchliessen: () => void }) {
  const erledigen = useFristErledigen()
  const [am, setAm] = useState(heuteIso())
  const [bei, setBei] = useState(
    frist.aktuelle_minuten != null ? stunden(frist.aktuelle_minuten).replace(' h', '') : '',
  )
  const [text, setText] = useState('')
  const minuten = stundenWert(bei)
  const brauchtStunden = frist.intervall_minuten != null || frist.faellig_bei_minuten != null

  const naechste: string[] = []
  if (frist.intervall_monate && am) naechste.push(tag(plusMonate(am, frist.intervall_monate)))
  if (frist.intervall_minuten && typeof minuten === 'number') {
    naechste.push(`bei ${stunden(minuten + frist.intervall_minuten)}`)
  }

  const fehler =
    !am || am > heuteIso()
      ? 'Datum darf nicht in der Zukunft liegen.'
      : minuten === 'ungueltig'
        ? 'Stunden bitte als 123:45 oder 123,5 angeben.'
        : brauchtStunden && minuten === null
          ? 'Bitte den Stundenstand bei der Durchführung angeben.'
          : null

  return (
    <Dialog
      offen
      onSchliessen={onSchliessen}
      titel={`${frist.titel} durchgeführt`}
      untertitel={`${frist.kennzeichen} · ${intervallText(frist)}`}
      fuss={
        <>
          <Button onClick={onSchliessen}>Abbrechen</Button>
          <Button
            art="primaer"
            disabled={Boolean(fehler)}
            laedt={erledigen.isPending}
            onClick={() =>
              erledigen.mutate(
                {
                  id: frist.id,
                  am,
                  beiMinuten: typeof minuten === 'number' ? minuten : null,
                  text: text.trim(),
                },
                { onSuccess: onSchliessen },
              )
            }
          >
            Eintragen
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Feld label="Durchgeführt am" pflicht>
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
        <Feld
          label="Stundenstand dabei"
          pflicht={brauchtStunden}
          hinweis={
            frist.aktuelle_minuten != null ? 'Vorbelegt mit dem letzten Zählerstand' : undefined
          }
        >
          {(p) => (
            <Eingabe
              {...p}
              inputMode="decimal"
              className="font-mono"
              value={bei}
              onChange={(e) => setBei(e.target.value)}
              placeholder="hhhh:mm"
            />
          )}
        </Feld>
      </div>
      <Feld label="Bemerkung">
        {(p) => (
          <Textfeld
            {...p}
            rows={2}
            maxLength={500}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="z. B. ohne Befund, Eintrag im Bordbuch Seite 12"
          />
        )}
      </Feld>
      <Hinweis ton={naechste.length ? 'info' : 'warnung'}>
        {naechste.length
          ? `Nächste Fälligkeit: ${naechste.join(' · ')}`
          : 'Ohne Intervall wird die Frist danach abgeschlossen.'}
      </Hinweis>
      {fehler && <p className="text-text-3 text-sm">{fehler}</p>}
      {erledigen.isError && <FehlerBox fehler={erledigen.error} />}
    </Dialog>
  )
}

export function FristenPage() {
  const [params, setParams] = useSearchParams()
  const flugzeugFilter = params.get('flugzeug') ?? ''
  const fristen = useFristen()
  const flotte = useFlotte()
  const [abgeschlosseneZeigen, setAbgeschlosseneZeigen] = useState(false)
  const [dialog, setDialog] = useState<{ frist: Frist | null } | null>(null)
  const [erledigen, setErledigen] = useState<Frist | null>(null)

  const liste = useMemo(
    () =>
      (fristen.data ?? []).filter(
        (f) =>
          (!flugzeugFilter || f.aircraft_id === flugzeugFilter) &&
          (abgeschlosseneZeigen || f.aktiv),
      ),
    [fristen.data, flugzeugFilter, abgeschlosseneZeigen],
  )
  const zahl = (s: FristStand) => liste.filter((f) => fristStand(f) === s).length

  return (
    <div className="space-y-4 lg:space-y-6">
      <SeitenKopf
        titel="Fristen"
        untertitel="Kontrollen und Lebensdauern nach Datum oder Betriebsstunden. Orientierung für die Instandhaltung – maßgeblich bleiben Bordbuch und Wartungsunterlagen."
        aktionen={
          <Button
            art="primaer"
            icon={<Plus aria-hidden="true" className="size-4" />}
            onClick={() => setDialog({ frist: null })}
          >
            Frist anlegen
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <Kennzahl label="Überfällig" wert={fristen.data ? zahl('ueberfaellig') : '–'} ton="rot" />
        <Kennzahl label="Bald fällig" wert={fristen.data ? zahl('bald') : '–'} ton="gelb" />
        <Kennzahl label="In Ordnung" wert={fristen.data ? zahl('ok') : '–'} ton="gruen" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Auswahl
          aria-label="Luftfahrzeug"
          className="max-w-xs"
          value={flugzeugFilter}
          onChange={(e) => {
            const p = new URLSearchParams(params)
            if (e.target.value) p.set('flugzeug', e.target.value)
            else p.delete('flugzeug')
            setParams(p, { replace: true })
          }}
        >
          <option value="">Alle Luftfahrzeuge</option>
          {(flotte.data ?? []).map((f) => (
            <option key={f.id} value={f.id}>
              {f.kennzeichen} · {f.muster}
            </option>
          ))}
        </Auswahl>
        <Haken
          label="Abgeschlossene zeigen"
          checked={abgeschlosseneZeigen}
          onChange={(e) => setAbgeschlosseneZeigen(e.target.checked)}
        />
      </div>

      {fristen.isPending ? (
        <Panel>
          <Laden />
        </Panel>
      ) : fristen.isError ? (
        <FehlerBox fehler={fristen.error} nochmal={() => void fristen.refetch()} />
      ) : liste.length === 0 ? (
        <Panel>
          <Leer icon={<CalendarClock />} titel="Keine Fristen">
            Lege Fristen für Kontrollen (z. B. 50-h-Kontrolle) und Bauteile mit Lebensdauer (z. B.
            Anschnallgurte) an.
          </Leer>
        </Panel>
      ) : (
        GRUPPEN.map(({ stand, titel }) => {
          const gruppe = liste.filter((f) => fristStand(f) === stand)
          if (gruppe.length === 0) return null
          return (
            <Panel key={stand}>
              <PanelKopf titel={titel} zusatz={gruppe.length} />
              <ul className="divide-rand divide-y">
                {gruppe.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <Link
                      to={`/flugzeuge/${f.aircraft_id}`}
                      className="text-primaer w-20 shrink-0 font-mono text-sm font-semibold hover:underline"
                    >
                      {f.kennzeichen}
                    </Link>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {f.titel}
                        <FristStandBadge f={f} />
                      </p>
                      <p className="text-text-2 font-mono text-xs">{faelligkeitText(f)}</p>
                      <p className="text-text-3 text-xs">
                        {intervallText(f)}
                        {f.zuletzt_am && ` · zuletzt ${tag(f.zuletzt_am)}`}
                        {f.zuletzt_bei_minuten != null && ` bei ${stunden(f.zuletzt_bei_minuten)}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {f.aktiv && (
                        <Button
                          groesse="klein"
                          icon={<CheckCheck aria-hidden="true" className="size-4" />}
                          onClick={() => setErledigen(f)}
                        >
                          Durchgeführt
                        </Button>
                      )}
                      <Button
                        groesse="klein"
                        aria-label={`${f.titel} bearbeiten`}
                        icon={<Pencil aria-hidden="true" className="size-4" />}
                        onClick={() => setDialog({ frist: f })}
                      >
                        <span className="hidden sm:inline">
                          {f.aktiv ? 'Bearbeiten' : 'Verlauf'}
                        </span>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )
        })
      )}

      {dialog && (
        <FristDialog
          frist={dialog.frist}
          aircraftId={flugzeugFilter || null}
          onSchliessen={() => setDialog(null)}
        />
      )}
      {erledigen && <ErledigenDialog frist={erledigen} onSchliessen={() => setErledigen(null)} />}
    </div>
  )
}
