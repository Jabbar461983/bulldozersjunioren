-- Phase 4 – Gamification-Engine (Punkte, Level, Streaks, Badges)
--
-- Erweitert das Datenmodell um woechentliche Streaks, eine konfigurierbare
-- Punkte-Basis, Web-Push-Abonnements und einen Badge-Katalog, und ersetzt
-- submit_selbsteinschaetzung() durch eine Version, die Level-Aufstieg und neu
-- vergebene Badges direkt zurueckgibt (fuer die Push-Benachrichtigung).

-- ---------------------------------------------------------------------------
-- 1) Schema-Erweiterungen
-- ---------------------------------------------------------------------------

alter table public.users
  add column streak_wochen integer not null default 0,
  add column streak_letzte_woche date;

-- Punkte-Basiswert als Konfigurationsdaten (nicht hart codiert), damit er bei
-- Bedarf angepasst werden kann (z. B. direkt in der Supabase-Tabellenansicht),
-- ohne Code/Funktionen anzufassen. Singleton-Tabelle (genau eine Zeile).
create table public.punkte_konfiguration (
  id smallint primary key default 1,
  basis_punkte_pro_uebung integer not null default 20,
  constraint punkte_konfiguration_singleton check (id = 1)
);

insert into public.punkte_konfiguration (id, basis_punkte_pro_uebung)
values (1, 20)
on conflict (id) do nothing;

alter table public.punkte_konfiguration enable row level security;

create policy punkte_konfiguration_select_all on public.punkte_konfiguration
  for select
  to authenticated
  using (true);

create policy punkte_konfiguration_update_admin on public.punkte_konfiguration
  for update
  to authenticated
  using (public.current_user_role() = 'admin');

-- Web-Push-Abonnements: ein Nutzer kann mehrere Geraete/Browser haben.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_own on public.push_subscriptions
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Badges brauchen einen eindeutigen Namen, damit der Seed-Insert unten
-- idempotent (per ON CONFLICT) wiederholt werden kann.
alter table public.badges add constraint badges_name_unique unique (name);

-- ---------------------------------------------------------------------------
-- 2) Badge-Katalog als Konfigurationsdaten (27 Badges)
--
-- kriterium_typ steuert, wie pruefe_und_vergib_badges() weiter unten das
-- Kriterium auswertet:
--   'kategorie_geschafft' – kriterium_wert = Anzahl "geschafft"-Einschaetzungen
--                            in der Kategorie (badges.kategorie)
--   'streak_tage'          – kriterium_wert = benoetigter taeglicher Streak
--   'streak_wochen'        – kriterium_wert = benoetigter woechentlicher Streak
--   'level'                – kriterium_wert = benoetigtes Level
--   'allrounder'           – kriterium_wert = Anzahl unterschiedlicher
--                            Kategorien mit mindestens einer "geschafft"-
--                            Einschaetzung (aktuell 6 = alle Kategorien)
--
-- Weitere Badges lassen sich spaeter einfach per INSERT ergaenzen, ohne
-- Code-Aenderungen an der Vergabe-Engine.
-- ---------------------------------------------------------------------------

insert into public.badges (name, beschreibung, icon, kategorie, kriterium_typ, kriterium_wert)
values
  ('Technik-Neuling', '5 Technik-Übungen geschafft', '🎯', 'technik', 'kategorie_geschafft', 5),
  ('Technik-Ass', '20 Technik-Übungen geschafft', '🎯', 'technik', 'kategorie_geschafft', 20),
  ('Technik-Meister', '50 Technik-Übungen geschafft', '🎯', 'technik', 'kategorie_geschafft', 50),

  ('Schuss-Neuling', '5 Schuss-Übungen geschafft', '🚀', 'schuss', 'kategorie_geschafft', 5),
  ('Schuss-Ass', '20 Schuss-Übungen geschafft', '🚀', 'schuss', 'kategorie_geschafft', 20),
  ('Schuss-Meister', '50 Schuss-Übungen geschafft', '🚀', 'schuss', 'kategorie_geschafft', 50),

  ('Kraft-Neuling', '5 Kraft-Übungen geschafft', '💪', 'kraft', 'kategorie_geschafft', 5),
  ('Kraft-Ass', '20 Kraft-Übungen geschafft', '💪', 'kraft', 'kategorie_geschafft', 20),
  ('Kraft-Meister', '50 Kraft-Übungen geschafft', '💪', 'kraft', 'kategorie_geschafft', 50),

  ('Koordinations-Neuling', '5 Koordinations-Übungen geschafft', '🤹', 'koordination', 'kategorie_geschafft', 5),
  ('Koordinations-Ass', '20 Koordinations-Übungen geschafft', '🤹', 'koordination', 'kategorie_geschafft', 20),
  ('Koordinations-Meister', '50 Koordinations-Übungen geschafft', '🤹', 'koordination', 'kategorie_geschafft', 50),

  ('Kondition-Neuling', '5 Kondition-Übungen geschafft', '🏃', 'kondition', 'kategorie_geschafft', 5),
  ('Kondition-Ass', '20 Kondition-Übungen geschafft', '🏃', 'kondition', 'kategorie_geschafft', 20),
  ('Kondition-Meister', '50 Kondition-Übungen geschafft', '🏃', 'kondition', 'kategorie_geschafft', 50),

  ('Schnelligkeits-Neuling', '5 Schnelligkeits-Übungen geschafft', '⚡', 'schnelligkeit', 'kategorie_geschafft', 5),
  ('Schnelligkeits-Ass', '20 Schnelligkeits-Übungen geschafft', '⚡', 'schnelligkeit', 'kategorie_geschafft', 20),
  ('Schnelligkeits-Meister', '50 Schnelligkeits-Übungen geschafft', '⚡', 'schnelligkeit', 'kategorie_geschafft', 50),

  ('3 Tage in Folge', '3 Tage in Folge aktiv', '🔥', 'streak', 'streak_tage', 3),
  ('7 Tage in Folge', '7 Tage in Folge aktiv', '🔥', 'streak', 'streak_tage', 7),
  ('30 Tage in Folge', '30 Tage in Folge aktiv', '🔥', 'streak', 'streak_tage', 30),
  ('4 Wochen in Folge', '4 Wochen in Folge aktiv', '📅', 'streak', 'streak_wochen', 4),

  ('Level 5', 'Level 5 erreicht', '⭐', 'level', 'level', 5),
  ('Level 10', 'Level 10 erreicht', '⭐', 'level', 'level', 10),
  ('Level 15', 'Level 15 erreicht', '⭐', 'level', 'level', 15),
  ('Level 20', 'Level 20 erreicht', '⭐', 'level', 'level', 20),

  ('Allrounder', 'Mindestens 1 Übung in jeder der 6 Kategorien geschafft', '🌟', 'special', 'allrounder', 6)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- 3) Level-Formel
