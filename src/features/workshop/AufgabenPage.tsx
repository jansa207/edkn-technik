import { ListTodo, MessageSquare, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Outlet, useNavigate, useParams, useSearchParams } from 'react-router'
import { AufgabeStatusBadge, FristBadge, PrioritaetBadge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { FehlerBox, Laden, Leer } from '@/components/Feedback'
import { Kennzahl, Panel, SeitenKopf } from '@/components/Panel'
import { useProfil } from '@/features/auth/useAuth'
import { aufgabenNr, tageBis } from '@/lib/format'
import { istOffen, useAufgaben, type Aufgabe } from './api'
import { AufgabeDialog } from './AufgabeDialog'

type Ansicht = 'offen' | 'meine' | 'ueberfaellig' | 'wartet' | 'abgeschlossen'

const ANSICHTEN: { wert: Ansicht; text: string }[] = [
  { wert: 'offen', text: 'Alle offenen' },
  { wert: 'meine', text: 'Meine' },
  { wert: 'ueberfaellig', text: 'Überfällig' },
  { wert: 'wartet', text: 'Wartet' },
  { wert: 'abgeschlossen', text: 'Abgeschlossen' },
]

const PRIO_RANG = { hoch: 0, normal: 1, niedrig: 2 } as const

/** Überfällige zuerst, dann nach Frist (ohne Frist am Ende), dann nach Priorität */
function sortiere(a: Aufgabe, b: Aufgabe): number {
  if (!istOffen(a) || !istOffen(b)) return (b.erledigt_am ?? '').localeCompare(a.erledigt_am ?? '')
  if (a.faellig_am !== b.faellig_am) {
    if (!a.faellig_am) return 1
    if (!b.faellig_am) return -1
    return a.faellig_am.localeCompare(b.faellig_am)
  }
  return PRIO_RANG[a.prioritaet] - PRIO_RANG[b.prioritaet] || a.nr - b.nr
}

function Fortschritt({ a }: { a: Aufgabe }) {
  const gesamt = a.anzahl_schritte ?? 0
  if (gesamt === 0) return null
  const fertig = a.anzahl_schritte_erledigt ?? 0
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`${fertig} von ${gesamt} Teilschritten erledigt`}
    >
      <span className="bg-rand h-1.5 w-14 overflow-hidden rounded-full">
        <span
          className="bg-ampel-gruen block h-full"
          style={{ width: `${(fertig / gesamt) * 100}%` }}
        />
      </span>
      <span className="text-text-2 font-mono text-xs">
        {fertig}/{gesamt}
      </span>
    </span>
  )
}

function AufgabeZeile({ a, gewaehlt, suche }: { a: Aufgabe; gewaehlt: boolean; suche: string }) {
  return (
    <li>
      <Link
        to={`/werkstatt/aufgaben/${a.id}${suche ? `?${suche}` : ''}`}
        aria-current={gewaehlt ? 'page' : undefined}
        className={`hover:bg-flaeche block space-y-1.5 px-4 py-3 ${gewaehlt ? 'bg-blue-50 shadow-[inset_3px_0_0_var(--color-primaer)] hover:bg-blue-50' : ''} ${a.ueberfaellig ? 'shadow-[inset_3px_0_0_var(--color-ampel-rot)]' : ''}`}
      >
        <p className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-text-2 font-mono">{aufgabenNr(a.nr)}</span>
          {a.kennzeichen ? (
            <span className="font-mono font-semibold">{a.kennzeichen}</span>
          ) : (
            <span className="text-text-3">Allgemein</span>
          )}
          <PrioritaetBadge prioritaet={a.prioritaet} />
          <span className="ml-auto">
            <AufgabeStatusBadge status={a.status} />
          </span>
        </p>
        <p className="text-sm font-semibold">{a.titel}</p>
        {a.status === 'wartet' && a.wartet_auf && (
          <p className="truncate text-xs text-violet-800">Wartet auf: {a.wartet_auf}</p>
        )}
        <p className="text-text-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <FristBadge faellig={a.faellig_am} abgeschlossen={!istOffen(a)} />
          <span>{a.zustaendig_name ?? 'Nicht zugewiesen'}</span>
          <Fortschritt a={a} />
          {(a.anzahl_kommentare ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare aria-hidden="true" className="size-3.5" /> {a.anzahl_kommentare}
            </span>
          )}
        </p>
      </Link>
    </li>
  )
}

