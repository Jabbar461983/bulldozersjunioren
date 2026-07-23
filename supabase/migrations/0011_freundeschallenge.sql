-- Freundeschallenges: Ein Junior fordert einen anderen Junior heraus, in einer
-- gewählten Kategorie an 3 aufeinanderfolgenden Tagen je eine Übung "geschafft"
-- einzuschätzen. Schafft es eine der beiden Personen an einem Tag nicht (oder
-- lässt einen Tag verstreichen), endet die Challenge ohne Punkte. Schaffen es
-- beide, gibt es für beide die admin-konfigurierten Extrapunkte.
--
-- Pro Junior ist zu jeder Zeit nur eine Freundeschallenge aktiv (angefragt
-- oder laufend) möglich (siehe freundeschallenge_anfragen()).

-- ---------------------------------------------------------------------------
-- 1) Schema
-- ---------------------------------------------------------------------------

create type public.freundeschallenge_status_typ as enum (
  'angefragt', 'aktiv', 'erfolgreich', 'gescheitert', 'abgelehnt'
);

-- Extrapunkte als Konfigurationsdaten (Singleton), analog zu
-- punkte_konfiguration (Migration 0004) – im Admin-Bereich editierbar, ohne
-- Code/Migrationen anzufassen.
create table public.freundeschallenge_konfiguration (
  id smallint primary key default 1,
  extra_punkte integer not null default 100,
  constraint freundeschallenge_konfiguration_singleton check (id = 1)
);

insert into public.freundeschallenge_konfiguration (id, extra_punkte)
values (1, 100)
on conflict (id) do nothing;

alter table public.freundeschallenge_konfiguration enable row level security;

create policy freundeschallenge_konfiguration_select_all on public.freundeschallenge_konfiguration
  for select
  to authenticated
  using (true);

create policy freundeschallenge_konfiguration_update_admin on public.freundeschallenge_konfiguration
  for update
  to authenticated
  using (public.current_user_role() = 'admin');

create table public.freundeschallenges (
  id uuid primary key default gen_random_uuid(),
  kategorie public.kategorie_typ not null,
  ersteller_id uuid not null references public.users (id) on delete cascade,
  empfaenger_id uuid not null references public.users (id) on delete cascade,
  status public.freundeschallenge_status_typ not null default 'angefragt',
  start_datum date,
  ersteller_tage integer not null default 0,
  empfaenger_tage integer not null default 0,
  ersteller_letzter_tag date,
  empfaenger_letzter_tag date,
  punkte_vergeben integer not null default 0,
  created_at timestamptz not null default now(),
  entschieden_am timestamptz,
  abgeschlossen_am timestamptz,
  constraint freundeschallenges_nicht_selbst check (ersteller_id <> empfaenger_id)
);

create index freundeschallenges_ersteller_id_idx on public.freundeschallenges (ersteller_id);
create index freundeschallenges_empfaenger_id_idx on public.freundeschallenges (empfaenger_id);
create index freundeschallenges_status_idx on public.freundeschallenges (status);

alter table public.freundeschallenges enable row level security;

-- Lesen dürfen nur die beiden Beteiligten (Admin sieht alles). Schreiben
-- passiert ausschliesslich über die SECURITY-DEFINER-Funktionen weiter unten
-- (kein Insert/Update/Delete für normale Nutzer per Policy vorgesehen).
create policy freundeschallenges_select_beteiligt on public.freundeschallenges
  for select
  to authenticated
  using (ersteller_id = auth.uid() or empfaenger_id = auth.uid());

create policy freundeschallenges_select_admin on public.freundeschallenges
  for select
  to authenticated
  using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 2) Ablauf-Erkennung (lazy, analog zum Streak-Anzeige-Muster in
-- gamification.ts): wird zu Beginn jeder relevanten Funktion aufgerufen, statt
-- über einen Cron-Job zu laufen. Eine laufende Challenge scheitert, sobald ein
-- bereits vollständig vergangener Tag von einer der beiden Personen nicht mit
-- einer "geschafft"-Einschätzung abgedeckt wurde.
-- ---------------------------------------------------------------------------

