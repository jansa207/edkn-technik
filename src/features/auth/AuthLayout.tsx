import { Plane } from 'lucide-react'
import type { ReactNode } from 'react'
import { FOOTER_HINWEIS } from '@/app/hinweise'

export function Logo({ hell = true }: { hell?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="bg-akzent flex size-9 items-center justify-center rounded-md text-white">
        <Plane aria-hidden="true" className="size-5" />
      </span>
      <span className="leading-tight">
        <span className={`block text-base font-semibold ${hell ? 'text-white' : 'text-text'}`}>
          EDKN Technik
        </span>
        <span
          className={`block font-mono text-[11px] tracking-wider ${hell ? 'text-nav-gedimmt' : 'text-text-3'}`}
        >
          TECH LOG · EDKN
        </span>
      </span>
    </div>
  )
}

/** Rahmen für Anmelden, Registrieren und Freigabe-Seiten */
export function AuthLayout({
  titel,
  untertitel,
  children,
}: {
  titel: string
  untertitel?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="bg-flaeche flex min-h-dvh flex-col lg:flex-row">
      <aside className="bg-nav px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 lg:flex lg:w-[420px] lg:flex-col lg:justify-between lg:p-10">
        <Logo />
        <div className="hidden space-y-4 lg:block">
          <p className="text-2xl font-semibold text-white">
            Technischer Zustand der Vereinsflugzeuge
          </p>
          <ul className="text-nav-text space-y-2 text-sm">
            <li>Status der Luftfahrzeuge vor dem Flug auf einen Blick</li>
            <li>Beanstandungen mit Foto in unter einer Minute melden</li>
            <li>Instandhaltung: Beanstandungen einstufen, Aufgaben planen</li>
          </ul>
        </div>
        <p className="text-nav-gedimmt hidden text-xs lg:block">{FOOTER_HINWEIS}</p>
      </aside>
      <main className="flex flex-1 items-start justify-center px-4 py-8 lg:items-center">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{titel}</h1>
            {untertitel && <p className="text-text-2">{untertitel}</p>}
          </div>
          {children}
          <p className="text-text-3 text-xs lg:hidden">{FOOTER_HINWEIS}</p>
        </div>
      </main>
    </div>
  )
}
