import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Bell } from './icons';
import { leseEdgeFunctionFehler } from '../lib/functionsError';
import type { PasswortResetAnfrage, User } from '../types/database';

type NutzerKurz = Pick<User, 'id' | 'vorname' | 'nachname' | 'email'>;

interface OffeneAnfrage extends PasswortResetAnfrage {
  nutzer: NutzerKurz | null;
}

export function PasswortResetAnfragenCard() {
  const { profile } = useAuth();

  const [anfragen, setAnfragen] = useState<OffeneAnfrage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aktivAnfrage, setAktivAnfrage] = useState<OffeneAnfrage | null>(null);
  const [neuesPasswort, setNeuesPasswort] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const laden = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: offene, error: anfrageError } = await supabase
      .from('passwort_reset_anfragen')
      .select('*')
      .eq('erledigt', false)
      .order('angefragt_am', { ascending: true });

    if (anfrageError) {
      setError(anfrageError.message);
      setLoading(false);
      return;
    }

    const userIds = [...new Set((offene ?? []).map((a) => a.user_id))];
    let nutzerById = new Map<string, NutzerKurz>();

    if (userIds.length > 0) {
      const { data: nutzer } = await supabase
        .from('users')
        .select('id, vorname, nachname, email')
        .in('id', userIds);
      nutzerById = new Map((nutzer ?? []).map((n) => [n.id, n]));
    }

    setAnfragen((offene ?? []).map((a) => ({ ...a, nutzer: nutzerById.get(a.user_id) ?? null })));
    setLoading(false);
  }, []);

  useEffect(() => {
    void laden();
  }, [laden]);

  function anfrageAuswaehlen(a: OffeneAnfrage) {
    setAktivAnfrage(a);
    setNeuesPasswort('');
    setError(null);
  }

  async function handlePasswortSetzen(e: FormEvent) {
    e.preventDefault();
    if (!aktivAnfrage) return;
    setError(null);

    if (neuesPasswort.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          action: 'reset-password',
          user_id: aktivAnfrage.user_id,
          password: neuesPasswort,
          request_id: aktivAnfrage.id,
        },
      });
      if (error) {
        throw new Error(await leseEdgeFunctionFehler(error, 'Passwort konnte nicht gesetzt werden.'));
      }
      if (data?.error) throw new Error(data.error);

      setAktivAnfrage(null);
      setNeuesPasswort('');
      await laden();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passwort konnte nicht gesetzt werden.');
    } finally {
      setSubmitting(false);
    }
  }

  async function alsErledigtMarkieren(a: OffeneAnfrage) {
    setError(null);
    const { error } = await supabase
      .from('passwort_reset_anfragen')
      .update({ erledigt: true, erledigt_am: new Date().toISOString(), erledigt_von: profile?.id ?? null })
      .eq('id', a.id);
    if (error) setError(error.message);
    else await laden();
  }

  if (!loading && anfragen.length === 0) return null;

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Bell size={20} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--bd-gold-600)' }} />
        <h2 style={{ margin: 0 }}>Offene Passwort-Reset-Anfragen</h2>
      </div>
      {error && <div className="alert-error">{error}</div>}

      {loading && <p>Wird geladen …</p>}

      {!loading && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {anfragen.map((a) => (
            <li
              key={a.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid var(--color-border)',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ flex: 1 }}>
                {a.nutzer
                  ? `${a.nutzer.vorname} ${a.nutzer.nachname} (${a.nutzer.email})`
                  : 'Unbekannter Nutzer'}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-primary"
                  style={{ width: 'auto' }}
                  onClick={() => anfrageAuswaehlen(a)}
                >
                  Passwort setzen
                </button>
                <button className="btn-secondary" onClick={() => void alsErledigtMarkieren(a)}>
                  Als erledigt markieren
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {aktivAnfrage && (
        <form onSubmit={handlePasswortSetzen} style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="neues-passwort">
              Neues Passwort für {aktivAnfrage.nutzer?.vorname} {aktivAnfrage.nutzer?.nachname}
            </label>
            <input
              id="neues-passwort"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={neuesPasswort}
              onChange={(e) => setNeuesPasswort(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Wird gespeichert …' : 'Passwort setzen'}
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => setAktivAnfrage(null)}
              disabled={submitting}
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
