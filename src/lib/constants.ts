import type { Altersgruppe, FreundeschallengeStatus, UebungKategorie } from '../types/database';

export const ALTERSGRUPPEN: Altersgruppe[] = ['U9', 'U12', 'U15', 'U18'];

export const KATEGORIE_LABELS: Record<UebungKategorie, string> = {
  technik: 'Technik',
  schuss: 'Schuss',
  kraft: 'Kraft',
  koordination: 'Koordination',
  kondition: 'Kondition',
  schnelligkeit: 'Schnelligkeit',
};

export const KATEGORIEN: UebungKategorie[] = [
  'technik',
  'schuss',
  'kraft',
  'koordination',
  'kondition',
  'schnelligkeit',
];

// Gleiche Emoji wie bei den entsprechenden Badges (Phase 4), damit Kategorie
// und Badge visuell sofort zusammengehörig wirken (Phase 6: verspielte
// Illustrationen statt reinem Text).
export const KATEGORIE_ICONS: Record<UebungKategorie, string> = {
  technik: '🎯',
  schuss: '🚀',
  kraft: '💪',
  koordination: '🤹',
  kondition: '🏃',
  schnelligkeit: '⚡',
};

export const FREUNDESCHALLENGE_STATUS_LABELS: Record<FreundeschallengeStatus, string> = {
  angefragt: 'Angefragt',
  aktiv: 'Läuft',
  erfolgreich: 'Erfolgreich',
  gescheitert: 'Gescheitert',
  abgelehnt: 'Abgelehnt',
};
