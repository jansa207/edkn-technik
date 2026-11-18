-- =============================================================================
-- RLS- und Fachlogik-Tests (pgTAP). Ausführen: npx supabase test db
-- Läuft in einer Transaktion mit eigenen Testdaten und wird am Ende zurückgerollt.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(75);

-- -----------------------------------------------------------------------------
-- Hilfen: Nutzer anlegen und als Nutzer handeln
-- -----------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.nutzer(p_id uuid, p_email text, p_rolle public.rolle, p_freigabe public.freigabe)
returns void language plpgsql as $$
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (p_id, p_email, jsonb_build_object('vorname', split_part(p_email, '@', 1), 'nachname', 'Test'));
  update public.profiles set rolle = p_rolle, freigabe = p_freigabe where id = p_id;
end;
$$;

-- Als Nutzer handeln (Rolle authenticated + JWT-Claims), NULL = wieder Postgres
create function tests.als(p_id uuid) returns void language plpgsql as $$
begin
  if p_id is null then
    perform set_config('role', 'postgres', true);
    perform set_config('request.jwt.claims', '', true);
  else
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  end if;
end;
$$;

-- Gemerkte IDs über Rollenwechsel hinweg
create function tests.id(p_name text) returns uuid language sql as $$
  select current_setting('tests.' || p_name)::uuid
$$;

grant execute on all functions in schema tests to anon, authenticated;

select tests.nutzer('10000000-0000-4000-a000-000000000001', 'admin@rls.test', 'admin', 'freigegeben');
select tests.nutzer('10000000-0000-4000-a000-000000000002', 'wart@rls.test', 'wart', 'freigegeben');
select tests.nutzer('10000000-0000-4000-a000-000000000003', 'pilot1@rls.test', 'pilot', 'freigegeben');
select tests.nutzer('10000000-0000-4000-a000-000000000004', 'pilot2@rls.test', 'pilot', 'freigegeben');
select tests.nutzer('10000000-0000-4000-a000-000000000005', 'neu@rls.test', 'pilot', 'ausstehend');
select tests.nutzer('10000000-0000-4000-a000-000000000006', 'abgelehnt@rls.test', 'pilot', 'abgelehnt');

select set_config('tests.admin', '10000000-0000-4000-a000-000000000001', true);
select set_config('tests.wart', '10000000-0000-4000-a000-000000000002', true);
select set_config('tests.p1', '10000000-0000-4000-a000-000000000003', true);
select set_config('tests.p2', '10000000-0000-4000-a000-000000000004', true);
select set_config('tests.neu', '10000000-0000-4000-a000-000000000005', true);
select set_config('tests.abgelehnt', '10000000-0000-4000-a000-000000000006', true);

insert into public.aircraft (id, kennzeichen, muster, art) values
  ('10000000-0000-4000-b000-000000000001', 'D-TST1', 'Testmuster', 'segler'),
  ('10000000-0000-4000-b000-000000000002', 'D-TST2', 'Testmuster', 'segler');
select set_config('tests.t1', '10000000-0000-4000-b000-000000000001', true);
select set_config('tests.t2', '10000000-0000-4000-b000-000000000002', true);

create function tests.ampel(p_aircraft uuid) returns text language sql as $$
  select ampel from public.aircraft_overview where id = p_aircraft
