import { useContext } from 'react'
import { AuthKontext, type AuthZustand, type Profil } from './authKontext'

export function useAuth(): AuthZustand {
  const kontext = useContext(AuthKontext)
  if (!kontext) throw new Error('useAuth braucht einen AuthProvider')
  return kontext
}

/** Profil eines freigegebenen Nutzers. Nur innerhalb der geschützten Routen verwenden. */
export function useProfil(): Profil {
  const { profil } = useAuth()
  if (!profil) throw new Error('useProfil nur hinter RequireFreigabe verwenden')
  return profil
}

export function useIstWart(): boolean {
  const { profil } = useAuth()
  return profil?.rolle === 'wart' || profil?.rolle === 'admin'
}

export function useIstAdmin(): boolean {
  const { profil } = useAuth()
  return profil?.rolle === 'admin'
}