export function AufgabenPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const profil = useProfil()
  const [params, setParams] = useSearchParams()
  const aufgaben = useAufgaben()
  const [suche, setSuche] = useState('')
  const ansicht = (params.get('ansicht') as Ansicht | null) ?? 'offen'
  const flugzeug = params.get('flugzeug') ?? ''
  const neuOffen = params.get('neu') === '1'

  const alle = useMemo(() => aufgaben.data ?? [], [aufgaben.data])
  const offen = alle.filter(istOffen)
  const zahlen = {
    offen: offen.length,
    ueberfaellig: offen.filter((a) => a.ueberfaellig).length,
    woche: offen.filter(
      (a) => a.faellig_am && tageBis(a.faellig_am) >= 0 && tageBis(a.faellig_am) <= 7,
    ).length,
    meine: offen.filter((a) => a.zustaendig_id === profil.id).length,
    wartet: offen.filter((a) => a.status === 'wartet').length,
  }

  const flugzeuge = useMemo(
    () =>
      [
        ...new Map(
          alle.filter((a) => a.aircraft_id).map((a) => [a.aircraft_id!, a.kennzeichen ?? '']),
        ).entries(),
      ].sort((x, y) => x[1].localeCompare(y[1])),
    [alle],
  )

  const s = suche.trim().toLowerCase()
  const liste = alle
    .filter((a) => {
      switch (ansicht) {
        case 'offen':
          return istOffen(a)
        case 'meine':
          return istOffen(a) && a.zustaendig_id === profil.id
        case 'ueberfaellig':
          return Boolean(a.ueberfaellig)
        case 'wartet':
          return a.status === 'wartet'
        case 'abgeschlossen':
          return !istOffen(a)
      }
    })
    .filter(
      (a) => !flugzeug || (flugzeug === 'allgemein' ? !a.aircraft_id : a.aircraft_id === flugzeug),
    )
    .filter(
      (a) =>
        !s ||
        a.titel.toLowerCase().includes(s) ||
        a.beschreibung.toLowerCase().includes(s) ||
        aufgabenNr(a.nr).toLowerCase().includes(s) ||
        (a.kennzeichen ?? '').toLowerCase().includes(s),
    )
    .sort(sortiere)

  const setze = (k: string, v: string) => {
    const neu = new URLSearchParams(params)
    if (v) neu.set(k, v)
    else neu.delete(k)
    setParams(neu, { replace: true })
  }
  // Filter beim Öffnen einer Aufgabe mitnehmen, aber nicht „neu=1“
  const listenSuche = new URLSearchParams(params)
  listenSuche.delete('neu')

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className={id ? 'hidden lg:block' : ''}>
        <SeitenKopf
          titel="Aufgaben"
          untertitel="Interne To-dos der Instandhaltung mit Frist, Zuständigkeit und Arbeitsstand."
          aktionen={
            <Button
              art="primaer"
              icon={<Plus aria-hidden="true" className="size-4" />}
              onClick={() => setze('neu', '1')}
            >
              Neue Aufgabe
            </Button>
          }
        />
      </div>

      <div className={`grid grid-cols-2 gap-3 lg:grid-cols-5 ${id ? 'hidden lg:grid' : ''}`}>
        <Kennzahl label="Offen" wert={aufgaben.data ? zahlen.offen : '–'} ton="blau" />
        <Kennzahl label="Überfällig" wert={aufgaben.data ? zahlen.ueberfaellig : '–'} ton="rot" />
        <Kennzahl label="Fällig in 7 Tagen" wert={aufgaben.data ? zahlen.woche : '–'} ton="gelb" />
        <Kennzahl label="Mir zugewiesen" wert={aufgaben.data ? zahlen.meine : '–'} ton="neutral" />
        <Kennzahl
          label="Wartet"
          wert={aufgaben.data ? zahlen.wartet : '–'}
          ton="neutral"
          hinweis="z. B. auf Ersatzteile"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(340px,440px)_1fr] lg:gap-6">
        <Panel className={id ? 'hidden lg:block' : ''}>
          <div
            role="tablist"
            aria-label="Ansicht"
            className="border-rand flex overflow-x-auto border-b"
          >
            {ANSICHTEN.map((a) => (
              <button
                key={a.wert}
                role="tab"
                type="button"
                aria-selected={ansicht === a.wert}
                onClick={() => setze('ansicht', a.wert === 'offen' ? '' : a.wert)}
                className={`min-h-12 shrink-0 border-b-2 px-3 text-sm font-medium whitespace-nowrap lg:min-h-11 ${ansicht === a.wert ? 'border-primaer text-primaer' : 'text-text-2 hover:text-text border-transparent'}`}
              >
                {a.text}
                {a.wert === 'ueberfaellig' && zahlen.ueberfaellig > 0 && (
                  <span className="bg-ampel-rot ml-1.5 rounded-sm px-1.5 font-mono text-xs text-white">
                    {zahlen.ueberfaellig}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="border-rand grid gap-2 border-b p-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="text-text-3 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              />
              <input
                type="search"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder="Suchen"
                aria-label="Aufgaben suchen"
                className="border-rand-stark focus:border-primaer min-h-11 w-full rounded-md border bg-white pr-3 pl-9 text-base focus:outline-none lg:min-h-9 lg:text-sm"
              />
            </div>
            <select
              aria-label="Luftfahrzeug"
              value={flugzeug}
              onChange={(e) => setze('flugzeug', e.target.value)}
              className="border-rand-stark min-h-11 w-full rounded-md border bg-white px-3 text-base lg:min-h-9 lg:text-sm"
            >
              <option value="">Alle Luftfahrzeuge</option>
              <option value="allgemein">Allgemein (ohne Luftfahrzeug)</option>
              {flugzeuge.map(([fid, kz]) => (
                <option key={fid} value={fid}>
                  {kz}
                </option>
              ))}
            </select>
          </div>
          {aufgaben.isPending ? (
            <Laden />
          ) : aufgaben.isError ? (
            <div className="p-4">
              <FehlerBox fehler={aufgaben.error} nochmal={() => void aufgaben.refetch()} />
            </div>
          ) : liste.length === 0 ? (
            <Leer icon={<ListTodo />} titel="Keine Aufgaben">
              {ansicht === 'meine'
                ? 'Dir ist gerade nichts zugewiesen.'
                : 'Mit „Neue Aufgabe“ legst du eine an.'}
            </Leer>
          ) : (
            <ul className="divide-rand divide-y">
              {liste.map((a) => (
                <AufgabeZeile
                  key={a.id}
                  a={a}
                  gewaehlt={a.id === id}
                  suche={listenSuche.toString()}
                />
              ))}
            </ul>
          )}
        </Panel>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>

      {neuOffen && (
        <AufgabeDialog
          onSchliessen={() => setze('neu', '')}
          onAngelegt={(aid) => void navigate(`/werkstatt/aufgaben/${aid}`)}
          vorlage={{ aircraftId: flugzeug && flugzeug !== 'allgemein' ? flugzeug : null }}
        />
      )}
    </div>
  )
}

export function AufgabePlatzhalter() {
  return (
    <Panel className="hidden lg:block">
      <Leer icon={<ListTodo />} titel="Aufgabe auswählen">
        Links eine Aufgabe wählen, um Teilschritte abzuhaken und den Arbeitsstand festzuhalten.
      </Leer>
    </Panel>
  )
}
