// Fehlermeldungen für Menschen. Die RPCs liefern bereits deutsche Texte
// (raise exception '…'), technische Fehler werden übersetzt.

interface MitMeldung {
  message?: unknown
  code?: unknown
}

export function fehlerText(fehler: unknown): string {
  if (!fehler) return 'Unbekannter Fehler'
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Keine Verbindung. Bitte später noch einmal versuchen.'
  }
  const f = fehler as MitMeldung
  const text = typeof f.message === 'string' ? f.message : String(fehler)
  const code = typeof f.code === 'string' ? f.code : ''

  if (/failed to fetch|networkerror|load failed/i.test(text)) {
    return 'Server nicht erreichbar. Bitte Verbindung prüfen.'
  }
  if (/invalid login credentials/i.test(text)) return 'E-Mail oder Passwort ist falsch.'
  if (/email not confirmed/i.test(text)) {
    return 'Bitte bestätige zuerst deine E-Mail-Adresse (Link in der Mail).'
  }
  if (/user already registered/i.test(text)) return 'Mit dieser E-Mail gibt es schon ein Konto.'
  if (/password should be at least/i.test(text)) {
    return 'Das Passwort muss mindestens 8 Zeichen lang sein.'
  }
  if (/rate limit|too many requests/i.test(text)) {
    return 'Zu viele Versuche. Bitte kurz warten und erneut versuchen.'
  }
  if (code === '42501' && /permission denied|row-level security/i.test(text)) {
    return 'Dafür fehlt dir die Berechtigung.'
  }
  return text
}
