import { useQuery } from '@tanstack/react-query'
import { Archive, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Badge, KatBadge, MeldungStatusBadge } from '@/components/Badge'
import { FehlerBox, Laden, Leer } from '@/components/Feedback'
import { Auswahl } from '@/components/Form'
import { Panel, PanelKopf, SeitenKopf } from '@/components/Panel'
import { useFlotte } from '@/features/aircraft/api'
import { datum, meldungsNr } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { pruefe } from '@/lib/useAktion'

/** Abgeschlossene Beanstandungen (erledigt und abgelegt), neueste zuerst */
function useArchiv() {
  return useQuery({
    queryKey: ['meldungen', 'archiv'],
    queryFn: async () =>
      pruefe(
        await supabase
          .from('report_list')
          .select('*')
          .in('status', ['erledigt', 'abgelegt'])
          .order('created_at', { ascending: false })
          .limit(2000),
      ),
  })
}

type KatFilter = '' | '1' | '2' | '3' | 'beobachtung'

/**
 * Archiv: Was war wann, und wie wurde es gelöst? Durchsucht Beschreibung,
 * Maßnahme und Kennzeichen. Daten nur für die Instandhaltung (RLS).
 */
export function ArchivPage() {
  const [params, setParams] = useSearchParams()
  const archiv = useArchiv()
  const flotte = useFlotte()
  const [suche, setSuche] = useState('')
  const flugzeug = params.get('flugzeug') ?? ''
  const [kat, setKat] = useState<KatFilter>('')

  const liste = useMemo(() => {
    const woerter = suche.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return (archiv.data ?? [])
      .filter((m) => !flugzeug || m.aircraft_id === flugzeug)
      .filter((m) => (kat === 'beobachtung' ? m.beobachten : !kat || String(m.kategorie) === kat))
      .filter((m) => {
        if (woerter.length === 0) return true
        const text =
          `${m.text} ${m.massnahme ?? ''} ${m.kennzeichen} ${m.muster} ${meldungsNr(m.nr)}`.toLowerCase()
        return woerter.every((w) => text.includes(w))
      })
      .sort((a, b) =>
        (b.erledigt_am ?? b.eingestuft_am ?? b.created_at).localeCompare(
          a.erledigt_am ?? a.eingestuft_am ?? a.created_at,
        ),
      )
  }, [archiv.data, flugzeug, kat, suche])

  return (
    <div className="space-y-4 lg:space-y-6">
      <SeitenKopf
        titel="Archiv"
        untertitel="Abgeschlossene Beanstandungen mit Maßnahme. Zum Nachschlagen, wie ein Symptom früher gelöst wurde."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search
            aria-hidden="true"
            className="text-text-3 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <input
            type="search"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Suchen in Beschreibung und Maßnahme, z. B. „Bremse“"
            aria-label="Archiv durchsuchen"
            className="border-rand-stark focus:border-primaer focus:ring-primaer/20 min-h-11 w-full rounded-md border bg-white pr-3 pl-9 text-base focus:ring-2 focus:outline-none lg:min-h-9 lg:text-sm"
          />
        </div>
        <Auswahl
          aria-label="Luftfahrzeug"
          className="max-w-56"
          value={flugzeug}
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
        <Auswahl
          aria-label="Kategorie"
          className="max-w-48"
          value={kat}
          onChange={(e) => setKat(e.target.value as KatFilter)}
        >
          <option value="">Alle Kategorien</option>
          <option value="1">Kat 1</option>
          <option value="2">Kat 2</option>
          <option value="3">Kat 3</option>
          <option value="beobachtung">Unter Beobachtung</option>
        </Auswahl>
      </div>

      <Panel>
        <PanelKopf titel="Abgeschlossen" zusatz={archiv.data ? liste.length : undefined} />
        {archiv.isPending ? (
          <Laden />
        ) : archiv.isError ? (
          <div className="p-4">
            <FehlerBox fehler={archiv.error} nochmal={() => void archiv.refetch()} />
          </div>
        ) : liste.length === 0 ? (
          <Leer icon={<Archive />} titel="Nichts gefunden">
            {suche || flugzeug || kat
              ? 'Suche oder Filter anpassen.'
              : 'Erledigte und abgelegte Beanstandungen erscheinen hier.'}
          </Leer>
        ) : (
          <ul className="divide-rand divide-y">
            {liste.map((m) => (
              <li key={m.id}>
                <Link
                  to={`/werkstatt/meldungen/${m.id}`}
                  className="hover:bg-flaeche block space-y-1.5 px-4 py-3"
                >
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-text-2 font-mono text-xs">{meldungsNr(m.nr)}</span>
                    <span className="font-mono text-sm font-semibold">{m.kennzeichen}</span>
                    <KatBadge kategorie={m.kategorie} />
                    <MeldungStatusBadge status={m.status} />
                    {m.beobachten && <Badge ton="lila">Unter Beobachtung</Badge>}
                    <span className="text-text-3 ml-auto font-mono text-xs">
                      {datum(m.created_at)}
                      {m.erledigt_am && ` → ${datum(m.erledigt_am)}`}
                    </span>
                  </p>
                  <p className="text-sm">{m.text}</p>
                  {m.massnahme && (
                    <p className="text-text-2 border-rand-stark border-l-2 pl-3 text-sm">
                      <span className="text-text-3 text-xs font-semibold tracking-wide uppercase">
                        {m.status === 'erledigt' ? 'Maßnahme' : 'Befund'}:
                      </span>{' '}
                      {m.massnahme}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
