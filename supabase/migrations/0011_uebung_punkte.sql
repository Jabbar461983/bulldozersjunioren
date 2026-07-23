-- Phase 11 – individuelle Punktzahl pro Übung
--
-- Bisher wurde für JEDE Übung derselbe globale Basiswert
-- (punkte_konfiguration.basis_punkte_pro_uebung) vergeben. Ab jetzt bekommt
-- jede Übung ihre eigene Punktzahl (Default 10 für neu erstellte Übungen),
-- die individuell durch einen Admin angepasst werden kann.

alter table public.uebungen
  add column punkte integer not null default 10
  constraint uebungen_punkte_nicht_negativ check (punkte >= 0);

-- ---------------------------------------------------------------------------
-- Punktzahl vor Änderungen/abweichenden Werten durch Nicht-Admins schützen.
-- Trainer dürfen ihre eigenen Übungen weiterhin erstellen und bearbeiten
-- (siehe uebungen_insert_trainer_admin / uebungen_update_creator_or_admin in
-- 0001_init.sql), aber nur ein Admin darf die Punktzahl festlegen oder
-- ändern – neue Übungen von Trainern erhalten daher immer den Standardwert.
-- ---------------------------------------------------------------------------

create or replace function public.prevent_uebung_punkte_change_non_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() = 'admin' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.punkte <> 10 then
      raise exception 'Nur Admins dürfen eine abweichende Punktzahl vergeben.';
    end if;
  elsif new.punkte <> old.punkte then
    raise exception 'Nur Admins dürfen die Punktzahl einer Übung ändern.';
  end if;

  return new;
end;
$$;

create trigger uebungen_prevent_punkte_change_non_admin
  before insert or update on public.uebungen
  for each row
  execute function public.prevent_uebung_punkte_change_non_admin();

-- ---------------------------------------------------------------------------
-- submit_selbsteinschaetzung: verwendet jetzt die individuelle Punktzahl der
-- jeweiligen Übung statt des globalen Basiswerts aus punkte_konfiguration.
-- ---------------------------------------------------------------------------

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
  v_uebung_punkte integer;
  v_row public.selbsteinschaetzungen;
  v_altes_level integer;
  v_neues_level integer;
  v_neue_badges public.badges[];
  v_ergebnis public.selbsteinschaetzung_ergebnis;
begin
  if p_gefuehl_sterne is not null and (p_gefuehl_sterne < 1 or p_gefuehl_sterne > 5) then
    raise exception 'gefuehl_sterne muss zwischen 1 und 5 liegen.';
  end if;

  select punkte into v_uebung_punkte from public.uebungen where id = p_uebung_id;
  if not found then
    raise exception 'Übung nicht gefunden.';
  end if;

  if p_geschafft then
    v_punkte := coalesce(v_uebung_punkte, 0);
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
