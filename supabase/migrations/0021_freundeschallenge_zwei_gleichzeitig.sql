-- Freundeschallenge: statt bisher genau einer, sind neu bis zu zwei
-- gleichzeitig laufende/angefragte Freundeschallenges pro Junior erlaubt –
-- allerdings nie zwei in derselben Kategorie (das wäre für die Übungsrotation
-- und die Auswertung in aktualisiere_freundeschallenge_bei_einschaetzung()
-- ohnehin nicht eindeutig zuordenbar, da diese pro Kategorie sucht).
--
-- freundeschallenge_anfragen() prüft deshalb neu für BEIDE Beteiligten
-- (Ersteller und Empfänger):
--   1) Anzahl offener Challenges (Status 'angefragt'/'aktiv') < 2
--   2) keine offene Challenge bereits in der gewählten Kategorie
-- und lehnt sonst mit einer Begründung ab, die die betroffene Person nennt.
--
-- freundeschallenge_kandidaten() (neu) liefert die Liste der Junioren, die
-- aktuell überhaupt noch als Gegner infrage kommen (< 2 offene Challenges) –
-- fürs Frontend, damit Junioren mit bereits vollem Kontingent gar nicht erst
-- zur Auswahl angeboten werden. Gleiches Datenschutz-Muster wie rangliste():
-- nur Vorname + Nachname-Initiale, kein Rückschluss auf Punkte/Level nötig.

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
  v_eigene_anzahl integer;
  v_empfaenger_anzahl integer;
  v_empfaenger_vorname text;
begin
  perform public.freundeschallenge_ablaufen_lassen();

  if p_empfaenger_id = auth.uid() then
    raise exception 'Du kannst keine Freundeschallenge an dich selbst schicken.';
  end if;

  select vorname into v_empfaenger_vorname
    from public.users where id = p_empfaenger_id and rolle = 'junior';

  if v_empfaenger_vorname is null then
    raise exception 'Junior nicht gefunden.';
  end if;

  select count(*) into v_eigene_anzahl
    from public.freundeschallenges
    where status in ('angefragt', 'aktiv')
      and (ersteller_id = auth.uid() or empfaenger_id = auth.uid());

  if v_eigene_anzahl >= 2 then
    raise exception 'Du hast bereits 2 Freundeschallenges gleichzeitig am Laufen (Maximum erreicht).';
  end if;

  select count(*) into v_empfaenger_anzahl
    from public.freundeschallenges
    where status in ('angefragt', 'aktiv')
      and (ersteller_id = p_empfaenger_id or empfaenger_id = p_empfaenger_id);

  if v_empfaenger_anzahl >= 2 then
    raise exception 'Sorry, % hat bereits 2 Freundeschallenges gleichzeitig am Laufen.', v_empfaenger_vorname;
  end if;

  if exists (
    select 1 from public.freundeschallenges
    where status in ('angefragt', 'aktiv')
      and kategorie = p_kategorie
      and (ersteller_id = auth.uid() or empfaenger_id = auth.uid())
  ) then
    raise exception 'Du hast in dieser Kategorie schon eine Freundeschallenge am Laufen.';
  end if;

  if exists (
    select 1 from public.freundeschallenges
    where status in ('angefragt', 'aktiv')
      and kategorie = p_kategorie
      and (ersteller_id = p_empfaenger_id or empfaenger_id = p_empfaenger_id)
  ) then
    raise exception 'Sorry, % hat schon eine Freundeschallenge in dieser Kategorie am Laufen.', v_empfaenger_vorname;
  end if;

  insert into public.freundeschallenges (kategorie, ersteller_id, empfaenger_id, status)
  values (p_kategorie, auth.uid(), p_empfaenger_id, 'angefragt')
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.freundeschallenge_anfragen(uuid, public.kategorie_typ) to authenticated;

create or replace function public.freundeschallenge_kandidaten()
returns table (
  id uuid,
  vorname text,
  nachname_initiale text,
  team_id uuid,
  team_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.freundeschallenge_ablaufen_lassen();

  return query
    select
      u.id,
      u.vorname,
      left(u.nachname, 1) as nachname_initiale,
      u.team_id,
      t.name as team_name
    from public.users u
    left join public.teams t on t.id = u.team_id
    where u.rolle = 'junior'
      and u.id <> auth.uid()
      and (
        select count(*) from public.freundeschallenges f
        where f.status in ('angefragt', 'aktiv')
          and (f.ersteller_id = u.id or f.empfaenger_id = u.id)
      ) < 2
    order by u.vorname;
end;
$$;

grant execute on function public.freundeschallenge_kandidaten() to authenticated;
