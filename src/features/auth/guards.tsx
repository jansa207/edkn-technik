import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { FehlerBox, Laden } from '@/components/Feedback'
import type { Rolle } from '@/components/statusTexte'
import { useAuth } from './useAuth'

/** Nur mit Anmeldung. Sonst zur Anmeldeseite (mit Rücksprung). */
export function RequireSession({ children }: { children?: ReactNode }) {
  const { laedt, session, passwortWiederherstellung } = useAuth()
  const ort = useLocation()
  if (laedt) return <Laden text="Anmeldung wird geprüft …" />
  if (!session)
    return <Navigate to="/anmelden" replace state={{ von: ort.pathname + ort.search }} />
  if (passwortWiederherstellung && ort.pathname !== '/passwort-neu') {
    return <Navigate to="/passwort-neu" replace />
  }
  return children ?? <Outlet />
}

/** Nur freigegebene Konten. Ausstehende, abgelehnte und deaktivierte landen auf /freigabe. */
export function RequireFreigabe({ children }: { children?: ReactNode }) {
  const { profil, profilFehler, profilNeuLaden } = useAuth()
  if (profilFehler) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <FehlerBox fehler={profilFehler} nochmal={() => void profilNeuLaden()} />
      </div>
    )
  }
  if (!profil) return <Laden />
  if (profil.freigabe !== 'freigegeben') return <Navigate to="/freigabe" replace />
  return children ?? <Outlet />
}

/** Nur bestimmte Rollen. Die echte Sperre liegt in RLS/RPCs, das hier ist nur Komfort. */
export function RequireRolle({ rollen, children }: { rollen: Rolle[]; children?: ReactNode }) {
  const { profil } = useAuth()
  if (!profil || !rollen.includes(profil.rolle)) return <Navigate to="/" replace />
  return children ?? <Outlet />
}