create or replace function public.freundeschallenge_ablaufen_lassen()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.freundeschallenges
    set status = 'gescheitert', abgeschlossen_am = now()
    where status = 'aktiv'
      and start_datum is not null
      and least(current_date - start_datum, 3) > least(ersteller_tage, empfaenger_tage);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Anfrage erstellen
-- ---------------------------------------------------------------------------

create or replace function public.freundeschallenge_anfragen(
  p_empfaenger_id uuid,
  p_kategorie public.kategorie_typ
)
returns public.freundeschallenges
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.freundeschallenges;
begin
  perform public.freundeschallenge_ablaufen_lassen();

  if p_empfaenger_id = auth.uid() then
    raise exception 'Du kannst keine Freundeschallenge an dich selbst schicken.';
  end if;

  if not exists (select 1 from public.users where id = p_empfaenger_id and rolle = 'junior') then
    raise exception 'Junior nicht gefunden.';
  end if;

  if exists (
    select 1 from public.freundeschallenges
    where status in ('angefragt', 'aktiv')
      and (ersteller_id = auth.uid() or empfaenger_id = auth.uid())
  ) then
    raise exception 'Aktuell schon eine Freundeschallenge am Laufen.';
  end if;

  if exists (
    select 1 from public.freundeschallenges
    where status in ('angefragt', 'aktiv')
      and (ersteller_id = p_empfaenger_id or empfaenger_id = p_empfaenger_id)
  ) then
    raise exception 'Diese Person hat aktuell schon eine Freundeschallenge am Laufen.';
  end if;

  insert into public.freundeschallenges (kategorie, ersteller_id, empfaenger_id, status)
  values (p_kategorie, auth.uid(), p_empfaenger_id, 'angefragt')
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.freundeschallenge_anfragen(uuid, public.kategorie_typ) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Anfrage annehmen/ablehnen
-- ---------------------------------------------------------------------------

create or replace function public.freundeschallenge_antworten(
  p_challenge_id uuid,
  p_annehmen boolean
)
returns public.freundeschallenges
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.freundeschallenges;
begin
  perform public.freundeschallenge_ablaufen_lassen();

  select * into v_row
    from public.freundeschallenges
    where id = p_challenge_id and empfaenger_id = auth.uid() and status = 'angefragt'
    for update;

  if v_row.id is null then
    raise exception 'Anfrage nicht gefunden oder bereits beantwortet.';
  end if;

  if p_annehmen then
    update public.freundeschallenges
      set status = 'aktiv', start_datum = current_date, entschieden_am = now()
      where id = p_challenge_id
      returning * into v_row;
  else
    update public.freundeschallenges
      set status = 'abgelehnt', entschieden_am = now()
      where id = p_challenge_id
      returning * into v_row;
  end if;

  return v_row;
end;
$$;

