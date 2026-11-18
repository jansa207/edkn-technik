import type { Session } from '@supabase/supabase-js'
import { createContext } from 'react'
import type { Tables } from '@/lib/supabase'

export type Profil = Tables<'profiles'>

export interface AuthZustand {
  /** true, solange die gespeicherte Sitzung noch gelesen wird */
  laedt: boolean
  session: Session | null
  profil: Profil | null
  profilFehler: unknown
  /** true nach Klick auf den Link „Passwort zurücksetzen“ in der Mail */
  passwortWiederherstellung: boolean
  abmelden: () => Promise<void>
  profilNeuLaden: () => Promise<unknown>
}

export const AuthKontext = createContext<AuthZustand | null>(null)