--
-- Dreieckszahlen-Formel: um Level n zu erreichen, werden insgesamt
--   punkte_fuer_level(n) = 50 * (n - 1) * n
-- Punkte benoetigt. Jedes weitere Level braucht damit einen wachsenden
-- Punkteabstand (Level 2: 100, Level 3: 300, Level 4: 600, Level 5: 1000, …) –
-- die Differenz zum jeweils naechsten Level waechst linear um 100 Punkte pro
-- Levelstufe (Dreieckszahl-Wachstum), was ein spuerbar, aber nicht
-- uebertrieben schneller wachsendes Levelsystem ergibt.
-- ---------------------------------------------------------------------------

create or replace function public.punkte_fuer_level(p_level integer)
returns integer
language sql
immutable
as $$
  select case when p_level <= 1 then 0 else 50 * (p_level - 1) * p_level end;
$$;

create or replace function public.berechne_level(p_punkte integer)
returns integer
language plpgsql
immutable
as $$
declare
  v_level integer := 1;
begin
  while public.punkte_fuer_level(v_level + 1) <= p_punkte loop
    v_level := v_level + 1;
  end loop;
  return v_level;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Streak-Berechnung (taeglich + woechentlich)
--
-- Wird nur bei "geschafft = true" aufgerufen (siehe submit_selbsteinschaetzung
-- weiter unten). Woechentlich wird per ISO-Woche (Montag als Wochenstart)
-- gezaehlt. Ein Tag/eine Woche ohne Aktivitaet setzt den jeweiligen Streak auf
-- 1 zurueck (nicht 0), da der Aufruf selbst schon die neue Aktivitaet ist;
-- fehlt jede weitere Aktivitaet, zeigt das Frontend den Streak anhand von
-- streak_letzte_aktivitaet/streak_letzte_woche als "abgebrochen" (0) an, ohne
-- dass dafuer ein weiterer Schreibzugriff noetig ist.
-- ---------------------------------------------------------------------------

create or replace function public.aktualisiere_streaks(p_junior_id uuid, p_heute date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_letzte_aktivitaet date;
  v_streak_tage integer;
  v_letzte_woche date;
  v_streak_wochen integer;
  v_heutige_woche date;
begin
  select streak_letzte_aktivitaet, streak_counter, streak_letzte_woche, streak_wochen
    into v_letzte_aktivitaet, v_streak_tage, v_letzte_woche, v_streak_wochen
    from public.users
    where id = p_junior_id;

  if v_letzte_aktivitaet = p_heute then
    -- bereits heute erfasst (zweite Einschaetzung am selben Tag) – unveraendert
    null;
  elsif v_letzte_aktivitaet = p_heute - 1 then
    v_streak_tage := coalesce(v_streak_tage, 0) + 1;
  else
    v_streak_tage := 1;
  end if;

  v_heutige_woche := date_trunc('week', p_heute)::date;

  if v_letzte_woche = v_heutige_woche then
    null;
  elsif v_letzte_woche = v_heutige_woche - 7 then
    v_streak_wochen := coalesce(v_streak_wochen, 0) + 1;
  else
    v_streak_wochen := 1;
  end if;

  perform set_config('app.allow_points_update', 'true', true);

  update public.users
    set streak_counter = v_streak_tage,
        streak_letzte_aktivitaet = p_heute,
        streak_wochen = v_streak_wochen,
        streak_letzte_woche = v_heutige_woche
    where id = p_junior_id;
end;
$$;

-- Streak-Felder ebenfalls vor direkten Client-Updates schuetzen (siehe
-- Migration 0003 fuer punkte_total/level_aktuell/streak_counter/
-- streak_letzte_aktivitaet – hier nur um die zwei neuen Spalten erweitert).
create or replace function public.prevent_privileged_field_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.rolle <> old.rolle or new.team_id is distinct from old.team_id)
     and public.current_user_role() <> 'admin' then
    raise exception 'Nur Admins duerfen Rolle oder Team aendern.';
  end if;

  if (
       new.punkte_total <> old.punkte_total
       or new.level_aktuell <> old.level_aktuell
       or new.streak_counter <> old.streak_counter
       or new.streak_letzte_aktivitaet is distinct from old.streak_letzte_aktivitaet
       or new.streak_wochen <> old.streak_wochen
       or new.streak_letzte_woche is distinct from old.streak_letzte_woche
     )
     and public.current_user_role() <> 'admin'
     and coalesce(current_setting('app.allow_points_update', true), 'false') <> 'true' then
    raise exception 'Punkte, Level und Streak duerfen nicht direkt geaendert werden.';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Badge-Vergabe-Engine
