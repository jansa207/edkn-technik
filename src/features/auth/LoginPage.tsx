import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { Button } from '@/components/Button'
import { FehlerBox, Hinweis } from '@/components/Feedback'
import { Eingabe, Feld } from '@/components/Form'
import { supabase, supabaseKonfiguriert } from '@/lib/supabase'
import { AuthLayout } from './AuthLayout'
import { useAuth } from './useAuth'

export function LoginPage() {
  const { session } = useAuth()
  const ort = useLocation()
  const ziel = (ort.state as { von?: string } | null)?.von ?? '/'
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState<unknown>(null)
  const [laedt, setLaedt] = useState(false)

  if (session) return <Navigate to={ziel} replace />

  async function anmelden(e: FormEvent) {
    e.preventDefault()
    setFehler(null)
    setLaedt(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: passwort,
    })
    setLaedt(false)
    if (error) setFehler(error)
  }

  return (
    <AuthLayout titel="Anmelden" untertitel="Mit deinem Vereinskonto">
      {!supabaseKonfiguriert && (
        <Hinweis ton="warnung" titel="Server nicht eingerichtet">
          Bitte <code>.env.local</code> nach <code>.env.example</code> anlegen.
        </Hinweis>
      )}
      <form onSubmit={anmelden} className="space-y-4" noValidate>
        <Feld label="E-Mail">
          {(p) => (
            <Eingabe
              {...p}
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Feld>
        <Feld label="Passwort">
          {(p) => (
            <Eingabe
              {...p}
              type="password"
              autoComplete="current-password"
              required
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
            />
          )}
        </Feld>
        {fehler != null && <FehlerBox fehler={fehler} />}
        <Button type="submit" art="primaer" groesse="gross" laedt={laedt} className="w-full">
          Anmelden
        </Button>
      </form>
      <div className="flex flex-wrap justify-between gap-3 text-sm">
        <Link
          to="/passwort-vergessen"
          className="text-primaer font-medium underline-offset-2 hover:underline"
        >
          Passwort vergessen?
        </Link>
        <Link
          to="/registrieren"
          className="text-primaer font-medium underline-offset-2 hover:underline"
        >
          Neues Konto anlegen
        </Link>
      </div>
    </AuthLayout>
  )
}
