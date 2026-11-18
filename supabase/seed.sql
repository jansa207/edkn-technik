-- =============================================================================
-- Testdaten für die lokale Entwicklung (supabase db reset). NUR Fantasiedaten.
-- Alle Testkonten haben das Passwort: edkn-test
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Testkonten (E-Mail bestätigt). Der Trigger legt die Profile an.
-- -----------------------------------------------------------------------------
do $$
declare
  v_konto record;
begin
  for v_konto in
    select * from (values
      ('00000000-0000-4000-a000-000000000001'::uuid, 'admin@test.local',     'Anna',  'Admin'),
      ('00000000-0000-4000-a000-000000000002'::uuid, 'wart@test.local',      'Willi', 'Wart'),
      ('00000000-0000-4000-a000-000000000003'::uuid, 'pilot@test.local',     'Paula', 'Pilot'),
      ('00000000-0000-4000-a000-000000000004'::uuid, 'pilot2@test.local',    'Peter', 'Probe'),
      ('00000000-0000-4000-a000-000000000005'::uuid, 'neu@test.local',       'Nina',  'Neu'),
      ('00000000-0000-4000-a000-000000000006'::uuid, 'abgelehnt@test.local', 'Arne',  'Abgelehnt')
    ) as t (id, email, vorname, nachname)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', v_konto.id, 'authenticated', 'authenticated',
      v_konto.email, extensions.crypt('edkn-test', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('vorname', v_konto.vorname, 'nachname', v_konto.nachname),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_konto.id, v_konto.id::text,
      jsonb_build_object('sub', v_konto.id::text, 'email', v_konto.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end;
$$;

-- Rollen und Freigaben (Seed läuft als Owner, der Profilschutz greift nur für Clients)
update public.profiles set rolle = 'admin', freigabe = 'freigegeben', freigegeben_am = now()
  where email = 'admin@test.local';
update public.profiles set rolle = 'wart', freigabe = 'freigegeben', freigegeben_am = now()
  where email = 'wart@test.local';
update public.profiles set freigabe = 'freigegeben', freigegeben_am = now()
  where email in ('pilot@test.local', 'pilot2@test.local');
update public.profiles set freigabe = 'abgelehnt'
  where email = 'abgelehnt@test.local';
-- neu@test.local bleibt 'ausstehend'
update public.profiles
  set freigegeben_von = '00000000-0000-4000-a000-000000000001'
  where freigabe = 'freigegeben' and email <> 'admin@test.local';

-- -----------------------------------------------------------------------------
-- Fantasie-Flugzeuge (Kennzeichen erfunden)
-- -----------------------------------------------------------------------------
insert into public.aircraft (id, kennzeichen, wettbewerbskennzeichen, muster, art) values
  ('00000000-0000-4000-b000-000000000001', 'D-9001', 'T1', 'ASK 21', 'segler'),
  ('00000000-0000-4000-b000-000000000002', 'D-9002', 'T2', 'LS4', 'segler'),
  ('00000000-0000-4000-b000-000000000003', 'D-9003', 'T3', 'Discus CS', 'segler'),
  ('00000000-0000-4000-b000-000000000004', 'D-KDEM', 'KD', 'SF 25C Falke', 'motorsegler'),
  ('00000000-0000-4000-b000-000000000005', 'D-MDEM', null, 'C42', 'ul');

-- -----------------------------------------------------------------------------
-- Meldungen für jede Ampelfarbe
--   D-9001 grün   (eine erledigte Kat-2-Meldung im Verlauf)
--   D-9002 gelb   (Kat 2 mit Pilotenhinweis) + 1 Meldung in Prüfung
--   D-9003 rot    (Kat 1 in Arbeit)
--   D-KDEM rot    (vorläufig nicht flugklar, noch nicht eingestuft)
--   D-MDEM rot    (manuelle Sperre)
-- -----------------------------------------------------------------------------
insert into public.reports (
  id, aircraft_id, melder_id, text, kategorie, status, vorlaeufig_nicht_flugklar,
  ziel, pilotenhinweis, pilotenhinweis_sichtbar, eingestuft_von, eingestuft_am, erledigt_am, created_at
) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001',
   '00000000-0000-4000-a000-000000000003', 'Haubenverriegelung hinten geht schwer.',
   2, 'erledigt', false, 'Schlechtwettertag', null, false,
   '00000000-0000-4000-a000-000000000002', now() - interval '20 days', now() - interval '14 days', now() - interval '21 days'),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000002',
   '00000000-0000-4000-a000-000000000004', 'Fahrtmesser zeigt beim Schlepp gefühlt 5 km/h zu wenig an.',
   2, 'zurueckgestellt', false, 'Winterarbeit 26/27',
   'Fahrtmesser zeigt leicht zu wenig an – bekannt, geprüft, nicht sicherheitsrelevant. Tausch in der Winterarbeit.',
   true, '00000000-0000-4000-a000-000000000002', now() - interval '6 days', null, now() - interval '7 days'),
  ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-b000-000000000002',
   '00000000-0000-4000-a000-000000000004', 'Kleiner Kratzer an der rechten Fläche, Nähe Querruder.',
   null, 'neu', false, null, null, false, null, null, null, now() - interval '3 hours'),
  ('00000000-0000-4000-c000-000000000004', '00000000-0000-4000-b000-000000000003',
   '00000000-0000-4000-a000-000000000003', 'Spornrad hat deutliches Spiel, Achse wackelt.',
   1, 'in_arbeit', false, null, 'Spornrad defekt, wird getauscht.', true,
   '00000000-0000-4000-a000-000000000002', now() - interval '1 day', null, now() - interval '2 days'),
  ('00000000-0000-4000-c000-000000000005', '00000000-0000-4000-b000-000000000004',
   '00000000-0000-4000-a000-000000000004', 'Motor springt schlecht an und läuft rau, Öl am Boden.',
   null, 'neu', true, null, null, false, null, null, null, now() - interval '1 hour');

