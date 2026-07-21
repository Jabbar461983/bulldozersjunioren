import type { Altersgruppe, UebungKategorie } from '../types/database';

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
