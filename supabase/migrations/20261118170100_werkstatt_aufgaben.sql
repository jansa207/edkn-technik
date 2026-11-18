-- =============================================================================
-- Werkstatt-Aufgaben, Meldungsnummern, Listen-View für Meldungen
--
-- * Aufgaben (tasks) sind die interne To-do-Liste der Werkstatt: Titel, Frist,
--   Priorität, zuständiger Wart, Teilschritte und Arbeitsstand-Kommentare.
--   Optional an ein Flugzeug und/oder eine Meldung gehängt.
-- * Aufgaben sind KEINE Wartungsfristen (Stunden/Starts) und kein Bordbuch-Ersatz.
--   Sie haben keinen Einfluss auf die Ampel.
-- * Sichtbar nur für Warte und Admins. Schreiben nur über task_*-RPCs, die den
--   Verlauf (task_events) schreiben.
-- * Meldungen und Aufgaben bekommen fortlaufende Nummern (M-0001, A-0001),
--   damit man in der Halle über „M-0012“ reden kann.
-- * report_set_status: Beim Erledigen ist die durchgeführte Maßnahme Pflicht.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Nummern für Meldungen
-- -----------------------------------------------------------------------------
alter table public.reports add column nr integer generated always as identity;
alter table public.reports add constraint reports_nr_key unique (nr);
comment on column public.reports.nr is 'Fortlaufende Nummer für Anzeigen (M-0001).';

-- -----------------------------------------------------------------------------
-- Enums und Tabellen
-- -----------------------------------------------------------------------------
create type public.aufgabe_status as enum ('offen', 'in_arbeit', 'wartet', 'erledigt', 'verworfen');
create type public.aufgabe_prioritaet as enum ('niedrig', 'normal', 'hoch');
create type public.aufgabe_event_typ as enum ('erstellt', 'geaendert', 'status', 'kommentar', 'teilschritt');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  nr integer generated always as identity unique,
  aircraft_id uuid references public.aircraft (id) on delete restrict,
  report_id uuid references public.reports (id) on delete set null,
  titel text not null check (char_length(btrim(titel)) between 1 and 150),
  beschreibung text not null default '' check (char_length(beschreibung) <= 4000),
  status public.aufgabe_status not null default 'offen',
  prioritaet public.aufgabe_prioritaet not null default 'normal',
  faellig_am date,
  zustaendig_id uuid references public.profiles (id) on delete set null,
  wartet_auf text check (char_length(wartet_auf) <= 300),
  erstellt_von uuid references public.profiles (id) on delete set null,
  erledigt_von uuid references public.profiles (id) on delete set null,
  erledigt_am timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wartet_braucht_grund check (status <> 'wartet' or coalesce(btrim(wartet_auf), '') <> ''),
  constraint abgeschlossen_hat_datum check ((status in ('erledigt', 'verworfen')) = (erledigt_am is not null))
);
create index tasks_status_idx on public.tasks (status, faellig_am);
create index tasks_aircraft_idx on public.tasks (aircraft_id);
create index tasks_report_idx on public.tasks (report_id);
create index tasks_zustaendig_idx on public.tasks (zustaendig_id);
comment on table public.tasks is 'Werkstatt-Aufgaben (interne To-dos). Nur Warte/Admins. Änderungen nur über task_*-RPCs.';

create table public.task_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 300),
  erledigt boolean not null default false,
  erledigt_von uuid references public.profiles (id) on delete set null,
  erledigt_am timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index task_items_task_idx on public.task_items (task_id, position);
comment on table public.task_items is 'Teilschritte (Checkliste) einer Aufgabe.';

create table public.task_events (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  typ public.aufgabe_event_typ not null,
  text text check (char_length(text) <= 4000),
  created_at timestamptz not null default now()
);
create index task_events_task_idx on public.task_events (task_id, created_at);
comment on table public.task_events is 'Verlauf und Arbeitsstand-Kommentare einer Aufgabe. Nur von RPCs geschrieben.';

