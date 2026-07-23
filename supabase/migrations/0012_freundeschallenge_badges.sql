-- Neue Badges für Freundeschallenges (Migration 0011): 3 zählbasierte Badges für
-- erfolgreich abgeschlossene Freundeschallenges (3/5/10) sowie ein "Teamplayer"-
-- Badge für 5 erfolgreiche Freundeschallenges mit jeweils unterschiedlichen
-- Gegnern. Datengetrieben wie der restliche Badge-Katalog (Migration 0004) –
-- pruefe_und_vergib_badges() bekommt dafür zwei neue kriterium_typ-Zweige.

-- ---------------------------------------------------------------------------
-- 1) Badges
-- ---------------------------------------------------------------------------

insert into public.badges (name, beschreibung, icon, kategorie, kriterium_typ, kriterium_wert)
values
  ('Freundeschallenge-Neuling', '3 Freundeschallenges erfolgreich abgeschlossen', '🤝', 'freundeschallenge', 'freundeschallenge_erfolgreich', 3),
  ('Freundeschallenge-Ass', '5 Freundeschallenges erfolgreich abgeschlossen', '🤝', 'freundeschallenge', 'freundeschallenge_erfolgreich', 5),
  ('Freundeschallenge-Meister', '10 Freundeschallenges erfolgreich abgeschlossen', '🤝', 'freundeschallenge', 'freundeschallenge_erfolgreich', 10),
  ('Teamplayer', '5 Freundeschallenges mit jeweils unterschiedlichen Junioren erfolgreich abgeschlossen', '👥', 'freundeschallenge', 'freundeschallenge_teamplayer', 5)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Badge-Vergabe-Engine um die beiden neuen kriterium_typ-Werte erweitern:
--    'freundeschallenge_erfolgreich' – kriterium_wert = Anzahl erfolgreich
--                                       abgeschlossener Freundeschallenges
--    'freundeschallenge_teamplayer'  – kriterium_wert = Anzahl unterschiedlicher
--                                       Gegner unter den erfolgreichen
--                                       Freundeschallenges
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
  v_freundeschallenge_erfolgreich integer;
  v_freundeschallenge_gegner integer;
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

  select
    count(*),
    count(distinct case when f.ersteller_id = p_junior_id then f.empfaenger_id else f.ersteller_id end)
    into v_freundeschallenge_erfolgreich, v_freundeschallenge_gegner
    from public.freundeschallenges f
    where f.status = 'erfolgreich'
      and (f.ersteller_id = p_junior_id or f.empfaenger_id = p_junior_id);

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

    elsif v_badge.kriterium_typ = 'freundeschallenge_erfolgreich' then
      v_erreicht := v_freundeschallenge_erfolgreich >= v_badge.kriterium_wert;

    elsif v_badge.kriterium_typ = 'freundeschallenge_teamplayer' then
      v_erreicht := v_freundeschallenge_gegner >= v_badge.kriterium_wert;
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
-- 3) submit_selbsteinschaetzung(): Reihenfolge korrigiert. Bisher (Migration
-- 0011) wurden Badges VOR der Freundeschallenge-Aktualisierung geprüft – eine
-- Einschätzung, die eine Freundeschallenge gerade erst erfolgreich abschliesst
-- (3. Tag) oder Extrapunkte gutschreibt, hätte weder die neuen
-- Freundeschallenge-Badges noch einen dadurch ausgelösten Level-Aufstieg im
-- selben Aufruf erkannt. Jetzt: erst die Freundeschallenge aktualisieren
-- (inkl. möglicher Extrapunkte), dann Level und Badges auswerten.
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

  select * into v_freundeschallenge
    from public.aktualisiere_freundeschallenge_bei_einschaetzung(auth.uid(), v_kategorie, p_geschafft, current_date);

  select level_aktuell into v_neues_level from public.users where id = auth.uid();

  select coalesce(array_agg(b.*), '{}') into v_neue_badges
    from public.pruefe_und_vergib_badges(auth.uid()) b;

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
