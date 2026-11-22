import { Eye, Hourglass, OctagonAlert, Search, TriangleAlert } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { KatBadge } from '@/components/Badge'
import { FehlerBox, Hinweis, Laden, Leer } from '@/components/Feedback'
import { Kennzahl, Panel, PanelKopf, SeitenKopf } from '@/components/Panel'
import { anzahl, datum, zeitpunkt } from '@/lib/format'
import { beobachtungenVon, hinweiseVon, sperrZeilen, useFlotte, type Flugzeug } from './api'

/**
 * Gruppen nach absteigender Wichtigkeit. Die Inhalte kommen aus der View
 * aircraft_overview, die Sichtbarkeit regelt die Datenbank.
 */
type GruppenArt = 'gesperrt' | 'pruefung' | 'zurueckgestellt' | 'beobachtung'

const GRUPPE: Record<
  GruppenArt,
  { titel: string; erklaerung: string; icon: ReactNode; leiste: string }
> = {
  gesperrt: {
    titel: 'Nicht lufttüchtig',
    erklaerung: 'Gesperrt durch die Instandhaltung, Kat 1 oder vorläufig durch einen Melder.',
    icon: <OctagonAlert aria-hidden="true" className="text-ampel-rot size-4" />,
    leiste: 'bg-ampel-rot',
  },
  pruefung: {
    titel: 'In Prüfung',
    erklaerung: 'Neue Beanstandungen, die noch nicht eingestuft sind.',
    icon: <Hourglass aria-hidden="true" className="text-primaer size-4" />,
    leiste: 'bg-primaer',
  },
  zurueckgestellt: {
    titel: 'Zurückgestellt (Kat 2)',
    erklaerung: 'Bekannt und geprüft, fliegbar. Behebung später.',
    icon: <TriangleAlert aria-hidden="true" className="text-ampel-gelb size-4" />,
    leiste: 'bg-ampel-gelb',
  },
  beobachtung: {
    titel: 'Unter Beobachtung',
    erklaerung: 'Kein Handlungsbedarf, aber bitte darauf achten und Veränderungen melden.',
    icon: <Eye aria-hidden="true" className="size-4 text-violet-600" />,
    leiste: 'bg-violet-500',
  },
}

interface Punkt {
  key: string
  flugzeug: Flugzeug
  etikett: ReactNode
  text: string
  zusatz?: string | null
}

function punkteVon(f: Flugzeug): Record<GruppenArt, Punkt[]> {
  const inPruefung = f.anzahl_in_pruefung ?? 0
  return {
    gesperrt: sperrZeilen(f).map((z, i) => ({
      key: `${f.id}-s${i}`,
      flugzeug: f,
      etikett: (
        <span className="bg-ampel-rot rounded-sm px-1.5 py-0.5 font-mono text-xs font-bold whitespace-nowrap text-white uppercase">
          {z.typ}
        </span>
      ),
      text: z.text,
      zusatz: [z.wer, z.wann && zeitpunkt(z.wann)].filter(Boolean).join(' · ') || null,
    })),
    pruefung:
      inPruefung > 0
        ? [
            {
              key: `${f.id}-p`,
              flugzeug: f,
              etikett: <KatBadge kategorie={null} />,
              text: `${anzahl(inPruefung, 'Beanstandung', 'Beanstandungen')} in Prüfung durch die Instandhaltung`,
              zusatz: 'Bei Unsicherheit vor dem Flug einen Wart fragen.',
            },
          ]
        : [],
    zurueckgestellt: hinweiseVon(f)
      .filter((h) => h.kategorie === 2)
      .map((h) => ({
        key: h.report_id,
        flugzeug: f,
        etikett: <KatBadge kategorie={2} />,
        text: h.pilotenhinweis,
        zusatz:
          [h.ziel && `Behebung: ${h.ziel}`, h.eingestuft_am && `seit ${datum(h.eingestuft_am)}`]
            .filter(Boolean)
            .join(' · ') || null,
      })),
    beobachtung: beobachtungenVon(f).map((b) => ({
      key: b.report_id,
      flugzeug: f,
      etikett: (
        <span className="rounded-sm bg-violet-600 px-1.5 py-0.5 font-mono text-xs font-bold whitespace-nowrap text-white uppercase">
          Beob.
        </span>
      ),
      text: b.pilotenhinweis,
      zusatz: b.eingestuft_am ? `seit ${datum(b.eingestuft_am)}` : null,
    })),
  }
}

const REIHENFOLGE: GruppenArt[] = ['gesperrt', 'pruefung', 'zurueckgestellt', 'beobachtung']

