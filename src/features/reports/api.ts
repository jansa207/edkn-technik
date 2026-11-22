import { useQuery } from '@tanstack/react-query'
import { verkleinereFoto } from '@/lib/bild'
import { FOTO_BUCKET, supabase, type Views } from '@/lib/supabase'
import { pruefe, pruefeOptional, useAktion } from '@/lib/useAktion'

export type Meldung = Views<'report_list'>

export function useMeineMeldungen(userId: string) {
  return useQuery({
    queryKey: ['meldungen', 'meine', userId],
    queryFn: async () =>
      pruefe(
        await supabase
          .from('report_list')
          .select('*')
          .eq('melder_id', userId)
          .order('created_at', { ascending: false }),
      ),
  })
}

export function useMeldung(id: string | undefined) {
  return useQuery({
    queryKey: ['meldungen', 'eine', id],
    enabled: Boolean(id),
    queryFn: async () =>
      pruefeOptional(await supabase.from('report_list').select('*').eq('id', id!).maybeSingle()),
  })
}

/** Verlauf einer Meldung (älteste zuerst). Interne Einträge sieht per RLS nur die Werkstatt. */
export function useMeldungVerlauf(reportId: string | undefined) {
  return useQuery({
    queryKey: ['verlauf', 'meldung', reportId],
    enabled: Boolean(reportId),
    queryFn: async () =>
      pruefe(
        await supabase
          .from('aircraft_verlauf')
          .select('*')
          .eq('report_id', reportId!)
          .order('created_at', { ascending: true }),
      ),
  })
}

/** Fotos über signierte URLs (Bucket ist privat) */
export function useMeldungFotos(reportId: string | undefined, anzahl: number | null | undefined) {
  return useQuery({
    queryKey: ['fotos', reportId],
    enabled: Boolean(reportId) && (anzahl ?? 0) > 0,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const fotos = pruefe(
        await supabase
          .from('report_photos')
          .select('id, storage_path')
          .eq('report_id', reportId!)
          .order('created_at'),
      )
      if (fotos.length === 0) return []
      const urls = pruefe(
        await supabase.storage.from(FOTO_BUCKET).createSignedUrls(
          fotos.map((f) => f.storage_path),
          60 * 60,
        ),
      )
      return fotos.map((f, i) => ({ id: f.id, url: urls[i]?.signedUrl ?? null }))
    },
  })
}

export interface NeueMeldung {
  aircraftId: string
  text: string
  vorlaeufigNichtFlugklar: boolean
  fotos: File[]
}

export interface MeldungErgebnis {
  id: string
  nr: number | null
  fotoFehler: number
}

/** Meldung anlegen, danach Fotos verkleinern und hochladen */
export async function meldungAnlegen(
  neu: NeueMeldung,
  fortschritt?: (schritt: string) => void,
): Promise<MeldungErgebnis> {
  fortschritt?.('Beanstandung wird gespeichert …')
  const id = pruefe(
    await supabase.rpc('report_create', {
      p_aircraft_id: neu.aircraftId,
      p_text: neu.text,
      p_vorlaeufig_nicht_flugklar: neu.vorlaeufigNichtFlugklar,
    }),
  )

  let fotoFehler = 0
  for (const [i, datei] of neu.fotos.entries()) {
    fortschritt?.(`Foto ${i + 1} von ${neu.fotos.length} wird hochgeladen …`)
    try {
      const blob = await verkleinereFoto(datei)
      const pfad = `${id}/${i + 1}-${crypto.randomUUID()}.jpg`
      pruefe(
        await supabase.storage
          .from(FOTO_BUCKET)
          .upload(pfad, blob, { contentType: 'image/jpeg', upsert: false }),
      )
      pruefe(await supabase.from('report_photos').insert({ report_id: id, storage_path: pfad }))
    } catch {
      fotoFehler++
    }
  }

  const zeile = await supabase.from('reports').select('nr').eq('id', id).maybeSingle()
  return { id, nr: zeile.data?.nr ?? null, fotoFehler }
}

export function useKommentieren() {
  return useAktion(
    async ({ reportId, text, intern }: { reportId: string; text: string; intern: boolean }) =>
      pruefe(
        await supabase.rpc('report_comment', {
          p_report_id: reportId,
          p_text: text,
          p_intern: intern,
        }),
      ),
    'Kommentar gespeichert',
  )
}
