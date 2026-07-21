-- Phase 2 – Content-Verwaltung für Trainer/Admin
-- Ergänzt das Uebungen-Schema und richtet Storage für Bild-Uploads ein.

-- ---------------------------------------------------------------------------
-- video_url: bewusst schon jetzt angelegt, aber noch ungenutzt (siehe
-- Formular-Hinweis "Kommt in einer späteren Version"), damit eine spätere
-- Video-Funktion ohne weitere Schemaänderung auskommt.
-- ---------------------------------------------------------------------------

alter table public.uebungen add column video_url text;

-- ---------------------------------------------------------------------------
-- Storage-Bucket für Übungsbilder (Alternative zur externen Bild-URL).
-- Der Bucket ist öffentlich lesbar, damit gespeicherte Bild-URLs direkt ohne
-- Signierung angezeigt werden können. Schreibrechte sind auf Trainer/Admin
-- beschränkt, jeweils nur innerhalb des eigenen Unterordners
-- (Pfad-Konvention: <user_id>/<dateiname>), damit sich Nutzer nicht
-- gegenseitig Dateien überschreiben oder löschen können.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('uebung-bilder', 'uebung-bilder', true)
on conflict (id) do nothing;

create policy uebung_bilder_public_read on storage.objects
  for select
  to public
  using (bucket_id = 'uebung-bilder');

create policy uebung_bilder_insert_trainer_admin on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'uebung-bilder'
    and public.current_user_role() in ('trainer', 'admin')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy uebung_bilder_update_own_or_admin on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'uebung-bilder'
    and (
      public.current_user_role() = 'admin'
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

create policy uebung_bilder_delete_own_or_admin on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'uebung-bilder'
    and (
      public.current_user_role() = 'admin'
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );
