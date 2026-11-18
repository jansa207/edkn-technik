# EDKN Technik – Konzept v1

Stand: 18.11.2026 · getrennt vom SMS-Portal · Prototyp mit E-Mail + Passwort und Freigabe durch den Admin · Team aus 2–3 Leuten. Spätere Entscheidungen stehen in `docs/entscheidungen.md`.

Grundlage: die Idee der Projektleitung, eine Mail des Werkstattleiters vom 17.11. zu Mängeln in der Meldeschematik und eine Web-Recherche. Die konkrete Übergabe an Claude Code steht in `docs/handoff.md`.

---

## 1. Ziel

Eine vereinseigene Web-App (PWA), die man aufs Handy installieren kann. Sie soll:

- **vor jedem Flug** in wenigen Sekunden zeigen, in welchem technischen Zustand ein Vereinsflugzeug ist: Status, offene Punkte, worauf man achten sollte, Verlauf,
- **Mängel und technische Vorfälle** mit Foto und kurzem Text erfassen,
- der **Werkstatt** helfen, Meldungen einzustufen (Kat. 1/2/3 des Werkstattleiters), Flugzeuge zu sperren und freizugeben, sodass nichts mehr in einer Mailbox liegen bleibt,
- **Werkstatt-Fristen** verwalten (Gurte, Kupplungen, Stundenkontrollen …), die heute in Excel stehen.

**Vorbild:** der Tech Log in der Airline. Die Crew sieht vor dem Flug offene Beanstandungen, zurückgestellte Mängel (Deferred Defects nach MEL) und den Freigabestatus. Kat. 2 entspricht ziemlich genau einem „Deferred Defect“.

**Eigenständig, getrennt vom SMS-Portal (Entscheidung 18.11.):** EDKN Technik ist ein eigenes Tool und kein Modul im SMS-Portal des Vereins. Faustregel:
- Technischer Zustand eines Flugzeugs (Mängel, Defekte, Schäden, Fristen) → **EDKN Technik**
- Sicherheitsereignisse und Flugsicherheitsmeldungen → **SMS**

Die genaue Grenze sprechen wir mit dem SMS-Verantwortlichen ab, damit Piloten wissen, wo sie was melden. Optional zeigt EDKN Technik bei einer Meldung den Hinweis „Sicherheitsrelevant? Zusätzlich im SMS melden“ mit Link.

**Was das Tool NICHT ist:** kein Ersatz für Bordbuch, CAO-Software oder Prüfer-Freigaben. Prüferpflichtige Fristen (LTA, Gurt- und Kupplungslaufzeiten) bleiben in der CAO-Software. Wie das Tool rechtlich zum Bordbuch steht, klären wir mit dem Werkstattleiter bzw. dem Prüfer.

---

## 2. Recherche: Was gibt es schon?

