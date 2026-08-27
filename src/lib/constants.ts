import type { Altersgruppe, FreundeschallengeStatus, Ort, UebungKategorie } from '../types/database';

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

// Kategorie-Farbcode für die Kacheln auf der Startseite und die grüne Bühne
// der Übungsdetailseite (design_handoff_junioren_pwa, Tabelle unter "1.
// Start / Dashboard"). Maximal zwei farbige Flächen pro Seite ist die
// Design-Regel für Inhalte – die sechs Kategorie-Kacheln sind bewusst die
// Ausnahme (eigenständiges Farbcode-System, kein Fliesstext).
export const KATEGORIE_FARBEN: Record<UebungKategorie, { bg: string; fg: string }> = {
  technik: { bg: 'var(--bd-green-600)', fg: '#fff' },
  schuss: { bg: 'var(--bd-black)', fg: 'var(--bd-gold-500)' },
  kraft: { bg: 'var(--bd-gold-500)', fg: 'var(--bd-black)' },
  koordination: { bg: 'var(--bd-green-800)', fg: 'var(--bd-gold-300)' },
  kondition: { bg: 'var(--bd-gold-200)', fg: 'var(--bd-gold-800)' },
  schnelligkeit: { bg: 'var(--bd-green-100)', fg: 'var(--bd-green-700)' },
};

export const ORTE: Ort[] = ['zuhause', 'halle'];

export const ORT_LABELS: Record<Ort, string> = {
  zuhause: 'Zuhause',
  halle: 'Spielfeld',
};

export const FREUNDESCHALLENGE_STATUS_LABELS: Record<FreundeschallengeStatus, string> = {
  angefragt: 'Angefragt',
  aktiv: 'Läuft',
  erfolgreich: 'Erfolgreich',
  gescheitert: 'Gescheitert',
  abgelehnt: 'Abgelehnt',
};
