-- =============================================================================
-- Instandhaltung v0.3
--
-- * Beanstandungen „unter Beobachtung“: Kat 3 (kein Handlungsbedarf) mit einem
--   Hinweis, den alle Piloten sehen, bis ein Wart die Beobachtung beendet.
--   Kein Einfluss auf die Ampel.
-- * Archiv: Spalte `massnahme` hält fest, wie eine Beanstandung abgeschlossen
--   wurde (durchgeführte Maßnahme bzw. Begründung bei Kat 3). Bestehende
--   Beanstandungen werden aus dem Verlauf nachgetragen.
-- * Betriebsstunden: manuell erfasste Zählerstände pro Luftfahrzeug
--   (`aircraft_counters`). Später kann die Vereinsflieger-Schnittstelle
--   mit `quelle = 'vereinsflieger'` nachtragen.
-- * Fristen (`deadlines`): nach Datum und/oder Betriebsstunden, optional mit
--   Intervall (z. B. 50-h-Kontrolle, Lebensdauer Anschnallgurte). Nur
--   Orientierung für die Instandhaltung, kein Einfluss auf die Ampel und kein
--   Ersatz für Bordbuch oder CAMO.
-- * Wartungsprogramme (`maintenance_templates`): gespeicherte Checklisten,
--   z. B. „Winterwartung ASK 21“. `wartung_starten` legt daraus eine Aufgabe mit
--   Teilschritten an und kann das Luftfahrzeug sperren.
-- * Alles nur für Warte/Admins lesbar, Schreiben nur über RPCs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Hilfen
-- -----------------------------------------------------------------------------

-- 754 → „12:34 h“
create function public.stunden_text(p_minuten integer)
returns text
language sql immutable set search_path = ''
as $$
  select case when p_minuten is null then null
    else (p_minuten / 60)::text || ':' || lpad((p_minuten % 60)::text, 2, '0') || ' h' end
$$;

-- -----------------------------------------------------------------------------
-- Beanstandungen: Maßnahme (Archiv) und „unter Beobachtung“
-- -----------------------------------------------------------------------------
alter table public.reports add column massnahme text check (char_length(massnahme) <= 2000);
alter table public.reports add column beobachten boolean not null default false;
alter table public.reports add constraint beobachten_nur_kat3 check (
  not beobachten or (kategorie = 3 and pilotenhinweis_sichtbar and coalesce(btrim(pilotenhinweis), '') <> '')
);
comment on column public.reports.massnahme is
  'Abschluss für das Archiv: durchgeführte Maßnahme (erledigt) bzw. Begründung (Kat 3).';
comment on column public.reports.beobachten is
  'Kat 3 unter Beobachtung: Pilotenhinweis bleibt sichtbar, bis ein Wart die Beobachtung beendet.';

-- Nachtragen aus dem Verlauf: Die Rückmeldung entsteht in derselben Transaktion
-- wie der Statuswechsel bzw. die Einstufung, hat also denselben Zeitstempel.
update public.reports r
set massnahme = e.text
from public.report_events e
where r.status = 'erledigt'
  and e.report_id = r.id and e.typ = 'kommentar' and not e.intern
  and exists (
    select 1 from public.report_events s
    where s.report_id = r.id and s.typ = 'statuswechsel' and s.text like 'Erledigt%'
      and s.created_at = e.created_at
  );

update public.reports r
set massnahme = e.text
from public.report_events e
where r.status = 'abgelegt'
  and e.report_id = r.id and e.typ = 'kommentar' and not e.intern
  and exists (
    select 1 from public.report_events s
    where s.report_id = r.id and s.typ = 'kategorie' and s.created_at = e.created_at
  );

create index reports_status_erledigt_idx on public.reports (status, erledigt_am desc);

-- Einstufen mit optionaler Beobachtung (neue Signatur, alte Funktion entfällt)
drop function public.report_einstufen(uuid, smallint, text, text, boolean, text);

