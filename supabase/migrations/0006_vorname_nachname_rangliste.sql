-- Vorname/Nachname getrennt erfassen + Rangliste
--
-- 1) users.name wird durch zwei getrennte Felder ersetzt (vorname, nachname).
--    Grund: Die Rangliste soll aus Datenschutzgründen nur "Vorname + erster
--    Buchstabe des Nachnamens" anzeigen – das lässt sich nur zuverlässig
--    umsetzen, wenn Vor- und Nachname von Anfang an getrennt gespeichert
--    werden (statt sie nachträglich aus einem Freitext-Namensfeld zu raten).
-- 2) Eine neue View public.rangliste liefert genau die dafür nötigen,
--    unkritischen Felder (kein Zugriff auf E-Mail, Streaks etc.).

-- ---------------------------------------------------------------------------
-- 1) Schema-Migration: name -> vorname/nachname
-- ---------------------------------------------------------------------------

alter table public.users
  add column vorname text,
  add column nachname text;

-- Bestehende Nutzer bestmöglich aus dem alten Freitext-Namen aufteilen
-- (erstes Wort = Vorname, Rest = Nachname).
update public.users
set vorname = coalesce(nullif(split_part(name, ' ', 1), ''), name, ''),
    nachname = coalesce(nullif(btrim(substring(name from position(' ' in name) + 1)), ''), '')
where vorname is null;

alter table public.users
  alter column vorname set not null,
  alter column vorname set default '',
  alter column nachname set not null,
  alter column nachname set default '';

alter table public.users drop column name;

-- handle_new_user() liest jetzt vorname/nachname statt name aus den
-- Registrierungs-Metadaten.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vorname text;
  v_nachname text;
  v_rolle public.rolle_typ;
  v_team_id uuid;
begin
  v_vorname := coalesce(new.raw_user_meta_data ->> 'vorname', split_part(new.email, '@', 1));
  v_nachname := coalesce(new.raw_user_meta_data ->> 'nachname', '');
  v_rolle := coalesce((new.raw_user_meta_data ->> 'rolle')::public.rolle_typ, 'junior');
  v_team_id := nullif(new.raw_user_meta_data ->> 'team_id', '')::uuid;

  if v_rolle = 'admin' and public.admin_exists() then
    v_rolle := 'junior';
  end if;

  insert into public.users (id, vorname, nachname, email, rolle, team_id)
  values (new.id, v_vorname, v_nachname, new.email, v_rolle, v_team_id)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Rangliste: eine View statt direktem Zugriff auf public.users, damit
-- Junioren einander sehen können (für die Rangliste), ohne dass dabei
-- E-Mail-Adressen, Streaks o. Ä. anderer Nutzer offengelegt werden. Die View
-- läuft mit den Rechten ihres Besitzers (Standardverhalten, kein
-- security_invoker gesetzt) und umgeht damit bewusst die RLS-Policies von
-- public.users – das ist hier gewollt, da die View selbst nur unkritische
-- Spalten exponiert und der Nachname serverseitig auf den ersten Buchstaben
-- gekürzt wird (der volle Nachname verlässt die Datenbank nie).
-- ---------------------------------------------------------------------------

create or replace view public.rangliste as
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
where u.rolle = 'junior';

grant select on public.rangliste to authenticated;