| Vorbild | Was es macht | Was wir mitnehmen |
|---|---|---|
| **vereinsflieger.de** (nutzt der Verein schon) | Mängelverwaltung (Mängelbuch). Wartung wird nach Datum, Starts, Flugzeit, Betriebsstunden und Zählern überwacht, Verantwortliche bekommen E-Mails, der Flugleiter einen Hinweis bei Überschreitung. Eine harte Sperre ist in der Funktionsübersicht (2023) nicht beschrieben. Kritik des Werkstattleiters: Alle sehen alle Meldungen. | **REST-API** vorhanden: App-Key über den Support, 1000 Aufrufe pro Tag, keine kommerzielle Nutzung. **Login mit dem Vereinsflieger-Account** ist möglich (siehe Abschnitt 5.2). Flugdaten taugen als Quelle für Stunden- und Start-Fristen. |
| **Britische Segelflugvereine** (Scottish Gliding Centre, Midland GC) | Mangel ins DI-Buch eintragen plus Meldeformular. Der Melder darf das Flugzeug selbst auf „U/S“ setzen und eine DO-NOT-FLY-Fahne ins Cockpit legen. Der Melder bekommt Rückmeldung. Zurückgestellte Mängel hängen an einer Tafel im Technikbüro. Bei Midland geht ein Online-Formular sofort per Mail ans Fleet-Team. | Schalter **„vorläufig nicht flugklar“** für den Melder, **Rückmeldung an den Melder**, Liste der zurückgestellten Punkte. |
| **Kommerzielle Club-Tools** (Aviatize, CloudGA, Planewise, FlightGuard, Coflyt) | Beanstandung aus der App landet in einer Triage-Warteschlange der Technik. Die Technik behebt den Punkt oder stellt ihn zurück, der Status ist live sichtbar. CloudGA kann Meldungen offline erfassen. | **Triage-Inbox**, **Offline-Meldung**, Live-Status. Meist Motorflug, USA/UK, kostenpflichtig. |
| **Open Source** | MyTailLog (MIT, self-hosted, Wartungstracker für GA-Halter, noch sehr klein). Akaflieg „startkladde“ (mit Vereinsflieger-Upload). „Gliding App“ (von einem Vereinsmitglied gebaut, in vielen Segelflugvereinen für Daily Inspections im Einsatz). wp-vereinsflieger und vereinsflieger_nodejs_api als Vorlage für den späteren Vereinsflieger-Login. | Gut für Ideen, nicht als Basis. |
| **Intern** | Der SMS-Verantwortliche plant etwas Ähnliches für das SMS-Portal. | **Entschieden: getrennt.** Abgrenzung mit ihm absprechen (siehe Abschnitt 1). |

**Fazit:** Es gibt kein fertiges Tool für einen deutschen Segelflugverein mit der 3-Kategorien-Logik des Werkstattleiters und abgestufter Sichtbarkeit. Ein Eigenbau lohnt sich, wenn er schlank bleibt.

---

## 3. Kernkonzept

### Rollen
- **Pilot:** sieht Status und freigegebene Hinweise, meldet Mängel, sieht seine eigenen Meldungen. Das ist die Standardrolle für jeden freigegebenen Nutzer.
- **Wart** (Werkstattleiter und weitere Werkstattverantwortliche): sieht alle Meldungen, stuft sie ein, sperrt und entsperrt, pflegt Fristen.
- **Admin** (Projektleitung): gibt neue Nutzer frei, vergibt Rollen, verwaltet Flugzeuge.

### Status pro Flugzeug (Ampel)
- 🟢 **Klar**
- 🟡 **Klar mit Hinweisen**: bekannte Kat-2-Punkte, die der Wart für Piloten freigegeben hat
- 🔴 **Gesperrt**: Kat 1, eine manuelle Sperre, oder vorläufig gesperrt durch einen Melder, bis ein Wart entscheidet
- *Offen:* Soll eine überschrittene Werkstatt-Frist automatisch Gelb oder Rot auslösen?

### Ablauf einer Meldung
1. Der Pilot meldet: Flugzeug wählen, Foto(s), kurzer Text, optional „Ich halte es für nicht flugklar“ (→ sofort 🔴 vorläufig).
2. Die Warte werden benachrichtigt (im Prototyp über die Inbox in der App, später per E-Mail bzw. Push).
3. Ein Wart stuft ein:
   - **Kat 1** → sperren, Grund angeben
   - **Kat 2** → zurückstellen mit Ziel (z. B. „Schlechtwettertag“ / „Winterarbeit 26/27“), optional einen **Pilotenhinweis** in verständlichen Worten formulieren
   - **Kat 3** → ablegen, mit kurzer Begründung
4. Der Melder bekommt Rückmeldung.
5. Erledigt → Flugzeug wieder frei. Der Verlauf bleibt erhalten.

### Sichtbarkeit – ⚠️ OFFENE ENTSCHEIDUNG
- **Projektleitung:** maximal transparent, jeder Pilot sieht alles.
- **Werkstattleiter:** Meldungen sehen nur die Warte und der Einmelder.

