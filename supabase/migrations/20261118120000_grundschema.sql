-- =============================================================================
-- EDKN Technik – Grundschema Prototyp v0.1
--
-- Prinzipien:
-- * RLS auf allen Tabellen. Sichtbarkeit nur hier (Policies + Views), nicht in der UI.
-- * Clients lesen direkt (SELECT unter RLS), schreiben aber fast nur über RPCs
--   (security definer). Jede RPC prüft die Rolle und schreibt den Verlauf.
-- * Rolle und Freigabe ändert nur der Admin über admin_update_user().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.rolle as enum ('pilot', 'wart', 'admin');
create type public.freigabe as enum ('ausstehend', 'freigegeben', 'abgelehnt');
create type public.flugzeug_art as enum ('segler', 'motorsegler', 'ul', 'schlepp');
create type public.meldung_status as enum ('neu', 'zurueckgestellt', 'in_arbeit', 'erledigt', 'abgelegt');
create type public.event_typ as enum ('erstellt', 'kommentar', 'statuswechsel', 'kategorie', 'sperre', 'entsperrt');
create type public.ampel as enum ('gruen', 'gelb', 'rot');

-- -----------------------------------------------------------------------------
-- Tabellen
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  vorname text not null default '' check (char_length(vorname) <= 100),
  nachname text not null default '' check (char_length(nachname) <= 100),
  email text not null,
  rolle public.rolle not null default 'pilot',
  freigabe public.freigabe not null default 'ausstehend',
  freigegeben_von uuid references public.profiles (id) on delete set null,
  freigegeben_am timestamptz,
  vf_uid integer unique, -- später: Vereinsflieger-Login
  created_at timestamptz not null default now()
);
comment on table public.profiles is 'Nutzerprofil zu auth.users. Rolle und Freigabe nur über admin_update_user().';

create table public.aircraft (
  id uuid primary key default gen_random_uuid(),
  kennzeichen text not null unique check (char_length(kennzeichen) between 2 and 20),
  wettbewerbskennzeichen text check (char_length(wettbewerbskennzeichen) <= 10),
  muster text not null check (char_length(muster) between 1 and 100),
  art public.flugzeug_art not null,
  gesperrt boolean not null default false,
  sperrgrund text check (char_length(sperrgrund) <= 500),
  gesperrt_von uuid references public.profiles (id) on delete set null,
  gesperrt_am timestamptz,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  constraint sperre_braucht_grund check (not gesperrt or coalesce(btrim(sperrgrund), '') <> '')
);
comment on table public.aircraft is 'Vereinsflugzeuge. Sperre nur über aircraft_sperren()/aircraft_entsperren().';

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  aircraft_id uuid not null references public.aircraft (id) on delete restrict,
  melder_id uuid not null references public.profiles (id) on delete restrict,
  text text not null check (char_length(btrim(text)) between 1 and 2000),
  kategorie smallint check (kategorie in (1, 2, 3)),
  status public.meldung_status not null default 'neu',
  vorlaeufig_nicht_flugklar boolean not null default false,
  ziel text check (char_length(ziel) <= 200),
  -- Kat 1: Sperrgrund für Piloten (immer sichtbar). Kat 2: optionaler Hinweis.
  pilotenhinweis text check (char_length(pilotenhinweis) <= 500),
  pilotenhinweis_sichtbar boolean not null default false,
  eingestuft_von uuid references public.profiles (id) on delete set null,
  eingestuft_am timestamptz,
  erledigt_am timestamptz,
  created_at timestamptz not null default now(),
  -- Status und Kategorie passen zusammen
  constraint neu_ohne_kategorie check ((status = 'neu') = (kategorie is null)),
  constraint kat3_abgelegt check ((kategorie = 3) = (status = 'abgelegt')),
  constraint kat1_status check (kategorie <> 1 or status in ('in_arbeit', 'erledigt')),
  constraint kat2_status check (kategorie <> 2 or status in ('zurueckgestellt', 'in_arbeit', 'erledigt')),
  constraint kat1_hinweis check (kategorie <> 1 or (pilotenhinweis_sichtbar and coalesce(btrim(pilotenhinweis), '') <> '')),
  constraint hinweis_sichtbar_braucht_text check (not pilotenhinweis_sichtbar or coalesce(btrim(pilotenhinweis), '') <> '')
);
create index reports_aircraft_status_idx on public.reports (aircraft_id, status);
create index reports_melder_idx on public.reports (melder_id);
comment on table public.reports is 'Mängelmeldungen. Änderungen nur über die report_*-RPCs.';