grant execute on function public.freundeschallenge_antworten(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Eigene Challenges lesen (angereichert mit Gegner-Anzeigename, analog zum
-- Datenschutz-Muster von rangliste(): nur Vorname + Nachname-Initiale).
-- ---------------------------------------------------------------------------

create or replace function public.meine_freundeschallengen()
returns table (
  id uuid,
  kategorie public.kategorie_typ,
  status public.freundeschallenge_status_typ,
  bin_ich_ersteller boolean,
  gegner_id uuid,
  gegner_vorname text,
  gegner_nachname_initiale text,
  meine_tage integer,
  gegner_tage integer,
  start_datum date,
  punkte_vergeben integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.freundeschallenge_ablaufen_lassen();

  return query
    select
      f.id,
      f.kategorie,
      f.status,
      f.ersteller_id = auth.uid() as bin_ich_ersteller,
      case when f.ersteller_id = auth.uid() then f.empfaenger_id else f.ersteller_id end as gegner_id,
      g.vorname,
      left(g.nachname, 1) as gegner_nachname_initiale,
      case when f.ersteller_id = auth.uid() then f.ersteller_tage else f.empfaenger_tage end as meine_tage,
      case when f.ersteller_id = auth.uid() then f.empfaenger_tage else f.ersteller_tage end as gegner_tage,
      f.start_datum,
      f.punkte_vergeben,
      f.created_at
    from public.freundeschallenges f
    join public.users g
      on g.id = case when f.ersteller_id = auth.uid() then f.empfaenger_id else f.ersteller_id end
    where f.ersteller_id = auth.uid() or f.empfaenger_id = auth.uid()
    order by f.created_at desc
    limit 20;
end;
$$;

grant execute on function public.meine_freundeschallengen() to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Anbindung an submit_selbsteinschaetzung(): jede Einschätzung prüft, ob
-- sie zu einer laufenden Freundeschallenge in derselben Kategorie gehört, und
-- aktualisiert diese entsprechend (Tag gutschreiben, scheitern lassen oder bei
-- 3/3 beidseitig abschliessen + Extrapunkte vergeben).
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'freundeschallenge_einschaetzung_ergebnis') then
    create type public.freundeschallenge_einschaetzung_ergebnis as (
      status public.freundeschallenge_status_typ,
      gegner_id uuid,
      gegner_vorname text,
      gegner_nachname_initiale text,
      punkte integer
    );
  end if;
end $$;

create or replace function public.aktualisiere_freundeschallenge_bei_einschaetzung(
  p_junior_id uuid,
  p_kategorie public.kategorie_typ,
  p_geschafft boolean,
  p_heute date
)
returns public.freundeschallenge_einschaetzung_ergebnis
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge public.freundeschallenges;
  v_ist_ersteller boolean;
  v_gegner_id uuid;
  v_gegner public.users;
  v_extra_punkte integer;
  v_ergebnis public.freundeschallenge_einschaetzung_ergebnis;
begin
  perform public.freundeschallenge_ablaufen_lassen();

  select * into v_challenge
    from public.freundeschallenges
    where status = 'aktiv'
      and kategorie = p_kategorie
      and (ersteller_id = p_junior_id or empfaenger_id = p_junior_id)
    limit 1;

  if v_challenge.id is null then
    return v_ergebnis;
  end if;

  v_ist_ersteller := v_challenge.ersteller_id = p_junior_id;
  v_gegner_id := case when v_ist_ersteller then v_challenge.empfaenger_id else v_challenge.ersteller_id end;

  if not p_geschafft then
    update public.freundeschallenges
      set status = 'gescheitert', abgeschlossen_am = now()
      where id = v_challenge.id;

    v_ergebnis.status := 'gescheitert';
    v_ergebnis.gegner_id := v_gegner_id;
  else
    if v_ist_ersteller then
      if v_challenge.ersteller_letzter_tag is distinct from p_heute then
        update public.freundeschallenges
          set ersteller_tage = ersteller_tage + 1,
              ersteller_letzter_tag = p_heute
          where id = v_challenge.id
          returning * into v_challenge;
      end if;
    else
      if v_challenge.empfaenger_letzter_tag is distinct from p_heute then
        update public.freundeschallenges
          set empfaenger_tage = empfaenger_tage + 1,
              empfaenger_letzter_tag = p_heute
          where id = v_challenge.id
          returning * into v_challenge;
      end if;
    end if;

    if v_challenge.ersteller_tage >= 3 and v_challenge.empfaenger_tage >= 3 then
      select extra_punkte into v_extra_punkte
        from public.freundeschallenge_konfiguration where id = 1;
      v_extra_punkte := coalesce(v_extra_punkte, 0);

      perform set_config('app.allow_points_update', 'true', true);
      update public.users
        set punkte_total = punkte_total + v_extra_punkte,
            level_aktuell = public.berechne_level(punkte_total + v_extra_punkte)
        where id in (v_challenge.ersteller_id, v_challenge.empfaenger_id);

      update public.freundeschallenges
        set status = 'erfolgreich', punkte_vergeben = v_extra_punkte, abgeschlossen_am = now()
        where id = v_challenge.id;

      v_ergebnis.status := 'erfolgreich';
      v_ergebnis.gegner_id := v_gegner_id;
      v_ergebnis.punkte := v_extra_punkte;
    end if;
  end if;

  if v_ergebnis.status is not null then
    select * into v_gegner from public.users where id = v_gegner_id;
    v_ergebnis.gegner_vorname := v_gegner.vorname;
    v_ergebnis.gegner_nachname_initiale := left(v_gegner.nachname, 1);
  end if;

  return v_ergebnis;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_attribute
    where attrelid = 'public.selbsteinschaetzung_ergebnis'::regtype::oid
      and attname = 'freundeschallenge_status'
      and not attisdropped
  ) then
    alter type public.selbsteinschaetzung_ergebnis add attribute freundeschallenge_status public.freundeschallenge_status_typ;
    alter type public.selbsteinschaetzung_ergebnis add attribute freundeschallenge_gegner_id uuid;
    alter type public.selbsteinschaetzung_ergebnis add attribute freundeschallenge_gegner_vorname text;
    alter type public.selbsteinschaetzung_ergebnis add attribute freundeschallenge_gegner_nachname_initiale text;
    alter type public.selbsteinschaetzung_ergebnis add attribute freundeschallenge_punkte integer;
  end if;
