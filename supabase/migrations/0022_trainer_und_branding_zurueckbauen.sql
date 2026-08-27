-- Phase 17 – Trainer-Rolle und Team-Branding zurückbauen
--
-- 1) Trainer-Rolle wird nirgends mehr verwendet: bestehende Trainer-Konten
--    werden zu Admin hochgestuft (Admin deckt alle bisherigen
--    Trainer-Funktionen ab – Übungen verwalten, Junioren einsehen). Das
--    Enum-Label 'trainer' bleibt in public.rolle_typ bewusst bestehen:
--    Postgres kann einzelne Enum-Werte nicht entfernen, nur durch Neuanlage
--    des ganzen Typs ersetzen – das würde hier zusätzlich current_user_role()
--    und rund zwanzig darauf aufbauende RLS-Policies per CASCADE mitreissen.
--    Ein Check-Constraint verhindert stattdessen zuverlässig, dass die Rolle
--    künftig wieder vergeben wird; die App selbst bietet sie nirgends mehr an.
-- 2) Team-Branding (Logo-Upload, Vereinsfarben pro Team) entfällt: alle Teams
--    verwenden künftig einheitlich das Bulldozers-Logo/-Design. Die Spalten
--    teams.logo_url/farbe_primaer/farbe_sekundaer und bereits hochgeladene
--    Logo-Dateien bleiben unangetastet (keine destruktive Schema-/
--    Datenänderung nötig) – die App liest/schreibt sie schlicht nicht mehr.
--    Nur das Schreibrecht auf den Storage-Bucket wird entzogen.

-- ---------------------------------------------------------------------------
-- 1) Trainer-Rolle
-- ---------------------------------------------------------------------------

update public.users set rolle = 'admin' where rolle = 'trainer';

alter table public.users
  add constraint users_rolle_nicht_trainer check (rolle <> 'trainer');

-- Rein Trainer-spezifische Policies entfallen ersatzlos (die jeweiligen
-- Admin-Policies decken den Zugriff weiterhin ab).
drop policy if exists users_select_trainer_team_juniors on public.users;
drop policy if exists selbsteinschaetzungen_select_trainer_team on public.selbsteinschaetzungen;
drop policy if exists junior_badges_select_trainer_team on public.junior_badges;

-- Policies mit gemischter Trainer/Admin-Bedingung: Trainer-Zweig entfernen,
-- Rest unverändert.
drop policy if exists uebungen_insert_trainer_admin on public.uebungen;
create policy uebungen_insert_admin on public.uebungen
  for insert
  to authenticated
  with check (
    public.current_user_role() = 'admin'
    and erstellt_von = auth.uid()
  );

drop policy if exists uebungen_update_creator_or_admin on public.uebungen;
create policy uebungen_update_admin on public.uebungen
  for update
  to authenticated
  using (public.current_user_role() = 'admin');

drop policy if exists uebungen_delete_creator_or_admin on public.uebungen;
create policy uebungen_delete_admin on public.uebungen
  for delete
  to authenticated
  using (public.current_user_role() = 'admin');

drop policy if exists uebung_bilder_insert_trainer_admin on storage.objects;
create policy uebung_bilder_insert_admin on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'uebung-bilder'
    and public.current_user_role() = 'admin'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 2) Team-Branding
-- ---------------------------------------------------------------------------

drop policy if exists team_logos_write_admin on storage.objects;

-- ---------------------------------------------------------------------------
-- 3) Mehrere Admins zulassen
--
-- handle_new_user() (Migration 0006) hat eine gewünschte Rolle "admin" bei
-- der Selbstregistrierung bisher automatisch auf "junior" zurückgestuft,
-- falls schon ein Admin existiert ("nur der allererste Nutzer darf Admin
-- werden"). Das Registrierungsformular bietet die Rollenwahl inzwischen gar
-- nicht mehr an (immer "junior", siehe RegisterPage) – die Abstufung greift
-- also nie mehr und wird hier als toter, verwirrender Code entfernt. Weitere
-- Admins können weiterhin ausschliesslich über die Nutzerverwaltung eines
-- bestehenden Admins angelegt bzw. befördert werden (admin-user-management /
-- NutzerForm) – das war schon zuvor uneingeschränkt möglich und bleibt es.
-- ---------------------------------------------------------------------------

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

  insert into public.users (id, vorname, nachname, email, rolle, team_id)
  values (new.id, v_vorname, v_nachname, new.email, v_rolle, v_team_id)
  on conflict (id) do nothing;

  return new;
end;
$$;
