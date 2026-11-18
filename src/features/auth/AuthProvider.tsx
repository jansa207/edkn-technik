import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthKontext, type AuthZustand } from './authKontext'

// Die gesamte Auth-Logik ist hier gekapselt, damit später der Login über
// Vereinsflieger dazukommen kann, ohne die übrige App anzufassen.
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLaedt, setSessionLaedt] = useState(true)
  const [passwortWiederherstellung, setPasswortWiederherstellung] = useState(false)

  useEffect(() => {
    let aktiv = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (aktiv) setSession(data.session)
      })
      .finally(() => {
        if (aktiv) setSessionLaedt(false)
      })

    const { data } = supabase.auth.onAuthStateChange((ereignis, neueSession) => {
      setSession(neueSession)
      setSessionLaedt(false)
      if (ereignis === 'PASSWORD_RECOVERY') setPasswortWiederherstellung(true)
      if (ereignis === 'USER_UPDATED') setPasswortWiederherstellung(false)
      if (ereignis === 'SIGNED_OUT') queryClient.clear()
    })
    return () => {
      aktiv = false
      data.subscription.unsubscribe()
    }
  }, [queryClient])

  const userId = session?.user.id
  const profilQuery = useQuery({
    queryKey: ['profil', userId],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).single()
      if (error) throw error
      return data
    },
  })

  const abmelden = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const wert = useMemo<AuthZustand>(
    () => ({
      laedt: sessionLaedt || (Boolean(userId) && profilQuery.isPending),
      session,
      profil: profilQuery.data ?? null,
      profilFehler: profilQuery.error,
      passwortWiederherstellung,
      abmelden,
      profilNeuLaden: profilQuery.refetch,
    }),
    [
      sessionLaedt,
      userId,
      profilQuery.isPending,
      profilQuery.data,
      profilQuery.error,
      profilQuery.refetch,
      session,
      passwortWiederherstellung,
      abmelden,
    ],
  )

  return <AuthKontext value={wert}>{children}</AuthKontext>
}