create function public.report_einstufen(
  p_report_id uuid,
  p_kategorie smallint,
  p_ziel text default null,
  p_pilotenhinweis text default null,
  p_pilotenhinweis_sichtbar boolean default false,
  p_begruendung text default null,
  p_beobachten boolean default false
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_alt public.reports;
  v_status public.meldung_status;
  v_hinweis text := nullif(btrim(p_pilotenhinweis), '');
  v_ziel text := nullif(btrim(p_ziel), '');
  v_beobachten boolean := false;
  v_sichtbar boolean;
  v_text text;
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Beanstandungen einstufen' using errcode = '42501';
  end if;
  if p_kategorie not in (1, 2, 3) then
    raise exception 'Kategorie muss 1, 2 oder 3 sein' using errcode = '22023';
  end if;

  select * into v_alt from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'Beanstandung nicht gefunden' using errcode = 'P0002';
  end if;
  if v_alt.status = 'erledigt' then
    raise exception 'Erledigte Beanstandungen können nicht mehr eingestuft werden' using errcode = '22023';
  end if;

  case p_kategorie
    when 1 then
      if v_hinweis is null then
        raise exception 'Kat 1: Bitte einen Sperrgrund für die Piloten angeben' using errcode = '22023';
      end if;
      v_status := 'in_arbeit';
      v_sichtbar := true;
    when 2 then
      if v_ziel is null then
        raise exception 'Kat 2: Bitte ein Ziel angeben (z. B. Schlechtwettertag)' using errcode = '22023';
      end if;
      -- in_arbeit bleibt in_arbeit, sonst zurückgestellt
      v_status := case when v_alt.kategorie = 2 and v_alt.status = 'in_arbeit'
                       then 'in_arbeit'::public.meldung_status
                       else 'zurueckgestellt'::public.meldung_status end;
      v_sichtbar := coalesce(p_pilotenhinweis_sichtbar, false) and v_hinweis is not null;
    else
      if coalesce(btrim(p_begruendung), '') = '' then
        raise exception 'Kat 3: Bitte kurz begründen, warum keine Maßnahme nötig ist' using errcode = '22023';
      end if;
      v_beobachten := coalesce(p_beobachten, false);
      if v_beobachten and v_hinweis is null then
        raise exception 'Unter Beobachtung: Bitte einen Hinweis für die Piloten angeben' using errcode = '22023';
      end if;
      v_status := 'abgelegt';
      v_sichtbar := v_beobachten;
      v_hinweis := case when v_beobachten then v_hinweis end;
      v_ziel := null;
  end case;

  update public.reports
  set kategorie = p_kategorie,
      status = v_status,
      ziel = v_ziel,
      pilotenhinweis = v_hinweis,
      pilotenhinweis_sichtbar = v_sichtbar,
      beobachten = v_beobachten,
      massnahme = case when p_kategorie = 3 then btrim(p_begruendung) end,
      eingestuft_von = auth.uid(),
      eingestuft_am = now()
  where id = p_report_id;

  v_text := case
    when v_alt.kategorie is null then 'Eingestuft als Kat ' || p_kategorie
    when v_alt.kategorie <> p_kategorie then 'Umgestuft von Kat ' || v_alt.kategorie || ' auf Kat ' || p_kategorie
    else 'Einstufung Kat ' || p_kategorie || ' geändert'
  end;
  if p_kategorie = 1 then
    v_text := v_text || ' – nicht lufttüchtig: ' || v_hinweis;
  elsif p_kategorie = 2 then
    v_text := v_text || ' – Ziel: ' || v_ziel;
    if v_sichtbar then
      v_text := v_text || ' – Hinweis: ' || v_hinweis;
    end if;
  elsif v_beobachten then
    v_text := v_text || ' – unter Beobachtung: ' || v_hinweis;
  else
    v_text := v_text || ' – abgelegt';
  end if;

  insert into public.report_events (report_id, aircraft_id, user_id, typ, text)
  values (p_report_id, v_alt.aircraft_id, auth.uid(), 'kategorie', v_text);

  -- Kat 3: Begründung als Rückmeldung an den Melder
  if p_kategorie = 3 then
    insert into public.report_events (report_id, aircraft_id, user_id, typ, text, intern)
    values (p_report_id, v_alt.aircraft_id, auth.uid(), 'kommentar', btrim(p_begruendung), false);
  end if;
end;
$$;

-- Status weiterschalten, Maßnahme wird fürs Archiv gespeichert
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
    raise exception 'Beanstandung nicht gefunden' using errcode = 'P0002';
  end if;

  if not (
    (v_alt.status = 'zurueckgestellt' and p_status in ('in_arbeit', 'erledigt'))
    or (v_alt.status = 'in_arbeit' and p_status = 'erledigt')
  ) then
    raise exception 'Statuswechsel von % nach % ist nicht erlaubt', v_alt.status, p_status
      using errcode = '22023';
  end if;

  if v_alt.kategorie = 1 and p_status = 'erledigt' and not coalesce(p_flugklar_bestaetigt, false) then
    raise exception 'Kat 1: Bitte bestätigen, dass das Luftfahrzeug wieder flugklar ist' using errcode = '22023';
  end if;
  if p_status = 'erledigt' and coalesce(btrim(p_rueckmeldung), '') = '' then
    raise exception 'Bitte die durchgeführte Maßnahme angeben' using errcode = '22023';
  end if;

  update public.reports
  set status = p_status,
      erledigt_am = case when p_status = 'erledigt' then now() else null end,
      massnahme = case when p_status = 'erledigt' then btrim(p_rueckmeldung) else null end
  where id = p_report_id;

  v_text := case p_status
    when 'in_arbeit' then 'In Arbeit'
    when 'erledigt' then case when v_alt.kategorie = 1 then 'Erledigt – Luftfahrzeug ist wieder flugklar'
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

-- Beobachtung beenden: Hinweis verschwindet bei den Piloten
create function public.report_beobachtung_beenden(p_report_id uuid, p_text text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_alt public.reports;
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Beobachtungen beenden' using errcode = '42501';
  end if;
  if coalesce(btrim(p_text), '') = '' then
    raise exception 'Bitte kurz das Ergebnis der Beobachtung angeben' using errcode = '22023';
  end if;

  select * into v_alt from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'Beanstandung nicht gefunden' using errcode = 'P0002';
  end if;
  if not v_alt.beobachten then
    raise exception 'Diese Beanstandung ist nicht unter Beobachtung' using errcode = '22023';
  end if;

  update public.reports
  set beobachten = false,
      pilotenhinweis_sichtbar = false
  where id = p_report_id;

  insert into public.report_events (report_id, aircraft_id, user_id, typ, text)
  values (p_report_id, v_alt.aircraft_id, auth.uid(), 'statuswechsel',
          'Beobachtung beendet – ' || btrim(p_text));
end;
$$;

-- Melden: Texte im Tech-Log-Stil
create or replace function public.report_create(p_aircraft_id uuid, p_text text, p_vorlaeufig_nicht_flugklar boolean default false)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_approved() then
    raise exception 'Konto ist nicht freigegeben' using errcode = '42501';
  end if;
  if not exists (select 1 from public.aircraft where id = p_aircraft_id and aktiv) then
    raise exception 'Luftfahrzeug nicht gefunden' using errcode = 'P0002';
  end if;
  if coalesce(btrim(p_text), '') = '' then
    raise exception 'Bitte beschreibe die Beanstandung' using errcode = '22023';
  end if;

  insert into public.reports (aircraft_id, melder_id, text, vorlaeufig_nicht_flugklar)
  values (p_aircraft_id, auth.uid(), btrim(p_text), coalesce(p_vorlaeufig_nicht_flugklar, false))
  returning id into v_id;

  insert into public.report_events (report_id, aircraft_id, user_id, typ, text)
  values (
    v_id, p_aircraft_id, auth.uid(), 'erstellt',
    case when p_vorlaeufig_nicht_flugklar then 'Beanstandung erfasst – vorläufig nicht flugklar'
         else 'Beanstandung erfasst' end
  );

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Views: Ampel mit Beobachtungen, Liste mit Maßnahme
-- -----------------------------------------------------------------------------
create or replace view public.aircraft_overview
with (security_invoker = false, security_barrier = true)
as
  with offen as (
    select
      r.aircraft_id,
      bool_or(r.kategorie = 1 and r.status <> 'erledigt') as kat1_offen,
      bool_or(r.status = 'neu' and r.vorlaeufig_nicht_flugklar) as vorlaeufig_gesperrt,
      bool_or(r.status in ('zurueckgestellt', 'in_arbeit') and r.pilotenhinweis_sichtbar) as hinweis_offen,
      count(*) filter (where r.status = 'neu') as anzahl_in_pruefung,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'report_id', r.id,
            'kategorie', r.kategorie,
            'status', r.status,
            'pilotenhinweis', r.pilotenhinweis,
            'ziel', r.ziel,
            'eingestuft_am', r.eingestuft_am
          )
          order by r.kategorie, r.eingestuft_am
        ) filter (where r.status in ('zurueckgestellt', 'in_arbeit') and r.pilotenhinweis_sichtbar),
        '[]'::jsonb
      ) as hinweise,
      array_remove(array_agg(r.pilotenhinweis order by r.eingestuft_am)
        filter (where r.kategorie = 1 and r.status <> 'erledigt'), null) as kat1_gruende
    from public.reports r
    where r.status not in ('erledigt', 'abgelegt')
    group by r.aircraft_id
  ),
  beobachtet as (
    select
      r.aircraft_id,
      jsonb_agg(
        jsonb_build_object(
          'report_id', r.id,
          'pilotenhinweis', r.pilotenhinweis,
          'eingestuft_am', r.eingestuft_am
        )
        order by r.eingestuft_am
      ) as beobachtungen
    from public.reports r
    where r.beobachten
    group by r.aircraft_id
  )
  select
    a.id,
    a.kennzeichen,
    a.wettbewerbskennzeichen,
    a.muster,
    a.art,
    a.aktiv,
    a.gesperrt,
    a.sperrgrund,
    a.gesperrt_am,
    nullif(trim(concat_ws(' ', sp.vorname, sp.nachname)), '') as gesperrt_von_name,
    coalesce(o.kat1_offen, false) as kat1_offen,
    coalesce(o.vorlaeufig_gesperrt, false) as vorlaeufig_gesperrt,
    case
      when a.gesperrt or coalesce(o.kat1_offen, false) or coalesce(o.vorlaeufig_gesperrt, false) then 'rot'
      when coalesce(o.hinweis_offen, false) then 'gelb'
      else 'gruen'
    end::public.ampel as ampel,
    -- Alle Gründe für Rot, in fester Reihenfolge: manuelle Sperre, Kat 1, vorläufig
    array_remove(
      array[case when a.gesperrt then a.sperrgrund end]
      || coalesce(o.kat1_gruende, array[]::text[])
      || array[case when coalesce(o.vorlaeufig_gesperrt, false)
                 then 'Vorläufig nicht flugklar – Beanstandung wird von der Instandhaltung geprüft' end],
      null
    ) as sperrgruende,
    coalesce(o.anzahl_in_pruefung, 0)::integer as anzahl_in_pruefung,
    coalesce(o.hinweise, '[]'::jsonb) as hinweise,
    coalesce(b.beobachtungen, '[]'::jsonb) as beobachtungen
  from public.aircraft a
  left join offen o on o.aircraft_id = a.id
  left join beobachtet b on b.aircraft_id = a.id
  left join public.profiles sp on sp.id = a.gesperrt_von
  where (select public.is_approved())
    and (a.aktiv or (select public.is_admin()));

