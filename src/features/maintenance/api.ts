import { useQuery } from '@tanstack/react-query'
import { supabase, type Tables, type Views } from '@/lib/supabase'
import { pruefe, useAktion } from '@/lib/useAktion'

export type Frist = Views<'deadline_list'>
export type FristEreignis = Views<'deadline_verlauf'>
export type Zaehlerstand = Tables<'aircraft_counters'>
export type AktuellerZaehler = Views<'aircraft_zaehler'>
export type Wartungsprogramm = Tables<'maintenance_templates'>
export type ProgrammSchritt = Tables<'maintenance_template_items'>

export type FristStand = 'ok' | 'bald' | 'ueberfaellig' | 'abgeschlossen'

export function fristStand(f: Pick<Frist, 'stand'>): FristStand {
  return (f.stand ?? 'ok') as FristStand
}

// ---------------------------------------------------------------------------
// Fristen
// ---------------------------------------------------------------------------

export function useFristen(aktiv = true) {
  return useQuery({
    queryKey: ['fristen'],
    enabled: aktiv,
    queryFn: async () =>
      pruefe(
        await supabase
          .from('deadline_list')
          .select('*')
          .order('kennzeichen')
          .order('faellig_am', { ascending: true, nullsFirst: false })
          .limit(1000),
      ),
  })
}

export function useFristVerlauf(id: string | undefined) {
  return useQuery({
    queryKey: ['fristen', 'verlauf', id],
    enabled: Boolean(id),
    queryFn: async () =>
      pruefe(
        await supabase
          .from('deadline_verlauf')
          .select('*')
          .eq('deadline_id', id!)
          .order('created_at', { ascending: false }),
      ),
  })
}

export interface FristDaten {
  aircraftId: string
  titel: string
  beschreibung: string
  faelligAm: string | null
  faelligBeiMinuten: number | null
  intervallMonate: number | null
  intervallMinuten: number | null
  vorlaufTage: number
  vorlaufMinuten: number
}

export function useFristSpeichern() {
  return useAktion(
    async ({ id, d }: { id: string | null; d: FristDaten }) =>
      pruefe(
        await supabase.rpc('deadline_save', {
          p_id: id ?? undefined,
          p_aircraft_id: d.aircraftId,
          p_titel: d.titel,
          p_beschreibung: d.beschreibung,
          p_faellig_am: d.faelligAm ?? undefined,
          p_faellig_bei_minuten: d.faelligBeiMinuten ?? undefined,
          p_intervall_monate: d.intervallMonate ?? undefined,
          p_intervall_minuten: d.intervallMinuten ?? undefined,
          p_vorlauf_tage: d.vorlaufTage,
          p_vorlauf_minuten: d.vorlaufMinuten,
        }),
      ),
    (_, v) => (v.id ? 'Frist gespeichert' : 'Frist angelegt'),
  )
}

export function useFristErledigen() {
  return useAktion(
    async (v: { id: string; am: string; beiMinuten: number | null; text: string }) =>
      pruefe(
        await supabase.rpc('deadline_erledigen', {
          p_id: v.id,
          p_am: v.am,
          p_bei_minuten: v.beiMinuten ?? undefined,
          p_text: v.text || undefined,
        }),
      ),
    'Durchführung eingetragen',
  )
}

export function useFristAbschliessen() {
  return useAktion(
    async (v: { id: string; text: string }) =>
      pruefe(await supabase.rpc('deadline_abschliessen', { p_id: v.id, p_text: v.text })),
    'Frist abgeschlossen',
  )
}

// ---------------------------------------------------------------------------
// Betriebsstunden
// ---------------------------------------------------------------------------

export function useAktuelleZaehler(aktiv = true) {
  return useQuery({
    queryKey: ['zaehler', 'aktuell'],
    enabled: aktiv,
    queryFn: async () => pruefe(await supabase.from('aircraft_zaehler').select('*')),
  })
}

export function useZaehlerVerlauf(aircraftId: string | undefined) {
  return useQuery({
    queryKey: ['zaehler', 'verlauf', aircraftId],
    enabled: Boolean(aircraftId),
    queryFn: async () =>
      pruefe(
        await supabase
          .from('aircraft_counters')
          .select('*')
          .eq('aircraft_id', aircraftId!)
          .order('stand_am', { ascending: false })
          .order('id', { ascending: false })
          .limit(50),
      ),
  })
}

export function useZaehlerErfassen() {
  return useAktion(
    async (v: {
      aircraftId: string
      standAm: string
      minuten: number
      landungen: number | null
      notiz: string
    }) =>
      pruefe(
        await supabase.rpc('aircraft_counter_add', {
          p_aircraft_id: v.aircraftId,
          p_stand_am: v.standAm,
          p_betriebsminuten: v.minuten,
          p_landungen: v.landungen ?? undefined,
          p_notiz: v.notiz || undefined,
        }),
      ),
    'Zählerstand erfasst',
  )
}

// ---------------------------------------------------------------------------
// Wartungsprogramme
// ---------------------------------------------------------------------------

export function useWartungsprogramme(aktiv = true) {
  return useQuery({
    queryKey: ['wartungsprogramme'],
    enabled: aktiv,
    queryFn: async () => {
      const programme = pruefe(
        await supabase.from('maintenance_templates').select('*').order('titel'),
      )
      const schritte = pruefe(
        await supabase.from('maintenance_template_items').select('*').order('position').order('id'),
      )
      return programme.map((p) => ({
        ...p,
        schritte: schritte.filter((s) => s.template_id === p.id),
      }))
    },
  })
}

export type ProgrammMitSchritten = Wartungsprogramm & { schritte: ProgrammSchritt[] }

export function useProgrammSpeichern() {
  return useAktion(
    async (v: {
      id: string | null
      titel: string
      beschreibung: string
      muster: string
      schritte: string[]
    }) =>
      pruefe(
        await supabase.rpc('template_save', {
          p_id: v.id ?? undefined,
          p_titel: v.titel,
          p_beschreibung: v.beschreibung,
          p_muster: v.muster || undefined,
          p_teilschritte: v.schritte,
        }),
      ),
    (_, v) => (v.id ? 'Wartungsprogramm gespeichert' : 'Wartungsprogramm angelegt'),
  )
}

export function useProgrammAktiv() {
  return useAktion(
    async (v: { id: string; aktiv: boolean }) =>
      pruefe(await supabase.rpc('template_set_aktiv', { p_id: v.id, p_aktiv: v.aktiv })),
    (_, v) => (v.aktiv ? 'Wartungsprogramm wieder aktiv' : 'Wartungsprogramm archiviert'),
  )
}

export function useWartungStarten() {
  return useAktion(
    async (v: {
      aircraftId: string
      templateId: string
      faelligAm: string | null
      zustaendigId: string | null
      sperren: boolean
    }) =>
      pruefe(
        await supabase.rpc('wartung_starten', {
          p_aircraft_id: v.aircraftId,
          p_template_id: v.templateId,
          p_faellig_am: v.faelligAm ?? undefined,
          p_zustaendig_id: v.zustaendigId ?? undefined,
          p_sperren: v.sperren,
        }),
      ),
    'Wartung begonnen – Aufgabe angelegt',
  )
}