-- -----------------------------------------------------------------------------
-- Rechte und RLS: nur Warte/Admins lesen, niemand schreibt direkt
-- -----------------------------------------------------------------------------
revoke all on public.tasks, public.task_items, public.task_events from anon, authenticated;
grant select on public.tasks, public.task_items, public.task_events to authenticated;

alter table public.tasks enable row level security;
alter table public.task_items enable row level security;
alter table public.task_events enable row level security;

create policy tasks_select_wart on public.tasks for select to authenticated
  using ((select public.is_wart()));
create policy task_items_select_wart on public.task_items for select to authenticated
  using ((select public.is_wart()));
create policy task_events_select_wart on public.task_events for select to authenticated
  using ((select public.is_wart()));

-- -----------------------------------------------------------------------------
-- Views
-- -----------------------------------------------------------------------------

-- Heutiges Datum in deutscher Zeit (für „überfällig“)
create function public.heute()
returns date
language sql stable set search_path = ''
as $$
  select (now() at time zone 'Europe/Berlin')::date
$$;

-- Meldungen für Listen: mit Flugzeug, Namen, Fotoanzahl, letzter Aktivität.
-- security_invoker: die RLS von reports gilt (Warte alles, Melder nur eigene).
create view public.report_list
with (security_invoker = true)
as
  select
    r.id,
    r.nr,
    r.aircraft_id,
    a.kennzeichen,
    a.muster,
    r.melder_id,
    nullif(trim(concat_ws(' ', mp.vorname, mp.nachname)), '') as melder_name,
    r.text,
    r.kategorie,
    r.status,
    r.vorlaeufig_nicht_flugklar,
    r.ziel,
    r.pilotenhinweis,
    r.pilotenhinweis_sichtbar,
    r.eingestuft_von,
    nullif(trim(concat_ws(' ', ep.vorname, ep.nachname)), '') as eingestuft_von_name,
    r.eingestuft_am,
    r.erledigt_am,
    r.created_at,
    (select count(*) from public.report_photos ph where ph.report_id = r.id)::integer as anzahl_fotos,
    coalesce((select max(e.created_at) from public.report_events e where e.report_id = r.id), r.created_at)
      as letzte_aktivitaet,
    (select count(*) from public.tasks t
      where t.report_id = r.id and t.status not in ('erledigt', 'verworfen'))::integer as anzahl_aufgaben_offen
  from public.reports r
  join public.aircraft a on a.id = r.aircraft_id
  left join public.profile_names mp on mp.id = r.melder_id
  left join public.profile_names ep on ep.id = r.eingestuft_von;
comment on view public.report_list is 'Meldungen mit Flugzeug und Namen für Listen. Sichtbarkeit über RLS von reports.';

-- Aufgaben für Listen: mit Flugzeug, Namen, Fortschritt der Teilschritte, Überfälligkeit.
create view public.task_list
with (security_invoker = true)
as
  select
    t.id,
    t.nr,
    t.aircraft_id,
    a.kennzeichen,
    a.muster,
    t.report_id,
    r.nr as report_nr,
    t.titel,
    t.beschreibung,
    t.status,
    t.prioritaet,
    t.faellig_am,
    t.zustaendig_id,
    nullif(trim(concat_ws(' ', zp.vorname, zp.nachname)), '') as zustaendig_name,
    t.wartet_auf,
    t.erstellt_von,
    nullif(trim(concat_ws(' ', cp.vorname, cp.nachname)), '') as erstellt_von_name,
    t.erledigt_am,
    t.created_at,
    t.updated_at,
    (t.status not in ('erledigt', 'verworfen') and t.faellig_am < public.heute()) as ueberfaellig,
    (select count(*) from public.task_items i where i.task_id = t.id)::integer as anzahl_schritte,
    (select count(*) from public.task_items i where i.task_id = t.id and i.erledigt)::integer as anzahl_schritte_erledigt,
    (select count(*) from public.task_events e where e.task_id = t.id and e.typ = 'kommentar')::integer as anzahl_kommentare,
    coalesce((select max(e.created_at) from public.task_events e where e.task_id = t.id), t.created_at)
      as letzte_aktivitaet
  from public.tasks t
  left join public.aircraft a on a.id = t.aircraft_id
  left join public.reports r on r.id = t.report_id
  left join public.profile_names zp on zp.id = t.zustaendig_id
  left join public.profile_names cp on cp.id = t.erstellt_von;
