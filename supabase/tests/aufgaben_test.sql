-- =============================================================================
-- Werkstatt-Aufgaben, Meldungsnummern, report_list, Deaktivieren (pgTAP)
-- Läuft in einer Transaktion und wird am Ende zurückgerollt.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(38);

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

select tests.nutzer('20000000-0000-4000-a000-000000000001', 'admin@aufgaben.test', 'admin', 'freigegeben');
select tests.nutzer('20000000-0000-4000-a000-000000000002', 'wart@aufgaben.test', 'wart', 'freigegeben');
select tests.nutzer('20000000-0000-4000-a000-000000000003', 'pilot@aufgaben.test', 'pilot', 'freigegeben');
select set_config('tests.admin', '20000000-0000-4000-a000-000000000001', true);
select set_config('tests.wart', '20000000-0000-4000-a000-000000000002', true);
select set_config('tests.pilot', '20000000-0000-4000-a000-000000000003', true);

insert into public.aircraft (id, kennzeichen, muster, art) values
  ('20000000-0000-4000-b000-000000000001', 'D-AUF1', 'Testmuster', 'segler'),
  ('20000000-0000-4000-b000-000000000002', 'D-AUF2', 'Testmuster', 'segler');
select set_config('tests.f1', '20000000-0000-4000-b000-000000000001', true);
select set_config('tests.f2', '20000000-0000-4000-b000-000000000002', true);

-- -----------------------------------------------------------------------------
-- Grundsätzliches
-- -----------------------------------------------------------------------------
select is_empty(
  $$select tablename from pg_tables where schemaname = 'public' and not rowsecurity$$,
  'RLS ist auf allen Tabellen in public aktiv (auch Aufgaben)'
);

select tests.als(tests.id('pilot'));
select set_config('tests.r1', public.report_create(tests.id('f1'), 'Bremse zieht schief')::text, true);
select isnt((select nr from public.reports where id = tests.id('r1')), null, 'Meldungen bekommen eine Nummer');
select is(
  (select count(*)::int from public.report_list where id = tests.id('r1') and kennzeichen = 'D-AUF1' and melder_name is not null),
  1, 'Melder sieht die eigene Meldung in report_list mit Kennzeichen und Namen'
);

-- -----------------------------------------------------------------------------
-- Piloten sehen und dürfen nichts
-- -----------------------------------------------------------------------------
select throws_ok(
  $$select public.task_create('Test')$$,
  '42501', null, 'Pilot kann keine Aufgabe anlegen'
);

-- -----------------------------------------------------------------------------
-- Anlegen
-- -----------------------------------------------------------------------------
select tests.als(tests.id('wart'));
select throws_ok($$select public.task_create('  ')$$, '22023', null, 'Aufgabe braucht einen Titel');
select throws_ok(
  format($$select public.task_create('Test', p_zustaendig_id => %L)$$, tests.id('pilot')),
  '22023', null, 'Zuständig kann nur ein Wart sein'
);
select throws_ok(
  format($$select public.task_create('Test', p_aircraft_id => %L, p_report_id => %L)$$, tests.id('f2'), tests.id('r1')),
  '22023', null, 'Meldung und Flugzeug müssen zusammenpassen'
);
select set_config('tests.a1', public.task_create(
  'Bremse einstellen', 'Bremsseil prüfen', null, tests.id('r1'), 'hoch', public.heute() - 1,
  tests.id('wart'), array['Seil prüfen', 'Einstellen', '  ']
)::text, true);
select is(
  (select aircraft_id from public.tasks where id = tests.id('a1')), tests.id('f1'),
  'Aufgabe zu einer Meldung übernimmt deren Flugzeug'
);
select is(
  (select count(*)::int from public.task_items where task_id = tests.id('a1')), 2,
  'Leere Teilschritte werden ignoriert'
);
select is(
  (select count(*)::int from public.task_events where task_id = tests.id('a1') and typ = 'erstellt'), 1,
  'Anlegen steht im Verlauf der Aufgabe'
);
select is(
  (select count(*)::int from public.report_events where report_id = tests.id('r1') and intern and text like 'Aufgabe A-%'), 1,
  'Anlegen steht intern im Verlauf der Meldung'
);
select is(
  (select ueberfaellig from public.task_list where id = tests.id('a1')), true,
  'Aufgabe mit Frist gestern ist überfällig'
);
select is(
  (select anzahl_aufgaben_offen from public.report_list where id = tests.id('r1')), 1,
  'report_list zählt offene Aufgaben zur Meldung'
);

