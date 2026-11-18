import { Lock, LockOpen, MessageSquare, PencilLine, PlusCircle, Tag } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/Badge'
import { zeitpunkt } from '@/lib/format'
import type { Enums } from '@/lib/supabase'
import type { VerlaufEintrag } from './api'

const TYP: Record<Enums<'event_typ'>, { text: string; icon: typeof Tag }> = {
  erstellt: { text: 'Meldung', icon: PlusCircle },
  kommentar: { text: 'Kommentar', icon: MessageSquare },
  statuswechsel: { text: 'Status', icon: PencilLine },
  kategorie: { text: 'Einstufung', icon: Tag },
  sperre: { text: 'Sperre', icon: Lock },
  entsperrt: { text: 'Entsperrt', icon: LockOpen },
}

/** Verlauf als Protokoll: Tabelle am Desktop, Liste am Handy */
export function VerlaufListe({
  eintraege,
  meldungsLink,
}: {
  eintraege: VerlaufEintrag[]
  /** Link zur Meldung (nur für die Werkstatt) */
  meldungsLink?: (reportId: string) => string
}) {
  if (eintraege.length === 0) {
    return <p className="text-text-2 px-4 py-6 text-sm">Noch keine Einträge.</p>
  }
  return (
    <ol className="divide-rand divide-y">
      {eintraege.map((e) => {
        const typ = TYP[e.typ]
        return (
          <li key={e.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_110px_1fr] sm:gap-4">
            <span className="text-text-2 font-mono text-xs sm:pt-0.5">
              {zeitpunkt(e.created_at)}
            </span>
            <span className="text-text-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase sm:pt-0.5">
              <typ.icon aria-hidden="true" className="size-3.5" />
              {typ.text}
            </span>
            <div className="min-w-0 space-y-1 text-sm">
              <p className="break-words whitespace-pre-line">{e.text}</p>
              <p className="text-text-3 flex flex-wrap items-center gap-2 text-xs">
                {e.user_name && <span>{e.user_name}</span>}
                {e.intern && <Badge ton="gelb">intern</Badge>}
                {meldungsLink && e.report_id && (
                  <Link
                    to={meldungsLink(e.report_id)}
                    className="text-primaer font-medium hover:underline"
                  >
                    Zur Meldung
                  </Link>
                )}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