create or replace view public.report_list
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
      where t.report_id = r.id and t.status not in ('erledigt', 'verworfen'))::integer as anzahl_aufgaben_offen,
    r.massnahme,
    r.beobachten
  from public.reports r
  join public.aircraft a on a.id = r.aircraft_id
  left join public.profile_names mp on mp.id = r.melder_id
  left join public.profile_names ep on ep.id = r.eingestuft_von;

-- -----------------------------------------------------------------------------
-- Betriebsstunden
-- -----------------------------------------------------------------------------
create type public.zaehler_quelle as enum ('manuell', 'vereinsflieger');

create table public.aircraft_counters (
  id bigint generated always as identity primary key,
  aircraft_id uuid not null references public.aircraft (id) on delete cascade,
  stand_am date not null,
  betriebsminuten integer not null check (betriebsminuten >= 0),
  landungen integer check (landungen >= 0),
  quelle public.zaehler_quelle not null default 'manuell',
  notiz text check (char_length(notiz) <= 300),
  erfasst_von uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index aircraft_counters_aircraft_idx on public.aircraft_counters (aircraft_id, stand_am desc, id desc);
comment on table public.aircraft_counters is
  'Betriebsstunden (Minuten) und Landungen pro Luftfahrzeug. Manuell oder später aus Vereinsflieger. Nur über aircraft_counter_add().';

-- -----------------------------------------------------------------------------
-- Fristen
-- -----------------------------------------------------------------------------
create type public.frist_event_typ as enum ('erstellt', 'geaendert', 'erledigt', 'abgeschlossen');

create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  aircraft_id uuid not null references public.aircraft (id) on delete cascade,
  titel text not null check (char_length(btrim(titel)) between 1 and 150),
  beschreibung text not null default '' check (char_length(beschreibung) <= 2000),
  faellig_am date,
  faellig_bei_minuten integer check (faellig_bei_minuten >= 0),
  intervall_monate integer check (intervall_monate between 1 and 600),
  intervall_minuten integer check (intervall_minuten > 0),
  vorlauf_tage integer not null default 30 check (vorlauf_tage between 0 and 3650),
  vorlauf_minuten integer not null default 600 check (vorlauf_minuten >= 0),
  zuletzt_am date,
  zuletzt_bei_minuten integer,
  aktiv boolean not null default true,
  erstellt_von uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint frist_braucht_faelligkeit check (faellig_am is not null or faellig_bei_minuten is not null)
);
create index deadlines_aircraft_idx on public.deadlines (aircraft_id, aktiv);
comment on table public.deadlines is
  'Fristen pro Luftfahrzeug (Datum und/oder Betriebsstunden). Orientierung, kein Einfluss auf die Ampel. Nur über deadline_*-RPCs.';

