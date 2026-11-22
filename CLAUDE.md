# CLAUDE.md – EDKN Technik

Gemeinsame Regeln für alle Claude-Code-Sitzungen im Team. Ausführlich: `docs/handoff.md` (Auftrag), `docs/konzept.md` (Hintergrund), `docs/entscheidungen.md` (was gilt). Persönliches gehört in `CLAUDE.local.md` (gitignored), nicht hierher.

## Ziel

Vereins-Web-App (PWA) für den Flugplatz EDKN, nach dem Vorbild des Tech Log in der Airline:

- Piloten sehen vor dem Flug den technischen Stand jedes Luftfahrzeugs des Vereins (Ampel, offene Punkte, Verlauf). Der Verein betreibt Motor- und Segelflug, nichts segelflug-spezifisch bauen.
- Jeder freigegebene Nutzer meldet Beanstandungen mit Foto und Text.
- Warte stufen Beanstandungen ein, sperren Luftfahrzeuge und geben sie wieder frei. Dazu Fristen, Betriebsstunden, Wartungsprogramme und Archiv (Instandhaltung).

Das Tool ist **eigenständig** (nicht Teil des SMS-Portals) und **ersetzt nicht** Bordbuch, CAO-Software oder Prüfer-Freigaben. Nichts bauen, was danach aussieht.

## Begriffe (in der UI genau so)

UI-Texte im Tech-Log-Stil (seit v0.3). Code-Namen bleiben wie im Schema (`reports`, `Meldung`, `/werkstatt/…`), damit Migrationen und Typen stabil bleiben.

| Begriff (UI)             | Code                    | Bedeutung                                                                                        |
| ------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------ |
| Beanstandung             | `reports`, „Meldung“    | gemeldeter Mangel oder Symptom an einem Luftfahrzeug                                             |
| Luftfahrzeug             | `aircraft`, „Flugzeug“  | Segelflugzeug, Motorsegler, UL, Motorflugzeug (`flugzeug_art`)                                   |
| Instandhaltung           | `workshop`, „Werkstatt“ | Bereich der Warte (Modus in der App)                                                             |
| Flugbetrieb              |                         | normale Ansicht für alle (Modus in der App)                                                      |
| Wart                     | `wart`                  | darf Beanstandungen einstufen und Luftfahrzeuge sperren                                          |
| Melder                   |                         | Person, die eine Beanstandung erfasst hat                                                        |
| Kat 1                    |                         | nicht lufttüchtig, sofort beheben, Luftfahrzeug rot, solange offen                               |
| Kat 2                    |                         | zurückgestellt (Ziel z. B. „Winterarbeit 26/27“), fliegbar                                       |
| Kat 3                    |                         | kein Handlungsbedarf, wird abgelegt                                                              |
| unter Beobachtung        | `beobachten`            | Kat 3 mit Pilotenhinweis, bis ein Wart die Beobachtung beendet. Keine Ampel                      |
| Sperre                   |                         | manuelle Sperre am Luftfahrzeug, mit Pflicht-Grund. Internes Signal, keine Stilllegung           |
| vorläufig nicht flugklar |                         | Melder hält es für nicht flugklar → sofort rot, bis ein Wart einstuft                            |
| Pilotenhinweis           |                         | verständlicher Text des Warts (Kat 1 Sperrgrund, Kat 2 optional, Beobachtung), für alle sichtbar |
| Ampel                    |                         | `gruen` Klar · `gelb` Klar mit Hinweisen · `rot` Gesperrt                                        |
| Freigabe                 |                         | neues Konto (`ausstehend`) muss vom Admin freigegeben werden                                     |
| Aufgabe                  | `tasks`                 | interne To-do der Instandhaltung mit Frist, Zuständigem, Teilschritten. Keine Ampel              |
| Arbeitsstand             |                         | Kommentar an einer Aufgabe: was ist gemacht, was fehlt (Übergabe)                                |
| Maßnahme                 | `reports.massnahme`     | wie eine Beanstandung abgeschlossen wurde (Archiv), bei Kat 3 die Begründung                     |
| Frist                    | `deadlines`             | Kontrolle/Lebensdauer nach Datum und/oder Betriebsstunden, optional mit Intervall. Keine Ampel   |
| Betriebsstunden          | `aircraft_counters`     | Zählerstand in Minuten (`hhhh:mm` in der UI), manuell oder später aus Vereinsflieger             |
| Wartungsprogramm         | `maintenance_templates` | gespeicherte Checkliste; „Wartung beginnen“ legt daraus eine Aufgabe an, optional mit Sperre     |

