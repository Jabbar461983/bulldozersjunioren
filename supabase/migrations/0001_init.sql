-- Streethockey Junioren-Tracker – Phase 1 Grundschema
-- Legt Tabellen, Rollen-Hilfsfunktionen, Trigger und Row-Level-Security (RLS)
-- Policies fuer das rollenbasierte Berechtigungssystem an.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.rolle_typ as enum ('junior', 'trainer', 'admin');
create type public.altersgruppe_typ as enum ('U9', 'U12', 'U15', 'U18');
create type public.kategorie_typ as enum (
  'technik', 'schuss', 'kraft', 'koordination', 'kondition', 'schnelligkeit'
);

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  altersgruppe public.altersgruppe_typ not null,
  logo_url text,
  farbe_primaer text default '#0f172a',
  farbe_sekundaer text default '#38bdf8',
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  rolle public.rolle_typ not null default 'junior',
  team_id uuid references public.teams (id) on delete set null,
  punkte_total integer not null default 0,
  level_aktuell integer not null default 1,
  streak_counter integer not null default 0,
  streak_letzte_aktivitaet date,
  created_at timestamptz not null default now()
);

create index users_team_id_idx on public.users (team_id);

create table public.uebungen (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  beschreibung text,
  bild_url text,
  kategorie public.kategorie_typ not null,
  erstellt_von uuid references public.users (id) on delete set null,
  altersgruppen public.altersgruppe_typ[] not null default '{}',
  created_at timestamptz not null default now()
);

create index uebungen_altersgruppen_idx on public.uebungen using gin (altersgruppen);
create index uebungen_erstellt_von_idx on public.uebungen (erstellt_von);

create table public.selbsteinschaetzungen (
  id uuid primary key default gen_random_uuid(),
  junior_id uuid not null references public.users (id) on delete cascade,
  uebung_id uuid not null references public.uebungen (id) on delete cascade,
  datum date not null default current_date,
  geschafft boolean not null default false,
  gefuehl_sterne smallint check (gefuehl_sterne between 1 and 5),
  punkte_vergeben integer not null default 0,
  created_at timestamptz not null default now()
);

create index selbsteinschaetzungen_junior_id_idx on public.selbsteinschaetzungen (junior_id);
create index selbsteinschaetzungen_uebung_id_idx on public.selbsteinschaetzungen (uebung_id);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  beschreibung text,
  icon text,
  kategorie text,
  kriterium_typ text,
  kriterium_wert integer,
  created_at timestamptz not null default now()
);

create table public.junior_badges (
  junior_id uuid not null references public.users (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  erreicht_am timestamptz not null default now(),
  primary key (junior_id, badge_id)
);

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen fuer RLS (SECURITY DEFINER, um rekursive RLS-Lookups auf
-- public.users zu vermeiden)
-- ---------------------------------------------------------------------------

create or replace function public.current_user_role()
returns public.rolle_typ
language sql
security definer
stable
set search_path = public
as $$
  select rolle from public.users where id = auth.uid();
$$;

create or replace function public.current_user_team_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select team_id from public.users where id = auth.uid();
$$;

-- Wird vom Registrierungs-Formular genutzt, um zu entscheiden, ob die Option
-- "Admin" noch angeboten werden darf (siehe handle_new_user()-Trigger unten).
create or replace function public.admin_exists()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(select 1 from public.users where rolle = 'admin');
$$;

-- admin_exists() muss auch vor dem Login (Registrierungsformular) aufrufbar
-- sein, daher explizites Execute-Grant fuer anon.
grant execute on function public.admin_exists() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Trigger: automatisches Anlegen des public.users-Profils bei Registrierung.
--
-- Name, Rolle und Team werden beim supabase.auth.signUp() Aufruf als
-- user_metadata mitgegeben. Der Trigger liest sie serverseitig aus, damit die
-- Profilzeile zuverlaessig entsteht (auch wenn wegen E-Mail-Bestaetigung noch
-- keine Client-Session existiert) und damit die Admin-Rolle nicht per Client
-- manipulierbar ist.
--
-- Sicherheitsregel: Es kann sich niemand einfach selbst zum Admin machen. Nur
-- der allererste registrierte Nutzer darf "admin" erhalten (Bootstrap). Jede
-- weitere Registrierung mit rolle='admin' wird automatisch auf 'junior'
-- zurueckgestuft. Weitere Admins muessen spaeter von einem bestehenden Admin
-- befoerdert werden (siehe README, Abschnitt "Sicherheitshinweise").
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_rolle public.rolle_typ;
  v_team_id uuid;
begin
  v_name := coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
  v_rolle := coalesce((new.raw_user_meta_data ->> 'rolle')::public.rolle_typ, 'junior');
  v_team_id := nullif(new.raw_user_meta_data ->> 'team_id', '')::uuid;

  if v_rolle = 'admin' and public.admin_exists() then
    v_rolle := 'junior';
  end if;

  insert into public.users (id, name, email, rolle, team_id)
  values (new.id, v_name, new.email, v_rolle, v_team_id)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Verhindert, dass sich Nutzer nachtraeglich selbst eine andere Rolle oder ein
-- anderes Team zuweisen (Privilege-Escalation). Nur Admins duerfen das.
create or replace function public.prevent_privileged_field_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.rolle <> old.rolle or new.team_id is distinct from old.team_id)
     and public.current_user_role() <> 'admin' then
    raise exception 'Nur Admins duerfen Rolle oder Team aendern.';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_privileged_field_change
