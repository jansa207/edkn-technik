# CLAUDE.md – EDKN Technik

Gemeinsame Regeln für alle Claude-Code-Sitzungen im Team. Ausführlich: `docs/handoff.md` (Auftrag), `docs/konzept.md` (Hintergrund), `docs/entscheidungen.md` (was gilt). Persönliches gehört in `CLAUDE.local.md` (gitignored), nicht hierher.

## Ziel

Vereins-Web-App (PWA) für den Flugplatz EDKN, nach dem Vorbild des Tech Log in der Airline:

- Piloten sehen vor dem Flug den technischen Stand jedes Vereinsflugzeugs (Ampel, Hinweise, Verlauf).
- Jeder freigegebene Nutzer meldet Mängel mit Foto und Text.
- Warte stufen Meldungen ein, sperren Flugzeuge und geben sie wieder frei.

Das Tool ist **eigenständig** (nicht Teil des SMS-Portals) und **ersetzt nicht** Bordbuch, CAO-Software oder Prüfer-Freigaben. Nichts bauen, was danach aussieht.

## Begriffe (in Code und UI genau so)

| Begriff                  | Bedeutung                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Wart                     | darf Meldungen einstufen und Flugzeuge sperren                                     |
| Melder                   | Person, die eine Meldung erstellt hat                                              |
| Kat 1                    | sofort reparieren, Flugzeug rot, solange offen                                     |
| Kat 2                    | später erledigen (Ziel z. B. „Winterarbeit 26/27“), fliegbar                       |
| Kat 3                    | keine Maßnahme, Meldung wird abgelegt                                              |
| Sperre                   | manuelle Sperre am Flugzeug, mit Pflicht-Grund. Internes Signal, keine Stilllegung |
| vorläufig nicht flugklar | Melder hält es für nicht flugklar → sofort rot, bis ein Wart einstuft              |
| Pilotenhinweis           | verständlicher Text des Warts zu einem Kat-2-Punkt, für alle Piloten sichtbar      |
| Ampel                    | `gruen` Klar · `gelb` Klar mit Hinweisen · `rot` Gesperrt                          |
| Freigabe                 | neues Konto (`ausstehend`) muss vom Admin freigegeben werden                       |

Rollen: `pilot` (Standard) · `wart` · `admin`. Freigabe: `ausstehend` · `freigegeben` · `abgelehnt`.
Meldungsstatus: `neu` → (Kat 1) `in_arbeit` → `erledigt` · (Kat 2) `zurueckgestellt` → `in_arbeit` → `erledigt` · (Kat 3) `abgelegt`.

## Fachregeln

- **Ampel wird in der View `aircraft_overview` berechnet**, nie im Frontend. Rot: manuelle Sperre, offene Kat 1 oder nicht eingestufte Meldung mit „vorläufig nicht flugklar“. Gelb: offener Punkt mit sichtbarem Pilotenhinweis. Sonst grün.
- Kat 1 erledigen erfordert die Bestätigung „Flugzeug ist wieder flugklar“ (Verlaufseintrag).
- Warte dürfen umstufen (Verlaufseintrag). Melder können nach dem Absenden nur noch einen Nachtrag kommentieren.
- Piloten sehen Namen der Warte, aber nicht, wer fremde Meldungen abgegeben hat.
- Jede Erstellung, Einstufung, jeder Statuswechsel, jede Sperre/Entsperrung und jeder Kommentar erzeugt einen Eintrag in `report_events`, und zwar in RPCs bzw. Triggern, nicht im Frontend.
- Die Sichtbarkeit ist fachlich noch nicht final. Regeln **nur zentral** in RLS-Policies und Views, nie in der UI verstreuen.

## Sicherheitsregeln (nicht verhandelbar)

- RLS auf **allen** Tabellen. Hilfsfunktionen (`is_approved()`, `current_role()`, `is_admin()`) als `security definer`, `stable`, mit festem `search_path`.
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
```

Vor jedem Commit: `npm run typecheck && npm run lint && npm run format:check && npm test`.

## Struktur

```
src/app/         Routing, Layout, Guards
src/features/    auth · admin · aircraft · reports · workshop (je ein Bereich)
src/components/  UI-Bausteine (z. B. Ampel)
src/lib/         Supabase-Client, Bildkompression, Helfer
supabase/        migrations/ · seed.sql · tests/
docs/            konzept · handoff · entscheidungen
```

## UI

- Deutsch, mobile-first, große Touch-Flächen (mind. 48 px hoch), hoher Kontrast (Sonne, Handschuhe).
- Ampel immer mit **Farbe + Symbol + Text** (Komponente `@/components/Ampel`).
- Footer-Hinweis bleibt: „Internes Meldetool des Vereins – ersetzt nicht Bordbuch oder Prüferfreigabe.“
- Fotos im Browser verkleinern (lange Kante ca. 1600 px, JPEG ca. 0,8), maximal 3 pro Meldung.

## Team-Workflow

- `main` nur über PRs ändern (Branch-Schutz folgt, siehe `docs/entscheidungen.md`). Pro Issue ein Branch (`feat/…`, `fix/…`, `chore/…`, `docs/…`) → PR → 1 Review → Squash-Merge, nur bei grüner CI.
- Commits nach Conventional Commits, auf Deutsch: `feat: Meldeformular mit Fotos`.
- Datenbank **nur über Migrationen** in `supabase/migrations`. Bestehende Migrationen nie editieren, immer eine neue anlegen. Nach jedem Pull: `npx supabase db reset`. Nie Schema-Änderungen im Supabase-Dashboard.
- Typen nach Schema-Änderungen neu erzeugen (`supabase gen types`).
- Wer etwas Grundsätzliches ändert, aktualisiert `CLAUDE.md` bzw. `docs/entscheidungen.md` im selben PR.
- Keine Features außerhalb des Umfangs von `docs/handoff.md` ohne Rückfrage bei der Projektleitung. Offene Fragen als Issue mit Label `frage`.