Rollen: `pilot` (Standard) · `wart` · `admin`. Freigabe: `ausstehend` · `freigegeben` · `abgelehnt` · `deaktiviert`.
Meldungsstatus: `neu` → (Kat 1) `in_arbeit` → `erledigt` · (Kat 2) `zurueckgestellt` → `in_arbeit` → `erledigt` · (Kat 3) `abgelegt`.
Aufgabenstatus: `offen` → `in_arbeit` ⇄ `wartet` → `erledigt` / `verworfen` (wieder öffnen mit Begründung).

## Fachregeln

- **Ampel wird in der View `aircraft_overview` berechnet**, nie im Frontend. Rot: manuelle Sperre, offene Kat 1 oder nicht eingestufte Meldung mit „vorläufig nicht flugklar“. Gelb: offener Punkt mit sichtbarem Pilotenhinweis. Sonst grün.
- Kat 1: `pilotenhinweis` ist Pflicht und immer sichtbar (= Sperrgrund für Piloten). Erledigen erfordert die Bestätigung „Flugzeug ist wieder flugklar“ (Verlaufseintrag).
- Kat 2: Ziel Pflicht, Pilotenhinweis optional. Kat 3: Begründung Pflicht, wird Rückmeldung an den Melder.
- Erledigen einer Meldung braucht die durchgeführte Maßnahme (Rückmeldung an den Melder).
- Aufgaben: nur Warte/Admins sehen sie, kein Einfluss auf die Ampel. „Wartet“/„Verworfen“/„Wieder öffnen“ brauchen Text, „Erledigt“ nur ohne offene Teilschritte. Verlauf in `task_events`.
- Fristen, Betriebsstunden und Wartungsprogramme: nur Warte/Admins, kein Einfluss auf die Ampel, ersetzen weder Bordbuch noch CAMO. Fristen haben ihren Verlauf in `deadline_events`. Zählerstände steigen nur (RPC prüft).
- Warte dürfen umstufen (Verlaufseintrag). Melder können nach dem Absenden nur noch einen Nachtrag kommentieren.
- Piloten sehen Namen der Warte, aber nicht, wer fremde Meldungen abgegeben hat.
- Jede Erstellung, Einstufung, jeder Statuswechsel, jede Sperre/Entsperrung und jeder Kommentar erzeugt einen Eintrag in `report_events`, und zwar in RPCs bzw. Triggern, nicht im Frontend.
- Die Sichtbarkeit ist fachlich noch nicht final. Regeln **nur zentral** in RLS-Policies und Views, nie in der UI verstreuen.

## Sicherheitsregeln (nicht verhandelbar)

- RLS auf **allen** Tabellen. Hilfsfunktionen (`is_approved()`, `current_rolle()`, `is_wart()`, `is_admin()`) als `security definer`, `stable`, mit `search_path = ''`.
- Clients schreiben nur über RPCs (`report_create`, `report_einstufen`, `report_set_status`, `report_comment`, `aircraft_sperren`, `aircraft_entsperren`, `admin_update_user`, `task_create`, `task_update`, `task_set_status`, `task_comment`, `task_item_add`, `task_item_set`, `task_item_delete`, `report_beobachtung_beenden`, `aircraft_counter_add`, `deadline_save`, `deadline_erledigen`, `deadline_abschliessen`, `template_save`, `template_set_aktiv`, `wartung_starten`). Ausnahme wie bisher: Admin pflegt Luftfahrzeug-Stammdaten direkt (RLS). Neue Schreibwege ebenfalls als RPC, die den Verlauf schreibt. Neue Funktionen: `execute` für `public`/`anon` entziehen.
- Niemand ändert seine eigene `rolle` oder `freigabe`. Nur über die RPC `admin_update_user` (prüft `is_admin()`), direkter UPDATE wird blockiert.
- Ausstehende und abgelehnte Nutzer bekommen per RLS keine Daten, nicht nur in der UI.
- Service-Role-/Secret-Key nie ins Frontend und nie ins Repo. Keine `.env` committen, nur `.env.example`.
- Storage-Bucket `report-photos` privat, Anzeige über signierte URLs, Upload nur in den Pfad einer eigenen Meldung.
- Keine echten Vereins- oder Personendaten in Seed, Tests, Screenshots oder Doku.

## Stack