update public.aircraft
set gesperrt = true,
    sperrgrund = 'Jahresnachprüfung läuft',
    gesperrt_von = '00000000-0000-4000-a000-000000000002',
    gesperrt_am = now() - interval '5 days'
where id = '00000000-0000-4000-b000-000000000005';

-- -----------------------------------------------------------------------------
-- Verlauf passend zu den Meldungen
-- -----------------------------------------------------------------------------
insert into public.report_events (report_id, aircraft_id, user_id, typ, text, intern, created_at) values
  -- D-9001: erledigte Kat 2
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000003',
   'erstellt', 'Meldung erstellt', false, now() - interval '21 days'),
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000002',
   'kategorie', 'Eingestuft als Kat 2 – Ziel: Schlechtwettertag', false, now() - interval '20 days'),
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000002',
   'statuswechsel', 'Erledigt', false, now() - interval '14 days'),
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000002',
   'kommentar', 'Verriegelung gereinigt und gefettet. Danke für die Meldung!', false, now() - interval '14 days'),
  -- D-9002: Kat 2 mit Hinweis + neue Meldung
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000004',
   'erstellt', 'Meldung erstellt', false, now() - interval '7 days'),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000002',
   'kommentar', 'Mit Prüfgerät verglichen: ca. 4 km/h Abweichung, innerhalb Toleranz.', true, now() - interval '6 days'),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000002',
   'kategorie', 'Eingestuft als Kat 2 – Ziel: Winterarbeit 26/27 – Hinweis: Fahrtmesser zeigt leicht zu wenig an – bekannt, geprüft, nicht sicherheitsrelevant. Tausch in der Winterarbeit.',
   false, now() - interval '6 days'),
  ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000004',
   'erstellt', 'Meldung erstellt', false, now() - interval '3 hours'),
  -- D-9003: Kat 1
  ('00000000-0000-4000-c000-000000000004', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000003',
   'erstellt', 'Meldung erstellt', false, now() - interval '2 days'),
  ('00000000-0000-4000-c000-000000000004', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000002',
   'kategorie', 'Eingestuft als Kat 1 – nicht flugklar: Spornrad defekt, wird getauscht.', false, now() - interval '1 day'),
  -- D-KDEM: vorläufig nicht flugklar
  ('00000000-0000-4000-c000-000000000005', '00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000004',
   'erstellt', 'Meldung erstellt – vorläufig nicht flugklar', false, now() - interval '1 hour'),
  -- D-MDEM: manuelle Sperre
  (null, '00000000-0000-4000-b000-000000000005', '00000000-0000-4000-a000-000000000002',
   'sperre', 'Jahresnachprüfung läuft', false, now() - interval '5 days');

