import { Ampel } from '@/components/Ampel'
import { AMPEL_ERKLAERUNG, type AmpelStatus } from '@/components/ampelStatus'

const AMPEL_REIHENFOLGE: AmpelStatus[] = ['gruen', 'gelb', 'rot']

// Platzhalter-Startseite für das Grundgerüst. Wird in Schritt 4 durch die Flugzeugliste ersetzt.
export function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">Willkommen bei EDKN Technik</h1>
        <p className="text-lg">
          Hier siehst du bald vor jedem Flug, in welchem technischen Zustand die Vereinsflugzeuge
          sind, und kannst Mängel mit Foto melden.
        </p>
        <p className="border-marine bg-marine/5 rounded-lg border-2 p-3 font-medium">
          Prototyp im Aufbau – es gibt noch keine echten Daten.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">So liest du die Ampel</h2>
        <ul className="space-y-3">
          {AMPEL_REIHENFOLGE.map((status) => (
            <li key={status} className="space-y-1">
              <Ampel status={status} />
              <p className="text-neutral-800">{AMPEL_ERKLAERUNG[status]}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Was als Nächstes kommt</h2>
        <ol className="list-decimal space-y-1 pl-6 text-lg">
          <li>Anmelden und Freigabe durch den Admin</li>
          <li>Flugzeugliste mit Ampel und Verlauf</li>
          <li>Mängel melden mit Foto</li>
          <li>Werkstatt-Inbox für die Warte</li>
        </ol>
      </section>
    </div>
  )
}