end $$;

create or replace function public.submit_selbsteinschaetzung(
  p_uebung_id uuid,
  p_geschafft boolean,
  p_gefuehl_sterne smallint
)
returns public.selbsteinschaetzung_ergebnis
language plpgsql
security definer
set search_path = public
as $$
declare
  v_punkte integer := 0;
  v_basis_punkte integer;
  v_row public.selbsteinschaetzungen;
  v_altes_level integer;
  v_neues_level integer;
  v_neue_badges public.badges[];
  v_kategorie public.kategorie_typ;
  v_freundeschallenge public.freundeschallenge_einschaetzung_ergebnis;
  v_ergebnis public.selbsteinschaetzung_ergebnis;
begin
  if p_gefuehl_sterne is not null and (p_gefuehl_sterne < 1 or p_gefuehl_sterne > 5) then
    raise exception 'gefuehl_sterne muss zwischen 1 und 5 liegen.';
  end if;

  select kategorie into v_kategorie from public.uebungen where id = p_uebung_id;
  if v_kategorie is null then
    raise exception 'Übung nicht gefunden.';
  end if;

  select basis_punkte_pro_uebung into v_basis_punkte
    from public.punkte_konfiguration where id = 1;

  if p_geschafft then
    v_punkte := coalesce(v_basis_punkte, 20);
  end if;

  insert into public.selbsteinschaetzungen (
    junior_id, uebung_id, datum, geschafft, gefuehl_sterne, punkte_vergeben
  )
  values (auth.uid(), p_uebung_id, current_date, p_geschafft, p_gefuehl_sterne, v_punkte)
  returning * into v_row;

  select level_aktuell into v_altes_level from public.users where id = auth.uid();

  if p_geschafft then
    perform public.aktualisiere_streaks(auth.uid(), current_date);
  end if;

  if v_punkte > 0 then
    perform set_config('app.allow_points_update', 'true', true);
    update public.users
      set punkte_total = punkte_total + v_punkte,
          level_aktuell = public.berechne_level(punkte_total + v_punkte)
      where id = auth.uid();
  end if;

  select level_aktuell into v_neues_level from public.users where id = auth.uid();

  select coalesce(array_agg(b.*), '{}') into v_neue_badges
    from public.pruefe_und_vergib_badges(auth.uid()) b;

  select * into v_freundeschallenge
    from public.aktualisiere_freundeschallenge_bei_einschaetzung(auth.uid(), v_kategorie, p_geschafft, current_date);

  v_ergebnis.einschaetzung := v_row;
  v_ergebnis.level_aufstieg := v_neues_level > v_altes_level;
  v_ergebnis.neues_level := v_neues_level;
  v_ergebnis.neue_badges := v_neue_badges;
  v_ergebnis.freundeschallenge_status := v_freundeschallenge.status;
  v_ergebnis.freundeschallenge_gegner_id := v_freundeschallenge.gegner_id;
  v_ergebnis.freundeschallenge_gegner_vorname := v_freundeschallenge.gegner_vorname;
  v_ergebnis.freundeschallenge_gegner_nachname_initiale := v_freundeschallenge.gegner_nachname_initiale;
  v_ergebnis.freundeschallenge_punkte := v_freundeschallenge.punkte;

  return v_ergebnis;
end;
$$;

grant execute on function public.submit_selbsteinschaetzung(uuid, boolean, smallint) to authenticated;
