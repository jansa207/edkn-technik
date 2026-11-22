import { ArrowLeft, FileText, PlaneTakeoff } from 'lucide-react'
import { Link, Outlet, useParams } from 'react-router'
import { KatBadge, MeldungStatusBadge } from '@/components/Badge'
import { ButtonLink } from '@/components/Button'
import { FehlerBox, Hinweis, Laden, Leer } from '@/components/Feedback'
import { DatenFeld, DatenFelder, Panel, PanelKopf, SeitenKopf } from '@/components/Panel'
import { useProfil } from '@/features/auth/useAuth'
import { meldungsNr, zeitpunkt } from '@/lib/format'
import { useMeineMeldungen, useMeldung, useMeldungVerlauf } from './api'
import { FotoGalerie, KommentarForm, MeldungFeed } from './MeldungTeile'

export function MeineMeldungenPage() {
  const { id } = useParams()
  const profil = useProfil()
  const meldungen = useMeineMeldungen(profil.id)

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className={id ? 'hidden lg:block' : ''}>
        <SeitenKopf
          titel="Meine Beanstandungen"
          untertitel="Deine Beanstandungen mit dem Stand der Instandhaltung und Rückmeldungen."
          aktionen={
            <ButtonLink
              to="/melden"
              art="primaer"
              icon={<PlaneTakeoff aria-hidden="true" className="size-4" />}
              className="hidden lg:inline-flex"
            >
              Beanstandung melden
            </ButtonLink>
          }
        />
      </div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(320px,420px)_1fr] lg:gap-6">
        <Panel className={id ? 'hidden lg:block' : ''}>
          <PanelKopf titel="Beanstandungen" zusatz={meldungen.data?.length} />
          {meldungen.isPending ? (
            <Laden />
          ) : meldungen.isError ? (
            <div className="p-4">
              <FehlerBox fehler={meldungen.error} nochmal={() => void meldungen.refetch()} />
            </div>
          ) : meldungen.data.length === 0 ? (
            <Leer icon={<FileText />} titel="Noch keine Beanstandungen">
              Wenn dir an einem Luftfahrzeug etwas auffällt, melde es über „Beanstandung melden“.
            </Leer>
          ) : (
            <ul className="divide-rand divide-y">
              {meldungen.data.map((m) => (
                <li key={m.id}>
                  <Link
                    to={`/meine-meldungen/${m.id}`}
                    aria-current={m.id === id ? 'page' : undefined}
                    className={`hover:bg-flaeche block space-y-1.5 px-4 py-3 ${m.id === id ? 'bg-blue-50 shadow-[inset_3px_0_0_var(--color-primaer)]' : ''}`}
                  >
                    <p className="flex items-center gap-2 text-xs">
                      <span className="text-text-2 font-mono">{meldungsNr(m.nr)}</span>
                      <span className="font-mono font-semibold">{m.kennzeichen}</span>
                      <span className="ml-auto">
                        <MeldungStatusBadge status={m.status} />
                      </span>
                    </p>
                    <p className="line-clamp-2 text-sm">{m.text}</p>
                    <p className="text-text-3 font-mono text-xs">{zeitpunkt(m.created_at)}</p>
                  </Link>
                </li>
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

export function MeineMeldungPlatzhalter() {
  return (
    <Panel className="hidden lg:block">
      <Leer icon={<FileText />} titel="Beanstandung auswählen" />
    </Panel>
  )
}

export function MeineMeldungDetail() {
  const { id } = useParams()
  const meldung = useMeldung(id)
  const verlauf = useMeldungVerlauf(id)

  if (meldung.isPending)
    return (
      <Panel>
        <Laden />
      </Panel>
    )
  if (meldung.isError) return <FehlerBox fehler={meldung.error} />
  const m = meldung.data
  if (!m)
    return (
      <Panel>
        <Leer titel="Beanstandung nicht gefunden" />
      </Panel>
    )

  return (
    <div className="space-y-4">
      <Link
        to="/meine-meldungen"
        className="text-primaer inline-flex min-h-11 items-center gap-2 text-sm font-medium lg:hidden"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Alle Meldungen
      </Link>
      <Panel>
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-semibold">{meldungsNr(m.nr)}</h1>
            <MeldungStatusBadge status={m.status} />
            {m.kategorie != null && <KatBadge kategorie={m.kategorie} />}
          </div>
          <DatenFelder>
            <DatenFeld label="Luftfahrzeug" mono>
              <Link to={`/flugzeuge/${m.aircraft_id}`} className="text-primaer hover:underline">
                {m.kennzeichen}
              </Link>
            </DatenFeld>
            <DatenFeld label="Gemeldet" mono>
              {zeitpunkt(m.created_at)}
            </DatenFeld>
            <DatenFeld label="Eingestuft" mono>
              {m.eingestuft_am ? zeitpunkt(m.eingestuft_am) : '–'}
            </DatenFeld>
            {m.ziel && <DatenFeld label="Ziel">{m.ziel}</DatenFeld>}
          </DatenFelder>
          <div>
            <p className="text-text-3 text-xs font-medium tracking-wide uppercase">Beschreibung</p>
            <p className="mt-1 whitespace-pre-line">{m.text}</p>
          </div>
          {m.vorlaeufig_nicht_flugklar && (
            <Hinweis ton="gefahr">
              Du hast das Luftfahrzeug als vorläufig nicht flugklar gemeldet.
            </Hinweis>
          )}
          <FotoGalerie reportId={m.id} anzahl={m.anzahl_fotos} />
        </div>
      </Panel>
      <Panel>
        <PanelKopf titel="Verlauf und Rückmeldungen" />
        <div className="space-y-5 p-4">
          {verlauf.isPending ? (
            <Laden />
          ) : verlauf.isError ? (
            <FehlerBox fehler={verlauf.error} />
          ) : (
            <MeldungFeed eintraege={verlauf.data} />
          )}
          <KommentarForm reportId={m.id} wart={false} />
        </div>
      </Panel>
    </div>
  )
}