create table public.report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 300),
  created_at timestamptz not null default now()
);
create index report_photos_report_idx on public.report_photos (report_id);

create table public.report_events (
  id bigint generated always as identity primary key,
  report_id uuid references public.reports (id) on delete cascade,
  aircraft_id uuid not null references public.aircraft (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  typ public.event_typ not null,
  text text check (char_length(text) <= 2000),
  intern boolean not null default false,
  created_at timestamptz not null default now()
);
create index report_events_aircraft_idx on public.report_events (aircraft_id, created_at desc);
create index report_events_report_idx on public.report_events (report_id);
comment on table public.report_events is 'Verlauf. Wird nur von RPCs/Seed geschrieben, nie direkt vom Client.';

-- -----------------------------------------------------------------------------
-- Hilfsfunktionen (security definer, damit sie in Policies ohne Rekursion laufen)
-- -----------------------------------------------------------------------------
create function public.current_rolle()
returns public.rolle
language sql stable security definer set search_path = ''
as $$
  select p.rolle from public.profiles p
  where p.id = auth.uid() and p.freigabe = 'freigegeben'
$$;
comment on function public.current_rolle() is 'Rolle des angemeldeten Nutzers, NULL wenn nicht freigegeben.';

create function public.is_approved()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.freigabe = 'freigegeben'
  )
$$;

create function public.is_wart()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.current_rolle() in ('wart', 'admin'), false)
$$;
comment on function public.is_wart() is 'Freigegeben und Rolle wart oder admin.';

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.current_rolle() = 'admin', false)
$$;

-- Darf ein Pilot Statuswechsel dieser Meldung im Verlauf sehen? (Hinweis freigegeben)
create function public.report_hinweis_sichtbar(p_report_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select r.pilotenhinweis_sichtbar from public.reports r where r.id = p_report_id), false)
$$;

