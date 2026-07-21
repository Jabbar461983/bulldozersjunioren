-- Phase 3 – Junior-Ansicht & Selbsteinschätzung
--
-- Selbsteinschätzungen dürfen ab jetzt nicht mehr per direktem INSERT/UPDATE
-- durch den Client erzeugt werden, sondern ausschliesslich über die Funktion
-- submit_selbsteinschaetzung() weiter unten. Grund: Nur so kann sichergestellt
-- werden, dass die Punktevergabe (users.punkte_total) serverseitig konsistent
-- und ausschliesslich anhand von "geschafft" berechnet wird, statt dem Client
-- zu vertrauen, welchen Punktewert er mitschickt.

drop policy if exists selbsteinschaetzungen_insert_own on public.selbsteinschaetzungen;
drop policy if exists selbsteinschaetzungen_update_own_or_admin on public.selbsteinschaetzungen;

-- Admin darf zur Korrektur weiterhin direkt schreiben; normale Nutzer nur
-- über die RPC-Funktion (siehe unten), die SECURITY DEFINER läuft und RLS
-- für ihre eigenen Schreibzugriffe umgeht.
create policy selbsteinschaetzungen_admin_write on public.selbsteinschaetzungen
  for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- Schutz von punkte_total/level_aktuell/streak_* vor direkten Client-Updates.
--
-- Diese Felder dürfen nur von Admin oder von einer als "vertrauenswürdig"
-- markierten Server-Funktion (siehe submit_selbsteinschaetzung) verändert
-- werden. Die Funktion setzt dazu ein transaktionslokales Flag
-- (app.allow_points_update), das der Trigger prüft. Ohne dieses Flag würde
-- z. B. ein Junior sonst per direktem "update users set punkte_total = ..."
-- sich beliebig Punkte gutschreiben können.
-- ---------------------------------------------------------------------------

create or replace function public.prevent_privileged_field_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.rolle <> old.rolle or new.team_id is distinct from old.team_id)
     and public.current_user_role() <> 'admin' then
    raise exception 'Nur Admins dürfen Rolle oder Team ändern.';
  end if;

  if (
       new.punkte_total <> old.punkte_total
       or new.level_aktuell <> old.level_aktuell
       or new.streak_counter <> old.streak_counter
       or new.streak_letzte_aktivitaet is distinct from old.streak_letzte_aktivitaet
     )
     and public.current_user_role() <> 'admin'
     and coalesce(current_setting('app.allow_points_update', true), 'false') <> 'true' then
    raise exception 'Punkte, Level und Streak dürfen nicht direkt geändert werden.';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- submit_selbsteinschaetzung: einziger Weg für Junioren, eine Selbstein-
-- schätzung zu erfassen. Bindet junior_id fest an auth.uid() (kann also nicht
-- im Namen eines anderen Nutzers aufgerufen werden) und berechnet den
-- Punktewert serverseitig anhand von "geschafft" – der Client kann keinen
-- eigenen Punktewert mitschicken.
--
-- Punktewert: fixer Platzhalter (20 Punkte pro erfolgreich eingeschätzter
-- Übung). Die tatsächliche Formel (Level-Berechnung etc.) folgt in Phase 4
-- und darf diese Funktion bei Bedarf anpassen.
-- ---------------------------------------------------------------------------

create or replace function public.submit_selbsteinschaetzung(
  p_uebung_id uuid,
  p_geschafft boolean,
  p_gefuehl_sterne smallint
)
returns public.selbsteinschaetzungen
language plpgsql
security definer
set search_path = public
as $$
declare
  v_punkte integer := 0;
  v_row public.selbsteinschaetzungen;
begin
  if p_gefuehl_sterne is not null and (p_gefuehl_sterne < 1 or p_gefuehl_sterne > 5) then
    raise exception 'gefuehl_sterne muss zwischen 1 und 5 liegen.';
  end if;

  if not exists (select 1 from public.uebungen where id = p_uebung_id) then
    raise exception 'Übung nicht gefunden.';
  end if;

  if p_geschafft then
    v_punkte := 20;
  end if;

  insert into public.selbsteinschaetzungen (
    junior_id, uebung_id, datum, geschafft, gefuehl_sterne, punkte_vergeben
  )
  values (auth.uid(), p_uebung_id, current_date, p_geschafft, p_gefuehl_sterne, v_punkte)
  returning * into v_row;

  if v_punkte > 0 then
    perform set_config('app.allow_points_update', 'true', true);
    update public.users
      set punkte_total = punkte_total + v_punkte
      where id = auth.uid();
  end if;

  return v_row;
end;
$$;

grant execute on function public.submit_selbsteinschaetzung(uuid, boolean, smallint) to authenticated;
