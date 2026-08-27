import { supabase } from './supabaseClient';

const UEBUNG_BILDER_BUCKET = 'uebung-bilder';
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
