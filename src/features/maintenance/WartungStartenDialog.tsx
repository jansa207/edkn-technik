import { ClipboardCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ButtonLink, Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { FehlerBox, Hinweis, Laden, Leer } from '@/components/Feedback'
import { AuswahlKarte, Auswahl, Eingabe, Feld, Haken } from '@/components/Form'
import { ROLLE_TEXT } from '@/components/statusTexte'
import type { Flugzeug } from '@/features/aircraft/api'
import { useWarte } from '@/features/workshop/api'
import { name } from '@/lib/format'
import { useWartungStarten, useWartungsprogramme } from './api'

/**
 * Wartung beginnen: Programm wählen → Aufgabe mit allen Teilschritten,
 * optional mit Sperre („In Wartung: …“). Die Sperre hebt ein Wart danach
 * bewusst wieder auf.
 */
export function WartungStartenDialog({
  flugzeug,
  onSchliessen,
}: {
  flugzeug: Flugzeug
  onSchliessen: () => void
}) {
  const programme = useWartungsprogramme()
  const warte = useWarte()
  const starten = useWartungStarten()
  const navigate = useNavigate()
  const [programmId, setProgrammId] = useState<string | null>(null)
  const [faelligAm, setFaelligAm] = useState('')
  const [zustaendigId, setZustaendigId] = useState('')
  const [sperren, setSperren] = useState(!flugzeug.gesperrt)

  const aktive = (programme.data ?? []).filter((p) => p.aktiv)
  // Passende Programme (gleiches Muster) zuerst
  const sortiert = [...aktive].sort(
    (a, b) =>
      Number(b.muster?.toLowerCase() === flugzeug.muster.toLowerCase()) -
      Number(a.muster?.toLowerCase() === flugzeug.muster.toLowerCase()),
  )

  return (
    <Dialog
      offen
      breit
      onSchliessen={onSchliessen}
      titel={`Wartung beginnen – ${flugzeug.kennzeichen}`}
      untertitel="Legt eine Aufgabe mit den Teilschritten des Wartungsprogramms an."
      fuss={
        <>
          <Button onClick={onSchliessen}>Abbrechen</Button>
          <Button
            art="primaer"
            disabled={!programmId}
            laedt={starten.isPending}
            onClick={() =>
              programmId &&
              starten.mutate(
                {
                  aircraftId: flugzeug.id,
                  templateId: programmId,
                  faelligAm: faelligAm || null,
                  zustaendigId: zustaendigId || null,
                  sperren,
                },
                { onSuccess: (id) => void navigate(`/werkstatt/aufgaben/${id}`) },
              )
            }
          >
            Wartung beginnen
          </Button>
        </>
      }
    >
      {programme.isPending ? (
        <Laden />
      ) : programme.isError ? (
        <FehlerBox fehler={programme.error} />
      ) : sortiert.length === 0 ? (
        <Leer icon={<ClipboardCheck />} titel="Noch keine Wartungsprogramme">
          <p>Lege zuerst ein Programm an, z. B. „50-h-Kontrolle“ mit den Prüfschritten.</p>
          <ButtonLink to="/verwaltung/wartungsprogramme" groesse="klein" className="mt-3">
            Zu den Wartungsprogrammen
          </ButtonLink>
        </Leer>
      ) : (
        <>
          <fieldset className="space-y-2">
            <legend className="text-text mb-1.5 text-sm font-semibold">Wartungsprogramm</legend>
            {sortiert.map((p) => (
              <AuswahlKarte
                key={p.id}
                name="programm"
                wert={p.id}
                gewaehlt={programmId === p.id}
                onWahl={setProgrammId}
                titel={p.titel}
                kennung={
                  p.muster ? (
                    <span className="text-text-2 font-mono text-xs font-normal">{p.muster}</span>
                  ) : undefined
                }
                text={`${p.schritte.length} Teilschritte${p.beschreibung ? ` · ${p.beschreibung}` : ''}`}
              />
            ))}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Feld label="Fertig bis">
              {(f) => (
                <Eingabe
                  {...f}
                  type="date"
                  value={faelligAm}
                  onChange={(e) => setFaelligAm(e.target.value)}
                />
              )}
            </Feld>
            <Feld label="Zuständig">
              {(f) => (
                <Auswahl
                  {...f}
                  value={zustaendigId}
                  onChange={(e) => setZustaendigId(e.target.value)}
                >
                  <option value="">Noch offen</option>
                  {(warte.data ?? []).map((w) => (
                    <option key={w.id} value={w.id}>
                      {name(w.vorname, w.nachname)} ({ROLLE_TEXT[w.rolle]})
                    </option>
                  ))}
                </Auswahl>
              )}
            </Feld>
          </div>
          {flugzeug.gesperrt ? (
            <Hinweis>Das Luftfahrzeug ist schon gesperrt: {flugzeug.sperrgrund}</Hinweis>
          ) : (
            <Haken
              label="Luftfahrzeug während der Wartung sperren"
              hinweis="Alle Piloten sehen „In Wartung: …“ als Sperrgrund. Nach der Wartung die Sperre bewusst aufheben."
              checked={sperren}
              onChange={(e) => setSperren(e.target.checked)}
            />
          )}
          {starten.isError && <FehlerBox fehler={starten.error} />}
        </>
      )}
    </Dialog>
  )
}
