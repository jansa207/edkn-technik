import { X } from 'lucide-react'
import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from 'react'

/**
 * Dialog: am Handy als Blatt von unten, am Desktop zentriert.
 * Schließt mit Escape und Klick auf den Hintergrund.
 */
export function Dialog({
  offen,
  onSchliessen,
  titel,
  untertitel,
  children,
  fuss,
  breit = false,
}: {
  offen: boolean
  onSchliessen: () => void
  titel: ReactNode
  untertitel?: ReactNode
  children: ReactNode
  fuss?: ReactNode
  breit?: boolean
}) {
  const titelId = useId()
  const box = useRef<HTMLDivElement>(null)
  const schliessen = useEffectEvent(() => onSchliessen())

  useEffect(() => {
    if (!offen) return
    const vorher = document.activeElement as HTMLElement | null
    const erstes = box.current?.querySelector<HTMLElement>(
      'textarea, input:not([type=hidden]), select, button:not([data-schliessen])',
    )
    ;(erstes ?? box.current)?.focus()
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') schliessen()
    }
    document.addEventListener('keydown', taste)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', taste)
      document.body.style.overflow = overflow
      vorher?.focus()
    }
  }, [offen])

  if (!offen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div aria-hidden="true" className="bg-nav/60 absolute inset-0" onClick={onSchliessen} />
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        tabIndex={-1}
        className={`relative flex max-h-[92dvh] w-full flex-col rounded-t-xl bg-white shadow-xl sm:rounded-lg ${breit ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
      >
        <div className="border-rand flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="space-y-0.5">
            <h2 id={titelId} className="text-lg font-semibold">
              {titel}
            </h2>
            {untertitel && <p className="text-text-2 text-sm">{untertitel}</p>}
          </div>
          <button
            type="button"
            data-schliessen
            onClick={onSchliessen}
            className="text-text-2 hover:bg-flaeche -m-2 flex size-11 items-center justify-center rounded-md"
            aria-label="Schließen"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        {fuss && (
          <div className="border-rand bg-flaeche/60 flex flex-col-reverse gap-2 border-t px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
            {fuss}
          </div>
        )}
      </div>
    </div>
  )
}
