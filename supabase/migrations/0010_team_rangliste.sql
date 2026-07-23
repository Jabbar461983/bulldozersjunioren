-- Team-Rangliste: Gesamtpunktzahl pro Team (Summe aller Junioren des Teams),
-- filterbar nach Altersgruppe. Analog zu public.rangliste() als
-- SECURITY-DEFINER-Funktion umgesetzt (nicht als View, siehe Migration 0007),
-- da die Summenbildung über alle Junioren eines Teams hinweg die normalen
-- RLS-Policies von public.users umgehen muss (ein Junior/Trainer darf sonst
-- nur die eigene bzw. die eigene Team-Zeile sehen). Es werden ausschliesslich
-- Team-Stammdaten und eine aggregierte Summe zurückgegeben, keine einzelnen
-- Junioren-Daten.

create or replace function public.team_rangliste(p_altersgruppe altersgruppe_typ default null)
returns table (
  team_id uuid,
  team_name text,
  altersgruppe altersgruppe_typ,
  punkte_total bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    t.id as team_id,
    t.name as team_name,
    t.altersgruppe,
    coalesce(sum(u.punkte_total), 0) as punkte_total
  from public.teams t
  left join public.users u on u.team_id = t.id and u.rolle = 'junior'
  where p_altersgruppe is null or t.altersgruppe = p_altersgruppe
  group by t.id, t.name, t.altersgruppe
  order by punkte_total desc;
$$;

grant execute on function public.team_rangliste(altersgruppe_typ) to authenticated;
