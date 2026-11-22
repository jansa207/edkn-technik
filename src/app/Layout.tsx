import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import {
  ChevronRight,
  LogOut,
  Menu,
  Plane,
  PlaneTakeoff,
  RefreshCw,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useMatches, useNavigate } from 'react-router'
import { ButtonLink } from '@/components/Button'
import { ROLLE_TEXT } from '@/components/statusTexte'
import { useFlotte } from '@/features/aircraft/api'
import { Logo } from '@/features/auth/AuthLayout'
import { useAuth, useProfil } from '@/features/auth/useAuth'
import { name, uhrzeit } from '@/lib/format'
import { useOnline } from '@/lib/useOnline'
import { APP_VERSION, FOOTER_HINWEIS } from './hinweise'
import { setModus, useModus } from './modus'
import {
  hatInstandhaltung,
  MODUS_START,
  MODUS_TEXT,
  sichtbareNavigation,
  type Modus,
  type RoutenHandle,
} from './navigation'
import { useZaehler } from './useZaehler'

export { FOOTER_HINWEIS } from './hinweise'

function useRoutenHandle(): RoutenHandle | undefined {
  const matches = useMatches()
  for (let i = matches.length - 1; i >= 0; i--) {
    const h = matches[i]?.handle as RoutenHandle | undefined
    if (h?.titel) return h
  }
  return undefined
}

function Zaehler({ wert }: { wert: number }) {
  if (wert <= 0) return null
  return (
    <span className="bg-akzent ml-auto min-w-6 rounded-sm px-1.5 py-0.5 text-center font-mono text-xs font-semibold text-white">
      {wert}
    </span>
  )
}

