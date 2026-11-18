import { ImageOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { Laden } from '@/components/Feedback'
import { Haken, Textfeld } from '@/components/Form'
import type { VerlaufEintrag } from '@/features/aircraft/api'
import { zeitpunkt } from '@/lib/format'
import { useKommentieren, useMeldungFotos } from './api'

export function FotoGalerie({ reportId, anzahl }: { reportId: string; anzahl: number | null }) {
  const fotos = useMeldungFotos(reportId, anzahl)
  const [gross, setGross] = useState<string | null>(null)
  if (!anzahl) return <p className="text-text-3 text-sm">Keine Fotos</p>
  if (fotos.isPending) return <Laden text="Fotos werden geladen …" />
  return (
    <>
      <div className="flex flex-wrap gap-3">
        {(fotos.data ?? []).map((f, i) =>
          f.url ? (
            <button
              key={f.id}
              type="button"
              onClick={() => setGross(f.url)}
              className="border-rand bg-flaeche hover:ring-primaer size-28 overflow-hidden rounded-md border hover:ring-2"
            >
              <img
                src={f.url}
                alt={`Foto ${i + 1}`}
                className="size-full object-cover"
                loading="lazy"
              />
            </button>
          ) : (
            <div
              key={f.id}
              className="border-rand bg-flaeche flex size-28 items-center justify-center rounded-md border"
            >
              <ImageOff aria-label="Foto nicht verfügbar" className="text-text-3 size-6" />
            </div>
          ),
        )}
      </div>
      <Dialog offen={Boolean(gross)} onSchliessen={() => setGross(null)} titel="Foto" breit>
        {gross && (
          <img src={gross} alt="Foto in groß" className="mx-auto max-h-[70dvh] rounded-md" />
        )}
      </Dialog>
    </>
  )
}

const TYP_TEXT: Record<string, string> = {
  erstellt: 'Meldung erstellt',
  kommentar: 'Kommentar',
  statuswechsel: 'Status',
  kategorie: 'Einstufung',
  sperre: 'Sperre',
  entsperrt: 'Entsperrt',
}

/** Aktivität einer Meldung als Feed (älteste oben). Kommentare hervorgehoben. */
export function MeldungFeed({ eintraege }: { eintraege: VerlaufEintrag[] }) {
  if (eintraege.length === 0) return <p className="text-text-2 text-sm">Noch keine Aktivität.</p>
  return (
    <ol className="before:bg-rand relative space-y-4 before:absolute before:inset-y-2 before:left-[7px] before:w-px">
      {eintraege.map((e) => {
        const kommentar = e.typ === 'kommentar'
        return (
          <li key={e.id} className="relative flex gap-3">
            <span
              aria-hidden="true"
              className={`relative mt-1.5 size-[15px] shrink-0 rounded-full border-2 border-white ${kommentar ? (e.intern ? 'bg-amber-500' : 'bg-primaer') : 'bg-rand-stark'}`}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-text-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="text-text font-semibold">{e.user_name ?? 'Melder'}</span>
                <span>{TYP_TEXT[e.typ]}</span>
                <span className="font-mono">{zeitpunkt(e.created_at)}</span>
                {e.intern && <Badge ton="gelb">intern</Badge>}
              </p>
              <p
                className={`text-sm break-words whitespace-pre-line ${kommentar ? `rounded-md border p-3 ${e.intern ? 'border-amber-200 bg-amber-50' : 'border-rand bg-white'}` : 'text-text-2'}`}
              >
                {e.text}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Kommentar schreiben. Warte wählen intern oder „für den Melder“, Melder schreiben einen Nachtrag. */
export function KommentarForm({ reportId, wart }: { reportId: string; wart: boolean }) {
  const kommentieren = useKommentieren()
  const [text, setText] = useState('')
  const [intern, setIntern] = useState(true)

  function senden(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    kommentieren.mutate(
      { reportId, text: text.trim(), intern: wart && intern },
      { onSuccess: () => setText('') },
    )
  }

  return (
    <form onSubmit={senden} className="space-y-2">
      <label className="sr-only" htmlFor={`kommentar-${reportId}`}>
        {wart ? 'Kommentar' : 'Nachtrag'}
      </label>
      <Textfeld
        id={`kommentar-${reportId}`}
        rows={3}
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          wart ? 'Kommentar schreiben …' : 'Nachtrag zur Meldung (z. B. neue Beobachtung) …'
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {wart ? (
          <Haken
            label="Nur intern (Melder sieht es nicht)"
            checked={intern}
            onChange={(e) => setIntern(e.target.checked)}
          />
        ) : (
          <span className="text-text-3 text-xs">
            Die Meldung selbst kann nicht mehr geändert werden.
          </span>
        )}
        <Button type="submit" art="primaer" laedt={kommentieren.isPending} disabled={!text.trim()}>
          {wart ? (intern ? 'Intern kommentieren' : 'An Melder senden') : 'Nachtrag senden'}
        </Button>
      </div>
    </form>
  )
}