$$;
grant execute on function tests.ampel(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Grundsätzliches
-- -----------------------------------------------------------------------------
select is_empty(
  $$select tablename from pg_tables where schemaname = 'public' and not rowsecurity$$,
  'RLS ist auf allen Tabellen in public aktiv'
);
select is(
  (select count(*)::int from public.profiles where email = 'neu@rls.test' and rolle = 'pilot'),
  1,
  'Trigger legt bei Registrierung ein Profil mit Rolle pilot an'
);
select is(
  (select freigabe from public.profiles where id = (select id from auth.users where email = 'neu@rls.test')),
  'ausstehend'::public.freigabe,
  'Neue Konten sind ausstehend'
);

-- -----------------------------------------------------------------------------
-- Ohne Login
-- -----------------------------------------------------------------------------
select set_config('role', 'anon', true);
select throws_ok($$select * from public.aircraft$$, '42501', null, 'anon: kein Zugriff auf aircraft');
select throws_ok($$select * from public.aircraft_overview$$, '42501', null, 'anon: kein Zugriff auf aircraft_overview');
select throws_ok($$select * from public.reports$$, '42501', null, 'anon: kein Zugriff auf reports');
select tests.als(null);

-- -----------------------------------------------------------------------------
-- Ausstehende und abgelehnte Nutzer sehen nichts
-- -----------------------------------------------------------------------------
select tests.als(tests.id('neu'));
select is((select count(*)::int from public.aircraft), 0, 'ausstehend: sieht keine Flugzeuge');
select is((select count(*)::int from public.aircraft_overview), 0, 'ausstehend: sieht keine Ampel');
select is((select count(*)::int from public.reports), 0, 'ausstehend: sieht keine Meldungen');
select is((select count(*)::int from public.report_events), 0, 'ausstehend: sieht keinen Verlauf');
select is((select count(*)::int from public.profile_names), 0, 'ausstehend: sieht keine Namen');
select is((select count(*)::int from public.profiles), 1, 'ausstehend: sieht nur das eigene Profil');
select throws_ok(
  format($$select public.report_create(%L, 'Test')$$, tests.id('t1')),
  '42501', null, 'ausstehend: kann nicht melden'
);

select tests.als(tests.id('abgelehnt'));
select is((select count(*)::int from public.aircraft), 0, 'abgelehnt: sieht keine Flugzeuge');
select is((select count(*)::int from public.aircraft_overview), 0, 'abgelehnt: sieht keine Ampel');
select is((select count(*)::int from public.report_events), 0, 'abgelehnt: sieht keinen Verlauf');
select throws_ok(
  format($$select public.report_create(%L, 'Test')$$, tests.id('t1')),
  '42501', null, 'abgelehnt: kann nicht melden'
);

-- -----------------------------------------------------------------------------
-- Rolle und Freigabe sind geschützt
-- -----------------------------------------------------------------------------
select tests.als(tests.id('p1'));
select throws_ok(
  format($$update public.profiles set rolle = 'admin' where id = %L$$, tests.id('p1')),
  '42501', null, 'Pilot kann die eigene Rolle nicht ändern'
);
select throws_ok(
  format($$update public.profiles set freigabe = 'freigegeben' where id = %L$$, tests.id('p1')),
  '42501', null, 'Pilot kann die eigene Freigabe nicht ändern'
);
select lives_ok(
  format($$update public.profiles set vorname = 'Pia' where id = %L$$, tests.id('p1')),
  'Pilot kann den eigenen Namen ändern'
);
select throws_ok(
  format($$select public.admin_update_user(%L, 'freigegeben', 'admin')$$, tests.id('p1')),
  '42501', null, 'Pilot kann admin_update_user nicht aufrufen'
);
select throws_ok(
  $$insert into public.aircraft (kennzeichen, muster, art) values ('D-XXXX', 'X', 'segler')$$,
  '42501', null, 'Pilot kann keine Flugzeuge anlegen'
);
select is((select count(*)::int from public.profiles), 1, 'Pilot sieht nur das eigene Profil');

select tests.als(tests.id('neu'));
select throws_ok(
  format($$update public.profiles set freigabe = 'freigegeben' where id = %L$$, tests.id('neu')),
  '42501', null, 'Ausstehender Nutzer kann sich nicht selbst freigeben'
);

select tests.als(tests.id('wart'));
select throws_ok(
  format($$select public.admin_update_user(%L, 'freigegeben', 'pilot')$$, tests.id('neu')),
  '42501', null, 'Wart kann keine Nutzer freigeben'
);

-- Admin gibt frei
select tests.als(tests.id('admin'));
select throws_ok(
  format($$select public.admin_update_user(%L, 'freigegeben', 'pilot')$$, tests.id('admin')),
  '42501', null, 'Admin kann die eigene Rolle nicht ändern'
);
select lives_ok(
  format($$select public.admin_update_user(%L, 'freigegeben', 'pilot')$$, tests.id('neu')),
  'Admin gibt einen ausstehenden Nutzer frei'
);
select tests.als(tests.id('neu'));
select is((select count(*)::int from public.aircraft where kennzeichen like 'D-TST%'), 2, 'Nach der Freigabe sieht der Nutzer die Flugzeuge');

-- -----------------------------------------------------------------------------
-- Melden, „vorläufig nicht flugklar“, Sichtbarkeit fremder Meldungen
-- -----------------------------------------------------------------------------
select tests.als(tests.id('p1'));
select set_config('tests.r1', public.report_create(tests.id('t1'), 'Fahrtmesser spinnt', true)::text, true);
select is(tests.ampel(tests.id('t1')), 'rot', 'vorläufig nicht flugklar macht das Flugzeug sofort rot');

select tests.als(tests.id('p2'));
select is(tests.ampel(tests.id('t1')), 'rot', 'rot ist auch für andere Piloten sichtbar');
select is((select count(*)::int from public.reports where id = tests.id('r1')), 0, 'Pilot sieht fremde Rohmeldungen nicht');
select is((select anzahl_in_pruefung from public.aircraft_overview where id = tests.id('t1')), 1, 'Pilot sieht „1 Meldung in Prüfung“');
select is((select count(*)::int from public.report_events where report_id = tests.id('r1')), 0, 'Pilot sieht den Verlauf fremder, ungeprüfter Meldungen nicht');
select is(
  (select count(*)::int from public.profile_names where id = tests.id('p1')),
  0, 'Pilot sieht den Namen fremder Melder nicht'
);
select is(
  (select count(*)::int from public.profile_names where id = tests.id('wart')),
  1, 'Pilot sieht den Namen der Warte'
);
select throws_ok(
  format($$select public.report_comment(%L, 'Ich auch')$$, tests.id('r1')),
  'P0002', null, 'Pilot kann fremde Meldungen nicht kommentieren'
);

select tests.als(tests.id('p1'));
select is((select count(*)::int from public.reports where id = tests.id('r1')), 1, 'Melder sieht die eigene Meldung');
select lives_ok(
  format($$select public.report_comment(%L, 'Nachtrag: nur bei Nässe')$$, tests.id('r1')),
  'Melder kann einen Nachtrag schreiben'
);
select throws_ok(
  format($$select public.report_comment(%L, 'geheim', true)$$, tests.id('r1')),
  '42501', null, 'Melder kann keine internen Kommentare schreiben'
);

-- -----------------------------------------------------------------------------
-- Werkstatt: Einstufen Kat 2 mit Pilotenhinweis, Kommentare
-- -----------------------------------------------------------------------------
select tests.als(tests.id('p1'));
select throws_ok(
  format($$select public.report_einstufen(%L, 2::smallint, 'Winterarbeit')$$, tests.id('r1')),
  '42501', null, 'Pilot kann nicht einstufen'
);

select tests.als(tests.id('wart'));
select is((select count(*)::int from public.reports where id = tests.id('r1')), 1, 'Wart sieht alle Meldungen');
select throws_ok(
  format($$select public.report_einstufen(%L, 2::smallint, null)$$, tests.id('r1')),
  '22023', null, 'Kat 2 braucht ein Ziel'
);
select lives_ok(
  format($$select public.report_einstufen(%L, 2::smallint, 'Winterarbeit 26/27', 'Zeigt etwas zu wenig an, geprüft.', true)$$, tests.id('r1')),
  'Wart stuft als Kat 2 mit sichtbarem Pilotenhinweis ein'
);
select lives_ok(
  format($$select public.report_comment(%L, 'Intern: Ersatzteil bestellt', true)$$, tests.id('r1')),
  'Wart schreibt einen internen Kommentar'
);
select lives_ok(
  format($$select public.report_comment(%L, 'Danke, ist notiert!', false)$$, tests.id('r1')),
  'Wart schreibt eine Rückmeldung an den Melder'
);
select is(tests.ampel(tests.id('t1')), 'gelb', 'Kat 2 mit sichtbarem Hinweis macht das Flugzeug gelb');

select tests.als(tests.id('p2'));
select is(
  (select hinweise -> 0 ->> 'pilotenhinweis' from public.aircraft_overview where id = tests.id('t1')),
  'Zeigt etwas zu wenig an, geprüft.', 'Der Pilotenhinweis ist für alle Piloten sichtbar'
);
select is(
  (select count(*)::int from public.report_events where report_id = tests.id('r1') and typ = 'kategorie'),
  1, 'Andere Piloten sehen die Einstufung im Verlauf'
);
select is(
  (select count(*)::int from public.report_events where report_id = tests.id('r1') and typ = 'kommentar'),
  0, 'Andere Piloten sehen keine Kommentare zu fremden Meldungen'
);

select tests.als(tests.id('p1'));
select is(
  (select count(*)::int from public.report_events where report_id = tests.id('r1') and typ = 'kommentar' and text = 'Danke, ist notiert!'),
  1, 'Melder sieht die Rückmeldung'
);
select is(
  (select count(*)::int from public.report_events where report_id = tests.id('r1') and intern),
  0, 'Melder sieht keine internen Kommentare'
);

-- -----------------------------------------------------------------------------
-- Kat 1: rot, Erledigen nur mit Bestätigung „wieder flugklar“
-- -----------------------------------------------------------------------------
select tests.als(tests.id('wart'));
select throws_ok(
  format($$select public.report_einstufen(%L, 1::smallint)$$, tests.id('r1')),
  '22023', null, 'Kat 1 braucht einen Sperrgrund'
);
select lives_ok(
  format($$select public.report_einstufen(%L, 1::smallint, null, 'Fahrtmesser ausgefallen')$$, tests.id('r1')),
  'Wart stuft auf Kat 1 um'
);
select is(tests.ampel(tests.id('t1')), 'rot', 'Offene Kat 1 macht das Flugzeug rot');
select throws_ok(
  format($$select public.report_set_status(%L, 'erledigt')$$, tests.id('r1')),
  '22023', null, 'Kat 1 erledigen ohne Bestätigung „flugklar“ geht nicht'
);
select lives_ok(
  format($$select public.report_set_status(%L, 'erledigt', 'Fahrtmesser getauscht', true)$$, tests.id('r1')),
  'Kat 1 erledigen mit Bestätigung'
);
select is(tests.ampel(tests.id('t1')), 'gruen', 'Nach dem Erledigen ist das Flugzeug wieder grün');

-- -----------------------------------------------------------------------------
-- Kat 3: Begründung Pflicht, wird Rückmeldung
-- -----------------------------------------------------------------------------
select tests.als(tests.id('p2'));
select set_config('tests.r2', public.report_create(tests.id('t2'), 'Reifen etwas weich')::text, true);
select tests.als(tests.id('wart'));
select throws_ok(
  format($$select public.report_einstufen(%L, 3::smallint)$$, tests.id('r2')),
  '22023', null, 'Kat 3 braucht eine Begründung'
);
select lives_ok(
  format($$select public.report_einstufen(%L, 3::smallint, p_begruendung => 'Luftdruck geprüft, in Ordnung')$$, tests.id('r2')),
  'Wart legt als Kat 3 ab'
);
select tests.als(tests.id('p2'));
select is(
  (select count(*)::int from public.report_events where report_id = tests.id('r2') and typ = 'kommentar'),
  1, 'Melder sieht die Begründung der Kat-3-Ablage'
);

-- -----------------------------------------------------------------------------
-- Manuelle Sperre
-- -----------------------------------------------------------------------------
select tests.als(tests.id('p1'));
select throws_ok(
  format($$select public.aircraft_sperren(%L, 'Test')$$, tests.id('t2')),
  '42501', null, 'Pilot kann nicht sperren'
);
select tests.als(tests.id('wart'));
select throws_ok(
  format($$select public.aircraft_sperren(%L, '  ')$$, tests.id('t2')),
  '22023', null, 'Sperren braucht einen Grund'
);
select lives_ok(
  format($$select public.aircraft_sperren(%L, 'Jahresnachprüfung')$$, tests.id('t2')),
  'Wart kann sperren'
);
select tests.als(tests.id('p1'));
select is(tests.ampel(tests.id('t2')), 'rot', 'Manuelle Sperre macht das Flugzeug rot');
select is(
  (select sperrgruende from public.aircraft_overview where id = tests.id('t2')),
  array['Jahresnachprüfung'], 'Piloten sehen den Sperrgrund'
);
select is(
  (select count(*)::int from public.aircraft_verlauf where aircraft_id = tests.id('t2') and typ = 'sperre' and user_name is not null),
  1, 'Piloten sehen die Sperre mit dem Namen des Warts im Verlauf'
);
select tests.als(tests.id('wart'));
select lives_ok(
  format($$select public.aircraft_entsperren(%L, 'Prüfung abgeschlossen')$$, tests.id('t2')),
  'Wart kann entsperren'
);
select is(tests.ampel(tests.id('t2')), 'gruen', 'Nach dem Entsperren ist das Flugzeug grün');

-- -----------------------------------------------------------------------------
-- Fotos: nur zur eigenen, neuen Meldung, höchstens 3
-- -----------------------------------------------------------------------------
select tests.als(tests.id('p1'));
select set_config('tests.r3', public.report_create(tests.id('t2'), 'Delle im Rumpf')::text, true);
select lives_ok(
  format($$insert into public.report_photos (report_id, storage_path) values (%L, %L || '/1.jpg'), (%L, %L || '/2.jpg'), (%L, %L || '/3.jpg')$$,
    tests.id('r3'), tests.id('r3'), tests.id('r3'), tests.id('r3'), tests.id('r3'), tests.id('r3')),
  'Melder kann 3 Fotos zur eigenen Meldung speichern'
);
select throws_ok(
  format($$insert into public.report_photos (report_id, storage_path) values (%L, %L || '/4.jpg')$$, tests.id('r3'), tests.id('r3')),
  'P0001', null, 'Ein 4. Foto wird abgelehnt'
);
-- Eigene Meldung ohne Fotos, damit die 3-Foto-Grenze die folgenden Prüfungen nicht verdeckt
select set_config('tests.r4', public.report_create(tests.id('t2'), 'Kratzer an der Haube')::text, true);
select throws_ok(
  format($$insert into public.report_photos (report_id, storage_path) values (%L, 'fremd/1.jpg')$$, tests.id('r4')),
  '42501', null, 'Foto-Pfad muss zur Meldung passen'
);
select tests.als(tests.id('p2'));
select throws_ok(
  format($$insert into public.report_photos (report_id, storage_path) values (%L, %L || '/x.jpg')$$, tests.id('r4'), tests.id('r4')),
  '42501', null, 'Fremde können keine Fotos zu einer Meldung hinzufügen'
);
select is((select count(*)::int from public.report_photos where report_id = tests.id('r3')), 0, 'Fremde Piloten sehen keine Fotos fremder Meldungen');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('report-photos', %L || '/hack.jpg')$$, tests.id('r3')),
  '42501', null, 'Storage: Fremde können nicht in den Ordner einer fremden Meldung hochladen'
);
select tests.als(tests.id('p1'));
select lives_ok(
  format($$insert into storage.objects (bucket_id, name) values ('report-photos', %L || '/1.jpg')$$, tests.id('r3')),
  'Storage: Melder kann in den Ordner der eigenen Meldung hochladen'
);

select tests.als(null);
select * from finish();
rollback;
