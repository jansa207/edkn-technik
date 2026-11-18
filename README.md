# EDKN Technik

Vereins-Web-App für den technischen Zustand der Vereinsflugzeuge am Flugplatz EDKN: Ampel vor dem Flug, Mängel mit Foto melden, Werkstatt-Inbox für die Warte. Installierbar als App auf dem Handy (PWA).

> Internes Meldetool des Vereins – ersetzt nicht Bordbuch oder Prüferfreigabe.

**Stand:** Prototyp v0.1 im Aufbau, nur mit Testdaten. Auftrag und Schritte: [`docs/handoff.md`](docs/handoff.md) · Hintergrund: [`docs/konzept.md`](docs/konzept.md) · Entscheidungen: [`docs/entscheidungen.md`](docs/entscheidungen.md) · Regeln für Claude Code: [`CLAUDE.md`](CLAUDE.md)

## Setup in 5 Minuten

Voraussetzungen: [Node.js 22](https://nodejs.org/) oder neuer, Git und ab Schritt 2 [Docker Desktop](https://www.docker.com/products/docker-desktop/) (für die lokale Supabase).

```bash
git clone https://github.com/jansa207/edkn-technik.git
cd edkn-technik
npm ci
cp .env.example .env.local
npm run dev
```

Dann <http://localhost:5173> öffnen. Am Handy im selben WLAN geht es mit `npm run dev -- --host` und der angezeigten Netzwerk-Adresse.

### Lokale Datenbank (ab Schritt 2)

Die Anleitung für `supabase start`, Testkonten und den ersten Admin kommt mit Schritt 2 hierher.

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
3. PR öffnen. Die CI prüft Typecheck, Lint, Format, Tests und Build. Cloudflare Pages baut einen Preview-Link, den man am Handy testen kann.
4. Ein anderes Teammitglied reviewt, dann Squash-Merge.

Details stehen in [`CLAUDE.md`](CLAUDE.md) unter „Team-Workflow“.

## Hosting (Cloudflare Pages)

Einstellungen beim Verbinden des Repos in Cloudflare Pages:

| Feld                   | Wert                  |
| ---------------------- | --------------------- |
| Framework preset       | `Vite` (oder „None“)  |
| Build command          | `npm run build`       |
| Build output directory | `dist`                |
| Production branch      | `main`                |
| Umgebungsvariable      | `NODE_VERSION` = `22` |

Ab Schritt 3 kommen `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` des Supabase-Dev-Projekts (Region EU/Frankfurt) als Umgebungsvariablen dazu. Niemals den Secret-/Service-Role-Key dort eintragen.

`public/_headers` setzt Sicherheits-Header und `noindex`, damit Suchmaschinen die App nicht aufnehmen.

## Vor dem echten Betrieb

- Der eingebaute Mailversand von Supabase ist **nur für Tests** gedacht. Vorher einen eigenen SMTP-Server einrichten.
- Gratis-Projekte bei Supabase pausieren nach längerer Inaktivität (z. B. im Winter). Einen kleinen bezahlten Plan einplanen.
- Datenschutz und Okay vom Vorstand, bevor echte Daten hineinkommen.