before update on public.users
for each row execute function public.prevent_privileged_field_change();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.teams enable row level security;
alter table public.users enable row level security;
alter table public.uebungen enable row level security;
alter table public.selbsteinschaetzungen enable row level security;
alter table public.badges enable row level security;
alter table public.junior_badges enable row level security;

-- teams: Liste ist oeffentlich lesbar (auch fuer noch nicht eingeloggte
-- Nutzer, da die Team-Auswahl bereits im Registrierungsformular benoetigt
-- wird). Es werden nur unkritische Stammdaten (Name, Altersgruppe, Farben)
-- preisgegeben. Nur Admin darf Teams anlegen/aendern/loeschen.
create policy teams_select_all on public.teams
  for select
  to anon, authenticated
  using (true);

create policy teams_insert_admin on public.teams
  for insert
  to authenticated
  with check (public.current_user_role() = 'admin');

create policy teams_update_admin on public.teams
  for update
  to authenticated
  using (public.current_user_role() = 'admin');

create policy teams_delete_admin on public.teams
  for delete
  to authenticated
  using (public.current_user_role() = 'admin');

-- users: eigene Zeile, Trainer sehen Junioren des eigenen Teams, Admin sieht
-- alles. Insert passiert ausschliesslich ueber den handle_new_user()-Trigger.
create policy users_select_own on public.users
  for select
  to authenticated
  using (id = auth.uid());

create policy users_select_trainer_team_juniors on public.users
  for select
  to authenticated
  using (
    public.current_user_role() = 'trainer'
    and rolle = 'junior'
    and team_id = public.current_user_team_id()
  );

create policy users_select_admin on public.users
  for select
  to authenticated
  using (public.current_user_role() = 'admin');

create policy users_update_own on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy users_update_admin on public.users
  for update
  to authenticated
  using (public.current_user_role() = 'admin');

-- uebungen: sichtbar fuer die eigene Altersgruppe (ueber das eigene Team),
-- Admin sieht alles. Erstellen/Aendern duerfen Trainer (eigene Uebungen) und
-- Admin (alles).
create policy uebungen_select_own_altersgruppe on public.uebungen
  for select
  to authenticated
  using (
    public.current_user_role() = 'admin'
    or exists (
      select 1
      from public.teams t
      where t.id = public.current_user_team_id()
        and t.altersgruppe = any (uebungen.altersgruppen)
    )
  );

create policy uebungen_insert_trainer_admin on public.uebungen
  for insert
  to authenticated
  with check (
    public.current_user_role() in ('trainer', 'admin')
    and erstellt_von = auth.uid()
  );

create policy uebungen_update_creator_or_admin on public.uebungen
  for update
  to authenticated
  using (
    public.current_user_role() = 'admin'
    or (public.current_user_role() = 'trainer' and erstellt_von = auth.uid())
  );

create policy uebungen_delete_creator_or_admin on public.uebungen
  for delete
  to authenticated
  using (
    public.current_user_role() = 'admin'
    or (public.current_user_role() = 'trainer' and erstellt_von = auth.uid())
  );

-- selbsteinschaetzungen: Junior sieht/erstellt nur eigene, Trainer sieht die
-- seines Teams, Admin sieht alles.
create policy selbsteinschaetzungen_select_own on public.selbsteinschaetzungen
  for select
  to authenticated
  using (junior_id = auth.uid());

create policy selbsteinschaetzungen_select_trainer_team on public.selbsteinschaetzungen
  for select
  to authenticated
  using (
    public.current_user_role() = 'trainer'
    and exists (
      select 1 from public.users u
      where u.id = selbsteinschaetzungen.junior_id
        and u.team_id = public.current_user_team_id()
    )
  );

create policy selbsteinschaetzungen_select_admin on public.selbsteinschaetzungen
  for select
  to authenticated
  using (public.current_user_role() = 'admin');

create policy selbsteinschaetzungen_insert_own on public.selbsteinschaetzungen
  for insert
  to authenticated
  with check (junior_id = auth.uid());

create policy selbsteinschaetzungen_update_own_or_admin on public.selbsteinschaetzungen
  for update
  to authenticated
  using (junior_id = auth.uid() or public.current_user_role() = 'admin');

-- badges / junior_badges: Katalog ist oeffentlich (fuer alle eingeloggten
-- Nutzer) lesbar. Vergabe (Insert) erfolgt in einer spaeteren Phase ueber
-- Server-/Admin-Logik, daher hier bewusst keine Insert-Policy fuer normale
-- Nutzer.
create policy badges_select_all on public.badges
  for select
  to authenticated
  using (true);

create policy junior_badges_select_own on public.junior_badges
  for select
  to authenticated
  using (junior_id = auth.uid());

create policy junior_badges_select_trainer_team on public.junior_badges
  for select
  to authenticated
  using (
    public.current_user_role() = 'trainer'
    and exists (
      select 1 from public.users u
      where u.id = junior_badges.junior_id
        and u.team_id = public.current_user_team_id()
    )
  );

create policy junior_badges_select_admin on public.junior_badges
  for select
  to authenticated
  using (public.current_user_role() = 'admin');
