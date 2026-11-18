import type { ReactNode } from 'react'

export function Panel({
  children,
  className = '',
  as: Tag = 'section',
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article'
}) {
  return (
    <Tag className={`border-rand rounded-md border bg-white shadow-xs ${className}`}>
      {children}
    </Tag>
  )
}

export function PanelKopf({
  titel,
  zusatz,
  aktionen,
  id,
}: {
  titel: ReactNode
  zusatz?: ReactNode
  aktionen?: ReactNode
  id?: string
}) {
  return (
    <div className="border-rand flex min-h-12 flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
      <h2
        id={id}
        className="text-text flex items-center gap-2 text-sm font-semibold tracking-wide uppercase"
      >
        {titel}
        {zusatz != null && (
          <span className="bg-flaeche text-text-2 rounded-sm px-1.5 py-0.5 font-mono text-xs normal-case">
            {zusatz}
          </span>
        )}
      </h2>
      {aktionen && <div className="flex items-center gap-2">{aktionen}</div>}
    </div>
  )
}

export function SeitenKopf({
  titel,
  untertitel,
  aktionen,
}: {
  titel: ReactNode
  untertitel?: ReactNode
  aktionen?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight lg:text-2xl">{titel}</h1>
        {untertitel && <p className="text-text-2 text-sm">{untertitel}</p>}
      </div>
      {aktionen && <div className="flex flex-wrap items-center gap-2">{aktionen}</div>}
    </div>
  )
}

type KennzahlTon = 'neutral' | 'gruen' | 'gelb' | 'rot' | 'blau'

const KENNZAHL_BALKEN: Record<KennzahlTon, string> = {
  neutral: 'bg-rand-stark',
  gruen: 'bg-ampel-gruen',
  gelb: 'bg-ampel-gelb',
  rot: 'bg-ampel-rot',
  blau: 'bg-primaer',
}

export function Kennzahl({
  label,
  wert,
  ton = 'neutral',
  hinweis,
}: {
  label: string
  wert: ReactNode
  ton?: KennzahlTon
  hinweis?: ReactNode
}) {
  return (
    <div className="border-rand relative overflow-hidden rounded-md border bg-white px-4 py-3 shadow-xs">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${KENNZAHL_BALKEN[ton]}`}
      />
      <p className="text-text-2 text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{wert}</p>
      {hinweis && <p className="text-text-3 mt-0.5 text-xs">{hinweis}</p>}
    </div>
  )
}

export function DatenFelder({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 xl:grid-cols-4">{children}</dl>
  )
}

export function DatenFeld({
  label,
  children,
  mono = false,
  breit = false,
}: {
  label: string
  children: ReactNode
  mono?: boolean
  breit?: boolean
}) {
  return (
    <div className={breit ? 'col-span-full' : ''}>
      <dt className="text-text-3 text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd className={`text-text mt-0.5 text-sm ${mono ? 'font-mono' : ''}`}>{children}</dd>
    </div>
  )
}

/** Einfache Tabelle im Verwaltungsstil */
export function Tabelle({ kopf, children }: { kopf: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-rand bg-flaeche/60 border-b">
            {kopf.map((k, i) => (
              <th
                key={i}
                scope="col"
                className="text-text-2 px-4 py-2 text-xs font-semibold tracking-wide whitespace-nowrap uppercase"
              >
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-rand divide-y">{children}</tbody>
      </table>
    </div>
  )
}