- React 19 + TypeScript 7 (strict) + Vite 8, React Router, TanStack Query, Tailwind CSS 4, `vite-plugin-pwa`
- Supabase (Auth, Postgres, Storage), lokal mit der Supabase-CLI (`npx supabase start`, braucht Docker)
- Tests: Vitest + Testing Library; RLS-Tests mit pgTAP (`supabase test db`)
- Lint: oxlint · Format: Prettier · Hosting: Cloudflare Workers mit statischen Assets (`wrangler.jsonc`, Preview pro Branch)
- Import-Alias `@/` → `src/`

## Befehle

```bash
npm run dev          # Entwicklungsserver
npm run typecheck    # tsc -b
npm run lint         # oxlint, Warnungen sind Fehler
npm run format       # Prettier schreibt
npm test             # Vitest einmal
npm run build        # Typecheck + Produktions-Build
npm run db:start     # lokale Supabase (Docker)
npm run db:reset     # Migrationen + Seed neu einspielen
npm run db:test      # pgTAP-Tests (RLS, Fachlogik)
npm run db:types     # src/lib/database.types.ts neu erzeugen
```

Testkonten lokal: `admin@test.local`, `wart@test.local`, `pilot@test.local`, `pilot2@test.local`, `neu@test.local` (ausstehend), `abgelehnt@test.local`, Passwort jeweils `edkn-test`.

Vor jedem Commit: `npm run typecheck && npm run lint && npm run format:check && npm test`, bei Datenbank-Änderungen zusätzlich `npm run db:reset && npm run db:lint && npm run db:test && npm run db:types`.

## Struktur

```
src/app/         Routing, Layout, Guards
src/features/    auth · admin · aircraft · reports · workshop · maintenance (je ein Bereich)
src/components/  UI-Bausteine (z. B. Ampel)
src/lib/         Supabase-Client, Bildkompression, Helfer
supabase/        migrations/ · seed.sql · tests/
docs/            konzept · handoff · entscheidungen
```

## UI

- Deutsch, mobile-first, große Touch-Flächen (mind. 48 px hoch am Handy, am Desktop dichter), hoher Kontrast (Sonne, Handschuhe).
- Design „Verwaltungssoftware“: Farben als Tokens in `src/index.css`, Bausteine in `src/components/` (`Panel`, `Badge`, `Button`, `Form`, `Dialog`). Kennzeichen, Nummern und Zeiten in Mono-Schrift, Zeiten absolut (`@/lib/format`).
- Schreibende Aktionen über `useAktion` (`@/lib/useAktion`): Toast + alle Daten neu laden.
- Ampel immer mit **Farbe + Symbol + Text** (Komponente `@/components/Ampel`).
- Footer-Hinweis bleibt: „Internes Meldetool des Vereins – ersetzt nicht Bordbuch oder Prüferfreigabe.“
- Fotos im Browser verkleinern (lange Kante ca. 1600 px, JPEG ca. 0,8), maximal 3 pro Beanstandung.
- Menü: Warte/Admins schalten zwischen „Flugbetrieb“ und „Instandhaltung“ um (`src/app/modus.ts`). Werkzeuge der Instandhaltung (Sperren, Wartung beginnen …) erscheinen nur im Modus Instandhaltung. Neue Menüpunkte in `src/app/navigation.ts`, Selten-Gebrauchtes unter „Verwaltung“.

## Team-Workflow

- `main` nur über PRs ändern (Branch-Schutz folgt, siehe `docs/entscheidungen.md`). Pro Issue ein Branch (`feat/…`, `fix/…`, `chore/…`, `docs/…`) → PR → 1 Review → Squash-Merge, nur bei grüner CI.
- Commits nach Conventional Commits, auf Deutsch: `feat: Meldeformular mit Fotos`.
- Datenbank **nur über Migrationen** in `supabase/migrations`. Bestehende Migrationen nie editieren, immer eine neue anlegen. Nach jedem Pull: `npx supabase db reset`. Nie Schema-Änderungen im Supabase-Dashboard.
- Typen nach Schema-Änderungen neu erzeugen (`supabase gen types`).
- Wer etwas Grundsätzliches ändert, aktualisiert `CLAUDE.md` bzw. `docs/entscheidungen.md` im selben PR.
- Keine Features außerhalb des Umfangs von `docs/handoff.md` ohne Rückfrage bei der Projektleitung. Offene Fragen als Issue mit Label `frage`.