-- -----------------------------------------------------------------------------
-- Trigger: Profil bei Registrierung anlegen, E-Mail synchron halten
-- -----------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, vorname, nachname)
  values (
    new.id,
    coalesce(new.email, ''),
    left(btrim(coalesce(new.raw_user_meta_data ->> 'vorname', '')), 100),
    left(btrim(coalesce(new.raw_user_meta_data ->> 'nachname', '')), 100)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.handle_user_email_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Zweite Verteidigungslinie neben den Spaltenrechten: Clients (Rollen anon/authenticated)
-- dürfen geschützte Profilfelder nie ändern. RPCs laufen als Owner und sind davon nicht betroffen.
create function public.protect_profile_fields()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and (
    new.id is distinct from old.id
    or new.rolle is distinct from old.rolle
    or new.freigabe is distinct from old.freigabe
    or new.freigegeben_von is distinct from old.freigegeben_von
    or new.freigegeben_am is distinct from old.freigegeben_am
    or new.email is distinct from old.email
    or new.vf_uid is distinct from old.vf_uid
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Rolle, Freigabe und E-Mail können nur vom Admin geändert werden'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Höchstens 3 Fotos pro Meldung
create function public.check_max_photos()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.reports where id = new.report_id for update;
  if (select count(*) from public.report_photos where report_id = new.report_id) >= 3 then
    raise exception 'Höchstens 3 Fotos pro Meldung' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger check_max_photos
  before insert on public.report_photos
  for each row execute function public.check_max_photos();

-- -----------------------------------------------------------------------------
-- Rechte: erst alles weg, dann gezielt erlauben (Supabase vergibt sonst Vollrechte)
-- -----------------------------------------------------------------------------
revoke all on public.profiles, public.aircraft, public.reports, public.report_photos, public.report_events
  from anon, authenticated;

grant select on public.profiles, public.aircraft, public.reports, public.report_photos, public.report_events
  to authenticated;
grant update (vorname, nachname) on public.profiles to authenticated;
grant insert (kennzeichen, wettbewerbskennzeichen, muster, art, aktiv) on public.aircraft to authenticated;
grant update (kennzeichen, wettbewerbskennzeichen, muster, art, aktiv) on public.aircraft to authenticated;
grant insert (report_id, storage_path) on public.report_photos to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.aircraft enable row level security;
alter table public.reports enable row level security;
alter table public.report_photos enable row level security;
alter table public.report_events enable row level security;

-- profiles: eigenes Profil immer (auch ausstehend, für die Warte-Seite), Admin sieht alle.
-- Namen anderer Personen gibt es für Piloten nur über die View profile_names.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- aircraft: alle Freigegebenen lesen, nur Admin legt an und bearbeitet Stammdaten.
create policy aircraft_select on public.aircraft for select to authenticated
  using ((select public.is_approved()));
create policy aircraft_insert_admin on public.aircraft for insert to authenticated
  with check ((select public.is_admin()));
create policy aircraft_update_admin on public.aircraft for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- reports: Rohmeldungen sieht nur der Melder und die Warte.
create policy reports_select on public.reports for select to authenticated
  using (
    (select public.is_wart())
    or ((select public.is_approved()) and melder_id = (select auth.uid()))
  );

-- report_photos: wie reports. Einfügen nur zur eigenen Meldung, Pfad muss zur Meldung passen.
create policy report_photos_select on public.report_photos for select to authenticated
  using (
    (select public.is_wart())
    or (
      (select public.is_approved())
      and exists (select 1 from public.reports r where r.id = report_id and r.melder_id = (select auth.uid()))
    )
  );
create policy report_photos_insert_own on public.report_photos for insert to authenticated
  with check (
    (select public.is_approved())
    and storage_path like report_id::text || '/%'
    and exists (
      select 1 from public.reports r
      where r.id = report_id and r.melder_id = (select auth.uid()) and r.status = 'neu'
    )
  );

-- report_events (Verlauf):
-- * Warte: alles, inkl. interner Kommentare
-- * Piloten: nur nicht-interne Einträge zu
--   - Sperren/Entsperrungen am Flugzeug (report_id ist NULL)
--   - eigenen Meldungen (inkl. Rückmeldungen)
--   - Einstufung/Statuswechsel von Meldungen mit freigegebenem Pilotenhinweis
create policy report_events_select on public.report_events for select to authenticated
  using (
    (select public.is_wart())
    or (
      (select public.is_approved())
      and not intern
      and (
        report_id is null
        or exists (select 1 from public.reports r where r.id = report_id and r.melder_id = (select auth.uid()))
        or (typ in ('kategorie', 'statuswechsel') and public.report_hinweis_sichtbar(report_id))
      )
    )
  );

-- -----------------------------------------------------------------------------
-- Views
-- -----------------------------------------------------------------------------

-- Namen für Anzeigen. Freigegebene sehen Namen von Warten/Admins und sich selbst,
-- Warte sehen alle Namen. Keine E-Mail-Adressen.
-- Läuft bewusst mit den Rechten des Owners (security_invoker = false) und filtert selbst.
create view public.profile_names
with (security_invoker = false, security_barrier = true)
as
  select p.id, p.vorname, p.nachname, p.rolle
  from public.profiles p
  where (select public.is_approved())
    and (
      p.id = (select auth.uid())
      or (p.rolle in ('wart', 'admin') and p.freigabe = 'freigegeben')
      or (select public.is_wart())
    );
comment on view public.profile_names is 'Namen für Anzeigen. Piloten sehen nur Warte/Admins und sich selbst.';

-- Ampel und Status pro Flugzeug. Wird für alle Freigegebenen berechnet, gibt aber
-- aus fremden Meldungen nur freigegebene Pilotenhinweise und Zählerstände heraus.
create view public.aircraft_overview
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
                 then 'Vorläufig nicht flugklar – Meldung wird von der Werkstatt geprüft' end],
      null
    ) as sperrgruende,
    coalesce(o.anzahl_in_pruefung, 0)::integer as anzahl_in_pruefung,
    coalesce(o.hinweise, '[]'::jsonb) as hinweise
  from public.aircraft a
  left join offen o on o.aircraft_id = a.id
  left join public.profiles sp on sp.id = a.gesperrt_von
  where (select public.is_approved())
    and (a.aktiv or (select public.is_admin()));
comment on view public.aircraft_overview is 'Ampel pro Flugzeug (rot/gelb/gruen), berechnet in der DB. Nur für Freigegebene.';

-- Verlauf mit Namen. security_invoker: die RLS von report_events gilt.
-- Namen kommen aus profile_names (Piloten sehen dort keine fremden Melder).
create view public.aircraft_verlauf
with (security_invoker = true)
as
  select
    e.id,
    e.aircraft_id,
    e.report_id,
    e.typ,
    e.text,
    e.intern,
    e.created_at,
    e.user_id,
    nullif(trim(concat_ws(' ', pn.vorname, pn.nachname)), '') as user_name
  from public.report_events e
  left join public.profile_names pn on pn.id = e.user_id;
