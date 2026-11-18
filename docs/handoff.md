# Handoff an Claude Code: EDKN Technik – Prototyp v0.1

> **Für Claude Code:** Lies diese Datei komplett, bevor du etwas anlegst. Hintergrund und Begründungen stehen in `docs/konzept.md`.
> **Stand:** 18.11.2026 · **Team:** Projektleitung (Admin) + 1–2 Vereinskameraden, alle arbeiten mit Claude Code · Spätere Entscheidungen: `docs/entscheidungen.md`

---

## 1. Worum es geht

**EDKN Technik** ist eine Web-App (PWA) für den Luftsportverein Wipperfürth (Flugplatz EDKN). Sie macht drei Dinge:

- **Piloten** sehen vor dem Flug in Sekunden den technischen Stand jedes Vereinsflugzeugs: eine Ampel, offene Hinweise, den Verlauf.
- **Jeder** kann einen Mangel mit Foto und kurzem Text melden.
- **Die Werkstatt (Warte)** stuft Meldungen ein, sperrt Flugzeuge und gibt sie wieder frei. Nichts geht mehr verloren.

Vorbild ist der Tech Log in der Airline. Das Tool ist **eigenständig** (nicht Teil des SMS-Portals des Vereins) und **ersetzt nicht** Bordbuch, CAO-Software oder Prüfer-Freigaben.

### Begriffe (in Code und UI genau so verwenden)

| Begriff | Bedeutung |
|---|---|
| **Wart** | Werkstattverantwortlicher, darf Meldungen einstufen und Flugzeuge sperren |
| **Melder** | die Person, die eine Meldung erstellt hat |
| **Kat 1** | sofort reparieren, Flugzeug wird gesperrt |
| **Kat 2** | später erledigen (Schlechtwettertag, spätestens Winterarbeit), Flugzeug bleibt fliegbar |
| **Kat 3** | keine Maßnahme nötig, Meldung wird abgelegt |
| **Sperre** | Flugzeug ist nicht flugklar. Das ist ein internes Signal, keine offizielle Stilllegung |
| **vorläufig nicht flugklar** | Der Melder hält das Flugzeug für nicht flugklar. Es wird sofort rot, bis ein Wart entscheidet |
| **Pilotenhinweis** | kurzer, verständlicher Text des Warts zu einem Kat-2-Punkt, den alle Piloten sehen |
| **Ampel** | 🟢 klar · 🟡 klar mit Hinweisen · 🔴 gesperrt |
| **Freigabe** | Ein neues Nutzerkonto muss vom Admin freigegeben werden, bevor es etwas sieht |

---

## 2. Ziel des Prototyps v0.1

Ein echter, funktionierender Prototyp, den die Projektleitung dem Werkstattleiter und ein paar Piloten **am Handy** zeigen kann. Er läuft **nur mit Testdaten**, nicht mit echten Vereinsdaten.

### Im Umfang
- **A. Login und Freigabe:** Registrieren mit E-Mail und Passwort, Freigabe durch den Admin, Rollen (Abschnitt 3)
- **B. Flugzeuge:** Liste mit Ampel, Detailseite, Verwaltung durch den Admin
- **C. Melden:** Formular mit bis zu 3 Fotos, Text, Schalter „vorläufig nicht flugklar“, Seite „Meine Meldungen“
- **D. Werkstatt-Inbox:** Einstufen (Kat 1/2/3), Sperren und Entsperren mit Grund, Pilotenhinweis, Kommentare (intern oder für den Melder), Status bis „erledigt“
- **E. Verlauf:** Jede Änderung wird protokolliert und am Flugzeug angezeigt
- **F. PWA:** installierbar auf Android und iPhone

### Nicht im Umfang (später, aber mitdenken)
- Login über Vereinsflieger: Lege `profiles.vf_uid` schon an und kapsle die Auth-Logik, damit der Login später dazukommen kann
- Werkstatt-Fristen (Stunden, Starts, Datum)
- Offline-Warteschlange, Push, E-Mail an die Warte, QR-Codes, Export
- Echte Vereins- und Personendaten

---

## 3. Login mit Freigabe (die wichtigste Regel)

