import { useQuery } from '@tanstack/react-query'
import type { AufgabeStatus, Prioritaet } from '@/components/statusTexte'
import { aufgabenNr } from '@/lib/format'
import { supabase, type Tables, type Views } from '@/lib/supabase'
import { pruefe, pruefeOptional, useAktion } from '@/lib/useAktion'

export type Aufgabe = Views<'task_list'>
export type Teilschritt = Tables<'task_items'>
export type AufgabenEreignis = Views<'task_verlauf'>

// ---------------------------------------------------------------------------
// Meldungen in der Werkstatt
// ---------------------------------------------------------------------------

export function useWerkstattMeldungen(aktiv = true) {
  return useQuery({
    queryKey: ['meldungen', 'werkstatt'],
    enabled: aktiv,
    queryFn: async () =>
      pruefe(
        await supabase
          .from('report_list')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
      ),
  })
}

export interface Einstufung {
  reportId: string
  kategorie: 1 | 2 | 3
  ziel?: string
  pilotenhinweis?: string
  pilotenhinweisSichtbar?: boolean
  begruendung?: string
  beobachten?: boolean
}

export function useEinstufen() {
  return useAktion(
    async (e: Einstufung) =>
      pruefe(
        await supabase.rpc('report_einstufen', {
          p_report_id: e.reportId,
          p_kategorie: e.kategorie,
          p_ziel: e.ziel,
          p_pilotenhinweis: e.pilotenhinweis,
          p_pilotenhinweis_sichtbar: e.pilotenhinweisSichtbar ?? false,
          p_begruendung: e.begruendung,
          p_beobachten: e.beobachten ?? false,
        }),
      ),
    (_, e) =>
      e.beobachten ? 'Als Kat 3 unter Beobachtung eingestuft' : `Als Kat ${e.kategorie} eingestuft`,
  )
}

export function useBeobachtungBeenden() {
  return useAktion(
    async (v: { reportId: string; text: string }) =>
      pruefe(
        await supabase.rpc('report_beobachtung_beenden', {
          p_report_id: v.reportId,
          p_text: v.text,
        }),
      ),
    'Beobachtung beendet',
  )
}

export function useMeldungStatus() {
  return useAktion(
    async (v: {
      reportId: string
      status: 'in_arbeit' | 'erledigt'
      massnahme?: string
      flugklar?: boolean
    }) =>
      pruefe(
        await supabase.rpc('report_set_status', {
          p_report_id: v.reportId,
          p_status: v.status,
          p_rueckmeldung: v.massnahme,
          p_flugklar_bestaetigt: v.flugklar ?? false,
        }),
      ),
    (_, v) => (v.status === 'erledigt' ? 'Beanstandung erledigt' : 'Beanstandung ist in Arbeit'),
  )
}

// ---------------------------------------------------------------------------
// Aufgaben
// ---------------------------------------------------------------------------

export function useAufgaben(aktiv = true) {
  return useQuery({
    queryKey: ['aufgaben'],
    enabled: aktiv,
    queryFn: async () =>
      pruefe(
        await supabase
          .from('task_list')
          .select('*')
          .order('faellig_am', { ascending: true, nullsFirst: false })
          .order('nr', { ascending: true })
          .limit(1000),
      ),
  })
}

export function useAufgabe(id: string | undefined) {
  return useQuery({
    queryKey: ['aufgaben', 'eine', id],
    enabled: Boolean(id),
    queryFn: async () =>
      pruefeOptional(await supabase.from('task_list').select('*').eq('id', id!).maybeSingle()),
  })
}

export function useTeilschritte(taskId: string | undefined) {
  return useQuery({
    queryKey: ['aufgaben', 'schritte', taskId],
    enabled: Boolean(taskId),
    queryFn: async () =>
      pruefe(
        await supabase
          .from('task_items')
          .select('*')
          .eq('task_id', taskId!)
          .order('position')
          .order('created_at'),
      ),
  })
}

export function useAufgabenVerlauf(taskId: string | undefined) {
  return useQuery({
    queryKey: ['aufgaben', 'verlauf', taskId],
    enabled: Boolean(taskId),
    queryFn: async () =>
      pruefe(
        await supabase
          .from('task_verlauf')
          .select('*')
          .eq('task_id', taskId!)
          .order('created_at', { ascending: true }),
      ),
  })
}

