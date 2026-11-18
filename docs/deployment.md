# Handoff: App ins Internet bringen (Supabase Cloud + Cloudflare)

Auftrag für eine **lokale** Claude-Code-Sitzung auf dem Rechner der Projektleitung. Ziel: Die App läuft unter einer festen Internet-Adresse, an ein Supabase-Projekt in der Cloud angebunden, und ist am Handy installierbar. Erst einmal nur zum Testen, **ohne echte Vereinsdaten**.

Vorher lesen: `CLAUDE.md` (Regeln), `README.md` (Abschnitte „Erster Admin“ und „Hosting“).

## Ergebnis (Stand 18.11.2026)

Der Auftrag ist bis auf das Mergen von PR #4 durchgelaufen. Die Anleitung unten ist um das ergänzt, was dabei anders war als geplant.

- **Adressen:** Production `https://edkn-technik.edkn.workers.dev` (nach dem Merge von PR #4), Preview pro Branch `https://<branch>-edkn-technik.edkn.workers.dev`.
- **Supabase:** Projekt `edkn-technik` in Frankfurt (Free) angelegt, alle Migrationen ohne Seed eingespielt, Auth-URLs gesetzt, erster Admin angelegt. Wem die Konten gehören: `docs/entscheidungen.md`.
- **Erster Cloudflare-Fehler:** Der Befehl für Nicht-main-Branches war `npx wrangler versions upload`. In der neuen Preview-Umgebung von Cloudflare führte das zu einem Namenskonflikt. Nach der Umstellung auf `npx wrangler preview` fehlte der `previews`-Block in `wrangler.jsonc`. Gelöst mit PR [jansa207/edkn-technik#5](https://github.com/jansa207/edkn-technik/pull/5) (`"previews": {}`). Seitdem sind die Preview-Builds grün.
- **Rauchtest:** auf der Preview komplett bestanden (alle Punkte in Schritt 6).
- **Security Advisor:** keine Tabelle ohne RLS. Die übrigen Hinweise sind unten unter „Offen, vor echtem Vereinsbetrieb“ aufgeführt.

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

## Supabase-CLI gegen die Cloud

- **`--remote` statt `--linked`:** Ohne Flag arbeiten `db push`, `migration list`, `gen types` usw. gegen die **lokale** Datenbank. Nach `supabase link` mit `--remote` das verknüpfte Cloud-Projekt ansprechen, z. B. `npx supabase db push --remote --dry-run`, `npx supabase migration list --remote`, `npx supabase gen types typescript --remote`.
- **Security Advisor im Terminal:** `npx supabase db advisors --remote --type security`
- **SQL nur lesend:** `npx supabase db query --remote --read-only "<SQL>"`. Schreibendes SQL (z. B. den ersten Admin) tippt die Projektleitung im SQL Editor des Dashboards.
- **Windows:** In PowerShell blockiert die Ausführungsrichtlinie oft `npx.ps1`. Dann `npx.cmd supabase …` bzw. `npx.cmd wrangler …` schreiben.

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
npx supabase db push --remote --dry-run
```

Die Liste muss genau die Dateien aus `supabase/migrations/` zeigen, und zwar ohne Seed. Erst dann:

```bash
npx supabase db push --remote
```

Kontrolle:

```bash
npx supabase migration list --remote
```

Lokal und remote müssen übereinstimmen. Zusätzlich prüfen, ob das Schema remote dem Repo entspricht:

```bash
npx supabase gen types typescript --remote > /tmp/remote.types.ts && npx prettier --stdin-filepath src/lib/database.types.ts < /tmp/remote.types.ts | diff -u src/lib/database.types.ts - && echo "Schema identisch"
```

Kleine Unterschiede nur bei `__InternalSupabase` bzw. der PostgREST-Version sind okay. Fehlen Tabellen oder Funktionen, abbrechen und melden.

Dann im Dashboard unter **Advisors → Security Advisor** nachsehen (oder im Terminal `npx supabase db advisors --remote --type security`). Es darf keine Tabelle ohne RLS geben. Andere Warnungen notieren und melden, aber nicht im Dashboard „reparieren“.

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

   | Feld                               | Wert                   |
   | ---------------------------------- | ---------------------- |
   | Production branch                  | `main`                 |
   | Build command                      | `npm run build`        |
   | Deploy command                     | `npx wrangler deploy`  |
   | Builds for non-production branches | an                     |
   | Previews → Base: Preview command   | `npx wrangler preview` |
   | Root directory                     | `/`                    |

   **Nicht** `npx wrangler versions upload` als Befehl für Nicht-main-Branches verwenden (Namenskonflikt in der Preview-Umgebung, siehe „Ergebnis“). `npx wrangler preview` braucht `"previews": {}` in `wrangler.jsonc`, das ist seit PR #5 drin.

3. **Settings → Build → Variables and secrets**, als **Build-Variablen** für Production **und** Previews (nicht als Runtime-Variablen des Workers, denn Vite baut sie beim Build ein). Jede Preview-Umgebung hat eine eigene Kopie der Build-Einstellungen, also dort ebenfalls prüfen:

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

Für Preview-Builds zusätzlich prüfen, ob `wrangler.jsonc` den Block `"previews": {}` enthält.

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

Dann `README.md` → Abschnitt „Hosting“ aktualisieren: die Adresse, die tatsächlichen Cloudflare-Einstellungen und den Hinweis auf dieses Dokument. Außerdem in `docs/entscheidungen.md` festhalten, wem das Supabase-Projekt gehört. Beides als PR `docs/hosting`. (Erledigt am 18.11.2026, Ergebnis siehe oben.)

## Offen, vor echtem Vereinsbetrieb (nicht Teil dieses Auftrags)

- **Vereinskonto:** Supabase-Projekt und Cloudflare-Worker liegen vorerst in privaten Konten der Projektleitung. Umzug auf ein Vereinskonto, siehe `docs/entscheidungen.md`.
- **Security Advisor (Stand 18.11.2026)**, im Dashboard bewusst nicht „repariert“:
  - ERROR „Security Definer View“ für `aircraft_overview` und `profile_names`: **gewollt.** Beide Views laufen mit den Rechten des Owners und filtern selbst, damit Piloten keine fremden Melder sehen (Kommentar in `supabase/migrations/20261118120000_grundschema.sql`). Vor dem Betrieb noch einmal bewusst bestätigen.
  - WARN: 20 `security definer`-RPCs sind für `authenticated` ausführbar. Das ist die Architektur (Schreiben nur über RPCs, die selbst Rolle und Freigabe prüfen). Prüfen, ob jede davon wirklich `authenticated` braucht.
  - WARN „Leaked Password Protection“ ist aus. Laut Supabase vermutlich nur im Pro-Tarif verfügbar. Beim Tarif-Entscheid mitbedenken.

- **Eigener SMTP-Server:** Der eingebaute Mailversand von Supabase schafft nur wenige Mails pro Stunde und ist nur für Tests gedacht.
- **Pausieren:** Gratis-Projekte bei Supabase werden nach etwa einer Woche ohne Nutzung angehalten. Dafür einen bezahlten Plan oder eine Lösung einplanen.
- **Eigene Domain:** Die Adresse statt `workers.dev` ist noch offen, siehe `docs/handoff.md`, offene Fragen.
- **Datenschutz:** Vorher braucht es das Okay vom Vorstand. Erst dann kommen echte Namen und Flugzeuge hinein.