### Ablauf
1. **Registrierung:** Vorname, Nachname, E-Mail, Passwort über Supabase Auth, mit E-Mail-Bestätigung.
2. Ein **Trigger** auf `auth.users` legt einen Eintrag in `profiles` an, mit `freigabe = 'ausstehend'` und `rolle = 'pilot'`.
3. **Ausstehende** Nutzer sehen nur die Seite „Dein Konto wartet auf Freigabe“. Sie haben keinen Zugriff auf Daten, und zwar **per RLS**, nicht nur in der UI.
4. **Admin** sieht unter „Nutzer“ die offenen Anfragen, mit einem Zähler-Badge im Menü. Er kann freigeben oder ablehnen und die Rolle setzen (pilot / wart / admin). Später kann er ein Konto auch wieder deaktivieren.
5. **Freigegebene** Nutzer haben normalen Zugriff je nach Rolle. **Abgelehnte** sehen eine Hinweisseite und haben keinen Zugriff.
6. **Passwort vergessen:** über den normalen Supabase-Reset-Flow.

### Erster Admin
Im README steht, wie die Projektleitung ihr Konto nach der ersten Registrierung per SQL zum Admin macht. Im Seed gibt es zusätzlich Testkonten.

### Sicherheitsregeln (nicht verhandelbar)
- **RLS ist auf allen Tabellen aktiv**, ohne Ausnahme. Dafür gibt es Hilfsfunktionen wie `public.is_approved()`, `public.current_role()` und `public.is_admin()` als `security definer`, `stable`, mit festem `search_path`.
- **Niemand kann seine eigene `rolle` oder `freigabe` ändern.** Diese Felder ändern sich nur über eine RPC `admin_update_user(user_id, freigabe, rolle)` (security definer, prüft `is_admin()`). Ein direkter UPDATE auf diese Spalten wird blockiert, per Trigger oder Policy.
- Der **Service-Role-Key** kommt nie ins Frontend und nie ins Repo.
- **Storage:** Der Bucket `report-photos` ist privat, Fotos werden über signierte URLs angezeigt. Uploads gehen nur in einen Pfad, der zu einer eigenen Meldung gehört.
- Der eingebaute Mailversand von Supabase ist **nur für Tests**. Im README steht der Hinweis, dass vor dem echten Betrieb ein eigener SMTP nötig ist.

---

## 4. Rollen und Sichtbarkeit

| Was | ausstehend / abgelehnt | pilot | wart | admin |
|---|:-:|:-:|:-:|:-:|
| Flugzeugliste mit Ampel und Sperrgrund | – | ✓ | ✓ | ✓ |
| Freigegebene Pilotenhinweise | – | ✓ | ✓ | ✓ |
| Anzahl der Meldungen „in Prüfung“ pro Flugzeug | – | ✓ | ✓ | ✓ |
| Eigene Meldungen inkl. Fotos und Rückmeldungen | – | ✓ | ✓ | ✓ |
| Melden | – | ✓ | ✓ | ✓ |
| Alle Meldungen, Fotos, interne Kommentare | – | – | ✓ | ✓ |
| Einstufen, Sperren/Entsperren, Pilotenhinweis | – | – | ✓ | ✓ |
| Flugzeuge anlegen und bearbeiten | – | – | – | ✓ |
| Nutzer freigeben, Rollen setzen | – | – | – | ✓ |

⚠️ **Die Sichtbarkeit ist fachlich noch nicht final entschieden.** Der Werkstattleiter will, dass nur Warte und Melder Meldungen sehen. Die Projektleitung will mehr Transparenz. Der Prototyp setzt den Mittelweg aus der Tabelle um. Baue die Regeln **zentral** (RLS und Views), damit sie sich an einer Stelle ändern lassen, statt sie in der UI zu verstreuen.

---

## 5. Fachlogik

### Status einer Meldung

```
neu ──(Wart stuft ein)──┬─ Kat 1 → in_arbeit (Flugzeug gesperrt) → erledigt
                        ├─ Kat 2 → zurueckgestellt (mit Ziel) → in_arbeit → erledigt
                        └─ Kat 3 → abgelegt
```

- Der Melder kann `vorlaeufig_nicht_flugklar = true` setzen. Dann wird das Flugzeug **sofort rot**, bis ein Wart einstuft.
- Bei „erledigt“ oder „abgelegt“ bekommt der Melder die Rückmeldung (Kommentar mit `intern = false`) in „Meine Meldungen“ angezeigt.