**Vorschlag für einen Mittelweg (so baut ihn der Prototyp):**
- **Alle Piloten sehen:** Ampel, Sperrgrund, vom Wart freigegebene Pilotenhinweise (z. B. „Fahrtmesser zeigt leicht zu wenig an – bekannt, geprüft, nicht sicherheitsrelevant, Tausch in der Winterarbeit“), Verlauf der erledigten Punkte, Anzahl der Meldungen „in Prüfung“.
- **Nur Warte und Melder sehen:** Rohmeldungen, interne Kommentare, Kat-3-Ablagen.
- **Noch ungeprüfte Meldungen:** Im Prototyp sehen alle nur den Hinweis „1 Meldung in Prüfung“. Sicherheitsfrage für den Werkstattleiter: Der nächste Pilot fliegt vielleicht, bevor ein Wart draufgeschaut hat.

Argument für den Werkstattleiter: Ein vom Wart bewerteter Hinweis beruhigt eher, als dass er verunsichert. Er zeigt, dass jemand draufgeschaut hat.

### Werkstatt-Fristen (nach dem Prototyp)
- **Typen:** Kalenderdatum, Flugstunden, Starts, Motorstunden
- **Pro Flugzeug:** Aufgabe bzw. Bauteil, Intervall, zuletzt erledigt (Datum/Stand), nächste Fälligkeit, Vorwarnzeit
- **Zählerstände:** erst manuell, später automatisch aus der Vereinsflieger-API
- **Abgrenzung:** CAO-Fristen nicht doppelt pflegen, höchstens als Info anzeigen. Mit dem Werkstattleiter klären.

---

## 4. Technik-Empfehlung

- **PWA:** installierbar über „Zum Home-Bildschirm“. Die Kamera läuft über den Datei-Upload. Kein App Store nötig.
- **Frontend:** React + TypeScript + Vite + `vite-plugin-pwa`, Tailwind CSS. Ein verbreiteter Stack, mit dem Claude Code sehr gut klarkommt.
- **Backend:** Supabase. Das bringt Postgres, Auth, Foto-Speicher, Edge Functions und **Row Level Security** mit. RLS ist genau das Werkzeug für „Wart sieht alles, Pilot nur Freigegebenes und Eigenes, Nicht-Freigegebene sehen nichts“. Region: EU (Frankfurt), wegen DSGVO.
- **Lokale Entwicklung:** Supabase CLI (`supabase start`, braucht Docker). Das Schema ändert sich nur über Migrationen im Repo.
- **Hosting:** Cloudflare Workers mit statischen Assets (Gratis-Stufe), mit einem **Preview-Link pro Branch bzw. Pull Request**. Vercel scheidet aus, weil der Gratis-Tarif bei privaten Repos keine Deployments von Mitstreitern baut (siehe `docs/entscheidungen.md`).
- **Alternative:** PocketBase auf einem kleinen eigenen Server (ein paar € im Monat). Alle Daten liegen dann beim Verein, dafür gibt es mehr Admin-Aufwand.
- **Offline:** Meldungen lokal speichern und senden, sobald wieder Netz da ist. Am Flugplatz ist der Empfang oft mies.
- **Benachrichtigungen:** E-Mail und später Web-Push. Auf dem iPhone geht Push nur, wenn die App auf dem Home-Bildschirm installiert ist.
- **QR-Code pro Flugzeug** (Cockpit, Anhänger, Halle): Scannen öffnet direkt die Seite des Flugzeugs.
- **Achtung:** Gratis-Tarife (z. B. Supabase) pausieren Projekte bei längerer Inaktivität. Das betrifft vor allem den Winter. Der eingebaute Mailversand von Supabase ist nur für Tests gedacht. Vor dem echten Betrieb also eigenen SMTP einrichten, aktuelle Bedingungen prüfen und einen kleinen bezahlten Plan einplanen.

