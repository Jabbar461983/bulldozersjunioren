-- Entfernt 'aussenplatz' wieder aus ort_typ (Migration 0016) und benennt das
-- Wording von 'halle' im Frontend auf "Spielfeld" um (der Enum-Wert selbst
-- bleibt 'halle', nur das Label/Icon ändert sich, siehe src/lib/constants.ts).
--
-- Postgres kennt kein "ALTER TYPE ... DROP VALUE", daher der übliche Umweg:
-- neuen Typ ohne den unerwünschten Wert anlegen, die Spalte darauf umstellen,
-- alten Typ löschen, neuen Typ auf den ursprünglichen Namen umbenennen.

-- Sicherheitshalber vorhandene 'aussenplatz'-Einträge entfernen, falls
-- zwischenzeitlich schon eine Übung damit markiert wurde.
update public.uebungen
set orte = array_remove(orte, 'aussenplatz'::ort_typ)
where 'aussenplatz' = any(orte);

-- Default muss vor dem Typwechsel weg, sonst blockiert er später das Löschen
-- des alten Typs (der Default-Ausdruck haengt sonst noch am alten Typ).
alter table public.uebungen alter column orte drop default;

create type public.ort_typ_neu as enum ('zuhause', 'halle');

alter table public.uebungen
  alter column orte type public.ort_typ_neu[]
  using orte::text[]::public.ort_typ_neu[];

alter table public.uebungen alter column orte set default '{}'::public.ort_typ_neu[];

drop type public.ort_typ;

alter type public.ort_typ_neu rename to ort_typ;
