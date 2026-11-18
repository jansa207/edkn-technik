import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

const EINGABE =
  'w-full rounded-md border border-rand-stark bg-white px-3 text-base text-text placeholder:text-text-3 focus:border-primaer focus:ring-2 focus:ring-primaer/20 focus:outline-none disabled:bg-flaeche lg:text-sm'

export function Feld({
  label,
  hinweis,
  fehler,
  pflicht,
  children,
  zaehler,
}: {
  label: string
  hinweis?: ReactNode
  fehler?: string | null
  pflicht?: boolean
  zaehler?: ReactNode
  children: (props: {
    id: string
    'aria-describedby'?: string
    'aria-invalid'?: boolean
  }) => ReactNode
}) {
  const id = useId()
  const hinweisId = `${id}-hinweis`
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-text text-sm font-semibold">
          {label}
          {pflicht && (
            <span className="text-ampel-rot ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {zaehler && <span className="text-text-3 font-mono text-xs">{zaehler}</span>}
      </div>
      {children({
        id,
        'aria-describedby': hinweis || fehler ? hinweisId : undefined,
        'aria-invalid': fehler ? true : undefined,
      })}
      {(fehler || hinweis) && (
        <p
          id={hinweisId}
          className={`text-sm ${fehler ? 'text-ampel-rot font-medium' : 'text-text-3'}`}
        >
          {fehler || hinweis}
        </p>
      )}
    </div>
  )
}

export function Eingabe({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${EINGABE} min-h-12 lg:min-h-9 ${className}`} {...props} />
}

export function Textfeld({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${EINGABE} min-h-24 py-2 leading-relaxed ${className}`} {...props} />
}

export function Auswahl({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${EINGABE} min-h-12 pr-8 lg:min-h-9 ${className}`} {...props}>
      {children}
    </select>
  )
}

export function Haken({
  label,
  hinweis,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hinweis?: ReactNode }) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-start gap-3 py-2 lg:min-h-0 ${className}`}
    >
      <input
        type="checkbox"
        className="accent-primaer mt-0.5 size-5 shrink-0 lg:size-4"
        {...props}
      />
      <span className="space-y-0.5">
        <span className="text-text block text-sm font-medium">{label}</span>
        {hinweis && <span className="text-text-2 block text-sm">{hinweis}</span>}
      </span>
    </label>
  )
}

/** Auswahlkarte (Radio) mit Titel, Kennung und Erklärung */
export function AuswahlKarte({
  name,
  wert,
  gewaehlt,
  onWahl,
  titel,
  kennung,
  text,
  ton = 'blau',
}: {
  name: string
  wert: string
  gewaehlt: boolean
  onWahl: (wert: string) => void
  titel: ReactNode
  kennung?: ReactNode
  text?: ReactNode
  ton?: 'blau' | 'rot' | 'gelb' | 'grau'
}) {
  const rahmen = {
    blau: 'has-checked:border-primaer has-checked:bg-blue-50',
    rot: 'has-checked:border-ampel-rot has-checked:bg-red-50',
    gelb: 'has-checked:border-amber-500 has-checked:bg-amber-50',
    grau: 'has-checked:border-text-2 has-checked:bg-flaeche',
  }[ton]
  return (
    <label
      className={`border-rand-stark flex cursor-pointer items-start gap-3 rounded-md border bg-white p-3 has-checked:ring-1 ${rahmen}`}
    >
      <input
        type="radio"
        name={name}
        value={wert}
        checked={gewaehlt}
        onChange={() => onWahl(wert)}
        className="accent-primaer mt-1 size-5 shrink-0 lg:size-4"
      />
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="text-text flex flex-wrap items-center gap-2 text-sm font-semibold">
          {kennung}
          {titel}
        </span>
        {text && <span className="text-text-2 block text-sm">{text}</span>}
      </span>
    </label>
  )
}
