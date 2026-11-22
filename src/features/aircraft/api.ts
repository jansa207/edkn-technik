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
    'Luftfahrzeug gesperrt',
  )
}

export function useEntsperren() {
  return useAktion(
    async ({ id, grund }: { id: string; grund: string }) =>
      pruefe(await supabase.rpc('aircraft_entsperren', { p_aircraft_id: id, p_grund: grund })),
    'Sperre aufgehoben',
  )
}

export interface Beobachtung {
  report_id: string
  pilotenhinweis: string
  eingestuft_am: string | null
}

/** Kat-3-Punkte unter Beobachtung (Hinweis für Piloten, ohne Einfluss auf die Ampel) */
export function beobachtungenVon(flugzeug: Flugzeug): Beobachtung[] {
  return Array.isArray(flugzeug.beobachtungen)
    ? (flugzeug.beobachtungen as unknown as Beobachtung[])
    : []
}

export interface SperrZeile {
  typ: string
  text: string
  wer?: string | null
  wann?: string | null
}

/** Alle Gründe, warum ein Luftfahrzeug rot ist: Sperre, Kat 1, vorläufig */
export function sperrZeilen(f: Flugzeug): SperrZeile[] {
  const zeilen: SperrZeile[] = []
  if (f.gesperrt && f.sperrgrund) {
    zeilen.push({
      typ: 'Sperre',
      text: f.sperrgrund,
      wer: f.gesperrt_von_name,
      wann: f.gesperrt_am,
    })
  }
  for (const hinweis of hinweiseVon(f).filter((x) => x.kategorie === 1)) {
    zeilen.push({ typ: 'Kat 1', text: hinweis.pilotenhinweis, wann: hinweis.eingestuft_am })
  }
  if (f.vorlaeufig_gesperrt) {
    zeilen.push({
      typ: 'Vorläufig',
      text: 'Vorläufig nicht flugklar – Beanstandung wird von der Instandhaltung geprüft',
    })
  }
  return zeilen
}