comment on view public.aircraft_verlauf is 'Verlauf pro Flugzeug mit Namen. Sichtbarkeit über RLS von report_events.';

revoke all on public.profile_names, public.aircraft_overview, public.aircraft_verlauf from anon, authenticated;
grant select on public.profile_names, public.aircraft_overview, public.aircraft_verlauf to authenticated;

-- -----------------------------------------------------------------------------
-- RPCs
-- -----------------------------------------------------------------------------

-- Admin: Freigabe und Rolle setzen
create function public.admin_update_user(p_user_id uuid, p_freigabe public.freigabe, p_rolle public.rolle)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_alt public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen Nutzer freigeben' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Die eigene Rolle und Freigabe kann man nicht selbst ändern' using errcode = '42501';
  end if;

  select * into v_alt from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Nutzer nicht gefunden' using errcode = 'P0002';
  end if;

  update public.profiles
  set freigabe = p_freigabe,
      rolle = p_rolle,
      freigegeben_von = case when p_freigabe = 'freigegeben' and v_alt.freigabe <> 'freigegeben'
                             then auth.uid() else freigegeben_von end,
      freigegeben_am = case when p_freigabe = 'freigegeben' and v_alt.freigabe <> 'freigegeben'
                            then now() else freigegeben_am end
  where id = p_user_id;
end;
$$;

-- Melden: neue Meldung anlegen
create function public.report_create(p_aircraft_id uuid, p_text text, p_vorlaeufig_nicht_flugklar boolean default false)
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
    raise exception 'Flugzeug nicht gefunden' using errcode = 'P0002';
  end if;
  if coalesce(btrim(p_text), '') = '' then
    raise exception 'Bitte beschreibe den Mangel' using errcode = '22023';
  end if;

  insert into public.reports (aircraft_id, melder_id, text, vorlaeufig_nicht_flugklar)
  values (p_aircraft_id, auth.uid(), btrim(p_text), coalesce(p_vorlaeufig_nicht_flugklar, false))
  returning id into v_id;

  insert into public.report_events (report_id, aircraft_id, user_id, typ, text)
  values (
    v_id, p_aircraft_id, auth.uid(), 'erstellt',
    case when p_vorlaeufig_nicht_flugklar then 'Meldung erstellt – vorläufig nicht flugklar'
         else 'Meldung erstellt' end
  );

  return v_id;
end;
$$;

