import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/Button'
import { FehlerBox, Hinweis } from '@/components/Feedback'
import { Eingabe, Feld } from '@/components/Form'
import { useToast } from '@/components/useToast'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from './AuthLayout'

export function PasswortVergessenPage() {
  const [email, setEmail] = useState('')
  const [fehler, setFehler] = useState<unknown>(null)
  const [laedt, setLaedt] = useState(false)
  const [gesendet, setGesendet] = useState(false)

  async function senden(e: FormEvent) {
    e.preventDefault()
    setFehler(null)
    setLaedt(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/passwort-neu`,
    })
    setLaedt(false)
    if (error) setFehler(error)
    else setGesendet(true)
  }

  return (
    <AuthLayout titel="Passwort vergessen" untertitel="Du bekommst einen Link zum Zurücksetzen.">
      {gesendet ? (
        <Hinweis titel="Mail ist unterwegs">
          Wenn es ein Konto mit <strong>{email}</strong> gibt, kommt gleich eine Mail mit einem
          Link.
        </Hinweis>
      ) : (
        <form onSubmit={senden} className="space-y-4" noValidate>
          <Feld label="E-Mail">
            {(p) => (
              <Eingabe
                {...p}
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Feld>
          {fehler != null && <FehlerBox fehler={fehler} />}
          <Button type="submit" art="primaer" groesse="gross" laedt={laedt} className="w-full">
            Link senden
          </Button>
        </form>
      )}
      <Link to="/anmelden" className="text-primaer text-sm font-medium hover:underline">
        Zurück zur Anmeldung
      </Link>
    </AuthLayout>
  )
}

/** Neues Passwort setzen (nach dem Link aus der Mail oder im Profil) */
export function PasswortNeuPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState<unknown>(null)
  const [laedt, setLaedt] = useState(false)

  async function speichern(e: FormEvent) {
    e.preventDefault()
    setFehler(null)
    if (passwort.length < 8) {
      setFehler(new Error('Das Passwort muss mindestens 8 Zeichen lang sein.'))
      return
    }
    setLaedt(true)
    const { error } = await supabase.auth.updateUser({ password: passwort })
    setLaedt(false)
    if (error) {
      setFehler(error)
      return
    }
    toast('Passwort gespeichert')
    void navigate('/', { replace: true })
  }

  return (
    <AuthLayout titel="Neues Passwort">
      <form onSubmit={speichern} className="space-y-4" noValidate>
        <Feld label="Neues Passwort" hinweis="Mindestens 8 Zeichen">
          {(p) => (
            <Eingabe
              {...p}
              type="password"
              autoComplete="new-password"
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
            />
          )}
        </Feld>
        {fehler != null && <FehlerBox fehler={fehler} />}
        <Button type="submit" art="primaer" groesse="gross" laedt={laedt} className="w-full">
          Passwort speichern
        </Button>
      </form>
    </AuthLayout>
  )
}
