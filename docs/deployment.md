# Handoff: App ins Internet bringen (Supabase Cloud + Cloudflare)

Auftrag für eine **lokale** Claude-Code-Sitzung auf dem Rechner der Projektleitung. Ziel: Die App läuft unter einer festen Internet-Adresse, an ein Supabase-Projekt in der Cloud angebunden, und ist am Handy installierbar. Erst einmal nur zum Testen, **ohne echte Vereinsdaten**.

Vorher lesen: `CLAUDE.md` (Regeln), `README.md` (Abschnitte „Erster Admin“ und „Hosting“).

## Ausgangslage (Stand 18.11.2026)

- Code: PR [jansa207/edkn-technik#4](https://github.com/jansa207/edkn-technik/pull/4), Branch `claude/quirky-heisenberg-9hs9dk` (App v0.2). Die GitHub-CI ist grün (App und Datenbank).
- **Cloudflare** (Workers mit statischen Assets, `wrangler.jsonc`) ist schon mit dem Repo verbunden. Der Workers-Build für PR #4 ist aber **nach 0 Sekunden fehlgeschlagen**. Der Code ist wohl nicht schuld: `npm run build` läuft auch ohne `VITE_*`-Variablen durch. Vermutlich liegt es an einer Einstellung in Cloudflare. Protokoll: Cloudflare-Dashboard → Workers & Pages → `edkn-technik` → Deployments/Builds.
- Ein **Supabase-Projekt in der Cloud gibt es noch nicht.** Bisher nur lokal (`npm run db:start`).
- Ohne `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` baut die App zwar, kann aber keine Daten laden.

## Regeln für diesen Auftrag

- **Keine Secrets ins Repo, in den Chat oder in Commits.** Das betrifft das Datenbank-Passwort, den Secret- bzw. Service-Role-Key und Zugangstoken. Ins Frontend und nach Cloudflare kommt **nur** der Publishable Key (`sb_publishable_…`).
- `.env.local` bleibt auf den lokalen Werten. Cloud-Werte gehören nicht in `.env.example`.
- **Kein Seed in die Cloud.** `supabase/seed.sql` enthält Testkonten mit bekanntem Passwort. Also nie `--include-seed` und nie `db reset --linked`.
- **Nicht `npx supabase config push`.** Das würde die lokalen Auth-Einstellungen aus `supabase/config.toml` übertragen, z. B. `site_url = http://localhost:5173`. Auth-Einstellungen nur im Dashboard ändern.
- **pgTAP-Tests nicht gegen die Cloud-Datenbank laufen lassen.** Sie legen Testdaten an.
- Schema-Änderungen nur über Migrationen, nie im Dashboard. Für diesen Auftrag sollte es keine geben.
- Schritte im Browser macht die Projektleitung, z. B. Konten anlegen, Dashboard-Einstellungen oder Keys kopieren. Claude sagt genau, wo sie klicken muss, und wartet. Kommandos im Terminal darf Claude selbst ausführen.
- Code-Änderungen, falls nötig, auf einem eigenen Branch (`fix/…`) mit PR, nicht direkt auf `main`. Den PR mergt die Projektleitung.
- Kosten: nur Gratis-Tarife. Vor allem, was Geld kostet, fragen.

## Schritte

### 1. Supabase-Projekt anlegen (Browser, Projektleitung)

1. Auf <https://supabase.com> ein Konto anlegen, laut Handoff besser ein Vereinskonto als ein privates. Dann **New project**:
   - Name: `edkn-technik`
   - Region: **Central EU (Frankfurt)**
   - Datenbank-Passwort: erzeugen lassen und **im Passwortmanager speichern**. Es wird gleich für `link` gebraucht.
2. Die **Project ID** notieren (Teil der URL `https://supabase.com/dashboard/project/<ID>`).

### 2. Schema einspielen (Terminal, Claude)

Im Repo-Ordner, auf dem Stand von PR #4:

```bash
git fetch origin claude/quirky-heisenberg-9hs9dk && git checkout claude/quirky-heisenberg-9hs9dk && git pull
```

```bash
npm ci
```

```bash
npx supabase login
```

(Öffnet den Browser, die Projektleitung bestätigt.)

```bash
npx supabase link --project-ref <PROJECT-ID>
```

(Fragt nach dem Datenbank-Passwort. Die Projektleitung tippt es selbst ein.)

```bash
npx supabase db push --dry-run
```

Die Liste muss genau die Dateien aus `supabase/migrations/` zeigen, und zwar ohne Seed. Erst dann:

```bash
npx supabase db push
```

Kontrolle:

```bash
npx supabase migration list --linked
```

Lokal und remote müssen übereinstimmen. Zusätzlich prüfen, ob das Schema remote dem Repo entspricht:

```bash
npx supabase gen types typescript --linked > /tmp/remote.types.ts && npx prettier --stdin-filepath src/lib/database.types.ts < /tmp/remote.types.ts | diff -u src/lib/database.types.ts - && echo "Schema identisch"
```

Kleine Unterschiede nur bei `__InternalSupabase` bzw. der PostgREST-Version sind okay. Fehlen Tabellen oder Funktionen, abbrechen und melden.

Dann im Dashboard unter **Advisors → Security Advisor** nachsehen. Es darf keine Tabelle ohne RLS geben. Andere Warnungen notieren und melden, aber nicht im Dashboard „reparieren“.

### 3. Auth einstellen (Browser, Projektleitung)

Erst nachdem die Adresse aus Schritt 4 bekannt ist, sonst vorläufig eintragen und später anpassen.

**Authentication → URL Configuration**

- Site URL: `https://edkn-technik.<SUBDOMAIN>.workers.dev`. Die genaue Adresse steht in Cloudflare beim Worker.
- Redirect URLs:
  - `https://edkn-technik.<SUBDOMAIN>.workers.dev/**`
  - `https://*-edkn-technik.<SUBDOMAIN>.workers.dev/**` (Preview-Links pro Branch)
  - `http://localhost:5173/**`

**Authentication → Sign In / Providers → Email:** „Confirm email“ muss **an** sein.

Passwort-Reset und Bestätigung leiten auf diese Adressen um. Ohne Eintrag schlagen die Links in den Mails fehl.

### 4. Cloudflare reparieren und anbinden (Browser, Projektleitung, Claude hilft)

1. Workers & Pages → `edkn-technik` → **Deployments/Builds**, den fehlgeschlagenen Build öffnen und das Protokoll an Claude geben. Claude ermittelt die Ursache.
2. **Settings → Build** prüfen (Sollwerte, siehe auch README):

   | Feld                                 | Wert                           |
   | ------------------------------------ | ------------------------------ |
   | Production branch                    | `main`                         |
   | Build command                        | `npm run build`                |
   | Deploy command                       | `npx wrangler deploy`          |
   | Non-production branch deploy command | `npx wrangler versions upload` |
   | Builds for non-production branches   | an                             |
   | Root directory                       | leer bzw. `/`                  |

3. **Settings → Build → Variables and secrets**, als **Build-Variablen** (nicht als Runtime-Variablen des Workers, denn Vite baut sie beim Build ein):

   | Name                            | Wert                                                         |
   | ------------------------------- | ------------------------------------------------------------ |
   | `NODE_VERSION`                  | `22`                                                         |
   | `VITE_SUPABASE_URL`             | `https://<PROJECT-ID>.supabase.co`                           |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → **Publishable key** |

   **Niemals** den Secret-Key oder `service_role` eintragen.

4. Den Build für den Branch neu starten (Retry), oder einen kleinen Commit pushen. Erst nach einem neuen Build sind die Variablen in der App.
5. Ist der Build grün, gibt Cloudflare einen **Preview-Link** aus. Wenn er im Browser lädt, kommt die Anmeldeseite ohne Konfigurationsfehler.

Bleibt der Build rot und lässt sich die Ursache nicht in den Einstellungen finden, die Fehlermeldung lokal nachstellen:

```bash
npm ci && npm run build && npx wrangler deploy --dry-run
```

### 5. Ersten Admin anlegen (Projektleitung, Claude führt)

1. Über den Preview-Link registrieren, mit echter Mailadresse der Projektleitung, und die Bestätigungs-Mail anklicken.
2. Im Supabase-Dashboard im **SQL Editor** (die Mailadresse trägt die Projektleitung selbst ein):

   ```sql
   update public.profiles
   set rolle = 'admin', freigabe = 'freigegeben', freigegeben_am = now()
   where email = '<MAIL>';
   ```

3. In der App neu laden. Jetzt sind „Nutzer“ und „Flugzeuge verwalten“ sichtbar.

### 6. Rauchtest (Projektleitung, Claude hakt ab)

Nur mit erfundenen Daten, z. B. Kennzeichen `D-9999`:

- [ ] Flugzeug anlegen: Es erscheint grün im Flottenstatus.
- [ ] Mangel melden mit Foto (am Handy mit der Kamera) und „vorläufig nicht flugklar“: Das Flugzeug wird rot.
- [ ] Im Meldungseingang einstufen (Kat 2 mit Pilotenhinweis): Das Flugzeug wird gelb.
- [ ] Aufgabe mit Frist und Teilschritten anlegen, Arbeitsstand kommentieren, Teilschritte abhaken und erledigen.
- [ ] Zweites Konto registrieren: Es landet auf „Freigabe ausstehend“ und sieht keine Daten. Dann als Admin freigeben.
- [ ] „Passwort vergessen“: Die Mail kommt an, und der Link führt zur App, nicht zu localhost.
- [ ] Am Handy installieren: iPhone in Safari über Teilen → „Zum Home-Bildschirm“, Android in Chrome über Menü → „App installieren“.

Danach die Testdaten im Admin-Bereich deaktivieren oder einfach drin lassen. Es ist ohnehin ein Testprojekt.

### 7. Veröffentlichen

Wenn Preview und Rauchtest passen, mergt die Projektleitung PR #4 (Squash). Cloudflare baut `main`, und die App liegt unter `https://edkn-technik.<SUBDOMAIN>.workers.dev`. Die Build-Variablen gelten für Production und Preview gleichermaßen. Kurz prüfen, ob das in Cloudflare so eingestellt ist.

## Abschluss

Claude meldet am Ende:

- die Production- und Preview-Adresse,
- die Ursache des ersten Cloudflare-Fehlers und wie er behoben wurde,
- welche Punkte des Rauchtests bestanden sind und was offen bleibt,
- Hinweise aus dem Security Advisor.

Dann `README.md` → Abschnitt „Hosting“ aktualisieren: die Adresse, die tatsächlichen Cloudflare-Einstellungen und den Hinweis auf dieses Dokument. Außerdem in `docs/entscheidungen.md` festhalten, wem das Supabase-Projekt gehört. Beides als PR `docs/hosting`.

## Offen, vor echtem Vereinsbetrieb (nicht Teil dieses Auftrags)

- **Eigener SMTP-Server:** Der eingebaute Mailversand von Supabase schafft nur wenige Mails pro Stunde und ist nur für Tests gedacht.
- **Pausieren:** Gratis-Projekte bei Supabase werden nach etwa einer Woche ohne Nutzung angehalten. Dafür einen bezahlten Plan oder eine Lösung einplanen.
- **Eigene Domain:** Die Adresse statt `workers.dev` ist noch offen, siehe `docs/handoff.md`, offene Fragen.
- **Datenschutz:** Vorher braucht es das Okay vom Vorstand. Erst dann kommen echte Namen und Flugzeuge hinein.
