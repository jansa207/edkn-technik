import { Camera, Inbox, ListTodo } from 'lucide-react'
import { useMemo } from 'react'
import { Link, Outlet, useParams, useSearchParams } from 'react-router'
import { KatBadge, MeldungStatusBadge } from '@/components/Badge'
import { FehlerBox, Laden, Leer } from '@/components/Feedback'
import { Kennzahl, Panel, SeitenKopf } from '@/components/Panel'
import type { MeldungStatus } from '@/components/statusTexte'
import type { Meldung } from '@/features/reports/api'
import { meldungsNr, zeitpunkt } from '@/lib/format'
import { useWerkstattMeldungen } from './api'

type Reiter = 'neu' | 'in_arbeit' | 'zurueckgestellt' | 'abgeschlossen'

const REITER: { wert: Reiter; text: string; status: MeldungStatus[] }[] = [
  { wert: 'neu', text: 'Neu', status: ['neu'] },
  { wert: 'in_arbeit', text: 'In Arbeit', status: ['in_arbeit'] },
  { wert: 'zurueckgestellt', text: 'Zurückgestellt', status: ['zurueckgestellt'] },
  { wert: 'abgeschlossen', text: 'Abgeschlossen', status: ['erledigt', 'abgelegt'] },
]

function sortiere(liste: Meldung[], reiter: Reiter): Meldung[] {
  return [...liste].sort((a, b) => {
    // Neu: vorläufig gesperrte zuerst, dann die neuesten
    if (reiter === 'neu' && a.vorlaeufig_nicht_flugklar !== b.vorlaeufig_nicht_flugklar) {
      return a.vorlaeufig_nicht_flugklar ? -1 : 1
    }
    // In Arbeit: Kat 1 zuerst
    if (reiter === 'in_arbeit' && a.kategorie !== b.kategorie)
      return (a.kategorie ?? 9) - (b.kategorie ?? 9)
    const zeit = reiter === 'abgeschlossen' ? 'letzte_aktivitaet' : 'created_at'
    return (b[zeit] ?? '').localeCompare(a[zeit] ?? '')
  })
}

function MeldungZeile({ m, gewaehlt, suche }: { m: Meldung; gewaehlt: boolean; suche: string }) {
  return (
    <li>
      <Link
        to={`/werkstatt/meldungen/${m.id}?${suche}`}
        aria-current={gewaehlt ? 'page' : undefined}
        className={`hover:bg-flaeche block space-y-1.5 px-4 py-3 ${gewaehlt ? 'bg-blue-50 shadow-[inset_3px_0_0_var(--color-primaer)] hover:bg-blue-50' : ''}`}
      >
        <p className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-text-2 font-mono">{meldungsNr(m.nr)}</span>
          <span className="font-mono font-semibold">{m.kennzeichen}</span>
          <KatBadge kategorie={m.kategorie} />
          {m.vorlaeufig_nicht_flugklar && m.status === 'neu' && (
            <span className="bg-ampel-rot rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">
              VORLÄUFIG GESPERRT
            </span>
          )}
          <span className="ml-auto">
            <MeldungStatusBadge status={m.status} />
          </span>
        </p>
        <p className="line-clamp-2 text-sm">{m.text}</p>
        <p className="text-text-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span>{m.melder_name ?? 'Unbekannt'}</span>
          <span className="font-mono">{zeitpunkt(m.created_at)}</span>
          {(m.anzahl_fotos ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <Camera aria-hidden="true" className="size-3.5" /> {m.anzahl_fotos}
            </span>
          )}
          {(m.anzahl_aufgaben_offen ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListTodo aria-hidden="true" className="size-3.5" /> {m.anzahl_aufgaben_offen}{' '}
              Aufgabe(n)
            </span>
          )}
          {m.ziel && <span>Ziel: {m.ziel}</span>}
        </p>
      </Link>
    </li>
  )
}

