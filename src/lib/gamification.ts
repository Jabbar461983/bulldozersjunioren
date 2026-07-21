// Spiegelt bewusst nur die REIN DARSTELLERISCHEN Berechnungen aus
// supabase/migrations/0004_gamification.sql (punkte_fuer_level/berechne_level).
// Massgeblich (level_aktuell, Badge-Vergabe, Streaks) ist immer der Server –
// diese Funktionen dienen nur der Anzeige (Fortschrittsbalken etc.), ohne für
// jede Anzeige einen Round-Trip zur Datenbank zu brauchen.

// Dreieckszahlen-Formel: punkte_fuer_level(n) = 50 * (n - 1) * n
const LEVEL_FAKTOR = 50;

export function punkteFuerLevel(level: number): number {
  if (level <= 1) return 0;
  return LEVEL_FAKTOR * (level - 1) * level;
}

export function berechneLevel(punkte: number): number {
  let level = 1;
  while (punkteFuerLevel(level + 1) <= punkte) {
    level += 1;
  }
  return level;
}

export interface LevelFortschritt {
  level: number;
  punkteAktuellesLevel: number;
  punkteNaechstesLevel: number;
  punkteBisNaechstesLevel: number;
  prozent: number;
}

export function levelFortschritt(punkte: number): LevelFortschritt {
  const level = berechneLevel(punkte);
  const punkteAktuellesLevel = punkteFuerLevel(level);
  const punkteNaechstesLevel = punkteFuerLevel(level + 1);
  const spanne = punkteNaechstesLevel - punkteAktuellesLevel;
  const fortschritt = spanne > 0 ? (punkte - punkteAktuellesLevel) / spanne : 1;

  return {
    level,
    punkteAktuellesLevel,
    punkteNaechstesLevel,
    punkteBisNaechstesLevel: Math.max(0, punkteNaechstesLevel - punkte),
    prozent: Math.min(100, Math.max(0, Math.round(fortschritt * 100))),
  };
}

function heuteAlsDatum(): string {
  return new Date().toISOString().slice(0, 10);
}

function tageDifferenz(datumIso: string, referenzIso: string): number {
  const datum = new Date(`${datumIso}T00:00:00Z`);
  const referenz = new Date(`${referenzIso}T00:00:00Z`);
  return Math.round((referenz.getTime() - datum.getTime()) / (1000 * 60 * 60 * 24));
}

// Der gespeicherte streak_counter wird nur bei einer neuen Einschätzung
// aktualisiert. Ohne neue Aktivität zeigen wir den Streak trotzdem korrekt
// als abgebrochen an, sobald mehr als ein Tag ohne Aktivität vergangen ist.
export function effektiverTagesStreak(
  streakCounter: number,
  letzteAktivitaet: string | null
): number {
  if (!letzteAktivitaet) return 0;
  const differenz = tageDifferenz(letzteAktivitaet, heuteAlsDatum());
  return differenz <= 1 ? streakCounter : 0;
}

export function effektiverWochenStreak(
  streakWochen: number,
  letzteWoche: string | null
): number {
  if (!letzteWoche) return 0;
  const differenzTage = tageDifferenz(letzteWoche, heuteAlsDatum());
  return differenzTage <= 13 ? streakWochen : 0;
}
