import type { Team } from '../types/database';

// Muss zu den Default-Werten in src/index.css (:root) passen. Entspricht den
// Vereinsfarben des Streethockeyclub Bulldozers; kann pro Team in der
// teams-Tabelle (farbe_primaer/-sekundaer) überschrieben werden.
const STANDARD_PRIMAER = '#0e6e45';
const STANDARD_SEKUNDAER = '#b08d2a';

// Wendet die Vereinsfarben des Teams als CSS-Design-Tokens auf die gesamte
// App an (Phase 6). Ohne Team (z. B. Admin) oder ohne gesetzte Farben gilt
// das Standard-Theme.
export function wendeTeamThemeAn(team: Team | null): void {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', team?.farbe_primaer || STANDARD_PRIMAER);
  root.style.setProperty('--color-accent', team?.farbe_sekundaer || STANDARD_SEKUNDAER);
}
