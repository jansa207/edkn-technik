import { Search, Users } from 'lucide-react'
import { useState } from 'react'
import { Badge, FreigabeBadge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { FehlerBox, Laden, Leer } from '@/components/Feedback'
import { Kennzahl, Panel, SeitenKopf } from '@/components/Panel'
import { ROLLE_TEXT, type Freigabe, type Rolle } from '@/components/statusTexte'
import { useProfil } from '@/features/auth/useAuth'
import { datum, name } from '@/lib/format'
import type { Tables } from '@/lib/supabase'
import { useNutzer, useNutzerAendern } from './api'

type Nutzer = Tables<'profiles'>
type Reiter = 'ausstehend' | 'aktiv' | 'gesperrt'

interface Frage {
  nutzer: Nutzer
  freigabe: Freigabe
  rolle: Rolle
  titel: string
  text: string
  knopf: string
  gefahr?: boolean
}

function RollenWahl({
  wert,
  onWahl,
  deaktiviert,
}: {
  wert: Rolle
  onWahl: (r: Rolle) => void
  deaktiviert?: boolean
}) {
  return (
    <div role="group" aria-label="Rolle" className="bg-flaeche inline-flex rounded-md p-0.5">
      {(['pilot', 'wart', 'admin'] as const).map((r) => (
        <button
          key={r}
          type="button"
          disabled={deaktiviert}
          aria-pressed={wert === r}
          onClick={() => onWahl(r)}
          className={`min-h-10 rounded-sm px-3 text-sm font-medium disabled:opacity-60 lg:min-h-8 ${wert === r ? 'text-text bg-white shadow-sm' : 'text-text-2 hover:text-text'}`}
        >
          {ROLLE_TEXT[r]}
        </button>
      ))}
    </div>
  )
}

export function NutzerPage() {
  const ich = useProfil()
  const nutzer = useNutzer()
  const aendern = useNutzerAendern()
  const [reiter, setReiter] = useState<Reiter>('ausstehend')
  const [suche, setSuche] = useState('')
  const [frage, setFrage] = useState<Frage | null>(null)
  const [rollenWahl, setRollenWahl] = useState<Record<string, Rolle>>({})

  const alle = nutzer.data ?? []
  const gruppe = (n: Nutzer): Reiter =>
    n.freigabe === 'ausstehend' ? 'ausstehend' : n.freigabe === 'freigegeben' ? 'aktiv' : 'gesperrt'
  const zahl = (r: Reiter) => alle.filter((n) => gruppe(n) === r).length
  const s = suche.trim().toLowerCase()
  const liste = alle.filter(
    (n) =>
      gruppe(n) === reiter &&
      (!s ||
        name(n.vorname, n.nachname).toLowerCase().includes(s) ||
        n.email.toLowerCase().includes(s)),
  )

  const rolleVon = (n: Nutzer) => rollenWahl[n.id] ?? n.rolle

  function ausfuehren() {
    if (!frage) return
    aendern.mutate(
      {
        userId: frage.nutzer.id,
        freigabe: frage.freigabe,
        rolle: frage.rolle,
        text: frage.knopf + ': ' + name(frage.nutzer.vorname, frage.nutzer.nachname),
      },
      { onSuccess: () => setFrage(null) },
    )
  }

  function aktionen(n: Nutzer) {
    const eigen = n.id === ich.id
    const nm = name(n.vorname, n.nachname) || n.email
    if (eigen) return <Badge ton="blau">Eigenes Konto</Badge>
    switch (n.freigabe) {
      case 'ausstehend':
        return (
          <div className="flex flex-wrap items-center gap-2">
            <RollenWahl
              wert={rolleVon(n)}
              onWahl={(r) => setRollenWahl((w) => ({ ...w, [n.id]: r }))}
            />
            <Button
              art="primaer"
              groesse="klein"
              onClick={() =>
                setFrage({
                  nutzer: n,
                  freigabe: 'freigegeben',
                  rolle: rolleVon(n),
                  titel: `${nm} freigeben?`,
                  text: `Das Konto bekommt Zugriff als ${ROLLE_TEXT[rolleVon(n)]}.`,
                  knopf: 'Freigegeben',
                })
              }
            >
              Freigeben
            </Button>
            <Button
              groesse="klein"
              onClick={() =>
                setFrage({
                  nutzer: n,
                  freigabe: 'abgelehnt',
                  rolle: n.rolle,
                  titel: `${nm} ablehnen?`,
                  text: 'Das Konto bekommt keinen Zugriff. Du kannst es später noch freigeben.',
                  knopf: 'Abgelehnt',
                  gefahr: true,
                })
              }
            >
              Ablehnen
            </Button>
          </div>
        )
      case 'freigegeben':
        return (
          <div className="flex flex-wrap items-center gap-2">
            <RollenWahl
              wert={n.rolle}
              deaktiviert={aendern.isPending}
              onWahl={(r) =>
                r !== n.rolle &&
                setFrage({
                  nutzer: n,
                  freigabe: 'freigegeben',
                  rolle: r,
                  titel: `Rolle von ${nm} ändern?`,
                  text: `Neue Rolle: ${ROLLE_TEXT[r]}.${r === 'admin' ? ' Admins können Nutzer freigeben und Rollen vergeben.' : ''}`,
                  knopf: 'Rolle geändert',
                })
              }
            />
            <Button
              groesse="klein"
              art="leise"
              onClick={() =>
                setFrage({
                  nutzer: n,
                  freigabe: 'deaktiviert',
                  rolle: n.rolle,
                  titel: `${nm} deaktivieren?`,
                  text: 'Das Konto verliert sofort den Zugriff. Meldungen und Verlauf bleiben erhalten.',
                  knopf: 'Deaktiviert',
                  gefahr: true,
                })
              }
            >
              Deaktivieren
            </Button>
          </div>
        )
      default:
        return (
          <Button
            groesse="klein"
            onClick={() =>
              setFrage({
                nutzer: n,
                freigabe: 'freigegeben',
                rolle: n.rolle,
                titel: `${nm} wieder freigeben?`,
                text: `Das Konto bekommt wieder Zugriff als ${ROLLE_TEXT[n.rolle]}.`,
                knopf: 'Wieder freigegeben',
              })
            }
          >
            Wieder freigeben
          </Button>
        )
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <SeitenKopf
        titel="Nutzer"
        untertitel="Neue Konten freigeben, Rollen vergeben, Zugriff entziehen."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl
          label="Warten auf Freigabe"
          wert={nutzer.data ? zahl('ausstehend') : '–'}
          ton="gelb"
        />
        <Kennzahl label="Aktiv" wert={nutzer.data ? zahl('aktiv') : '–'} ton="gruen" />
        <Kennzahl
          label="Warte / Admins"
          wert={
            nutzer.data
              ? alle.filter((n) => n.freigabe === 'freigegeben' && n.rolle !== 'pilot').length
              : '–'
          }
          ton="blau"
        />
        <Kennzahl
          label="Abgelehnt / deaktiviert"
          wert={nutzer.data ? zahl('gesperrt') : '–'}
          ton="neutral"
        />
      </div>

      <Panel>
        <div className="border-rand flex flex-wrap items-end justify-between gap-2 border-b pr-3">
          <div role="tablist" className="flex overflow-x-auto">
            {(
              [
                ['ausstehend', 'Warten auf Freigabe'],
                ['aktiv', 'Aktiv'],
                ['gesperrt', 'Abgelehnt / deaktiviert'],
              ] as const
            ).map(([r, t]) => (
              <button
                key={r}
                role="tab"
                type="button"
                aria-selected={reiter === r}
                onClick={() => setReiter(r)}
                className={`min-h-12 shrink-0 border-b-2 px-4 text-sm font-medium whitespace-nowrap lg:min-h-11 ${reiter === r ? 'border-primaer text-primaer' : 'text-text-2 hover:text-text border-transparent'}`}
              >
                {t}{' '}
                <span className="bg-flaeche ml-1 rounded-sm px-1.5 font-mono text-xs">
                  {nutzer.data ? zahl(r) : '·'}
                </span>
              </button>
            ))}
          </div>
          <div className="relative w-full py-2 pl-3 sm:w-64 sm:pl-0">
            <Search
              aria-hidden="true"
              className="text-text-3 pointer-events-none absolute top-1/2 left-6 size-4 -translate-y-1/2 sm:left-3"
            />
            <input
              type="search"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder="Name oder E-Mail"
              aria-label="Nutzer suchen"
              className="border-rand-stark min-h-11 w-full rounded-md border pr-3 pl-9 text-base lg:min-h-9 lg:text-sm"
            />
          </div>
        </div>

        {nutzer.isPending ? (
          <Laden />
        ) : nutzer.isError ? (
          <div className="p-4">
            <FehlerBox fehler={nutzer.error} nochmal={() => void nutzer.refetch()} />
          </div>
        ) : liste.length === 0 ? (
          <Leer
            icon={<Users />}
            titel={reiter === 'ausstehend' ? 'Keine offenen Anfragen' : 'Keine Nutzer'}
          />
        ) : (
          <ul className="divide-rand divide-y">
            {liste.map((n) => (
              <li
                key={n.id}
                className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_auto] lg:items-center"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {name(n.vorname, n.nachname) || 'Ohne Namen'}
                    </span>
                    <FreigabeBadge freigabe={n.freigabe} />
                    {n.freigabe === 'freigegeben' && (
                      <Badge ton={n.rolle === 'pilot' ? 'grau' : 'blau'} punkt={false}>
                        {ROLLE_TEXT[n.rolle]}
                      </Badge>
                    )}
                  </p>
                  <p className="text-text-2 truncate text-sm">{n.email}</p>
                  <p className="text-text-3 font-mono text-xs">
                    registriert {datum(n.created_at)}
                    {n.freigegeben_am && ` · freigegeben ${datum(n.freigegeben_am)}`}
                  </p>
                </div>
                {aktionen(n)}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog
        offen={Boolean(frage)}
        onSchliessen={() => setFrage(null)}
        titel={frage?.titel ?? ''}
        fuss={
          <>
            <Button onClick={() => setFrage(null)}>Abbrechen</Button>
            <Button
              art={frage?.gefahr ? 'gefahr' : 'primaer'}
              laedt={aendern.isPending}
              onClick={ausfuehren}
            >
              Bestätigen
            </Button>
          </>
        }
      >
        <p>{frage?.text}</p>
        {frage && <p className="text-text-2 text-sm">{frage.nutzer.email}</p>}
      </Dialog>
    </div>
  )
}
