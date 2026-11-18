import { useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { FehlerBox } from '@/components/Feedback'
import { Eingabe, Feld } from '@/components/Form'
import { DatenFeld, DatenFelder, Panel, PanelKopf, SeitenKopf } from '@/components/Panel'
import { ROLLE_TEXT } from '@/components/statusTexte'
import { useToast } from '@/components/useToast'
import { datum } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useAuth, useProfil } from './useAuth'

export function ProfilPage() {
  const profil = useProfil()
  const { abmelden } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [vorname, setVorname] = useState(profil.vorname)
  const [nachname, setNachname] = useState(profil.nachname)
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState<unknown>(null)
  const [laedt, setLaedt] = useState<'name' | 'passwort' | null>(null)

  async function nameSpeichern(e: FormEvent) {
    e.preventDefault()
    setFehler(null)
    setLaedt('name')
    const { error } = await supabase
      .from('profiles')
      .update({ vorname: vorname.trim(), nachname: nachname.trim() })
      .eq('id', profil.id)
    setLaedt(null)
    if (error) return setFehler(error)
    await queryClient.invalidateQueries()
    toast('Name gespeichert')
  }

  async function passwortSpeichern(e: FormEvent) {
    e.preventDefault()
    setFehler(null)
    if (passwort.length < 8)
      return setFehler(new Error('Das Passwort muss mindestens 8 Zeichen lang sein.'))
    setLaedt('passwort')
    const { error } = await supabase.auth.updateUser({ password: passwort })
    setLaedt(null)
    if (error) return setFehler(error)
    setPasswort('')
    toast('Passwort geändert')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 lg:space-y-6">
      <SeitenKopf titel="Mein Profil" />
      <Panel>
        <PanelKopf titel="Konto" />
        <div className="p-4">
          <DatenFelder>
            <DatenFeld label="E-Mail">{profil.email}</DatenFeld>
            <DatenFeld label="Rolle">
              <Badge ton="blau" punkt={false}>
                {ROLLE_TEXT[profil.rolle]}
              </Badge>
            </DatenFeld>
            <DatenFeld label="Registriert" mono>
              {datum(profil.created_at)}
            </DatenFeld>
            <DatenFeld label="Freigegeben" mono>
              {profil.freigegeben_am ? datum(profil.freigegeben_am) : '–'}
            </DatenFeld>
          </DatenFelder>
          <p className="text-text-3 mt-3 text-xs">Rolle und Freigabe ändert nur ein Admin.</p>
        </div>
      </Panel>

      {fehler != null && <FehlerBox fehler={fehler} />}

      <Panel>
        <PanelKopf titel="Name" />
        <form onSubmit={nameSpeichern} className="space-y-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Feld label="Vorname">
              {(p) => (
                <Eingabe
                  {...p}
                  autoComplete="given-name"
                  maxLength={100}
                  value={vorname}
                  onChange={(e) => setVorname(e.target.value)}
                />
              )}
            </Feld>
            <Feld label="Nachname">
              {(p) => (
                <Eingabe
                  {...p}
                  autoComplete="family-name"
                  maxLength={100}
                  value={nachname}
                  onChange={(e) => setNachname(e.target.value)}
                />
              )}
            </Feld>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              art="primaer"
              laedt={laedt === 'name'}
              disabled={vorname === profil.vorname && nachname === profil.nachname}
            >
              Name speichern
            </Button>
          </div>
        </form>
      </Panel>

      <Panel>
        <PanelKopf titel="Passwort ändern" />
        <form onSubmit={passwortSpeichern} className="space-y-4 p-4">
          <Feld label="Neues Passwort" hinweis="Mindestens 8 Zeichen">
            {(p) => (
              <Eingabe
                {...p}
                type="password"
                autoComplete="new-password"
                value={passwort}
                onChange={(e) => setPasswort(e.target.value)}
              />
            )}
          </Feld>
          <div className="flex justify-end">
            <Button type="submit" art="primaer" laedt={laedt === 'passwort'} disabled={!passwort}>
              Passwort ändern
            </Button>
          </div>
        </form>
      </Panel>

      <Button
        groesse="gross"
        className="w-full sm:w-auto"
        icon={<LogOut aria-hidden="true" className="size-4" />}
        onClick={() => void abmelden()}
      >
        Abmelden
      </Button>
    </div>
  )
}
