import { supabase } from './supabaseClient';

const UEBUNG_BILDER_BUCKET = 'uebung-bilder';
const TEAM_LOGOS_BUCKET = 'team-logos';
const MAX_BILD_BYTES = 5 * 1024 * 1024;

export async function uploadUebungBild(file: File, userId: string): Promise<string> {
  if (file.size > MAX_BILD_BYTES) {
    throw new Error('Das Bild darf maximal 5 MB gross sein.');
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop() : undefined;
  const path = `${userId}/${crypto.randomUUID()}${extension ? `.${extension}` : ''}`;

  const { error } = await supabase.storage.from(UEBUNG_BILDER_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(UEBUNG_BILDER_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Fester Dateiname pro Team (statt zufaelliger UUID): ein erneuter Upload
// ersetzt das bisherige Logo, statt verwaiste Dateien anzuhaeufen. Der
// Cache-Buster-Query-Parameter sorgt dafuer, dass Browser/Service-Worker das
// neue Bild sofort laden statt die alte, cachte Version weiter anzuzeigen.
export async function uploadTeamLogo(file: File, teamId: string): Promise<string> {
  if (file.size > MAX_BILD_BYTES) {
    throw new Error('Das Logo darf maximal 5 MB gross sein.');
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'png';
  const path = `${teamId}/logo.${extension}`;

  const { error } = await supabase.storage.from(TEAM_LOGOS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(TEAM_LOGOS_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
