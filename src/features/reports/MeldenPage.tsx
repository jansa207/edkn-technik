import { Camera, CircleCheck, ImagePlus, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Ampel } from '@/components/Ampel'
import { Button, ButtonLink } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { FehlerBox, Hinweis, Laden } from '@/components/Feedback'
import { Feld, Haken, Textfeld } from '@/components/Form'
import { Panel, PanelKopf, SeitenKopf } from '@/components/Panel'
import { useFlotte } from '@/features/aircraft/api'
import { useIstWart } from '@/features/auth/useAuth'
import { MAX_FOTOS } from '@/lib/bild'
import { meldungsNr } from '@/lib/format'
import { useQueryClient } from '@tanstack/react-query'
import { meldungAnlegen, type MeldungErgebnis } from './api'

const MAX_TEXT = 2000

function FotoAuswahl({ fotos, setFotos }: { fotos: File[]; setFotos: (f: File[]) => void }) {
  const vorschau = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos])
  useEffect(() => () => vorschau.forEach((u) => URL.revokeObjectURL(u)), [vorschau])

  function hinzufuegen(liste: FileList | null) {
    if (!liste) return
    const neu = Array.from(liste).filter((f) => f.type.startsWith('image/'))
    setFotos([...fotos, ...neu].slice(0, MAX_FOTOS))
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">
        Fotos <span className="text-text-3 font-normal">(optional, bis zu {MAX_FOTOS})</span>
      </p>
      <div className="flex flex-wrap gap-3">
        {vorschau.map((url, i) => (
          <div
            key={url}
            className="border-rand bg-flaeche relative size-24 overflow-hidden rounded-md border"
          >
            <img src={url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => setFotos(fotos.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-black/70 text-white"
              aria-label={`Foto ${i + 1} entfernen`}
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
        {fotos.length < MAX_FOTOS && (
          <>
            {/* Kamera direkt (Handy) */}
            <label className="border-rand-stark text-text-2 hover:border-primaer hover:text-primaer flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed bg-white text-sm font-medium">
              <Camera aria-hidden="true" className="size-6" />
              Kamera
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  hinzufuegen(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
            <label className="border-rand-stark text-text-2 hover:border-primaer hover:text-primaer flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed bg-white text-sm font-medium">
              <ImagePlus aria-hidden="true" className="size-6" />
              Galerie
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  hinzufuegen(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          </>
        )}
      </div>
      <p className="text-text-3 text-xs">Fotos werden vor dem Hochladen automatisch verkleinert.</p>
    </div>
  )
}

function Bestaetigung({
  ergebnis,
  kennzeichen,
}: {
  ergebnis: MeldungErgebnis
  kennzeichen: string
}) {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Panel>
        <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <CircleCheck aria-hidden="true" className="text-ampel-gruen size-12" />
          <h1 className="text-xl font-semibold">Danke! Beanstandung ist eingegangen.</h1>
          <p className="font-mono text-lg">
            {meldungsNr(ergebnis.nr)} · {kennzeichen}
          </p>
          <p className="text-text-2">
            Die Instandhaltung prüft die Beanstandung. Die Rückmeldung findest du unter „Meine
            Beanstandungen“.
          </p>
        </div>
      </Panel>
      {ergebnis.fotoFehler > 0 && (
        <Hinweis ton="warnung" titel="Nicht alle Fotos wurden hochgeladen">
          {ergebnis.fotoFehler} Foto(s) konnten nicht gespeichert werden. Die Beanstandung selbst
          ist gespeichert. Du kannst Fotos per Nachtrag beschreiben oder einem Wart direkt zeigen.
        </Hinweis>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <ButtonLink to={`/meine-meldungen/${ergebnis.id}`} art="primaer" groesse="gross">
          Beanstandung ansehen
        </ButtonLink>
        <ButtonLink to="/" groesse="gross">
          Zum Flottenstatus
        </ButtonLink>
      </div>
    </div>
  )
}

export function MeldenPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const wart = useIstWart()
  const flotte = useFlotte()
  const [aircraftId, setAircraftId] = useState(params.get('flugzeug') ?? '')
  const [text, setText] = useState('')
  const [vnf, setVnf] = useState(false)
  const [vnfFrage, setVnfFrage] = useState(false)
  const [fotos, setFotos] = useState<File[]>([])
  const [schritt, setSchritt] = useState<string | null>(null)
  const [fehler, setFehler] = useState<unknown>(null)
  const [ergebnis, setErgebnis] = useState<MeldungErgebnis | null>(null)

  const aktive = (flotte.data ?? []).filter((f) => f.aktiv)
  const gewaehlt = aktive.find((f) => f.id === aircraftId)
  const fehlt = !aircraftId
    ? 'Bitte ein Luftfahrzeug wählen.'
    : !text.trim()
      ? 'Bitte die Beanstandung beschreiben.'
      : null

  async function absenden(e?: FormEvent) {
    e?.preventDefault()
    if (fehlt || schritt) return
    setFehler(null)
    try {
      const r = await meldungAnlegen(
        { aircraftId, text: text.trim(), vorlaeufigNichtFlugklar: vnf, fotos },
        setSchritt,
      )
      await queryClient.invalidateQueries()
      setErgebnis(r)
    } catch (err) {
      setFehler(err)
    } finally {
      setSchritt(null)
    }
  }

  if (ergebnis)
    return <Bestaetigung ergebnis={ergebnis} kennzeichen={gewaehlt?.kennzeichen ?? ''} />

  return (
    <div className="mx-auto max-w-3xl space-y-4 lg:space-y-6">
      <SeitenKopf
        titel="Beanstandung melden"
        untertitel="Kurz beschreiben, was dir aufgefallen ist. Die Instandhaltung meldet sich zurück."
      />

      <form onSubmit={absenden} className="space-y-4" noValidate>
        <Panel>
          <PanelKopf titel="1 · Luftfahrzeug" />
          {flotte.isPending ? (
            <Laden />
          ) : flotte.isError ? (
            <div className="p-4">
              <FehlerBox fehler={flotte.error} nochmal={() => void flotte.refetch()} />
            </div>
          ) : (
            <fieldset className="grid gap-2 p-4 sm:grid-cols-2">
              <legend className="sr-only">Luftfahrzeug</legend>
              {aktive.map((f) => (
                <label
                  key={f.id}
                  className="border-rand-stark has-checked:border-primaer has-checked:ring-primaer flex min-h-14 cursor-pointer items-center gap-3 rounded-md border bg-white px-3 py-2 has-checked:bg-blue-50 has-checked:ring-1"
                >
                  <input
                    type="radio"
                    name="flugzeug"
                    value={f.id}
                    checked={aircraftId === f.id}
                    onChange={() => setAircraftId(f.id)}
                    className="accent-primaer size-5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono font-semibold">{f.kennzeichen}</span>
                    <span className="text-text-2 block truncate text-sm">{f.muster}</span>
                  </span>
                  {f.ampel && f.ampel !== 'gruen' && <Ampel status={f.ampel} groesse="klein" />}
                </label>
              ))}
            </fieldset>
          )}
          {gewaehlt && (gewaehlt.sperrgruende?.length || (gewaehlt.anzahl_in_pruefung ?? 0) > 0) ? (
            <div className="px-4 pb-4">
              <Hinweis titel="Bereits bekannt">
                {gewaehlt.sperrgruende?.map((g) => (
                  <p key={g}>• {g}</p>
                ))}
                {(gewaehlt.anzahl_in_pruefung ?? 0) > 0 && (
                  <p>• {gewaehlt.anzahl_in_pruefung} Beanstandung(en) in Prüfung</p>
                )}
                <p>
                  <Link to={`/flugzeuge/${gewaehlt.id}`} className="font-medium underline">
                    Details ansehen
                  </Link>{' '}
                  – trotzdem melden, wenn es etwas Neues ist.
                </p>
              </Hinweis>
            </div>
          ) : null}
        </Panel>

        <Panel>
          <PanelKopf titel="2 · Beschreibung" />
          <div className="space-y-4 p-4">
            <Feld label="Was ist dir aufgefallen?" pflicht zaehler={`${text.length}/${MAX_TEXT}`}>
              {(p) => (
                <Textfeld
                  {...p}
                  rows={5}
                  maxLength={MAX_TEXT}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Wo genau? Was passiert? Seit wann? z. B. „Spornrad hat deutliches Spiel, Achse wackelt.“"
                />
              )}
            </Feld>
            <FotoAuswahl fotos={fotos} setFotos={setFotos} />
          </div>
        </Panel>

        <Panel>
          <PanelKopf titel="3 · Einschätzung" />
          <div className="p-4">
            <div
              className={`rounded-md border p-3 ${vnf ? 'border-ampel-rot bg-red-50' : 'border-rand-stark'}`}
            >
              <Haken
                label="Ich halte das Luftfahrzeug für nicht flugklar"
                hinweis="Das Luftfahrzeug wird sofort für alle rot angezeigt („vorläufig nicht flugklar“), bis ein Wart entscheidet."
                checked={vnf}
                onChange={(e) => (e.target.checked ? setVnfFrage(true) : setVnf(false))}
              />
            </div>
            {wart && (
              <p className="text-text-2 mt-3 text-sm">
                Als Wart kannst du die Beanstandung danach direkt im Beanstandungseingang einstufen.
              </p>
            )}
          </div>
        </Panel>

        <Hinweis>
          Sicherheitsereignisse (z. B. Beinaheunfall) gehören zusätzlich ins SMS-Meldesystem des
          Vereins.
        </Hinweis>

        {fehler != null && <FehlerBox fehler={fehler} nochmal={() => void absenden()} />}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button groesse="gross" onClick={() => void navigate(-1)} disabled={Boolean(schritt)}>
            Abbrechen
          </Button>
          <Button
            type="submit"
            art="primaer"
            groesse="gross"
            laedt={Boolean(schritt)}
            disabled={Boolean(fehlt)}
          >
            {schritt ?? 'Beanstandung absenden'}
          </Button>
        </div>
        {fehlt && <p className="text-text-3 text-right text-sm">{fehlt}</p>}
      </form>

      <Dialog
        offen={vnfFrage}
        onSchliessen={() => setVnfFrage(false)}
        titel="Vorläufig nicht flugklar?"
        fuss={
          <>
            <Button onClick={() => setVnfFrage(false)}>Nein</Button>
            <Button
              art="gefahr"
              onClick={() => {
                setVnf(true)
                setVnfFrage(false)
              }}
            >
              Ja, Luftfahrzeug ist nicht flugklar
            </Button>
          </>
        }
      >
        <p>
          {gewaehlt ? (
            <strong className="font-mono">{gewaehlt.kennzeichen}</strong>
          ) : (
            'Das Luftfahrzeug'
          )}{' '}
          wird nach dem Absenden sofort für alle Piloten als gesperrt angezeigt, bis ein Wart die
          Beanstandung einstuft.
        </p>
      </Dialog>
    </div>
  )
}
