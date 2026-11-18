import { useState, type FormEvent } from 'react'
import { KatBadge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Hinweis } from '@/components/Feedback'
import { AuswahlKarte, Feld, Haken, Textfeld } from '@/components/Form'
import { KAT_TEXT } from '@/components/statusTexte'
import type { Meldung } from '@/features/reports/api'
import { useEinstufen, useMeldungStatus } from './api'
import { winterarbeit } from './ziele'

/** Einstufen bzw. umstufen (Kat 1/2/3) */
export function EinstufenForm({
  m,
  onEingestuft,
}: {
  m: Meldung
  onEingestuft?: (kategorie: 1 | 2 | 3, aufgabeAnlegen: boolean) => void
}) {
  const einstufen = useEinstufen()
  const [kat, setKat] = useState<1 | 2 | 3 | null>((m.kategorie as 1 | 2 | 3 | null) ?? null)
  const [hinweis, setHinweis] = useState(m.pilotenhinweis ?? '')
  const [sichtbar, setSichtbar] = useState(m.kategorie === 2 ? m.pilotenhinweis_sichtbar : true)
  const [ziel, setZiel] = useState(m.ziel ?? '')
  const [begruendung, setBegruendung] = useState('')
  const [aufgabe, setAufgabe] = useState(m.status === 'neu')

  const fehlt =
    kat === null
      ? 'Bitte eine Kategorie wählen.'
      : kat === 1 && !hinweis.trim()
        ? 'Bitte einen Sperrgrund für die Piloten angeben.'
        : kat === 2 && !ziel.trim()
          ? 'Bitte ein Ziel angeben.'
          : kat === 3 && !begruendung.trim()
            ? 'Bitte eine Begründung angeben.'
            : null

  function speichern(e: FormEvent) {
    e.preventDefault()
    if (fehlt || kat === null) return
    einstufen.mutate(
      {
        reportId: m.id,
        kategorie: kat,
        ziel: kat === 2 ? ziel.trim() : undefined,
        pilotenhinweis: kat !== 3 ? hinweis.trim() || undefined : undefined,
        pilotenhinweisSichtbar: kat === 2 ? sichtbar && Boolean(hinweis.trim()) : kat === 1,
        begruendung: kat === 3 ? begruendung.trim() : undefined,
      },
      { onSuccess: () => onEingestuft?.(kat, aufgabe && kat !== 3) },
    )
  }

  return (
    <form onSubmit={speichern} className="space-y-4" noValidate>
      <fieldset className="space-y-2">
        <legend className="sr-only">Kategorie</legend>
        {([1, 2, 3] as const).map((k) => (
          <AuswahlKarte
            key={k}
            name={`kat-${m.id}`}
            wert={String(k)}
            gewaehlt={kat === k}
            onWahl={() => setKat(k)}
            kennung={<KatBadge kategorie={k} />}
            titel={KAT_TEXT[k]}
            ton={k === 1 ? 'rot' : k === 2 ? 'gelb' : 'grau'}
            text={
              k === 1
                ? 'Flugzeug wird rot, bis die Meldung erledigt ist.'
                : k === 2
                  ? 'Flugzeug bleibt fliegbar. Optional mit Hinweis für Piloten (dann gelb).'
                  : 'Meldung wird abgelegt. Die Begründung geht an den Melder.'
            }
          />
        ))}
      </fieldset>

      {kat === 1 && (
        <Feld
          label="Sperrgrund für Piloten"
          pflicht
          hinweis="Sehen alle Piloten am Flugzeug."
          zaehler={`${hinweis.length}/500`}
        >
          {(p) => (
            <Textfeld
              {...p}
              rows={2}
              maxLength={500}
              value={hinweis}
              onChange={(e) => setHinweis(e.target.value)}
              placeholder="z. B. Spornrad defekt, wird getauscht."
            />
          )}
        </Feld>
      )}

      {kat === 2 && (
        <>
          <Feld label="Ziel" pflicht hinweis="Bis wann bzw. bei welcher Gelegenheit?">
            {(p) => (
              <div className="space-y-2">
                <Textfeld
                  {...p}
                  rows={1}
                  maxLength={200}
                  value={ziel}
                  onChange={(e) => setZiel(e.target.value)}
                  className="min-h-12 lg:min-h-9"
                />
                <div className="flex flex-wrap gap-1.5">
                  {['Nächster Schlechtwettertag', winterarbeit(), 'Nächste Jahresnachprüfung'].map(
                    (z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setZiel(z)}
                        className="border-rand-stark hover:bg-flaeche min-h-9 rounded-sm border bg-white px-2.5 text-xs font-medium lg:min-h-7"
                      >
                        {z}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}
          </Feld>
          <Feld
            label="Pilotenhinweis"
            hinweis="Kurz und verständlich, z. B. „bekannt, geprüft, nicht sicherheitsrelevant“."
            zaehler={`${hinweis.length}/500`}
          >
            {(p) => (
              <Textfeld
                {...p}
                rows={2}
                maxLength={500}
                value={hinweis}
                onChange={(e) => setHinweis(e.target.value)}
              />
            )}
          </Feld>
          <Haken
            label="Hinweis für alle Piloten anzeigen (Ampel gelb)"
            checked={sichtbar && Boolean(hinweis.trim())}
            disabled={!hinweis.trim()}
            onChange={(e) => setSichtbar(e.target.checked)}
          />
        </>
      )}

      {kat === 3 && (
        <Feld
          label="Begründung (Rückmeldung an den Melder)"
          pflicht
          zaehler={`${begruendung.length}/2000`}
        >
          {(p) => (
            <Textfeld
              {...p}
              rows={3}
              maxLength={2000}
              value={begruendung}
              onChange={(e) => setBegruendung(e.target.value)}
              placeholder="z. B. Luftdruck geprüft, alles in Ordnung. Danke für die Meldung!"
            />
          )}
        </Feld>
      )}

      {kat !== null && kat !== 3 && m.status === 'neu' && (
        <Haken
          label="Danach direkt eine Werkstatt-Aufgabe anlegen"
          checked={aufgabe}
          onChange={(e) => setAufgabe(e.target.checked)}
        />
      )}

      {m.status !== 'neu' && m.kategorie !== kat && kat !== null && (
        <Hinweis ton="warnung">
          Umstufen von Kat {m.kategorie} auf Kat {kat} wird im Verlauf protokolliert.
        </Hinweis>
      )}

      <div className="flex items-center justify-end gap-3">
        {fehlt && <span className="text-text-3 text-sm">{fehlt}</span>}
        <Button type="submit" art="primaer" laedt={einstufen.isPending} disabled={Boolean(fehlt)}>
          {m.status === 'neu' ? 'Einstufen' : 'Einstufung speichern'}
        </Button>
      </div>
    </form>
  )
}

/** Meldung erledigen: Maßnahme Pflicht, bei Kat 1 Bestätigung „wieder flugklar“ */
export function ErledigenForm({ m, offeneAufgaben }: { m: Meldung; offeneAufgaben: number }) {
  const status = useMeldungStatus()
  const [massnahme, setMassnahme] = useState('')
  const [flugklar, setFlugklar] = useState(false)
  const fehlt = !massnahme.trim()
    ? 'Bitte die Maßnahme angeben.'
    : m.kategorie === 1 && !flugklar
      ? 'Bitte „wieder flugklar“ bestätigen.'
      : null

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!fehlt)
          status.mutate({
            reportId: m.id,
            status: 'erledigt',
            massnahme: massnahme.trim(),
            flugklar,
          })
      }}
      className="space-y-4"
      noValidate
    >
      {offeneAufgaben > 0 && (
        <Hinweis ton="warnung">
          Zu dieser Meldung{' '}
          {offeneAufgaben === 1 ? 'ist noch 1 Aufgabe' : `sind noch ${offeneAufgaben} Aufgaben`}{' '}
          offen.
        </Hinweis>
      )}
      <Feld
        label="Durchgeführte Maßnahme"
        pflicht
        hinweis="Geht als Rückmeldung an den Melder und steht im Verlauf."
        zaehler={`${massnahme.length}/2000`}
      >
        {(p) => (
          <Textfeld
            {...p}
            rows={3}
            maxLength={2000}
            value={massnahme}
            onChange={(e) => setMassnahme(e.target.value)}
            placeholder="z. B. Spornrad und Achse getauscht, Funktionsprüfung i. O."
          />
        )}
      </Feld>
      {m.kategorie === 1 && (
        <div
          className={`rounded-md border p-3 ${flugklar ? 'border-ampel-gruen bg-green-50' : 'border-rand-stark'}`}
        >
          <Haken
            label="Flugzeug ist wieder flugklar"
            hinweis="Bestätigung durch dich als Wart. Ersetzt keine Prüferfreigabe oder Eintragung ins Bordbuch."
            checked={flugklar}
            onChange={(e) => setFlugklar(e.target.checked)}
          />
        </div>
      )}
      <div className="flex items-center justify-end gap-3">
        {fehlt && <span className="text-text-3 text-sm">{fehlt}</span>}
        <Button type="submit" art="primaer" laedt={status.isPending} disabled={Boolean(fehlt)}>
          Als erledigt abschließen
        </Button>
      </div>
    </form>
  )
}
