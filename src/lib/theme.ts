import type { Team } from '../types/database';

// Muss zu den Default-Werten in src/index.css (:root) und den Spalten-
// Defaults von teams.farbe_primaer/-sekundaer (Migration 0001) passen.
const STANDARD_PRIMAER = '#0f172a';
const STANDARD_SEKUNDAER = '#38bdf8';

// Wendet die Vereinsfarben des Teams als CSS-Design-Tokens auf die gesamte
// App an (Phase 6). Ohne Team (z. B. Admin) oder ohne gesetzte Farben gilt
// das Standard-Theme.
export function wendeTeamThemeAn(team: Team | null): void {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', team?.farbe_primaer || STANDARD_PRIMAER);
  root.style.setProperty('--color-accent', team?.farbe_sekundaer || STANDARD_SEKUNDAER);
}
