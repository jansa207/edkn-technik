import { CircleAlert, CircleCheck } from 'lucide-react'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { ToastKontext, type ToastTon } from './toastKontext'

interface Toast {
  id: number
  text: string
  ton: ToastTon
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const naechste = useRef(1)

  const zeigen = useCallback((text: string, ton: ToastTon = 'erfolg') => {
    const id = naechste.current++
    setToasts((t) => [...t, { id, text, ton }])
    window.setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      ton === 'fehler' ? 7000 : 4000,
    )
  }, [])

  return (
    <ToastKontext value={zeigen}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.ton === 'fehler' ? 'alert' : 'status'}
            className="bg-nav pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md px-4 py-3 text-sm text-white shadow-lg"
          >
            {t.ton === 'fehler' ? (
              <CircleAlert aria-hidden="true" className="size-5 shrink-0 text-red-300" />
            ) : (
              <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-green-300" />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastKontext>
  )
}
