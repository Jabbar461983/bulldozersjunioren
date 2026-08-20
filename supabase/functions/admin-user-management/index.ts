// Supabase Edge Function (Deno): Nutzerverwaltung für Admins – Anlegen,
// Löschen und Passwort-Reset von Nutzerkonten (Junior/Trainer/Admin).
//
// Warum eine Edge Function statt direktem Client-Zugriff: Ein neues Konto
// braucht einen auth.users-Eintrag (Passwort, E-Mail-Bestätigung
// überspringen), Löschen muss ebendiesen Eintrag entfernen (public.users
// hängt per "on delete cascade" daran) und ein Passwort-Reset setzt direkt
// das Passwort in auth.users – alles drei ist nur mit dem Service-Role-Key
// möglich, den der Client aus Sicherheitsgründen nie sieht. Mutieren
// bestehender Nutzer (Rolle/Team/Name) läuft dagegen weiterhin direkt über
// den Client, da RLS (users_update_admin, Migration 0001) das für Admins
// bereits erlaubt.
//
// SUPABASE_URL, SUPABASE_ANON_KEY und SUPABASE_SERVICE_ROLE_KEY sind in der
// Edge-Runtime bereits vorhanden (kein zusätzliches Secret nötig).

import { createClient } from 'npm:@supabase/supabase-js@2';

type Rolle = 'junior' | 'trainer' | 'admin';

interface CreateBody {
  action: 'create';
  vorname: string;
  nachname: string;
  email: string;
  password: string;
  rolle: Rolle;
  team_id: string | null;
}

interface DeleteBody {
  action: 'delete';
  user_id: string;
}

interface ResetPasswordBody {
  action: 'reset-password';
  user_id: string;
  password: string;
  // Optional: schliesst die zugehörige Zeile in
  // public.passwort_reset_anfragen (Migration 0015) gleich mit ab, damit sie
  // aus der Admin-Übersicht offener Anfragen verschwindet.
  request_id?: string;
}

type RequestBody = CreateBody | DeleteBody | ResetPasswordBody;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // Client mit dem JWT des Aufrufers: nur um dessen Identität und Rolle zu
  // prüfen, bevor irgendetwas Privilegiertes passiert.
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user: caller },
  } = await callerClient.auth.getUser();
  if (!caller) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const { data: rolle } = await callerClient.rpc('current_user_role');
  if (rolle !== 'admin') {
    return json({ error: 'Nur Admins dürfen Nutzer verwalten.' }, 403);
  }

  let payload: RequestBody;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Ungültiger Request-Body.' }, 400);
  }

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  if (payload.action === 'create') {
    const { vorname, nachname, email, password, rolle: neueRolle, team_id } = payload;

    if (!vorname?.trim() || !nachname?.trim() || !email?.trim() || !password) {
      return json({ error: 'Vorname, Nachname, E-Mail und Passwort sind erforderlich.' }, 400);
    }
    if (password.length < 6) {
      return json({ error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' }, 400);
    }

    const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { vorname, nachname, rolle: neueRolle, team_id },
    });
    if (createError || !created.user) {
      return json({ error: createError?.message ?? 'Nutzer konnte nicht angelegt werden.' }, 400);
    }

    // handle_new_user() (Migration 0001) hat die Profilzeile bereits über den
    // on_auth_user_created-Trigger angelegt, stuft eine gewünschte Rolle
    // "admin" dabei aber automatisch auf "junior" zurück, falls schon ein
    // Admin existiert (Schutz gegen Selbst-Registrierung als Admin). Da hier
    // ein bereits verifizierter Admin explizit einen weiteren Nutzer mit
    // dieser Rolle anlegen darf, wird die gewünschte Rolle jetzt gezielt
    // durchgesetzt.
    const { data: updated, error: updateError } = await serviceClient
      .from('users')
      .update({ vorname, nachname, rolle: neueRolle, team_id })
      .eq('id', created.user.id)
      .select()
      .single();

    if (updateError) {
      return json({ error: updateError.message }, 500);
    }

    return json({ user: updated });
  }

  if (payload.action === 'delete') {
    const { user_id } = payload;
    if (!user_id) {
      return json({ error: 'user_id ist erforderlich.' }, 400);
    }
    if (user_id === caller.id) {
      return json({ error: 'Du kannst dein eigenes Konto nicht löschen.' }, 400);
    }

    const { error } = await serviceClient.auth.admin.deleteUser(user_id);
    if (error) {
      return json({ error: error.message }, 500);
    }

    return json({ ok: true });
  }

  if (payload.action === 'reset-password') {
    const { user_id, password, request_id } = payload;
    if (!user_id || !password) {
      return json({ error: 'user_id und password sind erforderlich.' }, 400);
    }
    if (password.length < 6) {
      return json({ error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' }, 400);
    }

    const { error } = await serviceClient.auth.admin.updateUserById(user_id, { password });
    if (error) {
      return json({ error: error.message }, 500);
    }

    if (request_id) {
      await serviceClient
        .from('passwort_reset_anfragen')
        .update({ erledigt: true, erledigt_am: new Date().toISOString(), erledigt_von: caller.id })
        .eq('id', request_id);
    }

    return json({ ok: true });
  }

  return json({ error: 'Unbekannte Aktion.' }, 400);
});