create table public.deadline_events (
  id bigint generated always as identity primary key,
  deadline_id uuid not null references public.deadlines (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  typ public.frist_event_typ not null,
  text text check (char_length(text) <= 2000),
  created_at timestamptz not null default now()
);
create index deadline_events_deadline_idx on public.deadline_events (deadline_id, created_at);

-- -----------------------------------------------------------------------------
-- Wartungsprogramme
-- -----------------------------------------------------------------------------
create table public.maintenance_templates (
  id uuid primary key default gen_random_uuid(),
  titel text not null check (char_length(btrim(titel)) between 1 and 150),
  beschreibung text not null default '' check (char_length(beschreibung) <= 4000),
  muster text check (char_length(muster) <= 100),
  aktiv boolean not null default true,
  erstellt_von uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.maintenance_templates is
  'Wartungsprogramme (gespeicherte Checklisten). Nur über template_save()/template_set_aktiv().';

create table public.maintenance_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.maintenance_templates (id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 300),
  position integer not null default 0
);
create index maintenance_template_items_idx on public.maintenance_template_items (template_id, position);

alter table public.tasks add column template_id uuid references public.maintenance_templates (id) on delete set null;
comment on column public.tasks.template_id is 'Aufgabe wurde aus diesem Wartungsprogramm gestartet.';

-- -----------------------------------------------------------------------------
-- Rechte und RLS: nur Warte/Admins lesen, niemand schreibt direkt
-- -----------------------------------------------------------------------------
revoke all on public.aircraft_counters, public.deadlines, public.deadline_events,
  public.maintenance_templates, public.maintenance_template_items
  from anon, authenticated;
grant select on public.aircraft_counters, public.deadlines, public.deadline_events,
  public.maintenance_templates, public.maintenance_template_items
  to authenticated;

alter table public.aircraft_counters enable row level security;
alter table public.deadlines enable row level security;
alter table public.deadline_events enable row level security;
alter table public.maintenance_templates enable row level security;
alter table public.maintenance_template_items enable row level security;

create policy aircraft_counters_select_wart on public.aircraft_counters for select to authenticated
  using ((select public.is_wart()));
create policy deadlines_select_wart on public.deadlines for select to authenticated
  using ((select public.is_wart()));
create policy deadline_events_select_wart on public.deadline_events for select to authenticated
  using ((select public.is_wart()));
create policy maintenance_templates_select_wart on public.maintenance_templates for select to authenticated
  using ((select public.is_wart()));
create policy maintenance_template_items_select_wart on public.maintenance_template_items for select to authenticated
  using ((select public.is_wart()));

-- -----------------------------------------------------------------------------
-- Views (security_invoker: RLS der Tabellen gilt)
-- -----------------------------------------------------------------------------

-- Letzter Zählerstand pro Luftfahrzeug
create view public.aircraft_zaehler
with (security_invoker = true)
as
  select distinct on (c.aircraft_id)
    c.aircraft_id,
    a.kennzeichen,
    a.muster,
    c.stand_am,
    c.betriebsminuten,
    c.landungen,
    c.quelle,
    c.created_at
  from public.aircraft_counters c
  join public.aircraft a on a.id = c.aircraft_id
  order by c.aircraft_id, c.stand_am desc, c.id desc;
comment on view public.aircraft_zaehler is 'Aktueller Zählerstand pro Luftfahrzeug. Sichtbarkeit über RLS von aircraft_counters.';

-- Fristen mit Reststand
create view public.deadline_list
with (security_invoker = true)
as
  with z as (
    select distinct on (c.aircraft_id) c.aircraft_id, c.betriebsminuten, c.stand_am
    from public.aircraft_counters c
    order by c.aircraft_id, c.stand_am desc, c.id desc
  )
  select
    d.id,
    d.aircraft_id,
    a.kennzeichen,
    a.muster,
    d.titel,
    d.beschreibung,
    d.faellig_am,
    d.faellig_bei_minuten,
    d.intervall_monate,
    d.intervall_minuten,
    d.vorlauf_tage,
    d.vorlauf_minuten,
    d.zuletzt_am,
    d.zuletzt_bei_minuten,
    d.aktiv,
    d.created_at,
    d.updated_at,
    z.betriebsminuten as aktuelle_minuten,
    z.stand_am as zaehler_stand_am,
    (d.faellig_am - public.heute()) as rest_tage,
    (d.faellig_bei_minuten - z.betriebsminuten) as rest_minuten,
    case
      when not d.aktiv then 'abgeschlossen'
      when d.faellig_am < public.heute() or d.faellig_bei_minuten < z.betriebsminuten then 'ueberfaellig'
      when d.faellig_am - public.heute() <= d.vorlauf_tage
        or d.faellig_bei_minuten - z.betriebsminuten <= d.vorlauf_minuten then 'bald'
      else 'ok'
    end as stand
  from public.deadlines d
  join public.aircraft a on a.id = d.aircraft_id
  left join z on z.aircraft_id = d.aircraft_id;
comment on view public.deadline_list is
  'Fristen mit Resttagen/-stunden und Stand (ok, bald, ueberfaellig, abgeschlossen). Sichtbarkeit über RLS von deadlines.';

create view public.deadline_verlauf
with (security_invoker = true)
as
  select
    e.id,
    e.deadline_id,
    e.typ,
    e.text,
    e.created_at,
    e.user_id,
    nullif(trim(concat_ws(' ', pn.vorname, pn.nachname)), '') as user_name
  from public.deadline_events e
  left join public.profile_names pn on pn.id = e.user_id;

-- Aufgabenliste: Wartungsprogramm ergänzt
create or replace view public.task_list
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
      as letzte_aktivitaet,
    t.template_id
  from public.tasks t
  left join public.aircraft a on a.id = t.aircraft_id
  left join public.reports r on r.id = t.report_id
  left join public.profile_names zp on zp.id = t.zustaendig_id
  left join public.profile_names cp on cp.id = t.erstellt_von;

revoke all on public.aircraft_zaehler, public.deadline_list, public.deadline_verlauf from anon, authenticated;
grant select on public.aircraft_zaehler, public.deadline_list, public.deadline_verlauf to authenticated;

-- -----------------------------------------------------------------------------
-- RPCs: Betriebsstunden
-- -----------------------------------------------------------------------------
create function public.aircraft_counter_add(
  p_aircraft_id uuid,
  p_stand_am date,
  p_betriebsminuten integer,
  p_landungen integer default null,
  p_notiz text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_vorher public.aircraft_counters;
  v_nachher public.aircraft_counters;
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Betriebsstunden erfassen' using errcode = '42501';
  end if;
  if not exists (select 1 from public.aircraft where id = p_aircraft_id) then
    raise exception 'Luftfahrzeug nicht gefunden' using errcode = 'P0002';
  end if;
  if p_stand_am is null or p_stand_am > public.heute() then
    raise exception 'Bitte ein Datum angeben, das nicht in der Zukunft liegt' using errcode = '22023';
  end if;
  if p_betriebsminuten is null or p_betriebsminuten < 0 then
    raise exception 'Bitte einen gültigen Stundenstand angeben' using errcode = '22023';
  end if;
  if p_landungen is not null and p_landungen < 0 then
    raise exception 'Landungen dürfen nicht negativ sein' using errcode = '22023';
  end if;

  -- Zählerstände steigen nur: nicht kleiner als ein früherer, nicht größer als ein späterer Stand
  select * into v_vorher from public.aircraft_counters
  where aircraft_id = p_aircraft_id and stand_am <= p_stand_am
  order by stand_am desc, id desc limit 1;
  if found and p_betriebsminuten < v_vorher.betriebsminuten then
    raise exception 'Der Stand ist kleiner als der vom % (%)',
      to_char(v_vorher.stand_am, 'DD.MM.YYYY'), public.stunden_text(v_vorher.betriebsminuten)
      using errcode = '22023';
  end if;
  select * into v_nachher from public.aircraft_counters
  where aircraft_id = p_aircraft_id and stand_am > p_stand_am
  order by stand_am asc, id asc limit 1;
  if found and p_betriebsminuten > v_nachher.betriebsminuten then
    raise exception 'Der Stand ist größer als der spätere vom % (%)',
      to_char(v_nachher.stand_am, 'DD.MM.YYYY'), public.stunden_text(v_nachher.betriebsminuten)
      using errcode = '22023';
  end if;

  insert into public.aircraft_counters (aircraft_id, stand_am, betriebsminuten, landungen, notiz, erfasst_von)
  values (p_aircraft_id, p_stand_am, p_betriebsminuten, p_landungen, nullif(btrim(p_notiz), ''), auth.uid());
end;
$$;

-- -----------------------------------------------------------------------------
-- RPCs: Fristen
-- -----------------------------------------------------------------------------

-- Anlegen (p_id NULL) oder ändern
create function public.deadline_save(
  p_aircraft_id uuid,
  p_titel text,
  p_beschreibung text default '',
  p_faellig_am date default null,
  p_faellig_bei_minuten integer default null,
  p_intervall_monate integer default null,
  p_intervall_minuten integer default null,
  p_vorlauf_tage integer default 30,
  p_vorlauf_minuten integer default 600,
  p_id uuid default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_alt public.deadlines;
  v_id uuid;
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Fristen bearbeiten' using errcode = '42501';
  end if;
  if coalesce(btrim(p_titel), '') = '' then
    raise exception 'Bitte einen Titel angeben' using errcode = '22023';
  end if;
  if p_faellig_am is null and p_faellig_bei_minuten is null then
    raise exception 'Bitte ein Fälligkeitsdatum oder einen Stundenstand angeben' using errcode = '22023';
  end if;
  if not exists (select 1 from public.aircraft where id = p_aircraft_id) then
    raise exception 'Luftfahrzeug nicht gefunden' using errcode = 'P0002';
  end if;

  if p_id is null then
    insert into public.deadlines (
      aircraft_id, titel, beschreibung, faellig_am, faellig_bei_minuten, intervall_monate,
      intervall_minuten, vorlauf_tage, vorlauf_minuten, erstellt_von
    ) values (
      p_aircraft_id, btrim(p_titel), btrim(coalesce(p_beschreibung, '')), p_faellig_am, p_faellig_bei_minuten,
      p_intervall_monate, p_intervall_minuten, coalesce(p_vorlauf_tage, 30), coalesce(p_vorlauf_minuten, 600),
      auth.uid()
    )
    returning id into v_id;

    insert into public.deadline_events (deadline_id, user_id, typ, text)
    values (
      v_id, auth.uid(), 'erstellt',
      'Frist angelegt – fällig'
        || coalesce(' am ' || to_char(p_faellig_am, 'DD.MM.YYYY'), '')
        || coalesce(' bei ' || public.stunden_text(p_faellig_bei_minuten), '')
    );
    return v_id;
  end if;

  select * into v_alt from public.deadlines where id = p_id for update;
  if not found then
    raise exception 'Frist nicht gefunden' using errcode = 'P0002';
  end if;
  if not v_alt.aktiv then
    raise exception 'Die Frist ist abgeschlossen' using errcode = '22023';
  end if;
  if v_alt.aircraft_id <> p_aircraft_id then
    raise exception 'Das Luftfahrzeug einer Frist kann nicht geändert werden' using errcode = '22023';
  end if;

  update public.deadlines
  set titel = btrim(p_titel),
      beschreibung = btrim(coalesce(p_beschreibung, '')),
      faellig_am = p_faellig_am,
      faellig_bei_minuten = p_faellig_bei_minuten,
      intervall_monate = p_intervall_monate,
      intervall_minuten = p_intervall_minuten,
      vorlauf_tage = coalesce(p_vorlauf_tage, 30),
      vorlauf_minuten = coalesce(p_vorlauf_minuten, 600),
      updated_at = now()
  where id = p_id;

  insert into public.deadline_events (deadline_id, user_id, typ, text)
  values (
    p_id, auth.uid(), 'geaendert',
    'Frist geändert – fällig'
      || coalesce(' am ' || to_char(p_faellig_am, 'DD.MM.YYYY'), '')
      || coalesce(' bei ' || public.stunden_text(p_faellig_bei_minuten), '')
  );
  return p_id;
end;
$$;

-- Durchgeführt: nächste Fälligkeit aus dem Intervall, ohne Intervall wird die Frist abgeschlossen
create function public.deadline_erledigen(
  p_id uuid,
  p_am date,
  p_bei_minuten integer default null,
  p_text text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_alt public.deadlines;
  v_minuten integer := p_bei_minuten;
  v_neu_am date;
  v_neu_minuten integer;
  v_aktiv boolean;
  v_text text;
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Fristen erledigen' using errcode = '42501';
  end if;
  if p_am is null or p_am > public.heute() then
    raise exception 'Bitte ein Datum angeben, das nicht in der Zukunft liegt' using errcode = '22023';
  end if;

  select * into v_alt from public.deadlines where id = p_id for update;
  if not found then
    raise exception 'Frist nicht gefunden' using errcode = 'P0002';
  end if;
  if not v_alt.aktiv then
    raise exception 'Die Frist ist schon abgeschlossen' using errcode = '22023';
  end if;

  if v_minuten is null then
    select c.betriebsminuten into v_minuten from public.aircraft_counters c
    where c.aircraft_id = v_alt.aircraft_id and c.stand_am <= p_am
    order by c.stand_am desc, c.id desc limit 1;
  end if;
  if v_minuten is null and (v_alt.intervall_minuten is not null or v_alt.faellig_bei_minuten is not null) then
    raise exception 'Bitte den Stundenstand bei der Durchführung angeben' using errcode = '22023';
  end if;
  if v_minuten is not null and v_minuten < 0 then
    raise exception 'Bitte einen gültigen Stundenstand angeben' using errcode = '22023';
  end if;

  v_neu_am := case when v_alt.intervall_monate is not null
                   then (p_am + make_interval(months => v_alt.intervall_monate))::date end;
  v_neu_minuten := case when v_alt.intervall_minuten is not null
                        then v_minuten + v_alt.intervall_minuten end;
  v_aktiv := v_neu_am is not null or v_neu_minuten is not null;

  update public.deadlines
  set zuletzt_am = p_am,
      zuletzt_bei_minuten = v_minuten,
      faellig_am = case when v_aktiv then v_neu_am else faellig_am end,
      faellig_bei_minuten = case when v_aktiv then v_neu_minuten else faellig_bei_minuten end,
      aktiv = v_aktiv,
      updated_at = now()
  where id = p_id;

  v_text := 'Durchgeführt am ' || to_char(p_am, 'DD.MM.YYYY')
    || coalesce(' bei ' || public.stunden_text(v_minuten), '')
    || case when v_aktiv then ' – nächste Fälligkeit'
              || coalesce(' am ' || to_char(v_neu_am, 'DD.MM.YYYY'), '')
              || coalesce(' bei ' || public.stunden_text(v_neu_minuten), '')
            else ' – Frist abgeschlossen' end
    || coalesce(' – ' || nullif(btrim(p_text), ''), '');
  insert into public.deadline_events (deadline_id, user_id, typ, text)
  values (p_id, auth.uid(), 'erledigt', v_text);
end;
$$;

-- Ohne Durchführung abschließen (z. B. Bauteil ausgebaut)
create function public.deadline_abschliessen(p_id uuid, p_text text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Fristen abschließen' using errcode = '42501';
  end if;
  if coalesce(btrim(p_text), '') = '' then
    raise exception 'Bitte kurz begründen, warum die Frist entfällt' using errcode = '22023';
  end if;

  update public.deadlines set aktiv = false, updated_at = now() where id = p_id and aktiv;
  if not found then
    raise exception 'Frist nicht gefunden oder schon abgeschlossen' using errcode = 'P0002';
  end if;

  insert into public.deadline_events (deadline_id, user_id, typ, text)
  values (p_id, auth.uid(), 'abgeschlossen', 'Frist abgeschlossen – ' || btrim(p_text));
end;
$$;

-- -----------------------------------------------------------------------------
-- RPCs: Wartungsprogramme
-- -----------------------------------------------------------------------------

-- Anlegen (p_id NULL) oder ändern. Teilschritte werden komplett ersetzt.
create function public.template_save(
  p_titel text,
  p_beschreibung text default '',
  p_muster text default null,
  p_teilschritte text[] default '{}',
  p_id uuid default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid := p_id;
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Wartungsprogramme bearbeiten' using errcode = '42501';
  end if;
  if coalesce(btrim(p_titel), '') = '' then
    raise exception 'Bitte einen Titel angeben' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.maintenance_templates (titel, beschreibung, muster, erstellt_von)
    values (btrim(p_titel), btrim(coalesce(p_beschreibung, '')), nullif(btrim(p_muster), ''), auth.uid())
    returning id into v_id;
  else
    update public.maintenance_templates
    set titel = btrim(p_titel),
        beschreibung = btrim(coalesce(p_beschreibung, '')),
        muster = nullif(btrim(p_muster), ''),
        updated_at = now()
    where id = v_id;
    if not found then
      raise exception 'Wartungsprogramm nicht gefunden' using errcode = 'P0002';
    end if;
    delete from public.maintenance_template_items where template_id = v_id;
  end if;

  insert into public.maintenance_template_items (template_id, text, position)
  select v_id, btrim(s.text), s.pos::integer
  from unnest(coalesce(p_teilschritte, '{}')) with ordinality as s (text, pos)
  where coalesce(btrim(s.text), '') <> '';

  return v_id;
end;
$$;

create function public.template_set_aktiv(p_id uuid, p_aktiv boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Wartungsprogramme bearbeiten' using errcode = '42501';
  end if;
  update public.maintenance_templates
  set aktiv = coalesce(p_aktiv, false), updated_at = now()
  where id = p_id;
  if not found then
    raise exception 'Wartungsprogramm nicht gefunden' using errcode = 'P0002';
  end if;
end;
$$;

-- Wartung beginnen: Aufgabe mit den Teilschritten des Programms, optional Sperre
create function public.wartung_starten(
  p_aircraft_id uuid,
  p_template_id uuid,
  p_faellig_am date default null,
  p_zustaendig_id uuid default null,
  p_sperren boolean default false
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_vorlage public.maintenance_templates;
  v_aircraft public.aircraft;
  v_schritte text[];
  v_id uuid;
  v_nr integer;
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen eine Wartung beginnen' using errcode = '42501';
  end if;
  select * into v_vorlage from public.maintenance_templates where id = p_template_id and aktiv;
  if not found then
    raise exception 'Wartungsprogramm nicht gefunden' using errcode = 'P0002';
  end if;
  select * into v_aircraft from public.aircraft where id = p_aircraft_id;
  if not found then
    raise exception 'Luftfahrzeug nicht gefunden' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(i.text order by i.position, i.id), '{}') into v_schritte
  from public.maintenance_template_items i where i.template_id = p_template_id;

  v_id := public.task_create(
    v_vorlage.titel,
    v_vorlage.beschreibung,
    p_aircraft_id,
    null,
    'normal',
    p_faellig_am,
    p_zustaendig_id,
    v_schritte
  );
  update public.tasks set template_id = p_template_id where id = v_id returning nr into v_nr;

  insert into public.task_events (task_id, user_id, typ, text)
  values (v_id, auth.uid(), 'kommentar', 'Aus Wartungsprogramm „' || v_vorlage.titel || '“ gestartet');

  if coalesce(p_sperren, false) and not v_aircraft.gesperrt then
    perform public.aircraft_sperren(
      p_aircraft_id,
      'In Wartung: ' || v_vorlage.titel || ' (A-' || lpad(v_nr::text, 4, '0') || ')'
    );
  end if;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Funktionsrechte
-- -----------------------------------------------------------------------------
revoke execute on function
  public.stunden_text(integer),
  public.report_einstufen(uuid, smallint, text, text, boolean, text, boolean),
  public.report_beobachtung_beenden(uuid, text),
  public.aircraft_counter_add(uuid, date, integer, integer, text),
  public.deadline_save(uuid, text, text, date, integer, integer, integer, integer, integer, uuid),
  public.deadline_erledigen(uuid, date, integer, text),
  public.deadline_abschliessen(uuid, text),
  public.template_save(text, text, text, text[], uuid),
  public.template_set_aktiv(uuid, boolean),
  public.wartung_starten(uuid, uuid, date, uuid, boolean)
from public, anon, authenticated;

grant execute on function
  public.report_einstufen(uuid, smallint, text, text, boolean, text, boolean),
  public.report_beobachtung_beenden(uuid, text),
  public.aircraft_counter_add(uuid, date, integer, integer, text),
  public.deadline_save(uuid, text, text, date, integer, integer, integer, integer, integer, uuid),
  public.deadline_erledigen(uuid, date, integer, text),
  public.deadline_abschliessen(uuid, text),
  public.template_save(text, text, text, text[], uuid),
  public.template_set_aktiv(uuid, boolean),
  public.wartung_starten(uuid, uuid, date, uuid, boolean)
to authenticated;
