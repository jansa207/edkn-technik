import { MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { Button } from '@/components/Button'
import { FehlerBox, Hinweis } from '@/components/Feedback'
import { Eingabe, Feld } from '@/components/Form'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from './AuthLayout'
import { useAuth } from './useAuth'

export function RegisterPage() {
  const { session } = useAuth()
  const [werte, setWerte] = useState({ vorname: '', nachname: '', email: '', passwort: '' })
  const [fehler, setFehler] = useState<unknown>(null)
  const [laedt, setLaedt] = useState(false)
  const [gesendet, setGesendet] = useState(false)

  if (session) return <Navigate to="/" replace />

  const setze = (feld: keyof typeof werte) => (e: { target: { value: string } }) =>
    setWerte((w) => ({ ...w, [feld]: e.target.value }))

  async function registrieren(e: FormEvent) {
    e.preventDefault()
    setFehler(null)
    if (!werte.vorname.trim() || !werte.nachname.trim()) {
      setFehler(new Error('Bitte Vor- und Nachnamen angeben, damit der Admin dich zuordnen kann.'))
      return
    }
    if (werte.passwort.length < 8) {
      setFehler(new Error('Das Passwort muss mindestens 8 Zeichen lang sein.'))
      return
    }
    setLaedt(true)
    const { error } = await supabase.auth.signUp({
      email: werte.email.trim(),
      password: werte.passwort,
      options: {
        data: { vorname: werte.vorname.trim(), nachname: werte.nachname.trim() },
        emailRedirectTo: `${window.location.origin}/`,
      },
    })
    setLaedt(false)
    if (error) setFehler(error)
    else setGesendet(true)
  }

  if (gesendet) {
    return (
      <AuthLayout titel="Fast geschafft">
        <Hinweis titel="Bitte bestätige deine E-Mail-Adresse">
          <p>
            Wir haben dir eine Mail an <strong>{werte.email}</strong> geschickt. Nach dem Klick auf
            den Link prüft ein Admin dein Konto und gibt es frei.
          </p>
        </Hinweis>
        <div className="text-text-2 flex items-center gap-3">
          <MailCheck aria-hidden="true" className="size-5" />
          <Link to="/anmelden" className="text-primaer font-medium hover:underline">
            Zur Anmeldung
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      titel="Konto anlegen"
      untertitel="Ein Admin prüft jedes neue Konto, bevor es Daten sieht."
    >
      <form onSubmit={registrieren} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Feld label="Vorname" pflicht>
            {(p) => (
              <Eingabe
                {...p}
                autoComplete="given-name"
                value={werte.vorname}
                onChange={setze('vorname')}
              />
            )}
          </Feld>
          <Feld label="Nachname" pflicht>
            {(p) => (
              <Eingabe
                {...p}
                autoComplete="family-name"
                value={werte.nachname}
                onChange={setze('nachname')}
              />
            )}
          </Feld>
        </div>
        <Feld label="E-Mail" pflicht>
          {(p) => (
            <Eingabe
              {...p}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={werte.email}
              onChange={setze('email')}
            />
          )}
        </Feld>
        <Feld label="Passwort" pflicht hinweis="Mindestens 8 Zeichen">
          {(p) => (
            <Eingabe
              {...p}
              type="password"
              autoComplete="new-password"
              value={werte.passwort}
              onChange={setze('passwort')}
            />
          )}
        </Feld>
        {fehler != null && <FehlerBox fehler={fehler} />}
        <Button type="submit" art="primaer" groesse="gross" laedt={laedt} className="w-full">
          Konto anlegen
        </Button>
      </form>
      <p className="text-sm">
        Schon registriert?{' '}
        <Link to="/anmelden" className="text-primaer font-medium hover:underline">
          Anmelden
        </Link>
      </p>
    </AuthLayout>
  )
}