--
-- Datengetrieben ueber badges.kriterium_typ/kriterium_wert – neue Badges
-- lassen sich per INSERT in public.badges ergaenzen, ohne diese Funktion
-- anzupassen (ausser ein komplett neuer kriterium_typ wird eingefuehrt).
-- Gibt alle in diesem Aufruf NEU vergebenen Badges zurueck.
-- ---------------------------------------------------------------------------

create or replace function public.pruefe_und_vergib_badges(p_junior_id uuid)
returns setof public.badges
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badge record;
  v_erreicht boolean;
  v_level integer;
  v_streak_tage integer;
  v_streak_wochen integer;
  v_distinct_kategorien integer;
begin
  select level_aktuell, streak_counter, streak_wochen
    into v_level, v_streak_tage, v_streak_wochen
    from public.users
    where id = p_junior_id;

  select count(distinct u.kategorie)
    into v_distinct_kategorien
    from public.selbsteinschaetzungen s
    join public.uebungen u on u.id = s.uebung_id
    where s.junior_id = p_junior_id and s.geschafft;

  for v_badge in
    select b.*
    from public.badges b
    where not exists (
      select 1 from public.junior_badges jb
      where jb.junior_id = p_junior_id and jb.badge_id = b.id
    )
  loop
    v_erreicht := false;

    if v_badge.kriterium_typ = 'kategorie_geschafft' then
      select count(*) >= v_badge.kriterium_wert
        into v_erreicht
        from public.selbsteinschaetzungen s
        join public.uebungen u on u.id = s.uebung_id
        where s.junior_id = p_junior_id
          and s.geschafft
          and u.kategorie::text = v_badge.kategorie;

    elsif v_badge.kriterium_typ = 'streak_tage' then
      v_erreicht := v_streak_tage >= v_badge.kriterium_wert;

    elsif v_badge.kriterium_typ = 'streak_wochen' then
      v_erreicht := v_streak_wochen >= v_badge.kriterium_wert;

    elsif v_badge.kriterium_typ = 'level' then
      v_erreicht := v_level >= v_badge.kriterium_wert;

    elsif v_badge.kriterium_typ = 'allrounder' then
      v_erreicht := v_distinct_kategorien >= v_badge.kriterium_wert;
    end if;

    if v_erreicht then
      insert into public.junior_badges (junior_id, badge_id) values (p_junior_id, v_badge.id);
      return next v_badge;
    end if;
  end loop;

  return;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) submit_selbsteinschaetzung neu fassen: gibt jetzt Level-Aufstieg und neu
-- vergebene Badges zurueck, damit das Frontend genau dafuer (und nur dafuer)
-- eine Push-Benachrichtigung ausloesen kann.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'selbsteinschaetzung_ergebnis') then
    create type public.selbsteinschaetzung_ergebnis as (
      einschaetzung public.selbsteinschaetzungen,
      level_aufstieg boolean,
      neues_level integer,
      neue_badges public.badges[]
    );
  end if;
end $$;

drop function if exists public.submit_selbsteinschaetzung(uuid, boolean, smallint);

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
  v_ergebnis public.selbsteinschaetzung_ergebnis;
begin
  if p_gefuehl_sterne is not null and (p_gefuehl_sterne < 1 or p_gefuehl_sterne > 5) then
    raise exception 'gefuehl_sterne muss zwischen 1 und 5 liegen.';
  end if;

  if not exists (select 1 from public.uebungen where id = p_uebung_id) then
    raise exception 'Uebung nicht gefunden.';
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

  v_ergebnis.einschaetzung := v_row;
  v_ergebnis.level_aufstieg := v_neues_level > v_altes_level;
  v_ergebnis.neues_level := v_neues_level;
  v_ergebnis.neue_badges := v_neue_badges;

  return v_ergebnis;
end;
$$;

grant execute on function public.submit_selbsteinschaetzung(uuid, boolean, smallint) to authenticated;