export function MeldungseingangPage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const meldungen = useWerkstattMeldungen()
  const reiter = (params.get('reiter') as Reiter | null) ?? 'neu'
  const flugzeug = params.get('flugzeug') ?? ''

  const alle = useMemo(() => meldungen.data ?? [], [meldungen.data])
  const flugzeuge = useMemo(
    () =>
      [...new Map(alle.map((m) => [m.aircraft_id, m.kennzeichen])).entries()].sort((a, b) =>
        a[1].localeCompare(b[1]),
      ),
    [alle],
  )
  const zahl = (status: MeldungStatus[]) =>
    alle.filter((m) => status.includes(m.status) && (!flugzeug || m.aircraft_id === flugzeug))
      .length
  const aktiv = REITER.find((r) => r.wert === reiter) ?? REITER[0]!
  const liste = sortiere(
    alle.filter(
      (m) => aktiv.status.includes(m.status) && (!flugzeug || m.aircraft_id === flugzeug),
    ),
    reiter,
  )

  const setze = (k: string, v: string) => {
    const neu = new URLSearchParams(params)
    if (v) neu.set(k, v)
    else neu.delete(k)
    setParams(neu, { replace: true })
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className={id ? 'hidden lg:block' : ''}>
        <SeitenKopf
          titel="Meldungseingang"
          untertitel="Meldungen einstufen, bearbeiten und abschließen."
        />
      </div>

      <div className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${id ? 'hidden lg:grid' : ''}`}>
        <Kennzahl
          label="Neu"
          wert={meldungen.data ? zahl(['neu']) : '–'}
          ton="blau"
          hinweis="warten auf Einstufung"
        />
        <Kennzahl
          label="Vorläufig gesperrt"
          wert={
            meldungen.data
              ? alle.filter((m) => m.status === 'neu' && m.vorlaeufig_nicht_flugklar).length
              : '–'
          }
          ton="rot"
        />
        <Kennzahl label="In Arbeit" wert={meldungen.data ? zahl(['in_arbeit']) : '–'} ton="gelb" />
        <Kennzahl
          label="Zurückgestellt"
          wert={meldungen.data ? zahl(['zurueckgestellt']) : '–'}
          ton="neutral"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(340px,440px)_1fr] lg:gap-6">
        <Panel className={id ? 'hidden lg:block' : ''}>
          <div
            role="tablist"
            aria-label="Status"
            className="border-rand flex overflow-x-auto border-b"
          >
            {REITER.map((r) => (
              <button
                key={r.wert}
                role="tab"
                type="button"
                aria-selected={reiter === r.wert}
                onClick={() => setze('reiter', r.wert === 'neu' ? '' : r.wert)}
                className={`flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap lg:min-h-11 ${reiter === r.wert ? 'border-primaer text-primaer' : 'text-text-2 hover:text-text border-transparent'}`}
              >
                {r.text}
                <span
                  className={`rounded-sm px-1.5 font-mono text-xs ${reiter === r.wert ? 'bg-blue-100' : 'bg-flaeche'}`}
                >
                  {meldungen.data ? zahl(r.status) : '·'}
                </span>
              </button>
            ))}
          </div>
          <div className="border-rand border-b p-3">
            <label className="sr-only" htmlFor="flugzeugfilter">
              Flugzeug
            </label>
            <select
              id="flugzeugfilter"
              value={flugzeug}
              onChange={(e) => setze('flugzeug', e.target.value)}
              className="border-rand-stark min-h-11 w-full rounded-md border bg-white px-3 text-base lg:min-h-9 lg:text-sm"
            >
              <option value="">Alle Flugzeuge</option>
              {flugzeuge.map(([fid, kz]) => (
                <option key={fid} value={fid}>
                  {kz}
                </option>
              ))}
            </select>
          </div>
          {meldungen.isPending ? (
            <Laden />
          ) : meldungen.isError ? (
            <div className="p-4">
              <FehlerBox fehler={meldungen.error} nochmal={() => void meldungen.refetch()} />
            </div>
          ) : liste.length === 0 ? (
            <Leer
              icon={<Inbox />}
              titel={reiter === 'neu' ? 'Keine neuen Meldungen' : 'Keine Meldungen'}
            >
              {reiter === 'neu' && 'Alles eingestuft.'}
            </Leer>
          ) : (
            <ul className="divide-rand divide-y">
              {liste.map((m) => (
                <MeldungZeile key={m.id} m={m} gewaehlt={m.id === id} suche={params.toString()} />
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

export function MeldungPlatzhalter() {
  return (
    <Panel className="hidden lg:block">
      <Leer icon={<Inbox />} titel="Meldung auswählen">
        Links eine Meldung wählen, um sie einzustufen oder zu bearbeiten.
      </Leer>
    </Panel>
  )
}
