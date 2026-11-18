import { useQuery } from '@tanstack/react-query'
import { supabase, type Views } from '@/lib/supabase'
import { pruefe, pruefeOptional, useAktion } from '@/lib/useAktion'

export type Flugzeug = Views<'aircraft_overview'>
export type VerlaufEintrag = Views<'aircraft_verlauf'>

export interface PilotenHinweis {
  report_id: string
  kategorie: number
  status: string
  pilotenhinweis: string
  ziel: string | null
  eingestuft_am: string | null
}

export function hinweiseVon(flugzeug: Flugzeug): PilotenHinweis[] {
  return Array.isArray(flugzeug.hinweise) ? (flugzeug.hinweise as unknown as PilotenHinweis[]) : []
}

export function useFlotte() {
  return useQuery({
    queryKey: ['flotte'],
    queryFn: async () =>
      pruefe(await supabase.from('aircraft_overview').select('*').order('kennzeichen')),
  })
}

export function useFlugzeug(id: string | undefined) {
  return useQuery({
    queryKey: ['flotte', id],
    enabled: Boolean(id),
    queryFn: async () =>
      pruefeOptional(
        await supabase.from('aircraft_overview').select('*').eq('id', id!).maybeSingle(),
      ),
  })
}

export function useVerlauf(aircraftId: string | undefined) {
  return useQuery({
    queryKey: ['verlauf', aircraftId],
    enabled: Boolean(aircraftId),
    queryFn: async () =>
      pruefe(
        await supabase
          .from('aircraft_verlauf')
          .select('*')
          .eq('aircraft_id', aircraftId!)
          .order('created_at', { ascending: false })
          .limit(100),
      ),
  })
}

export function useSperren() {
  return useAktion(
    async ({ id, grund }: { id: string; grund: string }) =>
      pruefe(await supabase.rpc('aircraft_sperren', { p_aircraft_id: id, p_grund: grund })),
    'Flugzeug gesperrt',
  )
}

export function useEntsperren() {
  return useAktion(
    async ({ id, grund }: { id: string; grund: string }) =>
      pruefe(await supabase.rpc('aircraft_entsperren', { p_aircraft_id: id, p_grund: grund })),
    'Sperre aufgehoben',
  )
}
