-- Übungen: markierbar, wo sie am besten gemacht werden (Zuhause, Halle,
-- Aussenplatz). Mehrfachauswahl wie bei altersgruppen. Das Frontend zeigt für
-- Zuhause-Übungen zusätzlich ein Haus-Symbol auf der Übungskarte an.

create type public.ort_typ as enum ('zuhause', 'halle', 'aussenplatz');

alter table public.uebungen
  add column orte public.ort_typ[] not null default '{}';
