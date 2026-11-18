# EDKN Technik

Vereins-Web-App für den technischen Zustand der Vereinsflugzeuge am Flugplatz EDKN: Ampel vor dem Flug, Mängel mit Foto melden, Werkstatt-Inbox für die Warte. Installierbar als App auf dem Handy (PWA).

> Internes Meldetool des Vereins – ersetzt nicht Bordbuch oder Prüferfreigabe.

**Stand:** Prototyp v0.1 im Aufbau, nur mit Testdaten. Auftrag und Schritte: [`docs/handoff.md`](docs/handoff.md) · Hintergrund: [`docs/konzept.md`](docs/konzept.md) · Entscheidungen: [`docs/entscheidungen.md`](docs/entscheidungen.md) · Regeln für Claude Code: [`CLAUDE.md`](CLAUDE.md)

## Setup in 5 Minuten

Voraussetzungen: [Node.js 22](https://nodejs.org/) oder neuer, Git und [Docker Desktop](https://www.docker.com/products/docker-desktop/) (für die lokale Supabase, unter Windows mit WSL 2).

```bash
git clone https://github.com/jansa207/edkn-technik.git
cd edkn-technik
npm ci
cp .env.example .env.local
npm run dev
```

Dann <http://localhost:5173> öffnen. Am Handy im selben WLAN geht es mit `npm run dev -- --host` und der angezeigten Netzwerk-Adresse.

### Lokale Datenbank

Docker Desktop muss laufen. Die Supabase-CLI ist schon als Entwickler-Paket installiert (`npx supabase …`).

```bash
npm run db:start
```

Das startet Postgres, Auth, Storage, Studio und Mailpit, spielt alle Migrationen ein und lädt die Testdaten aus `supabase/seed.sql`. Die Werte in `.env.example` passen dazu, `cp .env.example .env.local` reicht.

| Was                          | Adresse                  |
| ---------------------------- | ------------------------ |
| API                          | <http://127.0.0.1:54321> |
| Studio (Datenbank ansehen)   | <http://127.0.0.1:54323> |
| Mailpit (Bestätigungs-Mails) | <http://127.0.0.1:54324> |

Weitere Befehle:

| Befehl             | Was es tut                                                      |
| ------------------ | --------------------------------------------------------------- |
| `npm run db:reset` | Datenbank neu aufsetzen (nach jedem Pull mit neuen Migrationen) |
| `npm run db:test`  | RLS- und Fachlogik-Tests (pgTAP)                                |
| `npm run db:lint`  | PL/pgSQL-Funktionen prüfen                                      |
| `npm run db:types` | TypeScript-Typen nach `src/lib/database.types.ts` erzeugen      |
| `npm run db:stop`  | Container stoppen                                               |

Neue Schema-Änderung: `npx supabase migration new <name>`, SQL schreiben, `npm run db:reset`, `npm run db:test`, `npm run db:types`. Bestehende Migrationen nie ändern.

### Testkonten (nur lokal)

Alle haben das Passwort **`edkn-test`**.

| E-Mail                 | Rolle | Freigabe    |
| ---------------------- | ----- | ----------- |
| `admin@test.local`     | admin | freigegeben |
| `wart@test.local`      | wart  | freigegeben |
| `pilot@test.local`     | pilot | freigegeben |
| `pilot2@test.local`    | pilot | freigegeben |
| `neu@test.local`       | pilot | ausstehend  |
| `abgelehnt@test.local` | pilot | abgelehnt   |

Die Testdaten zeigen jede Ampelfarbe: D-9001 grün, D-9002 gelb (mit 1 Meldung in Prüfung), D-9003 rot (Kat 1), D-KDEM rot (vorläufig nicht flugklar), D-MDEM rot (manuelle Sperre).

### Erster Admin (Supabase in der Cloud)

Im echten Projekt gibt es keine Testkonten. Der erste Admin registriert sich normal in der App, bestätigt die Mail und wird dann einmalig im SQL-Editor des Supabase-Dashboards freigeschaltet:

```sql
update public.profiles
set rolle = 'admin', freigabe = 'freigegeben', freigegeben_am = now()
where email = 'deine@mail.de';
```

Alle weiteren Nutzer gibt der Admin danach in der App frei.

## Befehle

| Befehl                            | Was es tut                                   |
| --------------------------------- | -------------------------------------------- |
| `npm run dev`                     | Entwicklungsserver                           |
| `npm run build`                   | Typecheck und Produktions-Build nach `dist/` |
| `npm run preview`                 | Build lokal ansehen (inkl. Service Worker)   |
| `npm run typecheck`               | TypeScript prüfen                            |
| `npm run lint`                    | oxlint (Warnungen zählen als Fehler)         |
| `npm run format` / `format:check` | Prettier schreiben / prüfen                  |
| `npm test`                        | Vitest-Tests einmal ausführen                |

## Mitarbeiten

1. Issue nehmen oder anlegen, Branch `feat/…`, `fix/…` oder `chore/…` erstellen.
2. Änderungen committen (Conventional Commits auf Deutsch, z. B. `feat: Meldeformular mit Fotos`).
3. PR öffnen. Die CI prüft Typecheck, Lint, Format, Tests und Build. Cloudflare baut einen Preview-Link, den man am Handy testen kann.
4. Ein anderes Teammitglied reviewt, dann Squash-Merge.

Details stehen in [`CLAUDE.md`](CLAUDE.md) unter „Team-Workflow“.

## Hosting (Cloudflare Workers)

Die App läuft als Cloudflare Worker mit statischen Assets. Die Konfiguration steht in [`wrangler.jsonc`](wrangler.jsonc): Cloudflare liefert `dist/` aus, unbekannte Pfade bekommen `index.html` (Single-Page-App). `public/_headers` setzt Sicherheits-Header und `noindex`, damit Suchmaschinen die App nicht aufnehmen.

Einstellungen in Cloudflare unter Workers & Pages → `edkn-technik` → Settings → Build:

| Feld                               | Wert                                |
| ---------------------------------- | ----------------------------------- |
| Git-Repository                     | `edkn-technik`                      |
| Production branch                  | `main`                              |
| Build command                      | `npm run build`                     |
| Deploy command                     | `npx wrangler deploy`               |
| Builds for non-production branches | aktiviert (Preview-Link pro Branch) |
| Umgebungsvariable (Build)          | `NODE_VERSION` = `22`               |

Ab Schritt 3 kommen `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` des Supabase-Dev-Projekts (Region EU/Frankfurt) als **Build-Variablen** dazu (Vite baut sie ins Frontend ein). Niemals den Secret-/Service-Role-Key dort eintragen.

## Vor dem echten Betrieb

- Der eingebaute Mailversand von Supabase ist **nur für Tests** gedacht. Vorher einen eigenen SMTP-Server einrichten.
- Gratis-Projekte bei Supabase pausieren nach längerer Inaktivität (z. B. im Winter). Einen kleinen bezahlten Plan einplanen.
- Datenschutz und Okay vom Vorstand, bevor echte Daten hineinkommen.
