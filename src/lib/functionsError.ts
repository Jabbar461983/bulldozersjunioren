import { FunctionsHttpError } from '@supabase/supabase-js';

// supabase.functions.invoke() liefert bei einem Non-2xx-Status nur eine
// generische Fehlermeldung; die eigentliche, vom Server gesetzte Meldung
// steckt im Response-Body und muss extra ausgelesen werden.
export async function leseEdgeFunctionFehler(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // Body war kein JSON – Fallback verwenden.
    }
  }
  return error instanceof Error ? error.message : fallback;
}