### Ampel (berechnet in der View `aircraft_overview`, nicht im Frontend)
- 🔴 **rot**, wenn mindestens eins davon zutrifft:
  - eine manuelle Sperre ist aktiv
  - eine Kat-1-Meldung ist nicht erledigt
  - eine Meldung mit `vorlaeufig_nicht_flugklar` ist noch nicht eingestuft
- 🟡 **gelb**, sonst, wenn mindestens ein offener Punkt einen sichtbaren Pilotenhinweis hat
- 🟢 **grün**, sonst

Die View liefert außerdem den Sperrgrund (bzw. „vorläufig gesperrt durch Melder“) und die Anzahl der Meldungen „in Prüfung“ (Status `neu`).

### Sperren und Entsperren
Nur Warte und Admins dürfen sperren, ein **Grund ist Pflicht**. Gespeichert wird das am Flugzeug (`gesperrt`, `sperrgrund`, `gesperrt_von`, `gesperrt_am`), zusätzlich gibt es einen Eintrag im Verlauf.

### Verlauf
Jede Erstellung, Einstufung, jeder Statuswechsel, jede Sperre, Entsperrung und jeder Kommentar erzeugt einen Eintrag in `report_events`. Am besten passiert das in den RPCs bzw. per Trigger, damit es nicht vergessen werden kann. Piloten sehen im Verlauf nur nicht-interne Einträge zu freigegebenen Hinweisen, zu Sperren und zu eigenen Meldungen.

---

## 6. Datenmodell (Startpunkt, Verbesserungen erwünscht)

```
enum rolle:          pilot | wart | admin
enum freigabe:       ausstehend | freigegeben | abgelehnt
enum flugzeug_art:   segler | motorsegler | ul | schlepp
enum meldung_status: neu | zurueckgestellt | in_arbeit | erledigt | abgelegt
enum event_typ:      erstellt | kommentar | statuswechsel | kategorie | sperre | entsperrt

profiles        id (pk, = auth.users.id), vorname, nachname, email, rolle, freigabe,
                freigegeben_von, freigegeben_am, vf_uid (int, nullable, unique), created_at
aircraft        id, kennzeichen (unique), wettbewerbskennzeichen, muster, art,
                gesperrt (bool), sperrgrund, gesperrt_von, gesperrt_am, aktiv (bool), created_at
reports         id, aircraft_id, melder_id, text, kategorie (1|2|3, nullable), status,
                vorlaeufig_nicht_flugklar (bool), ziel (text), pilotenhinweis (text),
                pilotenhinweis_sichtbar (bool), eingestuft_von, eingestuft_am, erledigt_am, created_at
report_photos   id, report_id, storage_path, created_at
report_events   id, report_id (nullable), aircraft_id, user_id, typ, text, intern (bool), created_at

view aircraft_overview   ampel, sperrgrund, anzahl_in_pruefung, hinweise[] je Flugzeug
```

---

## 7. Tech-Stack und Konventionen

- **Frontend:** React + TypeScript (strict) + Vite, React Router, TanStack Query, Tailwind CSS, `vite-plugin-pwa`
- **Backend:** Supabase (Auth, Postgres, Storage), später Edge Functions
- **Lokal:** Supabase CLI (`supabase start`, braucht Docker)
  - Das Schema ändert sich **nur über Migrationen** in `supabase/migrations`.
  - Testdaten kommen aus `supabase/seed.sql`.
  - TS-Typen mit `supabase gen types` erzeugen.
- **Versionen:** aktuelle stabile Versionen verwenden und vor dem Installieren prüfen.
- **Tests:**
  - Vitest für Logik und Komponenten
  - **RLS-Tests** als Datenbank-Tests (`supabase test db` / pgTAP). Mindestens:
    - ausstehende und abgelehnte Nutzer sehen nichts
    - ein Pilot sieht keine fremden Rohmeldungen und keine internen Kommentare
    - ein Pilot kann seine eigene Rolle und Freigabe nicht ändern
    - ein Wart kann sperren, ein Pilot nicht
- **Fotos:** im Browser verkleinern, bevor sie hochgeladen werden (lange Kante ca. 1600 px, JPEG ca. 0,8). Maximal 3 Fotos pro Meldung.
- **UI:**
  - Deutsch, mobile-first
  - große Touch-Flächen und hoher Kontrast (Sonne und Handschuhe am Flugplatz)
  - die Ampel immer mit **Farbe + Symbol + Text**, nie nur mit Farbe
