import { AMPEL_TEXT, type AmpelStatus } from './ampelStatus'

// Ampel: immer Farbe + Symbol + Text, nie nur Farbe (Barrierefreiheit, Sonne, Farbschwäche).
const STIL: Record<AmpelStatus, string> = {
  gruen: 'bg-ampel-gruen text-white',
  gelb: 'bg-ampel-gelb text-ampel-gelb-text',
  rot: 'bg-ampel-rot text-white',
}

const GROESSE = {
  klein: { box: 'min-h-7 px-2 text-xs gap-1.5', icon: 'size-3.5' },
  normal: { box: 'min-h-8 px-2.5 text-sm gap-1.5', icon: 'size-4' },
  gross: { box: 'min-h-11 px-4 text-base gap-2', icon: 'size-5' },
}

export function AmpelSymbol({ status, className }: { status: AmpelStatus; className: string }) {
  const common = {
    'aria-hidden': true,
    viewBox: '0 0 24 24',
    className: `${className} shrink-0`,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 3.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (status) {
    case 'gruen':
      return (
        <svg {...common}>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )
    case 'gelb':
      return (
        <svg {...common}>
          <path d="M12 6v8M12 18.5v.01" />
        </svg>
      )
    case 'rot':
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      )
  }
}

export function Ampel({
  status,
  groesse = 'normal',
}: {
  status: AmpelStatus
  groesse?: keyof typeof GROESSE
}) {
  const g = GROESSE[groesse]
  return (
    <span
      className={`inline-flex items-center rounded-sm font-bold tracking-wide whitespace-nowrap uppercase ${g.box} ${STIL[status]}`}
      data-ampel={status}
    >
      <AmpelSymbol status={status} className={g.icon} />
      <span>{AMPEL_TEXT[status]}</span>
    </span>
  )
}
