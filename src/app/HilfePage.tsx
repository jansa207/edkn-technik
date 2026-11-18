import { Ampel } from '@/components/Ampel'
import { AMPEL_ERKLAERUNG, type AmpelStatus } from '@/components/ampelStatus'
import { KatBadge } from '@/components/Badge'
import { Panel, PanelKopf, SeitenKopf } from '@/components/Panel'
import { KAT_TEXT } from '@/components/statusTexte'
import { useIstWart } from '@/features/auth/useAuth'
import { FOOTER_HINWEIS } from './hinweise'

const AMPELN: AmpelStatus[] = ['gruen', 'gelb', 'rot']

export function HilfePage() {
  const wart = useIstWart()
  return (
    <div className="space-y-4 lg:space-y-6">
      <SeitenKopf titel="Hilfe" untertitel={FOOTER_HINWEIS} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelKopf titel="So liest du die Ampel" />
          <ul className="divide-rand divide-y">
            {AMPELN.map((s) => (
              <li key={s} className="space-y-1.5 px-4 py-3">
                <Ampel status={s} />
                <p className="text-text-2 text-sm">{AMPEL_ERKLAERUNG[s]}</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <PanelKopf titel="Mangel melden" />
          <ol className="list-decimal space-y-2 py-3 pr-4 pl-9 text-sm">
            <li>„Mangel melden“ antippen und das Flugzeug wählen.</li>
            <li>Kurz beschreiben: Wo? Was passiert? Seit wann?</li>
            <li>Bis zu 3 Fotos aufnehmen (optional).</li>
            <li>
              Wenn du das Flugzeug für nicht flugklar hältst: Schalter „nicht flugklar“ setzen. Es
              wird sofort für alle rot.
            </li>
            <li>Die Rückmeldung der Werkstatt findest du unter „Meine Meldungen“.</li>
          </ol>
        </Panel>
        <Panel>
          <PanelKopf titel="Was passiert mit meiner Meldung?" />
          <ul className="divide-rand divide-y">
            {([1, 2, 3] as const).map((k) => (
              <li key={k} className="flex gap-3 px-4 py-3 text-sm">
                <KatBadge kategorie={k} />
                <span>{KAT_TEXT[k]}</span>
              </li>
            ))}
          </ul>
          <p className="text-text-2 px-4 pb-3 text-sm">
            Ein Wart stuft jede Meldung ein. Fremde Meldungen sehen Piloten nicht, nur den Hinweis
            „in Prüfung“ und freigegebene Pilotenhinweise.
          </p>
        </Panel>
        {wart && (
          <Panel>
            <PanelKopf titel="Für Warte: Aufgaben" />
            <ul className="list-disc space-y-2 py-3 pr-4 pl-9 text-sm">
              <li>
                Aufgaben sind interne To-dos der Werkstatt mit Frist, Zuständigem und Teilschritten.
                Sie ändern die Ampel nicht.
              </li>
              <li>
                Halb fertig? Unter „Arbeitsstand festhalten“ notieren, was gemacht ist und was fehlt
                („Übergabe-Vorlage“). So kann jemand anderes weitermachen.
              </li>
              <li>Wartet die Arbeit auf Teile oder Hilfe: Status „Wartet“ mit Grund setzen.</li>
              <li>
                „Erledigt“ geht erst, wenn alle Teilschritte abgehakt sind. Die zugehörige Meldung
                schließt du im Meldungseingang mit der Maßnahme ab.
              </li>
            </ul>
          </Panel>
        )}
      </div>
    </div>
  )
}