---

## 5. Login

### 5.1 Prototyp: E-Mail + Passwort mit Freigabe (Entscheidung 18.11.)
- Registrierung mit Vorname, Nachname, E-Mail und Passwort (Supabase Auth, mit E-Mail-Bestätigung).
- Ein neues Konto ist **„ausstehend“**, bis der Admin es **freigibt** und eine Rolle setzt (Standard: Pilot). Er kann ein Konto auch ablehnen oder später deaktivieren.
- Bis zur Freigabe sieht der Nutzer nur „Warte auf Freigabe“. Abgesichert ist das per RLS, nicht nur in der Oberfläche.
- Niemand kann seine eigene Rolle oder Freigabe ändern. Das geht nur über eine Admin-Funktion in der Datenbank.
- **Vorteil:** sofort startklar, kein App-Key nötig, volle Kontrolle darüber, wer reinkommt.

### 5.2 Später: Login über Vereinsflieger
Kommt nach dem Prototyp, sobald der App-Key da ist. Wer sich über Vereinsflieger anmeldet, kann automatisch freigegeben werden, denn die Mitgliedschaft ist damit belegt. Bestehende E-Mail-Konten verknüpfen wir über `profiles.vf_uid`.

**Prinzip:** Soweit bekannt bietet Vereinsflieger kein OAuth bzw. keinen „Mit Vereinsflieger anmelden“-Knopf. Es gibt aber eine REST-API, über die eine fremde Anwendung Zugangsdaten prüfen kann. So macht es auch das WordPress-Plugin wp-vereinsflieger. Die Prüfung läuft immer **über unseren Server**, nie direkt vom Handy zu Vereinsflieger, weil der App-Key geheim bleiben muss.

**Ablauf** (aus den Open-Source-Bibliotheken abgeleitet; die offizielle Doku liegt im Vereinsflieger-Hilfebereich und ist nur nach dem Login sichtbar):
1. Der Pilot gibt in der App E-Mail bzw. Benutzername und Passwort ein.
2. Die App schickt das per HTTPS an unsere Supabase Edge Function `vf-login`.
3. Die Function holt ein Zugriffstoken: `GET https://www.vereinsflieger.de/interface/rest/auth/accesstoken`
4. Die Function meldet den Nutzer an: `POST …/interface/rest/auth/signin` mit
   - `accesstoken`
   - `appkey` (aus den Server-Secrets)
   - `cid` (unsere Vereins-ID)
   - `username`
   - `password` = **MD5-Hash** des Passworts
   - optional `auth_secret` = 6-stelliger 2FA-Code

   Mögliche Antworten:
   - **200** → angemeldet
   - **403 mit `need_2fa = 1`** → die App fragt nach dem 2FA-Code und schickt alles nochmal mit `auth_secret`
   - **403 ohne `need_2fa`** → falsche Zugangsdaten oder Konto deaktiviert
5. Die Function holt die Nutzerdaten über `…/interface/rest/auth/getuser`. Zurück kommen u. a. `uid`, `memberid`, `firstname`, `lastname`, `email`, `status` und `roles`.
6. Die Function meldet sich bei Vereinsflieger wieder ab: `DELETE …/interface/rest/auth/signout`
7. Unser Nutzer wird angelegt bzw. aktualisiert. Schlüssel ist die Vereinsflieger-`uid`, die Rolle kommt aus unserer Datenbank.
8. Die Function erzeugt eine normale Supabase-Session:
   - `auth.admin.generateLink({ type: 'magiclink', email })` liefert einen `hashed_token`. Dabei wird keine Mail verschickt.
   - Die App löst den Token mit `supabase.auth.verifyOtp({ token_hash, type: 'email' })` ein.

