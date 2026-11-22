-- =============================================================================
-- Instandhaltung v0.3: Beobachtung, Archiv-Maßnahme, Betriebsstunden, Fristen,
-- Wartungsprogramme (pgTAP). Läuft in einer Transaktion und wird zurückgerollt.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(47);

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

create function tests.id(p_name text) returns uuid language sql as $$
  select current_setting('tests.' || p_name)::uuid
$$;

grant execute on all functions in schema tests to anon, authenticated;

select tests.nutzer('30000000-0000-4000-a000-000000000001', 'admin@ih.test', 'admin', 'freigegeben');
select tests.nutzer('30000000-0000-4000-a000-000000000002', 'wart@ih.test', 'wart', 'freigegeben');
select tests.nutzer('30000000-0000-4000-a000-000000000003', 'pilot@ih.test', 'pilot', 'freigegeben');
select tests.nutzer('30000000-0000-4000-a000-000000000004', 'pilot2@ih.test', 'pilot', 'freigegeben');
select set_config('tests.admin', '30000000-0000-4000-a000-000000000001', true);
select set_config('tests.wart', '30000000-0000-4000-a000-000000000002', true);
select set_config('tests.pilot', '30000000-0000-4000-a000-000000000003', true);
select set_config('tests.pilot2', '30000000-0000-4000-a000-000000000004', true);

insert into public.aircraft (id, kennzeichen, muster, art) values
  ('30000000-0000-4000-b000-000000000001', 'D-IH01', 'Testmuster', 'segler'),
  ('30000000-0000-4000-b000-000000000002', 'D-IH02', 'Testmuster', 'ul');
select set_config('tests.f1', '30000000-0000-4000-b000-000000000001', true);
select set_config('tests.f2', '30000000-0000-4000-b000-000000000002', true);

-- -----------------------------------------------------------------------------
-- Grundsätzliches
-- -----------------------------------------------------------------------------
select is_empty(
  $$select tablename from pg_tables where schemaname = 'public' and not rowsecurity$$,
  'RLS ist auf allen Tabellen in public aktiv (auch Fristen, Zähler, Programme)'
);
select is_empty(
  $$select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')$$,
  'anon darf keine Funktion in public ausführen'
);

-- -----------------------------------------------------------------------------
-- Unter Beobachtung
-- -----------------------------------------------------------------------------
select tests.als(tests.id('pilot'));
select set_config('tests.r1', public.report_create(tests.id('f1'), 'Motor läuft im Leerlauf etwas rau')::text, true);

select tests.als(tests.id('wart'));
select throws_ok(
  format($$select public.report_einstufen(%L, 3::smallint, p_begruendung => 'Geprüft', p_beobachten => true)$$, tests.id('r1')),
  '22023', null, 'Beobachtung braucht einen Hinweis für Piloten'
);
select lives_ok(
  format($$select public.report_einstufen(%L, 3::smallint, p_pilotenhinweis => 'Leerlauf etwas rau, bekannt. Auffälligkeiten bitte melden.', p_begruendung => 'Vergaser geprüft, in Ordnung', p_beobachten => true)$$, tests.id('r1')),
  'Wart stuft als Kat 3 unter Beobachtung ein'
);
select is(
  (select status::text || '/' || beobachten::text || '/' || massnahme from public.reports where id = tests.id('r1')),
  'abgelegt/true/Vergaser geprüft, in Ordnung',
  'Beobachtung: abgelegt, beobachtet, Begründung als Maßnahme'
);

select tests.als(tests.id('pilot2'));
select is(
  (select ampel::text from public.aircraft_overview where id = tests.id('f1')),
  'gruen', 'Beobachtung ändert die Ampel nicht'
);
select is(
  (select jsonb_array_length(beobachtungen) from public.aircraft_overview where id = tests.id('f1')),
  1, 'Andere Piloten sehen die Beobachtung am Luftfahrzeug'
);
select is(
  (select beobachtungen -> 0 ->> 'pilotenhinweis' from public.aircraft_overview where id = tests.id('f1')),
  'Leerlauf etwas rau, bekannt. Auffälligkeiten bitte melden.', 'Beobachtung zeigt den Pilotenhinweis'
);
select is(
  (select count(*)::int from public.aircraft_verlauf where report_id = tests.id('r1') and typ = 'kategorie'),
  1, 'Andere Piloten sehen die Einstufung „unter Beobachtung“ im Verlauf'
);
select is(
  (select count(*)::int from public.aircraft_verlauf where report_id = tests.id('r1') and typ = 'kommentar'),
  0, 'Andere Piloten sehen die Begründung (Rückmeldung) nicht'
);
select throws_ok(
  format($$select public.report_beobachtung_beenden(%L, 'Erledigt')$$, tests.id('r1')),
  '42501', null, 'Piloten können keine Beobachtung beenden'
);

