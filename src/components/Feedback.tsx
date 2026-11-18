import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { fehlerText } from '@/lib/fehler'

export function Spinner({ klein = false }: { klein?: boolean }) {
  return (
    <LoaderCircle
      aria-hidden="true"
      className={`animate-spin ${klein ? 'size-4' : 'size-6'} shrink-0`}
    />
  )
}

export function Laden({ text = 'Wird geladen …' }: { text?: string }) {
  return (
    <div role="status" className="text-text-2 flex items-center justify-center gap-3 py-12">
      <Spinner />
      <span>{text}</span>
    </div>
  )
}

export function FehlerBox({ fehler, nochmal }: { fehler: unknown; nochmal?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-900"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="flex-1 space-y-2">
        <p className="font-medium">{fehlerText(fehler)}</p>
        {nochmal && (
          <button
            type="button"
            onClick={nochmal}
            className="min-h-10 font-semibold underline underline-offset-2"
          >
            Erneut versuchen
          </button>
        )}
      </div>
    </div>
  )
}

export function Leer({
  icon,
  titel,
  children,
}: {
  icon?: ReactNode
  titel: string
  children?: ReactNode
}) {
  return (
    <div className="text-text-2 flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <div className="text-text-3 [&>svg]:size-8">{icon}</div>}
      <p className="text-text font-semibold">{titel}</p>
      {children && <div className="max-w-md text-sm">{children}</div>}
    </div>
  )
}

type HinweisTon = 'info' | 'warnung' | 'gefahr' | 'erfolg' | 'lila'

const HINWEIS_STIL: Record<HinweisTon, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-950',
  warnung: 'border-amber-300 bg-amber-50 text-amber-950',
  gefahr: 'border-red-200 bg-red-50 text-red-950',
  erfolg: 'border-green-200 bg-green-50 text-green-950',
  lila: 'border-violet-200 bg-violet-50 text-violet-950',
}

export function Hinweis({
  ton = 'info',
  titel,
  children,
  className = '',
}: {
  ton?: HinweisTon
  titel?: string
  children?: ReactNode
  className?: string
}) {
  const Icon =
    ton === 'warnung'
      ? TriangleAlert
      : ton === 'gefahr'
        ? CircleAlert
        : ton === 'erfolg'
          ? CircleCheck
          : Info
  return (
    <div
      className={`flex items-start gap-3 rounded-md border p-3 text-sm ${HINWEIS_STIL[ton]} ${className}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4.5 shrink-0" />
      <div className="space-y-1">
        {titel && <p className="font-semibold">{titel}</p>}
        {children}
      </div>
    </div>
  )
}
