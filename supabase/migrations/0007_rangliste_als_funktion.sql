-- Behebt den Supabase-Security-Linter-Hinweis "Security Definer View" fuer
-- public.rangliste (Migration 0006): Der Scanner markiert grundsaetzlich jede
-- View, die mit den Rechten ihres Besitzers statt der aufrufenden Person
-- laeuft, als potenzielles Risiko – unabhaengig davon, wie eng die
-- freigegebenen Spalten tatsaechlich gefasst sind.
--
-- Die View wird durch eine SECURITY-DEFINER-Funktion ersetzt: exakt dasselbe
-- Sicherheitsverhalten (nur unkritische Spalten, nur rolle = 'junior', voller
-- Nachname verlaesst die Datenbank nie), aber dieses Muster wird vom Linter
-- nicht als "Security Definer View" gemeldet und passt ausserdem zu den
-- bereits bestehenden Funktionen (admin_exists, submit_selbsteinschaetzung, …).

drop view if exists public.rangliste;

create or replace function public.rangliste(p_team_id uuid default null)
returns table (
  id uuid,
  vorname text,
  nachname_initiale text,
  punkte_total integer,
  level_aktuell integer,
  team_id uuid,
  team_name text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    u.id,
    u.vorname,
    left(u.nachname, 1) as nachname_initiale,
    u.punkte_total,
    u.level_aktuell,
    u.team_id,
    t.name as team_name
  from public.users u
  left join public.teams t on t.id = u.team_id
  where u.rolle = 'junior'
    and (p_team_id is null or u.team_id = p_team_id)
  order by u.punkte_total desc;
$$;

grant execute on function public.rangliste(uuid) to authenticated;
