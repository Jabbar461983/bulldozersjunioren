-- Phase 6 – Design, Branding & Maskottchen
--
-- teams.logo_url/farbe_primaer/farbe_sekundaer existieren bereits seit
-- Migration 0001 (dort als Platzhalter für "spätere Phase" angelegt). Diese
-- Migration ergänzt lediglich den Storage-Bucket für den Logo-Upload im
-- Admin-Bereich.

insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;

-- Öffentlich lesbar, damit das Logo ohne Signierung im Header/auf dem
-- Login-Screen angezeigt werden kann. Schreibzugriff ist auf Admin
-- beschränkt (Team-Branding ist eine Admin-Aufgabe, siehe Phase 1).
create policy team_logos_public_read on storage.objects
  for select
  to public
  using (bucket_id = 'team-logos');

create policy team_logos_write_admin on storage.objects
  for all
  to authenticated
  using (bucket_id = 'team-logos' and public.current_user_role() = 'admin')
  with check (bucket_id = 'team-logos' and public.current_user_role() = 'admin');
