-- Team-Rangliste (Migration 0010) filterte bisher nach Altersgruppe – die ist
-- pro Team aber ohnehin fix und daher als Filter wenig sinnvoll. Stattdessen
-- soll nach Übungs-Kategorie (Kraft, Schnelligkeit, …) gefiltert werden
-- können, um zu sehen, welches Team in welcher Kategorie führt.
--
-- punkte_total pro Junior ist exakt die Summe aller
-- selbsteinschaetzungen.punkte_vergeben (siehe submit_selbsteinschaetzung,
-- Migration 0003). Für die Kategorie-Filterung wird daher direkt über
-- selbsteinschaetzungen -> uebungen summiert statt über users.punkte_total.
-- Die Summe wird per FILTER-Klausel gebildet (nicht per WHERE), damit Teams
-- ohne Einschätzungen in der gewählten Kategorie weiterhin mit 0 Punkten in
-- der Liste erscheinen statt ganz zu verschwinden.

drop function if exists public.team_rangliste(altersgruppe_typ);

create or replace function public.team_rangliste(p_kategorie kategorie_typ default null)
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
    coalesce(
      sum(se.punkte_vergeben) filter (
        where p_kategorie is null or ue.kategorie = p_kategorie
      ),
      0
    ) as punkte_total
  from public.teams t
  left join public.users u on u.team_id = t.id and u.rolle = 'junior'
  left join public.selbsteinschaetzungen se on se.junior_id = u.id
  left join public.uebungen ue on ue.id = se.uebung_id
  group by t.id, t.name, t.altersgruppe
  order by punkte_total desc;
$$;

grant execute on function public.team_rangliste(kategorie_typ) to authenticated;