- **Footer-Hinweis:** „Internes Meldetool des Vereins – ersetzt nicht Bordbuch oder Prüferfreigabe.“
- **Hosting** (nach dem lokalen Prototyp): Cloudflare Pages mit Preview je PR, angebunden an ein Supabase-Dev-Projekt in der Region EU (Frankfurt)

### Ordnerstruktur (Vorschlag)

```
edkn-technik/
├─ CLAUDE.md                 gemeinsame Regeln für alle Claude-Code-Sitzungen
├─ CLAUDE.local.md           persönlich, gitignored
├─ README.md                 Setup in 5 Minuten, erster Admin, Testkonten
├─ .env.example
├─ docs/
│  ├─ konzept.md
│  ├─ handoff.md             (diese Datei)
│  └─ entscheidungen.md      kurze Einträge: Datum, Entscheidung, Grund
├─ src/
│  ├─ app/                   Routing, Layout, Guards (freigegeben? Rolle?)
│  ├─ features/
│  │  ├─ auth/               Login, Registrierung, Warte-Seite (gekapselt für späteren VF-Login)
│  │  ├─ admin/              Nutzerfreigabe, Flugzeugverwaltung
│  │  ├─ aircraft/           Liste, Detail, Ampel
│  │  ├─ reports/            Melden, Meine Meldungen
│  │  └─ workshop/           Inbox, Einstufen, Sperren
│  ├─ components/            UI-Bausteine
│  └─ lib/                   supabase-Client, Bildkompression, Helfer
├─ supabase/
│  ├─ migrations/
│  ├─ seed.sql
│  └─ tests/                 RLS-Tests
└─ .github/workflows/ci.yml
```

---

## 8. Zusammenarbeit (2–3 Leute, alle mit Claude Code)

