-- Beliebtheits-Bewertung pro Übung: Junioren können mit 1-5 Herzen bewerten,
-- wie cool sie eine Übung fanden. Das ist bewusst unabhängig von der
-- Selbsteinschätzung (die misst, ob eine Übung an einem bestimmten Tag
-- geschafft wurde) — eine Bewertung pro Junior und Übung, jederzeit änderbar,
-- kein täglicher Verlauf nötig.
--
-- Analog zu selbsteinschaetzungen (Migration 0003) läuft der Schreibzugriff
-- ausschliesslich über eine SECURITY-DEFINER-Funktion, nicht per direktem
-- INSERT/UPDATE durch den Client.

create table public.uebung_bewertungen (
  id uuid primary key default gen_random_uuid(),
  junior_id uuid not null references public.users (id) on delete cascade,
  uebung_id uuid not null references public.uebungen (id) on delete cascade,
  herzen smallint not null check (herzen between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (junior_id, uebung_id)
);

create index uebung_bewertungen_uebung_id_idx on public.uebung_bewertungen (uebung_id);
create index uebung_bewertungen_junior_id_idx on public.uebung_bewertungen (junior_id);

alter table public.uebung_bewertungen enable row level security;

-- Nur die eigene Bewertung ist per direktem SELECT sichtbar (z. B. um das
-- eigene Herzen-Bild in der Detailansicht vorauszufüllen). Die aggregierte
-- Beliebtheit für die Übungsübersicht liefert ausschliesslich die Funktion
-- uebung_beliebtheit() weiter unten — gleiches Datenschutz-Muster wie bei
-- rangliste()/team_rangliste(): nur die Aggregation ist einsehbar, nie wer
-- wie abgestimmt hat.
create policy uebung_bewertungen_select_own on public.uebung_bewertungen
  for select
  to authenticated
  using (junior_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Bewertung abgeben/ändern. Ein Junior kann seine Bewertung jederzeit
-- überschreiben (on conflict do update) statt einen neuen Verlaufseintrag
-- anzulegen, da nur die aktuelle Meinung zählt.
-- ---------------------------------------------------------------------------

create or replace function public.bewerte_uebung(p_uebung_id uuid, p_herzen smallint)
returns public.uebung_bewertungen
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.uebung_bewertungen;
begin
  if public.current_user_role() <> 'junior' then
    raise exception 'Nur Junioren können Übungen bewerten.';
  end if;

  if p_herzen < 1 or p_herzen > 5 then
    raise exception 'herzen muss zwischen 1 und 5 liegen.';
  end if;

  if not exists (select 1 from public.uebungen where id = p_uebung_id) then
    raise exception 'Übung nicht gefunden.';
  end if;

  insert into public.uebung_bewertungen (junior_id, uebung_id, herzen)
  values (auth.uid(), p_uebung_id, p_herzen)
  on conflict (junior_id, uebung_id)
  do update set herzen = excluded.herzen, updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.bewerte_uebung(uuid, smallint) to authenticated;

-- ---------------------------------------------------------------------------
-- Aggregierte Beliebtheit je Übung (Durchschnitt + Anzahl Bewertungen), ohne
-- Rückschluss auf einzelne Stimmen. Grundlage für Herzen-Anzeige und
-- Sortierung "beliebteste zuoberst" in der Übungsübersicht.
-- ---------------------------------------------------------------------------

create or replace function public.uebung_beliebtheit()
returns table (
  uebung_id uuid,
  durchschnitt_herzen numeric,
  anzahl_bewertungen integer
)
language sql
stable
security definer
set search_path = public
as $$
  select uebung_id, round(avg(herzen), 2), count(*)::integer
  from public.uebung_bewertungen
  group by uebung_id;
$$;

grant execute on function public.uebung_beliebtheit() to authenticated;