comment on view public.task_list is 'Werkstatt-Aufgaben mit Namen und Fortschritt. Sichtbarkeit über RLS von tasks.';

-- Verlauf einer Aufgabe mit Namen
create view public.task_verlauf
with (security_invoker = true)
as
  select
    e.id,
    e.task_id,
    e.typ,
    e.text,
    e.created_at,
    e.user_id,
    nullif(trim(concat_ws(' ', pn.vorname, pn.nachname)), '') as user_name
  from public.task_events e
  left join public.profile_names pn on pn.id = e.user_id;

revoke all on public.report_list, public.task_list, public.task_verlauf from anon, authenticated;
grant select on public.report_list, public.task_list, public.task_verlauf to authenticated;

-- -----------------------------------------------------------------------------
-- Hilfen für die RPCs
-- -----------------------------------------------------------------------------
create function public.aufgabe_status_text(p_status public.aufgabe_status)
returns text
language sql immutable set search_path = ''
as $$
  select case p_status
    when 'offen' then 'Offen'
    when 'in_arbeit' then 'In Arbeit'
    when 'wartet' then 'Wartet'
    when 'erledigt' then 'Erledigt'
    when 'verworfen' then 'Verworfen'
  end
$$;

create function public.profil_name(p_id uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce(nullif(trim(concat_ws(' ', p.vorname, p.nachname)), ''), 'niemand')
  from (select 1) x
  left join public.profiles p on p.id = p_id
$$;

-- Zuständig darf nur ein freigegebener Wart oder Admin sein
create function public.pruefe_zustaendig(p_id uuid)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_id is not null and not exists (
    select 1 from public.profiles p
    where p.id = p_id and p.freigabe = 'freigegeben' and p.rolle in ('wart', 'admin')
  ) then
    raise exception 'Zuständig kann nur ein freigegebener Wart sein' using errcode = '22023';
  end if;
end;
$$;

-- Aufgabe sperren und prüfen, dass sie noch offen ist
create function public.offene_aufgabe(p_task_id uuid)
returns public.tasks
language plpgsql security definer set search_path = ''
as $$
declare
  v_task public.tasks;
begin
  select * into v_task from public.tasks where id = p_task_id for update;
  if not found then
    raise exception 'Aufgabe nicht gefunden' using errcode = 'P0002';
  end if;
  if v_task.status in ('erledigt', 'verworfen') then
    raise exception 'Die Aufgabe ist abgeschlossen. Bitte erst wieder öffnen.' using errcode = '22023';
  end if;
  return v_task;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPCs: Aufgaben
-- -----------------------------------------------------------------------------
create function public.task_create(
  p_titel text,
  p_beschreibung text default '',
  p_aircraft_id uuid default null,
  p_report_id uuid default null,
  p_prioritaet public.aufgabe_prioritaet default 'normal',
  p_faellig_am date default null,
  p_zustaendig_id uuid default null,
  p_teilschritte text[] default '{}'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_nr integer;
  v_aircraft uuid := p_aircraft_id;
  v_report public.reports;
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Aufgaben anlegen' using errcode = '42501';
  end if;
  if coalesce(btrim(p_titel), '') = '' then
    raise exception 'Bitte einen Titel angeben' using errcode = '22023';
  end if;

  if p_report_id is not null then
    select * into v_report from public.reports where id = p_report_id;
    if not found then
      raise exception 'Meldung nicht gefunden' using errcode = 'P0002';
    end if;
    if v_aircraft is null then
      v_aircraft := v_report.aircraft_id;
    elsif v_aircraft <> v_report.aircraft_id then
      raise exception 'Die Meldung gehört zu einem anderen Flugzeug' using errcode = '22023';
    end if;
  end if;
  if v_aircraft is not null and not exists (select 1 from public.aircraft where id = v_aircraft) then
    raise exception 'Flugzeug nicht gefunden' using errcode = 'P0002';
  end if;
  perform public.pruefe_zustaendig(p_zustaendig_id);

  insert into public.tasks (aircraft_id, report_id, titel, beschreibung, prioritaet, faellig_am, zustaendig_id, erstellt_von)
  values (
    v_aircraft, p_report_id, btrim(p_titel), btrim(coalesce(p_beschreibung, '')),
    coalesce(p_prioritaet, 'normal'), p_faellig_am, p_zustaendig_id, auth.uid()
  )
  returning id, nr into v_id, v_nr;

  insert into public.task_items (task_id, text, position)
  select v_id, btrim(s.text), s.pos::integer
  from unnest(coalesce(p_teilschritte, '{}')) with ordinality as s (text, pos)
  where coalesce(btrim(s.text), '') <> '';

  insert into public.task_events (task_id, user_id, typ, text)
  values (
    v_id, auth.uid(), 'erstellt',
    'Aufgabe angelegt'
      || case when p_zustaendig_id is not null then ' – zuständig: ' || public.profil_name(p_zustaendig_id) else '' end
      || case when p_faellig_am is not null then ' – fällig: ' || to_char(p_faellig_am, 'DD.MM.YYYY') else '' end
  );

  -- Verknüpfung auch im Verlauf der Meldung sichtbar (nur für Warte)
  if p_report_id is not null then
    insert into public.report_events (report_id, aircraft_id, user_id, typ, text, intern)
    values (p_report_id, v_aircraft, auth.uid(), 'kommentar',
            'Aufgabe A-' || lpad(v_nr::text, 4, '0') || ' angelegt: ' || btrim(p_titel), true);
  end if;

  return v_id;
end;
$$;

create function public.task_update(
  p_task_id uuid,
  p_titel text,
  p_beschreibung text,
  p_aircraft_id uuid,
  p_prioritaet public.aufgabe_prioritaet,
  p_faellig_am date,
  p_zustaendig_id uuid
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_alt public.tasks;
  v_aenderungen text[] := '{}'::text[];
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Aufgaben bearbeiten' using errcode = '42501';
  end if;
  v_alt := public.offene_aufgabe(p_task_id);
  if coalesce(btrim(p_titel), '') = '' then
    raise exception 'Bitte einen Titel angeben' using errcode = '22023';
  end if;
  if p_aircraft_id is not null and not exists (select 1 from public.aircraft where id = p_aircraft_id) then
    raise exception 'Flugzeug nicht gefunden' using errcode = 'P0002';
  end if;
  if v_alt.report_id is not null and p_aircraft_id is distinct from v_alt.aircraft_id then
    raise exception 'Das Flugzeug einer Aufgabe zu einer Meldung kann nicht geändert werden' using errcode = '22023';
  end if;
  perform public.pruefe_zustaendig(p_zustaendig_id);

  if btrim(p_titel) <> v_alt.titel then
    v_aenderungen := v_aenderungen || ('Titel: ' || btrim(p_titel));
  end if;
  if btrim(coalesce(p_beschreibung, '')) <> v_alt.beschreibung then
    v_aenderungen := v_aenderungen || 'Beschreibung geändert'::text;
  end if;
  if p_aircraft_id is distinct from v_alt.aircraft_id then
    v_aenderungen := v_aenderungen || ('Flugzeug: ' || coalesce(
      (select kennzeichen from public.aircraft where id = p_aircraft_id), 'keins'));
  end if;
  if p_prioritaet <> v_alt.prioritaet then
    v_aenderungen := v_aenderungen || ('Priorität: ' || initcap(p_prioritaet::text));
  end if;
  if p_faellig_am is distinct from v_alt.faellig_am then
    v_aenderungen := v_aenderungen || ('Frist: ' || coalesce(to_char(v_alt.faellig_am, 'DD.MM.YYYY'), 'keine')
      || ' → ' || coalesce(to_char(p_faellig_am, 'DD.MM.YYYY'), 'keine'));
  end if;
  if p_zustaendig_id is distinct from v_alt.zustaendig_id then
    v_aenderungen := v_aenderungen || ('Zuständig: ' || public.profil_name(p_zustaendig_id));
  end if;

  if cardinality(v_aenderungen) = 0 then
    return;
  end if;

  update public.tasks
  set titel = btrim(p_titel),
      beschreibung = btrim(coalesce(p_beschreibung, '')),
      aircraft_id = p_aircraft_id,
      prioritaet = coalesce(p_prioritaet, 'normal'),
      faellig_am = p_faellig_am,
      zustaendig_id = p_zustaendig_id,
      updated_at = now()
  where id = p_task_id;

  insert into public.task_events (task_id, user_id, typ, text)
  values (p_task_id, auth.uid(), 'geaendert', array_to_string(v_aenderungen, ' · '));
end;
$$;

-- Status ändern. wartet/verworfen/wieder öffnen brauchen einen Text.
-- Erledigt nur, wenn alle Teilschritte abgehakt sind.
create function public.task_set_status(p_task_id uuid, p_status public.aufgabe_status, p_text text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_alt public.tasks;
  v_text text := nullif(btrim(p_text), '');
  v_offen integer;
  v_event text;
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen den Status ändern' using errcode = '42501';
  end if;

  select * into v_alt from public.tasks where id = p_task_id for update;
  if not found then
    raise exception 'Aufgabe nicht gefunden' using errcode = 'P0002';
  end if;
  if v_alt.status = p_status then
    raise exception 'Die Aufgabe hat diesen Status schon' using errcode = '22023';
  end if;

  if v_alt.status in ('erledigt', 'verworfen') then
    if p_status not in ('offen', 'in_arbeit') then
      raise exception 'Eine abgeschlossene Aufgabe kann nur wieder geöffnet werden' using errcode = '22023';
    end if;
    if v_text is null then
      raise exception 'Bitte kurz begründen, warum die Aufgabe wieder geöffnet wird' using errcode = '22023';
    end if;
  end if;

  if p_status = 'wartet' and v_text is null then
    raise exception 'Bitte angeben, worauf gewartet wird (z. B. Ersatzteil bestellt)' using errcode = '22023';
  end if;
  if p_status = 'verworfen' and v_text is null then
    raise exception 'Bitte kurz begründen, warum die Aufgabe verworfen wird' using errcode = '22023';
  end if;
  if p_status = 'erledigt' then
    select count(*) into v_offen from public.task_items where task_id = p_task_id and not erledigt;
    if v_offen > 0 then
      raise exception 'Noch % offene Teilschritte. Abhaken, entfernen oder die Aufgabe auf „Wartet“ setzen.', v_offen
        using errcode = '22023';
    end if;
  end if;

  update public.tasks
  set status = p_status,
      wartet_auf = case when p_status = 'wartet' then v_text else null end,
      erledigt_am = case when p_status in ('erledigt', 'verworfen') then now() else null end,
      erledigt_von = case when p_status in ('erledigt', 'verworfen') then auth.uid() else null end,
      updated_at = now()
  where id = p_task_id;

  v_event := public.aufgabe_status_text(v_alt.status) || ' → ' || public.aufgabe_status_text(p_status);
  if v_text is not null then
    v_event := v_event || ' – ' || case p_status when 'wartet' then 'wartet auf: ' else '' end || v_text;
  end if;
  insert into public.task_events (task_id, user_id, typ, text)
  values (p_task_id, auth.uid(), 'status', v_event);

  if v_alt.report_id is not null and p_status in ('erledigt', 'verworfen') then
    insert into public.report_events (report_id, aircraft_id, user_id, typ, text, intern)
    select v_alt.report_id, r.aircraft_id, auth.uid(), 'kommentar',
           'Aufgabe A-' || lpad(v_alt.nr::text, 4, '0') || ' ' || lower(public.aufgabe_status_text(p_status))
             || ': ' || v_alt.titel, true
    from public.reports r where r.id = v_alt.report_id;
  end if;
end;
$$;

-- Arbeitsstand / Kommentar. Geht auch bei abgeschlossenen Aufgaben (Nachtrag).
create function public.task_comment(p_task_id uuid, p_text text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Aufgaben kommentieren' using errcode = '42501';
  end if;
  if coalesce(btrim(p_text), '') = '' then
    raise exception 'Kommentar ist leer' using errcode = '22023';
  end if;
  if not exists (select 1 from public.tasks where id = p_task_id) then
    raise exception 'Aufgabe nicht gefunden' using errcode = 'P0002';
  end if;

  insert into public.task_events (task_id, user_id, typ, text)
  values (p_task_id, auth.uid(), 'kommentar', btrim(p_text));
  update public.tasks set updated_at = now() where id = p_task_id;
end;
$$;

-- Teilschritte
create function public.task_item_add(p_task_id uuid, p_text text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Teilschritte anlegen' using errcode = '42501';
  end if;
  perform public.offene_aufgabe(p_task_id);
  if coalesce(btrim(p_text), '') = '' then
    raise exception 'Teilschritt ist leer' using errcode = '22023';
  end if;

  insert into public.task_items (task_id, text, position)
  values (
    p_task_id, btrim(p_text),
    coalesce((select max(position) + 1 from public.task_items where task_id = p_task_id), 1)
  )
  returning id into v_id;

  insert into public.task_events (task_id, user_id, typ, text)
  values (p_task_id, auth.uid(), 'teilschritt', 'Teilschritt hinzugefügt: ' || btrim(p_text));
  update public.tasks set updated_at = now() where id = p_task_id;
  return v_id;
end;
$$;

-- Teilschritt abhaken bzw. wieder öffnen. Der erste Haken setzt „Offen“ auf „In Arbeit“.
create function public.task_item_set(p_item_id uuid, p_erledigt boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_item public.task_items;
  v_task public.tasks;
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Teilschritte abhaken' using errcode = '42501';
  end if;
  select * into v_item from public.task_items where id = p_item_id;
  if not found then
    raise exception 'Teilschritt nicht gefunden' using errcode = 'P0002';
  end if;
  v_task := public.offene_aufgabe(v_item.task_id);
  if v_item.erledigt = coalesce(p_erledigt, false) then
    return;
  end if;

  update public.task_items
  set erledigt = p_erledigt,
      erledigt_von = case when p_erledigt then auth.uid() else null end,
      erledigt_am = case when p_erledigt then now() else null end
  where id = p_item_id;

  insert into public.task_events (task_id, user_id, typ, text)
  values (
    v_item.task_id, auth.uid(), 'teilschritt',
    case when p_erledigt then 'Erledigt: ' else 'Wieder offen: ' end || v_item.text
  );

  if p_erledigt and v_task.status = 'offen' then
    update public.tasks set status = 'in_arbeit', updated_at = now() where id = v_item.task_id;
    insert into public.task_events (task_id, user_id, typ, text)
    values (v_item.task_id, auth.uid(), 'status', 'Offen → In Arbeit');
  else
    update public.tasks set updated_at = now() where id = v_item.task_id;
  end if;
end;
$$;

create function public.task_item_delete(p_item_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_item public.task_items;
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Teilschritte entfernen' using errcode = '42501';
  end if;
  select * into v_item from public.task_items where id = p_item_id;
  if not found then
    raise exception 'Teilschritt nicht gefunden' using errcode = 'P0002';
  end if;
  perform public.offene_aufgabe(v_item.task_id);

  delete from public.task_items where id = p_item_id;
  insert into public.task_events (task_id, user_id, typ, text)
  values (v_item.task_id, auth.uid(), 'teilschritt', 'Teilschritt entfernt: ' || v_item.text);
  update public.tasks set updated_at = now() where id = v_item.task_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- report_set_status: Maßnahme beim Erledigen ist Pflicht (Tech-Log-Prinzip:
-- was wurde gemacht?). Sie geht als Rückmeldung an den Melder.
-- -----------------------------------------------------------------------------
create or replace function public.report_set_status(
  p_report_id uuid,
  p_status public.meldung_status,
  p_rueckmeldung text default null,
  p_flugklar_bestaetigt boolean default false
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_alt public.reports;
  v_text text;
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen den Status ändern' using errcode = '42501';
  end if;

  select * into v_alt from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'Meldung nicht gefunden' using errcode = 'P0002';
  end if;

  if not (
    (v_alt.status = 'zurueckgestellt' and p_status in ('in_arbeit', 'erledigt'))
    or (v_alt.status = 'in_arbeit' and p_status = 'erledigt')
  ) then
    raise exception 'Statuswechsel von % nach % ist nicht erlaubt', v_alt.status, p_status
      using errcode = '22023';
  end if;

  if v_alt.kategorie = 1 and p_status = 'erledigt' and not coalesce(p_flugklar_bestaetigt, false) then
    raise exception 'Kat 1: Bitte bestätigen, dass das Flugzeug wieder flugklar ist' using errcode = '22023';
  end if;
  if p_status = 'erledigt' and coalesce(btrim(p_rueckmeldung), '') = '' then
    raise exception 'Bitte die durchgeführte Maßnahme angeben' using errcode = '22023';
  end if;

  update public.reports
  set status = p_status,
      erledigt_am = case when p_status = 'erledigt' then now() else null end
  where id = p_report_id;

  v_text := case p_status
    when 'in_arbeit' then 'In Arbeit'
    when 'erledigt' then case when v_alt.kategorie = 1 then 'Erledigt – Flugzeug ist wieder flugklar'
                              else 'Erledigt' end
  end;
  insert into public.report_events (report_id, aircraft_id, user_id, typ, text)
  values (p_report_id, v_alt.aircraft_id, auth.uid(), 'statuswechsel', v_text);

  if coalesce(btrim(p_rueckmeldung), '') <> '' then
    insert into public.report_events (report_id, aircraft_id, user_id, typ, text, intern)
    values (p_report_id, v_alt.aircraft_id, auth.uid(), 'kommentar', btrim(p_rueckmeldung), false);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Funktionsrechte
-- -----------------------------------------------------------------------------
revoke execute on function
  public.heute(),
  public.aufgabe_status_text(public.aufgabe_status),
  public.profil_name(uuid),
  public.pruefe_zustaendig(uuid),
  public.offene_aufgabe(uuid),
  public.task_create(text, text, uuid, uuid, public.aufgabe_prioritaet, date, uuid, text[]),
  public.task_update(uuid, text, text, uuid, public.aufgabe_prioritaet, date, uuid),
  public.task_set_status(uuid, public.aufgabe_status, text),
  public.task_comment(uuid, text),
  public.task_item_add(uuid, text),
  public.task_item_set(uuid, boolean),
  public.task_item_delete(uuid)
from public, anon, authenticated;

grant execute on function
  public.heute(),
  public.task_create(text, text, uuid, uuid, public.aufgabe_prioritaet, date, uuid, text[]),
  public.task_update(uuid, text, text, uuid, public.aufgabe_prioritaet, date, uuid),
  public.task_set_status(uuid, public.aufgabe_status, text),
  public.task_comment(uuid, text),
  public.task_item_add(uuid, text),
  public.task_item_set(uuid, boolean),
  public.task_item_delete(uuid)
to authenticated;
