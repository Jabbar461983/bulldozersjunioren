import type { Altersgruppe } from '../types/database';

// Übungsbeschreibungen folgen bei zeitbasierten Übungen dem Muster
// "U9: 30s, U12: 45s, U15: 60s, U18: 90s." bzw. mit Minuten statt Sekunden
// ("U9: 1 Min, U12: 2 Min, …"), siehe supabase/migrations/0008_seed_uebungen_*.
// Reine Wiederholungs-Übungen ("U9: 8, U12: 12, … Wdh./Schüsse/Versuche/x")
// enthalten kein "s"/"Min" direkt nach der Zahl und lösen daher keinen Timer
// aus. Das ist eine Heuristik über den freien Beschreibungstext – Trainer
// legen keinen expliziten "braucht Timer"-Wert pro Übung fest.
const DAUER_REGEX = /(U9|U12|U15|U18)\s*:\s*(\d+)\s*(Min|s)\b/gi;

export function parseUebungTimerSekunden(
  beschreibung: string | null,
  altersgruppe: Altersgruppe | undefined
): number | null {
  if (!beschreibung || !altersgruppe) return null;

  for (const match of beschreibung.matchAll(DAUER_REGEX)) {
    const [, gruppe, zahl, einheit] = match;
    if (gruppe.toUpperCase() !== altersgruppe) continue;
    const wert = Number(zahl);
    return einheit.toLowerCase() === 'min' ? wert * 60 : wert;
  }

  return null;
}