-- -----------------------------------------------------------------------------
-- Werkstatt-Aufgaben (nur für Warte sichtbar)
--   A-0001 Spornrad D-9003, wartet auf Ersatzteil, halb erledigt
--   A-0002 Ölverlust D-KDEM, in Arbeit mit Arbeitsstand-Kommentar
--   A-0003 Fahrtmesser D-9002, offen, Winterarbeit
--   A-0004 allgemeine Hallenaufgabe, überfällig
--   A-0005 Haubenverriegelung D-9001, erledigt
-- -----------------------------------------------------------------------------
insert into public.tasks (
  id, aircraft_id, report_id, titel, beschreibung, status, prioritaet, faellig_am,
  zustaendig_id, wartet_auf, erstellt_von, erledigt_von, erledigt_am, created_at, updated_at
)
select * from (values
  ('00000000-0000-4000-d000-000000000001'::uuid, '00000000-0000-4000-b000-000000000003'::uuid,
   '00000000-0000-4000-c000-000000000004'::uuid, 'Spornrad tauschen',
   'Spornrad hat Spiel, Achse prüfen und ggf. mit tauschen.', 'wartet'::public.aufgabe_status,
   'hoch'::public.aufgabe_prioritaet, (now() at time zone 'Europe/Berlin')::date + 2,
   '00000000-0000-4000-a000-000000000002'::uuid, 'Ersatzteil bestellt, Lieferung ca. Freitag',
   '00000000-0000-4000-a000-000000000002'::uuid, null::uuid, null::timestamptz,
   now() - interval '1 day', now() - interval '3 hours'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-b000-000000000004',
   '00000000-0000-4000-c000-000000000005', 'Ölverlust am Motor suchen',
   'Öl unter dem Motor nach dem letzten Flug. Leitungen und Dichtungen prüfen.', 'in_arbeit',
   'hoch', (now() at time zone 'Europe/Berlin')::date,
   '00000000-0000-4000-a000-000000000002', null, '00000000-0000-4000-a000-000000000001', null, null,
   now() - interval '50 minutes', now() - interval '20 minutes'),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-b000-000000000002',
   '00000000-0000-4000-c000-000000000002', 'Fahrtmesser tauschen',
   'Fahrtmesser zeigt ca. 4 km/h zu wenig. Tausch im Rahmen der Winterarbeit.', 'offen',
   'normal', make_date(2027, 2, 28),
   null, null, '00000000-0000-4000-a000-000000000002', null, null,
   now() - interval '6 days', now() - interval '6 days'),
  ('00000000-0000-4000-d000-000000000004', null, null, 'Reifenfüller in der Halle prüfen',
   'Manometer zeigt unplausible Werte. Mit zweitem Gerät vergleichen.', 'offen',
   'niedrig', (now() at time zone 'Europe/Berlin')::date - 3,
   '00000000-0000-4000-a000-000000000001', null, '00000000-0000-4000-a000-000000000001', null, null,
   now() - interval '10 days', now() - interval '10 days'),
  ('00000000-0000-4000-d000-000000000005', '00000000-0000-4000-b000-000000000001',
   '00000000-0000-4000-c000-000000000001', 'Haubenverriegelung reinigen und fetten',
   '', 'erledigt', 'normal', null,
   '00000000-0000-4000-a000-000000000002', null, '00000000-0000-4000-a000-000000000002',
   '00000000-0000-4000-a000-000000000002', now() - interval '14 days',
   now() - interval '20 days', now() - interval '14 days')
) as t;

