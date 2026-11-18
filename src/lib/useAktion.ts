import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/useToast'
import { fehlerText } from './fehler'

/**
 * Schreibende Aktion (RPC) mit Erfolgsmeldung. Danach werden alle Daten neu geladen:
 * Eine Einstufung ändert z. B. Ampel, Verlauf, Inbox und Zähler gleichzeitig.
 * Bei Vereinsgröße ist das billig und verhindert veraltete Anzeigen.
 */
export function useAktion<TVars, TErgebnis = unknown>(
  fn: (vars: TVars) => Promise<TErgebnis>,
  erfolg?: string | ((ergebnis: TErgebnis, vars: TVars) => string | null),
) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: fn,
    onSuccess: async (ergebnis, vars) => {
      await queryClient.invalidateQueries()
      const text = typeof erfolg === 'function' ? erfolg(ergebnis, vars) : erfolg
      if (text) toast(text)
    },
    onError: (fehler) => toast(fehlerText(fehler), 'fehler'),
  })
}

/** Supabase-Antwort auspacken: Fehler werfen, sonst Daten zurückgeben (Listen, RPCs) */
export function pruefe<T>(antwort: { data: T; error: unknown }): Exclude<T, null> {
  if (antwort.error) throw antwort.error
  return antwort.data as Exclude<T, null>
}

/** Wie pruefe, aber für maybeSingle(): null heißt „nicht gefunden“ */
export function pruefeOptional<T>(antwort: { data: T; error: unknown }): T {
  if (antwort.error) throw antwort.error
  return antwort.data
}
