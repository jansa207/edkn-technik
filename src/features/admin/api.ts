import { useQuery } from '@tanstack/react-query'
import type { FlugzeugArt, Freigabe, Rolle } from '@/components/statusTexte'
import { supabase } from '@/lib/supabase'
import { pruefe, useAktion } from '@/lib/useAktion'

export function useNutzer(aktiv = true) {
  return useQuery({
    queryKey: ['nutzer'],
    enabled: aktiv,
    queryFn: async () =>
      pruefe(await supabase.from('profiles').select('*').order('created_at', { ascending: false })),
  })
}

export function useNutzerAendern() {
  return useAktion(
    async (v: { userId: string; freigabe: Freigabe; rolle: Rolle; text: string }) =>
      pruefe(
        await supabase.rpc('admin_update_user', {
          p_user_id: v.userId,
          p_freigabe: v.freigabe,
          p_rolle: v.rolle,
        }),
      ),
    (_, v) => v.text,
  )
}

export interface FlugzeugDaten {
  kennzeichen: string
  wettbewerbskennzeichen: string | null
  muster: string
  art: FlugzeugArt
  aktiv: boolean
}

export function useFlugzeugSpeichern() {
  return useAktion(
    async ({ id, daten }: { id: string | null; daten: FlugzeugDaten }) => {
      if (id) pruefe(await supabase.from('aircraft').update(daten).eq('id', id))
      else pruefe(await supabase.from('aircraft').insert(daten))
    },
    (_, v) => (v.id ? 'Luftfahrzeug gespeichert' : 'Luftfahrzeug angelegt'),
  )
}