/** Umschalter Flugbetrieb ⇄ Instandhaltung für Warte und Admins */
function ModusUmschalter({ onNavigiert }: { onNavigiert?: () => void }) {
  const modus = useModus()
  const navigate = useNavigate()
  const zaehler = useZaehler()
  const offen = zaehler.neueMeldungen + zaehler.fristenUeberfaellig
  const wahl = (m: Modus) => {
    setModus(m)
    void navigate(MODUS_START[m])
    onNavigiert?.()
  }
  return (
    <div
      role="group"
      aria-label="Bereich"
      className="mx-2 mb-1 grid grid-cols-2 gap-1 rounded-md bg-white/5 p-1"
    >
      {(['flugbetrieb', 'instandhaltung'] as const).map((m) => {
        const Icon = m === 'flugbetrieb' ? Plane : Wrench
        const aktiv = modus === m
        return (
          <button
            key={m}
            type="button"
            aria-pressed={aktiv}
            onClick={() => wahl(m)}
            className={`relative flex min-h-11 items-center justify-center gap-1.5 rounded-sm px-2 text-[13px] font-medium lg:min-h-8 lg:text-xs ${
              aktiv
                ? 'bg-nav-aktiv text-white'
                : 'text-nav-text hover:bg-nav-hover hover:text-white'
            }`}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0 lg:size-3.5" />
            {MODUS_TEXT[m]}
            {m === 'instandhaltung' && !aktiv && offen > 0 && (
              <span className="bg-akzent absolute -top-1 -right-1 min-w-4 rounded-full px-1 text-center font-mono text-[10px] leading-4 font-semibold text-white">
                {offen}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Navigation: dunkel, gruppiert. Gleicher Inhalt für Desktop-Leiste und Handy-Menü. */
function NavInhalt({ onNavigiert }: { onNavigiert?: () => void }) {
  const profil = useProfil()
  const { abmelden } = useAuth()
  const zaehler = useZaehler()
  const modus = useModus()
  const gruppen = sichtbareNavigation(profil.rolle, modus)

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center px-4">
        <Link to="/" onClick={onNavigiert} aria-label="EDKN Technik – Startseite">
          <Logo />
        </Link>
      </div>
      {hatInstandhaltung(profil.rolle) && <ModusUmschalter onNavigiert={onNavigiert} />}
      <nav aria-label="Hauptmenü" className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
        {gruppen.map((g) => (
          <div key={g.titel}>
            <p className="text-nav-gedimmt px-3 pb-1.5 text-[11px] font-semibold tracking-widest uppercase">
              {g.titel}
            </p>
            <ul className="space-y-0.5">
              {g.punkte.map((p) => (
                <li key={`${g.titel}-${p.to}`}>
                  <NavLink
                    to={p.to}
                    end={p.exakt}
                    onClick={onNavigiert}
                    className={({ isActive }) =>
                      `relative flex min-h-12 items-center gap-3 rounded-md px-3 text-[15px] lg:min-h-9 lg:text-sm ${
                        isActive
                          ? 'bg-nav-aktiv before:bg-akzent font-semibold text-white before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full'
                          : 'text-nav-text hover:bg-nav-hover hover:text-white'
                      }`
                    }
                  >
                    <p.icon aria-hidden="true" className="size-5 shrink-0 lg:size-4" />
                    <span>{p.label}</span>
                    {p.zaehler && <Zaehler wert={zaehler[p.zaehler]} />}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <span className="bg-nav-aktiv flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold text-white">
            {(profil.vorname[0] ?? '') + (profil.nachname[0] ?? '')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {name(profil.vorname, profil.nachname) || profil.email}
            </p>
            <p className="text-nav-gedimmt text-xs">{ROLLE_TEXT[profil.rolle]}</p>
          </div>
          <button
            type="button"
            onClick={() => void abmelden()}
            className="text-nav-text hover:bg-nav-hover flex size-11 items-center justify-center rounded-md hover:text-white lg:size-9"
            aria-label="Abmelden"
            title="Abmelden"
          >
            <LogOut aria-hidden="true" className="size-4.5" />
          </button>
        </div>
        <p className="text-nav-gedimmt px-2 pt-1 font-mono text-[11px]">Version {APP_VERSION}</p>
      </div>
    </div>
  )
}

/** Verbindung und Datenstand („Stand 14:05“) */
function Verbindung({ hell = false }: { hell?: boolean }) {
  const online = useOnline()
  const { dataUpdatedAt } = useFlotte()
  const text = online ? (dataUpdatedAt ? `Stand ${uhrzeit(dataUpdatedAt)}` : 'Online') : 'Offline'
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs ${hell ? 'text-nav-text' : 'text-text-2'}`}
      title={online ? 'Verbunden' : 'Keine Verbindung – angezeigte Daten können veraltet sein'}
    >
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${online ? 'bg-green-500' : 'bg-ampel-rot'}`}
      />
      {text}
    </span>
  )
}

function AktualisierenKnopf() {
  const queryClient = useQueryClient()
  const laedt = useIsFetching() > 0
  return (
    <button
      type="button"
      onClick={() => void queryClient.invalidateQueries()}
      className="border-rand-stark text-text hover:bg-flaeche inline-flex min-h-9 items-center gap-2 rounded-md border bg-white px-3 text-sm font-medium"
    >
      <RefreshCw aria-hidden="true" className={`size-4 ${laedt ? 'animate-spin' : ''}`} />
      Aktualisieren
    </button>
  )
}

export function Layout() {
  const handle = useRoutenHandle()
  const online = useOnline()
  const ort = useLocation()
  const zaehler = useZaehler()
  const menuZaehler = zaehler.neueMeldungen + zaehler.nutzerAusstehend + zaehler.fristenUeberfaellig
  // Menü gilt nur für die Adresse, auf der es geöffnet wurde (schließt z. B. bei Zurück-Taste)
  const [menuPfad, setMenuPfad] = useState<string | null>(null)
  const menuOffen = menuPfad === ort.pathname
  const setMenuOffen = (offen: boolean) => setMenuPfad(offen ? ort.pathname : null)

  const zeigeMeldeKnopf = !ort.pathname.startsWith('/melden')

  return (
    <div className="min-h-dvh lg:pl-60">
      {/* Desktop: feste Seitenleiste */}
      <aside className="bg-nav fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">
        <NavInhalt />
      </aside>

      {/* Handy: Kopfzeile mit Menü */}
      <header className="bg-nav sticky top-0 z-30 pt-[env(safe-area-inset-top)] text-white lg:hidden">
        <div className="flex h-14 items-center gap-2 px-2">
          <button
            type="button"
            onClick={() => setMenuOffen(true)}
            className="hover:bg-nav-hover relative flex size-12 items-center justify-center rounded-md"
            aria-label="Menü öffnen"
            aria-expanded={menuOffen}
          >
            <Menu aria-hidden="true" className="size-6" />
            {menuZaehler > 0 && (
              <span className="bg-akzent absolute top-1.5 right-1.5 min-w-5 rounded-full px-1 text-center font-mono text-[11px] leading-5 font-semibold">
                {menuZaehler}
              </span>
            )}
          </button>
          <p className="min-w-0 flex-1 truncate text-base font-semibold">
            {handle?.titel ?? 'EDKN Technik'}
          </p>
          <div className="pr-2">
            <Verbindung hell />
          </div>
        </div>
      </header>

      {/* Desktop: Kopfzeile mit Pfadangabe */}
      <header className="border-rand sticky top-0 z-20 hidden h-14 items-center gap-4 border-b bg-white px-8 lg:flex">
        <nav
          aria-label="Pfad"
          className="text-text-2 flex min-w-0 flex-1 items-center gap-1.5 text-sm"
        >
          <span>EDKN Technik</span>
          {handle?.bereich && (
            <>
              <ChevronRight aria-hidden="true" className="text-text-3 size-4" />
              <span>{handle.bereich}</span>
            </>
          )}
          {handle && (
            <>
              <ChevronRight aria-hidden="true" className="text-text-3 size-4" />
              <span className="text-text truncate font-medium">{handle.titel}</span>
            </>
          )}
        </nav>
        <Verbindung />
        <AktualisierenKnopf />
        {zeigeMeldeKnopf && (
          <ButtonLink
            to="/melden"
            art="primaer"
            icon={<PlaneTakeoff aria-hidden="true" className="size-4" />}
          >
            Beanstandung melden
          </ButtonLink>
        )}
      </header>

      {/* Handy: ausklappbares Seitenmenü */}
      {menuOffen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOffen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menü"
            className="bg-nav absolute inset-y-0 left-0 w-[300px] max-w-[85vw] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setMenuOffen(false)}
              className="text-nav-text absolute top-[calc(env(safe-area-inset-top)+0.25rem)] right-1 flex size-12 items-center justify-center rounded-md hover:text-white"
              aria-label="Menü schließen"
            >
              <X aria-hidden="true" className="size-6" />
            </button>
            <NavInhalt onNavigiert={() => setMenuOffen(false)} />
          </div>
        </div>
      )}

      {!online && (
        <div
          role="status"
          className="flex items-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-950 lg:px-8"
        >
          <WifiOff aria-hidden="true" className="size-4 shrink-0" />
          Keine Verbindung. Angezeigt wird der letzte Stand – vor dem Flug bitte neu laden.
        </div>
      )}

      <main className="mx-auto w-full max-w-[1600px] px-4 pt-4 pb-28 lg:px-8 lg:pt-6 lg:pb-10">
        <Outlet />
      </main>

      <footer className="border-rand text-text-3 border-t px-4 py-4 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] text-xs lg:px-8 lg:pb-4">
        <p className="mx-auto flex max-w-[1600px] flex-wrap justify-between gap-2">
          <span>{FOOTER_HINWEIS}</span>
          <span className="font-mono">EDKN Technik {APP_VERSION}</span>
        </p>
      </footer>

      {/* Handy: schwebender Melde-Knopf */}
      {zeigeMeldeKnopf && (
        <Link
          to="/melden"
          className="bg-primaer fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 inline-flex min-h-14 items-center gap-2 rounded-md px-5 text-base font-semibold text-white shadow-lg lg:hidden"
        >
          <PlaneTakeoff aria-hidden="true" className="size-5" />
          Beanstandung melden
        </Link>
      )}
    </div>
  )
}
