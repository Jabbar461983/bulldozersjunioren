-- Passwort-Reset-Anfragen (Phase 14)
--
-- Es gibt bewusst keinen klassischen E-Mail-Self-Service-Reset: Supabases
-- eingebauter Mailer ist nur für Tests gedacht und ohne eigenen
-- SMTP-Anbieter nicht zuverlässig genug für sicherheitsrelevante Links
-- (siehe README, Abschnitt "Nutzerverwaltung"/Setup). Stattdessen kann ein
-- Nutzer über /passwort-vergessen eine Anfrage stellen (Edge Function
-- "passwort-reset-anfragen"); diese landet in dieser Tabelle und wird per
-- Push an alle Admins gemeldet. Der Admin setzt das neue Passwort danach
-- direkt in der Nutzerverwaltung (Edge Function "admin-user-management",
-- Aktion "reset-password").

create table public.passwort_reset_anfragen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  angefragt_am timestamptz not null default now(),
  erledigt boolean not null default false,
  erledigt_am timestamptz,
  erledigt_von uuid references public.users (id) on delete set null
);

create index passwort_reset_anfragen_user_id_idx on public.passwort_reset_anfragen (user_id);

-- Partieller Index für die Admin-Übersicht ("offene Anfragen"), die den
-- Hauptzugriffspfad darstellt.
create index passwort_reset_anfragen_offen_idx
  on public.passwort_reset_anfragen (angefragt_am)
  where not erledigt;

alter table public.passwort_reset_anfragen enable row level security;

-- Einträge entstehen ausschliesslich über die Edge Function
-- "passwort-reset-anfragen" (Service-Role-Key, umgeht RLS) – ein anonymer
-- oder eingeloggter Client darf hier nie direkt schreiben (kein Angriffsweg,
-- um beliebige Anfragen für fremde Konten anzulegen). Lesen und Abschliessen
-- ("erledigt" setzen) darf nur ein Admin.
create policy passwort_reset_anfragen_select_admin on public.passwort_reset_anfragen
  for select
  to authenticated
  using (public.current_user_role() = 'admin');

create policy passwort_reset_anfragen_update_admin on public.passwort_reset_anfragen
  for update
  to authenticated
  using (public.current_user_role() = 'admin');