/** Warte und Admins für „Zuständig“ */
export function useWarte() {
  return useQuery({
    queryKey: ['warte'],
    staleTime: 10 * 60_000,
    queryFn: async () =>
      pruefe(
        await supabase
          .from('profile_names')
          .select('id, vorname, nachname, rolle')
          .in('rolle', ['wart', 'admin'])
          .order('vorname'),
      ),
  })
}

export interface AufgabenDaten {
  titel: string
  beschreibung: string
  aircraftId: string | null
  prioritaet: Prioritaet
  faelligAm: string | null
  zustaendigId: string | null
}

export function useAufgabeAnlegen() {
  return useAktion(
    async (v: AufgabenDaten & { reportId?: string | null; teilschritte: string[] }) => {
      const id = pruefe(
        await supabase.rpc('task_create', {
          p_titel: v.titel,
          p_beschreibung: v.beschreibung,
          p_aircraft_id: v.aircraftId ?? undefined,
          p_report_id: v.reportId ?? undefined,
          p_prioritaet: v.prioritaet,
          p_faellig_am: v.faelligAm ?? undefined,
          p_zustaendig_id: v.zustaendigId ?? undefined,
          p_teilschritte: v.teilschritte,
        }),
      )
      const zeile = await supabase.from('tasks').select('nr').eq('id', id).maybeSingle()
      return { id, nr: zeile.data?.nr ?? null }
    },
    (e) => `Aufgabe ${aufgabenNr(e.nr)} angelegt`,
  )
}

export function useAufgabeBearbeiten() {
  return useAktion(
    async (v: AufgabenDaten & { taskId: string }) =>
      pruefe(
        await supabase.rpc('task_update', {
          p_task_id: v.taskId,
          p_titel: v.titel,
          p_beschreibung: v.beschreibung,
          // null = „kein Flugzeug“ bzw. „keine Frist“, die RPC erwartet die Werte immer
          p_aircraft_id: v.aircraftId as string,
          p_prioritaet: v.prioritaet,
          p_faellig_am: v.faelligAm as string,
          p_zustaendig_id: v.zustaendigId as string,
        }),
      ),
    'Aufgabe gespeichert',
  )
}

export function useAufgabeStatus() {
  return useAktion(
    async (v: { taskId: string; status: AufgabeStatus; text?: string }) =>
      pruefe(
        await supabase.rpc('task_set_status', {
          p_task_id: v.taskId,
          p_status: v.status,
          p_text: v.text,
        }),
      ),
    (_, v) =>
      ({
        offen: 'Aufgabe wieder geöffnet',
        in_arbeit: 'Aufgabe ist in Arbeit',
        wartet: 'Aufgabe wartet',
        erledigt: 'Aufgabe erledigt',
        verworfen: 'Aufgabe verworfen',
      })[v.status],
  )
}

export function useAufgabeKommentieren() {
  return useAktion(async (v: { taskId: string; text: string }) =>
    pruefe(await supabase.rpc('task_comment', { p_task_id: v.taskId, p_text: v.text })),
  )
}

export function useTeilschrittAnlegen() {
  return useAktion(async (v: { taskId: string; text: string }) =>
    pruefe(await supabase.rpc('task_item_add', { p_task_id: v.taskId, p_text: v.text })),
  )
}

export function useTeilschrittSetzen() {
  return useAktion(async (v: { itemId: string; erledigt: boolean }) =>
    pruefe(await supabase.rpc('task_item_set', { p_item_id: v.itemId, p_erledigt: v.erledigt })),
  )
}

export function useTeilschrittLoeschen() {
  return useAktion(
    async (v: { itemId: string }) =>
      pruefe(await supabase.rpc('task_item_delete', { p_item_id: v.itemId })),
    'Teilschritt entfernt',
  )
}

export const OFFENE_AUFGABE: AufgabeStatus[] = ['offen', 'in_arbeit', 'wartet']

export function istOffen(a: { status: AufgabeStatus }) {
  return OFFENE_AUFGABE.includes(a.status)
}
