import { ArchiveRestore, ClipboardCheck, Pencil, Plus, Archive as ArchivIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { FehlerBox, Laden, Leer } from '@/components/Feedback'
import { Eingabe, Feld, Haken, Textfeld } from '@/components/Form'
import { Panel, PanelKopf, SeitenKopf } from '@/components/Panel'
import {
  useProgrammAktiv,
  useProgrammSpeichern,
  useWartungsprogramme,
  type ProgrammMitSchritten,
} from './api'

function ProgrammDialog({
  programm,
  onSchliessen,
}: {
  programm: ProgrammMitSchritten | null
  onSchliessen: () => void
}) {
  const speichern = useProgrammSpeichern()
  const [titel, setTitel] = useState(programm?.titel ?? '')
  const [muster, setMuster] = useState(programm?.muster ?? '')
  const [beschreibung, setBeschreibung] = useState(programm?.beschreibung ?? '')
  const [schritte, setSchritte] = useState(programm?.schritte.map((s) => s.text).join('\n') ?? '')
  const [versucht, setVersucht] = useState(false)
  const liste = schritte
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const zuLang = liste.find((s) => s.length > 300)

  function absenden(e: FormEvent) {
    e.preventDefault()
    setVersucht(true)
    if (!titel.trim() || zuLang) return
    speichern.mutate(
      {
        id: programm?.id ?? null,
        titel: titel.trim(),
        muster: muster.trim(),
        beschreibung: beschreibung.trim(),
        schritte: liste,
      },
      { onSuccess: onSchliessen },
    )
  }

  return (
    <Dialog
      offen
      breit
      onSchliessen={onSchliessen}
      titel={programm ? 'Wartungsprogramm bearbeiten' : 'Wartungsprogramm anlegen'}
      untertitel="Gespeicherte Checkliste, z. B. für die Winterwartung oder eine 50-h-Kontrolle. Bereits gestartete Wartungen ändern sich nicht."
      fuss={
        <>
          <Button onClick={onSchliessen}>Abbrechen</Button>
          <Button art="primaer" type="submit" form="programm-form" laedt={speichern.isPending}>
            Speichern
          </Button>
        </>
      }
    >
      <form id="programm-form" onSubmit={absenden} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Feld
            label="Titel"
            pflicht
            fehler={versucht && !titel.trim() ? 'Bitte einen Titel angeben.' : null}
          >
            {(p) => (
              <Eingabe
                {...p}
                maxLength={150}
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                placeholder="z. B. 50-h-Kontrolle UL"
              />
            )}
          </Feld>
          <Feld label="Für Muster" hinweis="Wird beim Starten zuerst vorgeschlagen">
            {(p) => (
              <Eingabe
                {...p}
                maxLength={100}
                value={muster}
                onChange={(e) => setMuster(e.target.value)}
                placeholder="z. B. C42"
              />
            )}
          </Feld>
        </div>
        <Feld label="Beschreibung" zaehler={`${beschreibung.length}/4000`}>
          {(p) => (
            <Textfeld
              {...p}
              rows={2}
              maxLength={4000}
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              placeholder="z. B. Grundlage: Wartungshandbuch, Ausgabe …"
            />
          )}
        </Feld>
        <Feld
          label="Teilschritte"
          hinweis="Ein Schritt pro Zeile. Wird zur Checkliste der Aufgabe."
          zaehler={`${liste.length} Schritte`}
          fehler={versucht && zuLang ? 'Ein Schritt darf höchstens 300 Zeichen haben.' : null}
        >
          {(p) => (
            <Textfeld
              {...p}
              rows={8}
              value={schritte}
              onChange={(e) => setSchritte(e.target.value)}
              placeholder={
                'Ölwechsel und Filter\nZündkerzen prüfen\nReifendruck und Bremsen prüfen'
              }
            />
          )}
        </Feld>
        {speichern.isError && <FehlerBox fehler={speichern.error} />}
      </form>
    </Dialog>
  )
}

export function WartungsprogrammePage() {
  const programme = useWartungsprogramme()
  const aktivSetzen = useProgrammAktiv()
  const [dialog, setDialog] = useState<{ programm: ProgrammMitSchritten | null } | null>(null)
  const [archivierteZeigen, setArchivierteZeigen] = useState(false)
  const liste = (programme.data ?? []).filter((p) => archivierteZeigen || p.aktiv)

  return (
    <div className="space-y-4 lg:space-y-6">
      <SeitenKopf
        titel="Wartungsprogramme"
        untertitel="Gespeicherte Checklisten. Am Luftfahrzeug startest du damit über „Wartung beginnen“ eine Aufgabe mit allen Teilschritten."
        aktionen={
          <Button
            art="primaer"
            icon={<Plus aria-hidden="true" className="size-4" />}
            onClick={() => setDialog({ programm: null })}
          >
            Programm anlegen
          </Button>
        }
      />
      <Haken
        label="Archivierte zeigen"
        checked={archivierteZeigen}
        onChange={(e) => setArchivierteZeigen(e.target.checked)}
      />
      {programme.isPending ? (
        <Panel>
          <Laden />
        </Panel>
      ) : programme.isError ? (
        <FehlerBox fehler={programme.error} nochmal={() => void programme.refetch()} />
      ) : liste.length === 0 ? (
        <Panel>
          <Leer icon={<ClipboardCheck />} titel="Noch keine Wartungsprogramme">
            Lege z. B. „Winterwartung Doppelsitzer“ oder „50-h-Kontrolle UL“ mit den Prüfschritten
            an.
          </Leer>
        </Panel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {liste.map((p) => (
            <Panel key={p.id} className={p.aktiv ? '' : 'opacity-70'}>
              <PanelKopf
                titel={p.titel}
                zusatz={`${p.schritte.length} Schritte`}
                aktionen={
                  <>
                    {!p.aktiv && <Badge>Archiviert</Badge>}
                    <Button
                      groesse="klein"
                      aria-label={
                        p.aktiv ? `${p.titel} archivieren` : `${p.titel} wieder aktivieren`
                      }
                      laedt={aktivSetzen.isPending && aktivSetzen.variables?.id === p.id}
                      icon={
                        p.aktiv ? (
                          <ArchivIcon aria-hidden="true" className="size-4" />
                        ) : (
                          <ArchiveRestore aria-hidden="true" className="size-4" />
                        )
                      }
                      onClick={() => aktivSetzen.mutate({ id: p.id, aktiv: !p.aktiv })}
                    />
                    <Button
                      groesse="klein"
                      icon={<Pencil aria-hidden="true" className="size-4" />}
                      onClick={() => setDialog({ programm: p })}
                    >
                      Bearbeiten
                    </Button>
                  </>
                }
              />
              <div className="space-y-3 p-4">
                {(p.muster || p.beschreibung) && (
                  <p className="text-text-2 text-sm">
                    {p.muster && <span className="font-mono">{p.muster}</span>}
                    {p.muster && p.beschreibung && ' · '}
                    {p.beschreibung}
                  </p>
                )}
                {p.schritte.length === 0 ? (
                  <p className="text-text-3 text-sm">Keine Teilschritte.</p>
                ) : (
                  <ol className="list-decimal space-y-1 pl-5 text-sm">
                    {p.schritte.map((s) => (
                      <li key={s.id}>{s.text}</li>
                    ))}
                  </ol>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}
      {dialog && <ProgrammDialog programm={dialog.programm} onSchliessen={() => setDialog(null)} />}
    </div>
  )
}