- **Repo:** privat auf GitHub, die Mitstreiter sind Collaborators. `main` ist geschützt, es gibt keinen direkten Push.
- **Branch pro Issue:** `feat/…`, `fix/…`, `chore/…`. Dann ein PR, **1 Review** durch einen anderen und ein Squash-Merge.
- **Commits** nach Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:` …), kurz und auf Deutsch oder Englisch, aber einheitlich.
- **Aufteilung nach Bereichen**, damit es wenig Konflikte gibt:
  - Person 1: Auth/Admin
  - Person 2: Flugzeuge/Melden
  - Person 3: Werkstatt
  - Die Datenbank-Basis (Schritt 2) macht **eine** Person zuerst.
- **Migrationen:**
  - Jede Änderung ist eine neue Migrationsdatei, bestehende werden nie nachträglich editiert.
  - Wenn sich zwei Migrationen in die Quere kommen, wird neu nummeriert.
  - Nach jedem Pull: `supabase db reset` lokal.
- **CI** auf jedem PR: install → typecheck → lint → test → build. Gemergt wird nur, wenn alles grün ist.
- **`CLAUDE.md`** enthält die Regeln aus diesem Handoff in Kurzform. Wer etwas Grundsätzliches ändert, aktualisiert die `CLAUDE.md` im selben PR.
- **Offene Fragen** werden zu GitHub Issues mit dem Label `frage`. Entscheidungen kommen in `docs/entscheidungen.md`.

---

## 9. So gehst du vor

Arbeite **in Schritten**. Vor jedem Schritt machst du einen kurzen Plan. Nach jedem Schritt committest und pushst du, fasst zusammen, was entstanden ist, und die Projektleitung prüft den PR. Ihr Okay heißt „weiter mit dem nächsten Schritt“.

1. **Grundgerüst**
   - Vite + React + TS (strict), Tailwind, Router, TanStack Query, ESLint/Prettier, Vitest
   - `vite-plugin-pwa` (Manifest „EDKN Technik“, Platzhalter-Icons)
   - Ordnerstruktur, README, `.env.example`, `.gitignore` (inkl. `CLAUDE.local.md`)
   - **`CLAUDE.md`** (Ziel, Begriffe, Stack, Sicherheitsregeln, Team-Workflow – kompakt aus diesem Handoff)
   - `docs/konzept.md`, `docs/handoff.md`, `docs/entscheidungen.md`, CI-Workflow
   - → **Stopp**, die Projektleitung prüft
2. **Datenbank**
   - Supabase CLI init
   - erste Migration: Enums, Tabellen, View `aircraft_overview`, Trigger (Profil anlegen, Rollen-/Freigabe-Schutz, Verlauf), Hilfsfunktionen, RPCs, **RLS-Policies**, Storage-Bucket mit Policies
   - `seed.sql`: 5 Fantasie-Flugzeuge (gemischt Segler/Motorsegler/UL) und Testkonten (`pilot@test.local`, `wart@test.local`, `admin@test.local`, `neu@test.local` mit Status ausstehend)
   - **RLS-Tests**
   - → **Stopp**, die Projektleitung prüft
3. **Auth und Freigabe:** Registrieren, Login, Logout, Passwort-Reset, Warte-Seite, Admin-Nutzerliste mit Freigabe und Rolle, Route-Guards
4. **Flugzeuge:** Liste mit Ampel, Detailseite (Status, Hinweise, „in Prüfung“, Verlauf), Admin-Verwaltung
5. **Melden:** Formular mit Fotos (Kamera am Handy), „vorläufig nicht flugklar“, „Meine Meldungen“ mit Rückmeldungen
6. **Werkstatt:** Inbox (neu zuerst), Einstufen, Ziel, Pilotenhinweis, Sperren/Entsperren, Kommentare (intern oder für den Melder), Status bis erledigt
7. **Feinschliff und Demo:**
   - Installation auf Android und iPhone testen
   - Demo-Durchlauf anhand der Abnahmekriterien
   - Issues für Phase 2 anlegen (Fristen, Vereinsflieger-Login, E-Mail an Warte, Offline, QR, Hosting)

---

## 10. Abnahmekriterien Prototyp v0.1

- [ ] Ein neuer Nutzer kann sich registrieren und sieht danach nur „wartet auf Freigabe“.
- [ ] Der Admin gibt ihn frei und setzt eine Rolle. Erst dann sieht der Nutzer Daten.
- [ ] Ausstehende und abgelehnte Nutzer bekommen **auch direkt über die API** keine Daten (RLS-Test).
- [ ] Ein Pilot kann seine eigene Rolle und Freigabe nicht ändern (RLS-Test).
- [ ] Ein Pilot meldet am Handy in unter 1 Minute einen Mangel mit Foto.
- [ ] „Vorläufig nicht flugklar“ macht das Flugzeug sofort rot, für alle sichtbar.
- [ ] Ein Wart sieht die neue Meldung in der Inbox, stuft sie ein und sperrt oder entsperrt mit Grund.
- [ ] Ein Kat-2-Punkt mit sichtbarem Pilotenhinweis macht das Flugzeug gelb, der Hinweis ist für alle Piloten sichtbar.
- [ ] Ein Pilot sieht fremde Rohmeldungen nicht, aber den Hinweis „1 Meldung in Prüfung“.
- [ ] Der Melder sieht die Rückmeldung zu seiner Meldung.
- [ ] Jeder Schritt erscheint im Verlauf des Flugzeugs.
- [ ] Die App lässt sich auf Android und iPhone zum Home-Bildschirm hinzufügen.
- [ ] CI und RLS-Tests sind grün.

---

## 11. Offene Punkte – nicht selbst entscheiden, die Projektleitung fragen

- Endgültige Sichtbarkeit ungeprüfter Meldungen (der Prototyp nutzt den Mittelweg)
- Echte Flugzeugliste und wer die Warte sind (kommt vom Werkstattleiter)
- Name, Domain und Hosting-Account. Wem gehört das Supabase-Projekt? Empfehlung: ein Vereins-Account, kein Privatkonto
- Datenschutz und Okay vom Vorstand, bevor echte Daten reinkommen
- Vereinsflieger-App-Key (wenn er da ist, kommt der Login in Phase 2, siehe `docs/konzept.md` Abschnitt 5.2)

## 12. Nicht tun

- Keine echten Vereins- oder Personendaten in Seed, Tests oder Screenshots
- Keine Secrets committen, keinen Service-Role-Key im Frontend
- Keine Schema-Änderungen über das Supabase-Dashboard, nur Migrationen
- Nichts, was nach offizieller Freigabe oder Bordbuch-Ersatz aussieht
- Keine Features außerhalb des Umfangs ohne Rückfrage