-- Pilot sieht die Aufgabe nicht
select tests.als(tests.id('pilot'));
select is((select count(*)::int from public.tasks), 0, 'Pilot sieht keine Aufgaben');
select is((select count(*)::int from public.task_list), 0, 'Pilot sieht keine Aufgaben in task_list');
select is((select count(*)::int from public.task_items), 0, 'Pilot sieht keine Teilschritte');
select is((select count(*)::int from public.task_events), 0, 'Pilot sieht keinen Aufgaben-Verlauf');
select is(
  (select count(*)::int from public.report_events where report_id = tests.id('r1') and text like 'Aufgabe A-%'), 0,
  'Melder sieht den internen Aufgaben-Hinweis an seiner Meldung nicht'
);
select throws_ok(
  format($$select public.task_comment(%L, 'Hallo')$$, tests.id('a1')),
  '42501', null, 'Pilot kann Aufgaben nicht kommentieren'
);
select throws_ok(
  format($$update public.tasks set status = 'erledigt' where id = %L$$, tests.id('a1')),
  '42501', null, 'Direktes UPDATE auf tasks ist verboten'
);

-- -----------------------------------------------------------------------------
-- Teilschritte, Arbeitsstand, Status
-- -----------------------------------------------------------------------------
select tests.als(tests.id('wart'));
select lives_ok(
  format($$select public.task_item_set((select id from public.task_items where task_id = %L and text = 'Seil prüfen'), true)$$, tests.id('a1')),
  'Wart hakt einen Teilschritt ab'
);
select is((select status from public.tasks where id = tests.id('a1')), 'in_arbeit'::public.aufgabe_status,
  'Erster Haken setzt die Aufgabe auf In Arbeit');
select lives_ok(
  format($$select public.task_comment(%L, 'Seil ist gelängt, halb eingestellt. Morgen weiter.')$$, tests.id('a1')),
  'Wart schreibt einen Arbeitsstand'
);
select throws_ok(
  format($$select public.task_set_status(%L, 'erledigt')$$, tests.id('a1')),
  '22023', null, 'Erledigt geht nicht mit offenen Teilschritten'
);
select throws_ok(
  format($$select public.task_set_status(%L, 'wartet')$$, tests.id('a1')),
  '22023', null, 'Wartet braucht einen Grund'
);
select lives_ok(
  format($$select public.task_set_status(%L, 'wartet', 'Neues Seil bestellt')$$, tests.id('a1')),
  'Wart setzt auf Wartet mit Grund'
);
select is((select wartet_auf from public.tasks where id = tests.id('a1')), 'Neues Seil bestellt', 'Grund wird gespeichert');
select lives_ok(
  format($$select public.task_update(%L, 'Bremse einstellen', 'Bremsseil prüfen', %L, 'normal', public.heute() + 7, %L)$$,
    tests.id('a1'), tests.id('f1'), tests.id('admin')),
  'Wart verschiebt die Frist und gibt die Aufgabe ab'
);
select is(
  (select count(*)::int from public.task_events where task_id = tests.id('a1') and typ = 'geaendert' and text like '%Frist:%' and text like '%Zuständig:%'),
  1, 'Änderung von Frist und Zuständigkeit steht im Verlauf'
);
select lives_ok(
  format($$select public.task_item_set((select id from public.task_items where task_id = %L and text = 'Einstellen'), true)$$, tests.id('a1')),
  'Letzten Teilschritt abhaken'
);
select lives_ok(
  format($$select public.task_set_status(%L, 'erledigt', 'Seil getauscht und eingestellt')$$, tests.id('a1')),
  'Erledigt, wenn alle Teilschritte abgehakt sind'
);
select throws_ok(
  format($$select public.task_item_add(%L, 'Noch was')$$, tests.id('a1')),
  '22023', null, 'An abgeschlossenen Aufgaben keine Teilschritte mehr'
);
select throws_ok(
  format($$select public.task_set_status(%L, 'in_arbeit')$$, tests.id('a1')),
  '22023', null, 'Wieder öffnen braucht eine Begründung'
);
select lives_ok(
  format($$select public.task_set_status(%L, 'in_arbeit', 'Bremse zieht wieder')$$, tests.id('a1')),
  'Wieder öffnen mit Begründung'
);

-- -----------------------------------------------------------------------------
-- Meldung erledigen braucht eine Maßnahme
-- -----------------------------------------------------------------------------
select lives_ok(
  format($$select public.report_einstufen(%L, 2::smallint, 'Schlechtwettertag')$$, tests.id('r1')),
  'Wart stuft Kat 2 ein'
);
select throws_ok(
  format($$select public.report_set_status(%L, 'erledigt')$$, tests.id('r1')),
  '22023', null, 'Erledigen ohne Maßnahme geht nicht'
);

-- -----------------------------------------------------------------------------
-- Deaktivieren
-- -----------------------------------------------------------------------------
select tests.als(tests.id('admin'));
select lives_ok(
  format($$select public.admin_update_user(%L, 'deaktiviert', 'pilot')$$, tests.id('pilot')),
  'Admin kann ein Konto deaktivieren'
);
select tests.als(tests.id('pilot'));
select is((select count(*)::int from public.aircraft_overview), 0, 'Deaktiviertes Konto sieht keine Flugzeuge');

select tests.als(null);
select * from finish();
rollback;
