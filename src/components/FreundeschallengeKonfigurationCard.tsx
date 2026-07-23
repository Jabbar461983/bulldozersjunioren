import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { FreundeschallengeKonfiguration } from '../types/database';

export function FreundeschallengeKonfigurationCard() {
  const [konfiguration, setKonfiguration] = useState<FreundeschallengeKonfiguration | null>(null);
  const [extraPunkte, setExtraPunkte] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gespeichert, setGespeichert] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('freundeschallenge_konfiguration')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (error) setError(error.message);
      else if (data) {
        setKonfiguration(data);
        setExtraPunkte(String(data.extra_punkte));
      }
      setLoading(false);
    }
    void load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGespeichert(false);

    const wert = Number(extraPunkte);
    if (!Number.isInteger(wert) || wert < 0) {
      setError('Bitte eine ganze Zahl ≥ 0 angeben.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('freundeschallenge_konfiguration')
        .update({ extra_punkte: wert })
        .eq('id', 1)
        .select()
        .single();
      if (error) throw error;
      setKonfiguration(data);
      setGespeichert(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konnte nicht gespeichert werden.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h2>Freundeschallenge</h2>
      <p>
        Extrapunkte, die beide Junioren erhalten, wenn sie eine Freundeschallenge (3 Tage in Folge
        in der gewählten Kategorie) gemeinsam erfolgreich abschliessen.
      </p>
      {error && <div className="alert-error">{error}</div>}

      {loading ? (
        <p>Wird geladen …</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="freundeschallenge-extra-punkte">Extrapunkte pro Person</label>
            <input
              id="freundeschallenge-extra-punkte"
              type="number"
              min={0}
              step={1}
              required
              value={extraPunkte}
              onChange={(e) => {
                setExtraPunkte(e.target.value);
                setGespeichert(false);
              }}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Wird gespeichert …' : 'Speichern'}
          </button>
          {gespeichert && konfiguration && (
            <p style={{ marginTop: 8, color: 'var(--color-text-muted)' }}>
              Gespeichert: {konfiguration.extra_punkte} Extrapunkte pro Person.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