-- Werkstatt: einstufen bzw. umstufen (Kat 1/2/3). Gleiche Kategorie = Angaben ändern.
create function public.report_einstufen(
  p_report_id uuid,
  p_kategorie smallint,
  p_ziel text default null,
  p_pilotenhinweis text default null,
  p_pilotenhinweis_sichtbar boolean default false,
  p_begruendung text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_alt public.reports;
  v_status public.meldung_status;
  v_hinweis text := nullif(btrim(p_pilotenhinweis), '');
  v_ziel text := nullif(btrim(p_ziel), '');
  v_sichtbar boolean;
  v_text text;
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Meldungen einstufen' using errcode = '42501';
  end if;
  if p_kategorie not in (1, 2, 3) then
    raise exception 'Kategorie muss 1, 2 oder 3 sein' using errcode = '22023';
  end if;

  select * into v_alt from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'Meldung nicht gefunden' using errcode = 'P0002';
  end if;
  if v_alt.status = 'erledigt' then
    raise exception 'Erledigte Meldungen können nicht mehr eingestuft werden' using errcode = '22023';
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
      v_status := 'abgelegt';
      v_sichtbar := false;
      v_hinweis := null;
      v_ziel := null;
  end case;

  update public.reports
  set kategorie = p_kategorie,
      status = v_status,
      ziel = v_ziel,
      pilotenhinweis = v_hinweis,
      pilotenhinweis_sichtbar = v_sichtbar,
      eingestuft_von = auth.uid(),
      eingestuft_am = now()
  where id = p_report_id;

  v_text := case
    when v_alt.kategorie is null then 'Eingestuft als Kat ' || p_kategorie
    when v_alt.kategorie <> p_kategorie then 'Umgestuft von Kat ' || v_alt.kategorie || ' auf Kat ' || p_kategorie
    else 'Einstufung Kat ' || p_kategorie || ' geändert'
  end;
  if p_kategorie = 1 then
    v_text := v_text || ' – nicht flugklar: ' || v_hinweis;
  elsif p_kategorie = 2 then
    v_text := v_text || ' – Ziel: ' || v_ziel;
    if v_sichtbar then
      v_text := v_text || ' – Hinweis: ' || v_hinweis;
    end if;
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

-- Werkstatt: Status weiterschalten (in_arbeit, erledigt)
create function public.report_set_status(
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

-- Kommentar: Warte intern oder für den Melder, Melder als Nachtrag zur eigenen Meldung
create function public.report_comment(p_report_id uuid, p_text text, p_intern boolean default false)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_report public.reports;
  v_wart boolean := public.is_wart();
begin
  if not public.is_approved() then
    raise exception 'Konto ist nicht freigegeben' using errcode = '42501';
  end if;
  if coalesce(btrim(p_text), '') = '' then
    raise exception 'Kommentar ist leer' using errcode = '22023';
  end if;

  select * into v_report from public.reports where id = p_report_id;
  if not found or (not v_wart and v_report.melder_id <> auth.uid()) then
    raise exception 'Meldung nicht gefunden' using errcode = 'P0002';
  end if;
  if not v_wart and coalesce(p_intern, false) then
    raise exception 'Nur Warte können interne Kommentare schreiben' using errcode = '42501';
  end if;

  insert into public.report_events (report_id, aircraft_id, user_id, typ, text, intern)
  values (p_report_id, v_report.aircraft_id, auth.uid(), 'kommentar', btrim(p_text), v_wart and coalesce(p_intern, false));
end;
$$;

-- Werkstatt: manuelle Sperre
create function public.aircraft_sperren(p_aircraft_id uuid, p_grund text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Flugzeuge sperren' using errcode = '42501';
  end if;
  if coalesce(btrim(p_grund), '') = '' then
    raise exception 'Bitte einen Sperrgrund angeben' using errcode = '22023';
  end if;

  update public.aircraft
  set gesperrt = true, sperrgrund = btrim(p_grund), gesperrt_von = auth.uid(), gesperrt_am = now()
  where id = p_aircraft_id;
  if not found then
    raise exception 'Flugzeug nicht gefunden' using errcode = 'P0002';
  end if;

  insert into public.report_events (aircraft_id, user_id, typ, text)
  values (p_aircraft_id, auth.uid(), 'sperre', btrim(p_grund));
end;
$$;

create function public.aircraft_entsperren(p_aircraft_id uuid, p_grund text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_wart() then
    raise exception 'Nur Warte dürfen Flugzeuge entsperren' using errcode = '42501';
  end if;
  if coalesce(btrim(p_grund), '') = '' then
    raise exception 'Bitte einen Grund für die Entsperrung angeben' using errcode = '22023';
  end if;

  update public.aircraft
  set gesperrt = false, sperrgrund = null, gesperrt_von = null, gesperrt_am = null
  where id = p_aircraft_id and gesperrt;
  if not found then
    raise exception 'Flugzeug nicht gefunden oder nicht gesperrt' using errcode = 'P0002';
  end if;

  insert into public.report_events (aircraft_id, user_id, typ, text)
  values (p_aircraft_id, auth.uid(), 'entsperrt', btrim(p_grund));
end;
$$;

-- -----------------------------------------------------------------------------
-- Funktionsrechte: Postgres erlaubt EXECUTE sonst für PUBLIC
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.current_rolle(),
  public.is_approved(),
  public.is_wart(),
  public.is_admin(),
  public.report_hinweis_sichtbar(uuid),
  public.admin_update_user(uuid, public.freigabe, public.rolle),
  public.report_create(uuid, text, boolean),
  public.report_einstufen(uuid, smallint, text, text, boolean, text),
  public.report_set_status(uuid, public.meldung_status, text, boolean),
  public.report_comment(uuid, text, boolean),
  public.aircraft_sperren(uuid, text),
  public.aircraft_entsperren(uuid, text)
to authenticated;

-- -----------------------------------------------------------------------------
-- Storage: privater Bucket für Fotos, Pfad = <report_id>/<datei>
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy report_photos_upload_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'report-photos'
    and (select public.is_approved())
    and exists (
      select 1 from public.reports r
      where r.id::text = (storage.foldername(name))[1]
        and r.melder_id = (select auth.uid())
        and r.status = 'neu'
    )
  );

create policy report_photos_read on storage.objects for select to authenticated
  using (
    bucket_id = 'report-photos'
    and (
      (select public.is_wart())
      or (
        (select public.is_approved())
        and exists (
          select 1 from public.reports r
          where r.id::text = (storage.foldername(name))[1]
            and r.melder_id = (select auth.uid())
        )
      )
    )
  );
