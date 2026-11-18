import { AMPEL_TEXT, type AmpelStatus } from './ampelStatus'

// Ampel: immer Farbe + Symbol + Text, nie nur Farbe (Barrierefreiheit, Sonne, Farbschwäche).
const STIL: Record<AmpelStatus, string> = {
  gruen: 'bg-ampel-gruen text-white',
  gelb: 'bg-ampel-gelb text-neutral-950',
  rot: 'bg-ampel-rot text-white',
}

function Symbol({ status }: { status: AmpelStatus }) {
  const common = {
    'aria-hidden': true,
    viewBox: '0 0 24 24',
    className: 'size-6 shrink-0',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 3,
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
          <path d="M12 7v6M12 17.5v.01" />
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

export function Ampel({ status }: { status: AmpelStatus }) {
  return (
    <span
      className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-1 text-base font-bold ${STIL[status]}`}
      data-ampel={status}
    >
      <Symbol status={status} />
      <span>{AMPEL_TEXT[status]}</span>
    </span>
  )
}