**Regeln:**
- Das Passwort wird nie gespeichert und nie geloggt.
- App-Key und CID liegen nur als Secrets auf dem Server.
- Login-Versuche begrenzen.
- Lange Sessions, um das API-Limit von 1000 Aufrufen pro Tag zu schonen.
- Nächtlicher Abgleich über `user/list` mit einem technischen Konto, damit in Vereinsflieger deaktivierte Mitglieder auch bei uns rausfliegen.
- Auf der Login-Seite der Hinweis: „Passwort wird nur zur Prüfung weitergeleitet“.

**Voraussetzungen:**
- App-Key beim Vereinsflieger-Support beantragen (über Vorstand bzw. Vereinsflieger-Admin, nur nicht-kommerzielle Nutzung erlaubt)
- CID des Vereins
- technisches Konto mit Leserechten
- Okay vom Vorstand

**Weitere Endpunkte für später:**
- `flight/list/plane`: Flüge pro Flugzeug → Stunden und Starts für die Fristen
- `maintenance/airplane/[Kennzeichen]`: Wartungsdaten aus Vereinsflieger
- `user/list`: Mitgliederliste für den Abgleich

---

## 6. Zusammenarbeit im Team (Projektleitung + 1–2 Mitstreiter)

- **Ein privates GitHub-Repo** (`edkn-technik`), die Mitstreiter als Collaborators. Eine Vereins-Organisation auf GitHub kann später dazukommen.
- **`main` schützen:** Branch pro Aufgabe → Pull Request → 1 Review durch einen anderen → Squash-Merge.
- **GitHub Issues + Projects-Board** (Backlog / In Arbeit / Review / Fertig). Die Arbeit wird nach Bereichen aufgeteilt (Auth/Admin · Flugzeuge/Melden · Werkstatt), damit es wenig Konflikte gibt.
- **Datenbank nur über Migrationen** im Repo (`supabase/migrations`), jeder entwickelt lokal mit der Supabase CLI. Schema-Änderungen nie von Hand im Dashboard machen.
- **CI** (GitHub Actions) auf jedem PR: Typecheck, Lint, Tests, Build.
- **`CLAUDE.md` ins Repo:** Stack, Regeln, Begriffe (Kat 1/2/3, Wart, Sperre, Pilotenhinweis). So arbeitet jede Claude-Code-Sitzung mit denselben Regeln. Persönliches kommt in `CLAUDE.local.md` (gitignored).
- **Keine Secrets ins Repo:** `.env.example` ja, `.env` nie.
- **Nicht jeder muss coden:** Der Werkstattleiter ist fachlicher „Product Owner“ für die Werkstatt, ein paar Piloten testen über die Preview-Links am Handy und schreiben Feedback als Issue.
- **Entscheidungen** in `docs/entscheidungen.md` oder in Issues festhalten, nicht nur in WhatsApp.

---

## 7. Fahrplan

**Phase 0 – Abstimmen (jetzt, 1–2 Wochen, parallel zum Prototyp)**
- **SMS-Verantwortlichem** Bescheid geben: EDKN Technik bleibt getrennt vom SMS. Gemeinsam festlegen, was wo gemeldet wird.
- 30 Minuten mit dem **Werkstattleiter**: Kategorien, Sichtbarkeit, Abgrenzung der Fristen zur CAO-Software, Bordbuch-Frage, welche Flugzeuge, wer zählt als Wart.
- **Vorstand:** Okay einholen, Datenschutz klären (Namen, Fotos), Vereinsflieger-App-Key beantragen. Das blockiert den Prototyp nicht.

**Phase 1 – Prototyp v0.1 (Winter)** → Details in `docs/handoff.md`
- Login mit E-Mail + Passwort, Freigabe durch den Admin, Rollen
- Flugzeugliste mit Ampel und Detailseite (Status, Hinweise, Verlauf)
- Melden mit Foto und „vorläufig nicht flugklar“
- Werkstatt-Inbox: Triage Kat 1/2/3, Sperren/Entsperren, Kommentare, Rückmeldung an den Melder
- Installierbar als PWA, mit Testdaten