select tests.als(tests.id('wart'));
select throws_ok(
  format($$select public.report_beobachtung_beenden(%L, '  ')$$, tests.id('r1')),
  '22023', null, 'Beobachtung beenden braucht ein Ergebnis'
);
select lives_ok(
  format($$select public.report_beobachtung_beenden(%L, 'Seit 10 Flügen unauffällig')$$, tests.id('r1')),
  'Wart beendet die Beobachtung'
);
select throws_ok(
  format($$select public.report_beobachtung_beenden(%L, 'Nochmal')$$, tests.id('r1')),
  '22023', null, 'Beendete Beobachtung kann nicht nochmal beendet werden'
);

select tests.als(tests.id('pilot2'));
select is(
  (select jsonb_array_length(beobachtungen) from public.aircraft_overview where id = tests.id('f1')),
  0, 'Nach dem Beenden ist die Beobachtung für Piloten weg'
);

-- Umstufen von Beobachtung auf Kat 2 räumt Beobachtung und Maßnahme auf
select tests.als(tests.id('pilot'));
select set_config('tests.r2', public.report_create(tests.id('f1'), 'Kabinenhaube klemmt leicht')::text, true);
select tests.als(tests.id('wart'));
select public.report_einstufen(tests.id('r2'), 3::smallint, p_pilotenhinweis => 'Haube klemmt, bekannt', p_begruendung => 'Beobachten', p_beobachten => true);
select lives_ok(
  format($$select public.report_einstufen(%L, 2::smallint, 'Winterarbeit')$$, tests.id('r2')),
  'Beobachtung kann auf Kat 2 umgestuft werden'
);
select is(
  (select beobachten::text || '/' || coalesce(massnahme, 'leer') from public.reports where id = tests.id('r2')),
  'false/leer', 'Umstufen auf Kat 2 beendet die Beobachtung und leert die Maßnahme'
);

-- Archiv: Maßnahme beim Erledigen
select lives_ok(
  format($$select public.report_set_status(%L, 'erledigt', 'Führung gereinigt und gefettet')$$, tests.id('r2')),
  'Kat 2 erledigen'
);
select is(
  (select massnahme from public.report_list where id = tests.id('r2')),
  'Führung gereinigt und gefettet', 'report_list zeigt die Maßnahme fürs Archiv'
);

-- -----------------------------------------------------------------------------
-- Betriebsstunden
-- -----------------------------------------------------------------------------
select tests.als(tests.id('pilot'));
select throws_ok(
  format($$select public.aircraft_counter_add(%L, public.heute(), 6000)$$, tests.id('f2')),
  '42501', null, 'Piloten können keine Betriebsstunden erfassen'
);
select is((select count(*)::int from public.aircraft_counters), 0, 'Piloten sehen keine Zählerstände');

select tests.als(tests.id('wart'));
select lives_ok(
  format($$select public.aircraft_counter_add(%L, public.heute() - 10, 6000, 4000)$$, tests.id('f2')),
  'Wart erfasst einen Zählerstand'
);
select lives_ok(
  format($$select public.aircraft_counter_add(%L, public.heute(), 6300, 4010, 'Nach Flugtag')$$, tests.id('f2')),
  'Wart erfasst einen späteren Zählerstand'
);
select throws_ok(
  format($$select public.aircraft_counter_add(%L, public.heute(), 5900)$$, tests.id('f2')),
  '22023', null, 'Zählerstand darf nicht kleiner als ein früherer sein'
);
select throws_ok(
  format($$select public.aircraft_counter_add(%L, public.heute() - 5, 6400)$$, tests.id('f2')),
  '22023', null, 'Zählerstand darf nicht größer als ein späterer sein'
);
select throws_ok(
  format($$select public.aircraft_counter_add(%L, public.heute() + 1, 6400)$$, tests.id('f2')),
  '22023', null, 'Zählerstand darf nicht in der Zukunft liegen'
);
select is(
  (select betriebsminuten from public.aircraft_zaehler where aircraft_id = tests.id('f2')),
  6300, 'aircraft_zaehler liefert den neuesten Stand'
);

-- -----------------------------------------------------------------------------
-- Fristen
-- -----------------------------------------------------------------------------
select tests.als(tests.id('pilot'));
select throws_ok(
  format($$select public.deadline_save(%L, 'Gurte', p_faellig_am => public.heute())$$, tests.id('f2')),
  '42501', null, 'Piloten können keine Fristen anlegen'
);

