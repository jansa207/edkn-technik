import { Plane, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Outlet, useParams } from 'react-router'
import { Ampel } from '@/components/Ampel'
import { FehlerBox, Laden, Leer } from '@/components/Feedback'
import { Kennzahl, Panel, PanelKopf, SeitenKopf } from '@/components/Panel'
import { ART_TEXT } from '@/components/statusTexte'
import { anzahl } from '@/lib/format'
import { useFlotte, type Flugzeug } from './api'

type Filter = 'alle' | 'rot' | 'gelb' | 'gruen'

const FILTER: { wert: Filter; text: string }[] = [
  { wert: 'alle', text: 'Alle' },
  { wert: 'rot', text: 'Gesperrt' },
  { wert: 'gelb', text: 'Hinweise' },
  { wert: 'gruen', text: 'Klar' },
]

function FlugzeugZeile({ f, gewaehlt }: { f: Flugzeug; gewaehlt: boolean }) {
  const ersterGrund = f.sperrgruende?.[0]
  return (
    <li>
      <Link
        to={`/flugzeuge/${f.id}`}
        aria-current={gewaehlt ? 'page' : undefined}
        className={`hover:bg-flaeche flex min-h-16 items-center gap-3 px-4 py-3 ${gewaehlt ? 'bg-blue-50 shadow-[inset_3px_0_0_var(--color-primaer)] hover:bg-blue-50' : ''}`}
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2">
            <span className="font-mono text-base font-semibold">{f.kennzeichen}</span>
            {f.wettbewerbskennzeichen && (
              <span className="text-text-3 font-mono text-xs">„{f.wettbewerbskennzeichen}“</span>
            )}
          </p>
          <p className="text-text-2 truncate text-sm">
            {f.muster} · {ART_TEXT[f.art]}
          </p>
          {f.ampel === 'rot' && ersterGrund && (
            <p className="text-ampel-rot mt-0.5 truncate text-sm font-medium">{ersterGrund}</p>
          )}
          {(f.anzahl_in_pruefung ?? 0) > 0 && (
            <p className="text-text-2 mt-0.5 text-xs">
              {anzahl(f.anzahl_in_pruefung ?? 0, 'Beanstandung', 'Beanstandungen')} in Prüfung
            </p>
          )}
        </div>
        {f.ampel && <Ampel status={f.ampel} groesse="klein" />}
      </Link>
    </li>
  )
}

/** Startseite: Flottenstatus mit Liste und Detail (Desktop nebeneinander, Handy nacheinander) */
export function FlottePage() {
  const { id } = useParams()
  const flotte = useFlotte()
  const [filter, setFilter] = useState<Filter>('alle')
  const [suche, setSuche] = useState('')

  const aktive = useMemo(() => (flotte.data ?? []).filter((f) => f.aktiv), [flotte.data])
  const zahlen = useMemo(
    () => ({
      gruen: aktive.filter((f) => f.ampel === 'gruen').length,
      gelb: aktive.filter((f) => f.ampel === 'gelb').length,
      rot: aktive.filter((f) => f.ampel === 'rot').length,
      pruefung: aktive.reduce((s, f) => s + (f.anzahl_in_pruefung ?? 0), 0),
    }),
    [aktive],
  )
  const liste = aktive.filter((f) => {
    if (filter !== 'alle' && f.ampel !== filter) return false
    const s = suche.trim().toLowerCase()
    return (
      !s ||
      f.kennzeichen.toLowerCase().includes(s) ||
      f.muster.toLowerCase().includes(s) ||
      (f.wettbewerbskennzeichen ?? '').toLowerCase().includes(s)
    )
  })

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className={id ? 'hidden lg:block' : ''}>
        <SeitenKopf
          titel="Flottenstatus"
          untertitel="Technischer Stand der Vereinsflugzeuge. Vorflugkontrolle und Bordbuch bleiben Pflicht."
        />
      </div>

      <div className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${id ? 'hidden lg:grid' : ''}`}>
        <Kennzahl label="Klar" wert={flotte.data ? zahlen.gruen : '–'} ton="gruen" />
        <Kennzahl label="Mit Hinweisen" wert={flotte.data ? zahlen.gelb : '–'} ton="gelb" />
        <Kennzahl label="Gesperrt" wert={flotte.data ? zahlen.rot : '–'} ton="rot" />
        <Kennzahl
          label="In Prüfung"
          wert={flotte.data ? zahlen.pruefung : '–'}
          ton="blau"
          hinweis="Beanstandungen ohne Einstufung"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(320px,400px)_1fr] lg:gap-6">
        <Panel className={id ? 'hidden lg:block' : ''}>
          <PanelKopf titel="Luftfahrzeuge" zusatz={flotte.data ? aktive.length : undefined} />
          <div className="border-rand space-y-3 border-b p-3">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="text-text-3 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              />
              <input
                type="search"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder="Kennzeichen oder Muster"
                aria-label="Luftfahrzeug suchen"
                className="border-rand-stark focus:border-primaer focus:ring-primaer/20 min-h-11 w-full rounded-md border bg-white pr-3 pl-9 text-base focus:ring-2 focus:outline-none lg:min-h-9 lg:text-sm"
              />
            </div>
            <div role="group" aria-label="Filter" className="bg-flaeche flex gap-1 rounded-md p-1">
              {FILTER.map((f) => (
                <button
                  key={f.wert}
                  type="button"
                  aria-pressed={filter === f.wert}
                  onClick={() => setFilter(f.wert)}
                  className={`min-h-10 flex-1 rounded-sm text-sm font-medium lg:min-h-8 ${filter === f.wert ? 'text-text bg-white shadow-sm' : 'text-text-2 hover:text-text'}`}
                >
                  {f.text}
                </button>
              ))}
            </div>
          </div>
          {flotte.isPending ? (
            <Laden />
          ) : flotte.isError ? (
            <div className="p-4">
              <FehlerBox fehler={flotte.error} nochmal={() => void flotte.refetch()} />
            </div>
          ) : liste.length === 0 ? (
            <Leer icon={<Plane />} titel="Keine Luftfahrzeuge gefunden" />
          ) : (
            <ul className="divide-rand divide-y">
              {liste.map((f) => (
                <FlugzeugZeile key={f.id} f={f} gewaehlt={f.id === id} />
              ))}
            </ul>
          )}
        </Panel>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

/** Desktop: rechte Seite, solange kein Flugzeug gewählt ist */
export function FlugzeugPlatzhalter() {
  return (
    <Panel className="hidden lg:block">
      <Leer icon={<Plane />} titel="Luftfahrzeug auswählen">
        Links ein Luftfahrzeug wählen, um Sperrgründe, Pilotenhinweise und den Verlauf zu sehen.
      </Leer>
    </Panel>
  )
}
