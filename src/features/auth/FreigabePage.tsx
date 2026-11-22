import { Hourglass } from 'lucide-react'
import { Navigate } from 'react-router'
import { Button } from '@/components/Button'
import { Hinweis, Laden } from '@/components/Feedback'
import { AuthLayout } from './AuthLayout'
import { useAuth } from './useAuth'

/** Seite für ausstehende, abgelehnte und deaktivierte Konten */
export function FreigabePage() {
  const { profil, abmelden, profilNeuLaden } = useAuth()
  if (!profil) return <Laden />
  if (profil.freigabe === 'freigegeben') return <Navigate to="/" replace />

  const abmeldenKnopf = (
    <Button groesse="gross" className="w-full" onClick={() => void abmelden()}>
      Abmelden
    </Button>
  )

  if (profil.freigabe === 'ausstehend') {
    return (
      <AuthLayout titel="Dein Konto wartet auf Freigabe">
        <Hinweis titel={`Hallo ${profil.vorname}!`}>
          <p>
            Ein Admin des Vereins prüft dein Konto und schaltet es frei. Danach siehst du hier den
            Zustand der Luftfahrzeuge und kannst Beanstandungen melden.
          </p>
        </Hinweis>
        <div className="text-text-2 flex items-center gap-3 text-sm">
          <Hourglass aria-hidden="true" className="size-5" />
          <span>Angemeldet als {profil.email}</span>
        </div>
        <Button
          art="primaer"
          groesse="gross"
          className="w-full"
          onClick={() => void profilNeuLaden()}
        >
          Erneut prüfen
        </Button>
        {abmeldenKnopf}
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      titel={profil.freigabe === 'abgelehnt' ? 'Konto nicht freigegeben' : 'Konto deaktiviert'}
    >
      <Hinweis ton="warnung">
        <p>
          {profil.freigabe === 'abgelehnt'
            ? 'Dein Konto wurde nicht freigegeben. Wenn das ein Irrtum ist, sprich bitte einen Admin des Vereins an.'
            : 'Dein Konto wurde deaktiviert. Wenn du wieder Zugriff brauchst, sprich bitte einen Admin des Vereins an.'}
        </p>
      </Hinweis>
      {abmeldenKnopf}
    </AuthLayout>
  )
}