select tests.als(tests.id('wart'));
select throws_ok(
  format($$select public.deadline_save(%L, 'Ohne Fälligkeit')$$, tests.id('f2')),
  '22023', null, 'Frist braucht Datum oder Stundenstand'
);
-- 50-h-Kontrolle: fällig bei 6600 Minuten (110 h), Intervall 50 h
select set_config('tests.d1', public.deadline_save(
  tests.id('f2'), '50-h-Kontrolle', p_faellig_bei_minuten => 6600, p_intervall_minuten => 3000
)::text, true);
select is(
  (select stand || '/' || rest_minuten from public.deadline_list where id = tests.id('d1')),
  'bald/300', '50-h-Kontrolle: noch 5 h, also bald fällig (Vorlauf 10 h)'
);
-- Anschnallgurte: Datum in der Vergangenheit, ohne Intervall
select set_config('tests.d2', public.deadline_save(
  tests.id('f2'), 'Anschnallgurte tauschen', p_faellig_am => public.heute() - 1
)::text, true);
select is(
  (select stand from public.deadline_list where id = tests.id('d2')), 'ueberfaellig', 'Abgelaufenes Datum ist überfällig'
);
-- Jahresnachprüfung: Datum weit weg, Intervall 12 Monate
select set_config('tests.d3', public.deadline_save(
  tests.id('f2'), 'Jahresnachprüfung', p_faellig_am => public.heute() + 200, p_intervall_monate => 12
)::text, true);
select is((select stand from public.deadline_list where id = tests.id('d3')), 'ok', 'Fernes Datum ist ok');

select tests.als(tests.id('pilot'));
select is((select count(*)::int from public.deadline_list), 0, 'Piloten sehen keine Fristen');

select tests.als(tests.id('wart'));
select lives_ok(
  format($$select public.deadline_erledigen(%L, public.heute(), p_text => 'Kontrolle ohne Befund')$$, tests.id('d1')),
  'Wart erledigt die 50-h-Kontrolle (Stundenstand aus dem Zähler)'
);
select is(
  (select faellig_bei_minuten || '/' || zuletzt_bei_minuten || '/' || aktiv from public.deadlines where id = tests.id('d1')),
  '9300/6300/true', 'Nächste Fälligkeit = Stand bei Durchführung + Intervall'
);
select lives_ok(
  format($$select public.deadline_erledigen(%L, public.heute())$$, tests.id('d3')),
  'Wart erledigt die Jahresnachprüfung'
);
select is(
  (select faellig_am from public.deadlines where id = tests.id('d3')),
  (public.heute() + interval '12 months')::date, 'Nächste Jahresnachprüfung in 12 Monaten'
);
select lives_ok(
  format($$select public.deadline_erledigen(%L, public.heute())$$, tests.id('d2')),
  'Frist ohne Intervall erledigen'
);
select is(
  (select stand from public.deadline_list where id = tests.id('d2')),
  'abgeschlossen', 'Frist ohne Intervall ist danach abgeschlossen'
);
select throws_ok(
  format($$select public.deadline_abschliessen(%L, '')$$, tests.id('d1')),
  '22023', null, 'Abschließen braucht eine Begründung'
);
select is(
  (select count(*)::int from public.deadline_verlauf where deadline_id = tests.id('d1')),
  2, 'Frist hat Verlauf (angelegt, erledigt)'
);

-- -----------------------------------------------------------------------------
-- Wartungsprogramme
-- -----------------------------------------------------------------------------
select tests.als(tests.id('pilot'));
select throws_ok(
  $$select public.template_save('50-h-Kontrolle UL', p_teilschritte => array['Öl'])$$,
  '42501', null, 'Piloten können keine Wartungsprogramme anlegen'
);

select tests.als(tests.id('wart'));
select set_config('tests.v1', public.template_save(
  '50-h-Kontrolle UL', 'Nach Wartungshandbuch', 'C42',
  array['Ölwechsel', '  ', 'Zündkerzen prüfen', 'Reifendruck']
)::text, true);
select is(
  (select count(*)::int from public.maintenance_template_items where template_id = tests.id('v1')),
  3, 'Leere Teilschritte werden ignoriert'
);
select set_config('tests.a1', public.wartung_starten(tests.id('f2'), tests.id('v1'), p_sperren => true)::text, true);
select is(
  (select anzahl_schritte || '/' || template_id::text from public.task_list where id = tests.id('a1')),
  '3/' || tests.id('v1')::text, 'Wartung beginnen legt eine Aufgabe mit den Teilschritten an'
);
select is(
  (select gesperrt from public.aircraft where id = tests.id('f2')), true, 'Wartung beginnen kann das Luftfahrzeug sperren'
);
select lives_ok(
  format($$select public.template_set_aktiv(%L, false)$$, tests.id('v1')),
  'Wart kann ein Wartungsprogramm archivieren'
);
select throws_ok(
  format($$select public.wartung_starten(%L, %L)$$, tests.id('f2'), tests.id('v1')),
  'P0002', null, 'Archivierte Programme können nicht gestartet werden'
);

select tests.als(null);
select * from finish();
rollback;