**Phase 2 – bis Saisonstart**
- Werkstatt-Fristen, Liste für Schlechtwettertag/Winterarbeit
- E-Mail an die Warte, QR-Codes, Offline-Meldung, Export (PDF/Excel)
- Login über Vereinsflieger (sobald der App-Key da ist), Mitglieder-Abgleich
- Hosting für den echten Betrieb, eigener SMTP

**Phase 3 – Saison 2027**
- Automatischer Import der Flugdaten aus Vereinsflieger (Stunden, Starts) für die Fristen
- Push, Vorflug-Quittung („Status gelesen“), Statistik

---

## 8. Datenmodell (Startpunkt)

- `profiles`: id (= auth.users.id), vorname, nachname, email, rolle (pilot / wart / admin), freigabe (ausstehend / freigegeben / abgelehnt), freigegeben_von, freigegeben_am, vf_uid (nullable, unique; für später), created_at
- `aircraft`: id, kennzeichen, wettbewerbskennzeichen, muster, art (Segler / Motorsegler / UL / Schlepp), gesperrt (bool), sperrgrund, gesperrt_von, gesperrt_am, aktiv
- `reports`: id, aircraft_id, melder_id, text, kategorie (null/1/2/3), status (neu / zurueckgestellt / in_arbeit / erledigt / abgelegt), vorlaeufig_nicht_flugklar, ziel (z. B. „Winterarbeit 26/27“), pilotenhinweis, pilotenhinweis_sichtbar, created_at, eingestuft_von, eingestuft_am, erledigt_am
- `report_photos`: id, report_id, storage_path
- `report_events`: id, report_id, aircraft_id, user_id, typ (erstellt / kommentar / statuswechsel / kategorie / sperre / entsperrt), text, intern (bool), created_at → ergibt den Verlauf
- View `aircraft_overview`: berechnet die Ampel, den Sperrgrund und die Anzahl „in Prüfung“ in der Datenbank, nicht im Frontend
- später: `deadlines`, `aircraft_counters`, `login_attempts` (siehe frühere Fassung bzw. Phase 2)

---

## 9. Übergabe an Claude Code

→ siehe `docs/handoff.md`.

---

## Quellen

- vereinsflieger.de Funktionsübersicht (Stand April 2023): https://lam.akaflieg.tu-darmstadt.de/hyperkitty/list/anwaerter@akaflieg.tu-darmstadt.de/message/SMFWSFR66TFSWLXHWR7LDXTHD2GW6ACM/attachment/4/01_vereinsflieger2023-04D.pdf
- Vereinsflieger REST-API, inoffizieller Node.js-Wrapper: https://github.com/termigrator/vereinsflieger_nodejs_api
- wp-vereinsflieger, WordPress-Login mit Vereinsflieger-Account: https://github.com/diginize/wp-vereinsflieger
- Inoffizielles PHP-SDK für die Vereinsflieger-API: https://github.com/edsh/vereinsflieger-sdk-php
- Scottish Gliding Centre – Reporting Defects in Club Gliders: https://pilots.scottishglidingcentre.co.uk/airfieldmanual/g._reporting_defects_in_club_gliders
- Midland Gliding Club – Online Forms: https://www.midlandgliding.club/?p=13494
- Aviatize Aircraft Maintenance: https://www.aviatize.com/aircraft-maintenance-software
- CloudGA (App Store): https://apps.apple.com/ee/app/cloudga/id6503251596
- Planewise (App Store): https://apps.apple.com/app/id6483054740
- MyTailLog: https://alternativeto.net/software/mytaillog/about/
- Akaflieg startkladde: https://www.github.com/Akaflieg
- RAS-Diskussion „Apps for daily inspections“ (Gliding App): https://groups.google.com/g/rasprime/c/15-RYcPjxy0