insert into public.task_items (task_id, text, erledigt, erledigt_von, erledigt_am, position) values
  ('00000000-0000-4000-d000-000000000001', 'Spornrad ausbauen', true,
   '00000000-0000-4000-a000-000000000002', now() - interval '20 hours', 1),
  ('00000000-0000-4000-d000-000000000001', 'Ersatzteile bestellen (Rad und Achse)', true,
   '00000000-0000-4000-a000-000000000002', now() - interval '19 hours', 2),
  ('00000000-0000-4000-d000-000000000001', 'Neues Spornrad einbauen', false, null, null, 3),
  ('00000000-0000-4000-d000-000000000001', 'Funktionsprüfung am Boden', false, null, null, 4),
  ('00000000-0000-4000-d000-000000000002', 'Motorhaube abnehmen', true,
   '00000000-0000-4000-a000-000000000002', now() - interval '40 minutes', 1),
  ('00000000-0000-4000-d000-000000000002', 'Ölleitungen und Kühleranschlüsse prüfen', false, null, null, 2),
  ('00000000-0000-4000-d000-000000000002', 'Probelauf und Sichtprüfung auf Dichtheit', false, null, null, 3),
  ('00000000-0000-4000-d000-000000000003', 'Ersatzinstrument besorgen', false, null, null, 1),
  ('00000000-0000-4000-d000-000000000003', 'Einbauen und Dichtheitsprüfung', false, null, null, 2);

insert into public.task_events (task_id, user_id, typ, text, created_at) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-a000-000000000002', 'erstellt',
   'Aufgabe angelegt – zuständig: Willi Wart', now() - interval '1 day'),
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-a000-000000000002', 'teilschritt',
   'Erledigt: Spornrad ausbauen', now() - interval '20 hours'),
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-a000-000000000002', 'status',
   'Offen → In Arbeit', now() - interval '20 hours'),
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-a000-000000000002', 'kommentar',
   'Rad ist ab. Die Achse ist eingelaufen, deshalb gleich mitbestellt. Lager sehen gut aus.', now() - interval '19 hours 30 minutes'),
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-a000-000000000002', 'teilschritt',
   'Erledigt: Ersatzteile bestellen (Rad und Achse)', now() - interval '19 hours'),
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-a000-000000000002', 'status',
   'In Arbeit → Wartet – wartet auf: Ersatzteil bestellt, Lieferung ca. Freitag', now() - interval '3 hours'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-a000-000000000001', 'erstellt',
   'Aufgabe angelegt – zuständig: Willi Wart', now() - interval '50 minutes'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-a000-000000000002', 'teilschritt',
   'Erledigt: Motorhaube abnehmen', now() - interval '40 minutes'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-a000-000000000002', 'status',
   'Offen → In Arbeit', now() - interval '40 minutes'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-a000-000000000002', 'kommentar',
   'Halb fertig: Haube ist ab, die Ölleitung zum Kühler ist feucht und verdächtig. Muss heute weg, morgen früh geht es weiter.',
   now() - interval '20 minutes'),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-a000-000000000002', 'erstellt',
   'Aufgabe angelegt – fällig: 28.02.2027', now() - interval '6 days'),
  ('00000000-0000-4000-d000-000000000004', '00000000-0000-4000-a000-000000000001', 'erstellt',
   'Aufgabe angelegt – zuständig: Anna Admin', now() - interval '10 days'),
  ('00000000-0000-4000-d000-000000000005', '00000000-0000-4000-a000-000000000002', 'erstellt',
   'Aufgabe angelegt – zuständig: Willi Wart', now() - interval '20 days'),
  ('00000000-0000-4000-d000-000000000005', '00000000-0000-4000-a000-000000000002', 'status',
   'Offen → Erledigt – Verriegelung gereinigt und gefettet.', now() - interval '14 days');
