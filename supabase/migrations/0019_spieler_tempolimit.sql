-- Zusätzliches Tempolimit: maximal 3 Selbsteinschätzungen pro Junior
-- innerhalb der letzten 5 Minuten — über alle Übungen hinweg (im Unterschied
-- zum Tageslimit aus Migration 0018, das pro einzelner Übung gilt). Verhindert
-- sehr schnelles Durchklicken mehrerer Übungen hintereinander.
--
-- Wieder kompletter Nachdruck von submit_selbsteinschaetzung() (zuletzt
-- Migration 0018) mit der neuen Prüfung ergänzt, aus demselben Grund wie in
-- 0014/0018 vermerkt: CREATE OR REPLACE ersetzt die gesamte Funktion.

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
  v_kategorie public.kategorie_typ;
  v_anzahl_heute integer;
  v_anzahl_5min integer;
  v_row public.selbsteinschaetzungen;
  v_altes_level integer;
  v_neues_level integer;
  v_neue_badges public.badges[];
  v_freundeschallenge public.freundeschallenge_einschaetzung_ergebnis;
  v_ergebnis public.selbsteinschaetzung_ergebnis;
begin
  if p_gefuehl_sterne is not null and (p_gefuehl_sterne < 1 or p_gefuehl_sterne > 5) then
    raise exception 'gefuehl_sterne muss zwischen 1 und 5 liegen.';
  end if;

  select punkte, kategorie into v_uebung_punkte, v_kategorie
    from public.uebungen where id = p_uebung_id;
  if not found then
    raise exception 'Übung nicht gefunden.';
  end if;

  select count(*) into v_anzahl_heute
    from public.selbsteinschaetzungen
    where junior_id = auth.uid()
      and uebung_id = p_uebung_id
      and datum = current_date;
  if v_anzahl_heute >= 3 then
    raise exception 'Diese Übung wurde heute bereits 3x eingeschätzt. Morgen geht''s weiter!';
  end if;

  select count(*) into v_anzahl_5min
    from public.selbsteinschaetzungen
    where junior_id = auth.uid()
      and created_at >= now() - interval '5 minutes';
  if v_anzahl_5min >= 3 then
    raise exception 'Du hast in den letzten 5 Minuten bereits 3 Übungen abgeschlossen. Kurz durchatmen und gleich weiter!';
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