function GruppenPanel({
  art,
  punkte,
  mitKennzeichen,
  leerText,
}: {
  art: GruppenArt
  punkte: Punkt[]
  mitKennzeichen: boolean
  leerText?: string
}) {
  const g = GRUPPE[art]
  if (punkte.length === 0 && !leerText) return null
  return (
    <Panel className="relative overflow-hidden">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${g.leiste}`} />
      <PanelKopf
        titel={
          <span className="flex items-center gap-2">
            {g.icon}
            {g.titel}
          </span>
        }
        zusatz={punkte.length}
      />
      {punkte.length === 0 ? (
        <p className="text-text-2 px-4 py-4 text-sm">{leerText}</p>
      ) : (
        <ul className="divide-rand divide-y">
          {punkte.map((p) => (
            <li key={p.key} className="flex gap-3 px-4 py-3">
              <div className="w-16 shrink-0 pt-0.5">{p.etikett}</div>
              <div className="min-w-0 flex-1 space-y-0.5 text-sm">
                {mitKennzeichen && (
                  <Link
                    to={`/flugzeuge/${p.flugzeug.id}`}
                    className="text-primaer font-mono font-semibold hover:underline"
                  >
                    {p.flugzeug.kennzeichen}
                    <span className="text-text-2 ml-2 font-sans font-normal">
                      {p.flugzeug.muster}
                    </span>
                  </Link>
                )}
                <p className={art === 'gesperrt' ? 'font-medium' : ''}>{p.text}</p>
                {p.zusatz && <p className="text-text-3 font-mono text-xs">{p.zusatz}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/** Offene Punkte eines Luftfahrzeugs, nach Wichtigkeit gruppiert (Detailseite) */
export function FlugzeugPunkte({ f }: { f: Flugzeug }) {
  const punkte = punkteVon(f)
  return (
    <>
      <GruppenPanel art="gesperrt" punkte={punkte.gesperrt} mitKennzeichen={false} />
      {punkte.pruefung.length > 0 && (
        <Hinweis>
          {punkte.pruefung[0]?.text}. Bei Unsicherheit vor dem Flug einen Wart fragen.
        </Hinweis>
      )}
      <GruppenPanel
        art="zurueckgestellt"
        punkte={punkte.zurueckgestellt}
        mitKennzeichen={false}
        leerText="Keine zurückgestellten Punkte mit Hinweis."
      />
      <GruppenPanel art="beobachtung" punkte={punkte.beobachtung} mitKennzeichen={false} />
    </>
  )
}

/** Flugbetrieb: alle offenen Punkte der Flotte, gruppiert nach Wichtigkeit */
export function OffenePunktePage() {
  const flotte = useFlotte()
  const [suche, setSuche] = useState('')

  const gruppen = useMemo(() => {
    const s = suche.trim().toLowerCase()
    const liste = (flotte.data ?? []).filter(
      (f) =>
        f.aktiv &&
        (!s || f.kennzeichen.toLowerCase().includes(s) || f.muster.toLowerCase().includes(s)),
    )
    const ergebnis: Record<GruppenArt, Punkt[]> = {
      gesperrt: [],
      pruefung: [],
      zurueckgestellt: [],
      beobachtung: [],
    }
    for (const f of liste) {
      const p = punkteVon(f)
      for (const art of REIHENFOLGE) ergebnis[art].push(...p[art])
    }
    return ergebnis
  }, [flotte.data, suche])

  const gesamt = REIHENFOLGE.reduce((s, a) => s + gruppen[a].length, 0)

  return (
    <div className="space-y-4 lg:space-y-6">
      <SeitenKopf
        titel="Offene Punkte"
        untertitel="Alles, was du vor dem Flug wissen musst – nach Wichtigkeit sortiert. Vorflugkontrolle und Bordbuch bleiben Pflicht."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl
          label="Nicht lufttüchtig"
          wert={flotte.data ? gruppen.gesperrt.length : '–'}
          ton="rot"
        />
        <Kennzahl
          label="In Prüfung"
          wert={flotte.data ? gruppen.pruefung.length : '–'}
          ton="blau"
        />
        <Kennzahl
          label="Zurückgestellt"
          wert={flotte.data ? gruppen.zurueckgestellt.length : '–'}
          ton="gelb"
        />
        <Kennzahl label="Beobachtung" wert={flotte.data ? gruppen.beobachtung.length : '–'} />
      </div>

      <div className="relative max-w-md">
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

      {flotte.isPending ? (
        <Panel>
          <Laden />
        </Panel>
      ) : flotte.isError ? (
        <FehlerBox fehler={flotte.error} nochmal={() => void flotte.refetch()} />
      ) : gesamt === 0 ? (
        <Panel>
          <Leer icon={<TriangleAlert />} titel="Keine offenen Punkte">
            {suche ? 'Für diese Suche gibt es nichts.' : 'Alle Luftfahrzeuge sind ohne Hinweise.'}
          </Leer>
        </Panel>
      ) : (
        <div className="space-y-4">
          {REIHENFOLGE.map((art) => (
            <div key={art} className="space-y-1.5">
              <GruppenPanel art={art} punkte={gruppen[art]} mitKennzeichen />
              {gruppen[art].length > 0 && (
                <p className="text-text-3 px-1 text-xs">{GRUPPE[art].erklaerung}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
