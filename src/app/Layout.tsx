import { Link, Outlet } from 'react-router'

export const FOOTER_HINWEIS =
  'Internes Meldetool des Vereins – ersetzt nicht Bordbuch oder Prüferfreigabe.'

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-marine pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto flex max-w-screen-sm items-center px-4 py-3">
          <Link to="/" className="text-xl font-bold tracking-tight">
            EDKN Technik
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-sm flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-neutral-300 bg-neutral-100 pb-[env(safe-area-inset-bottom)]">
        <p className="mx-auto max-w-screen-sm px-4 py-4 text-sm text-neutral-700">
          {FOOTER_HINWEIS}
        </p>
      </footer>
    </div>
  )
}
