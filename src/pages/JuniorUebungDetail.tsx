import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { SterneAuswahl } from '../components/SterneAuswahl';
import { KATEGORIE_LABELS } from '../lib/constants';
import type { Selbsteinschaetzung, Uebung } from '../types/database';

export function JuniorUebungDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile, refreshProfile } = useAuth();

  const [uebung, setUebung] = useState<Uebung | null>(null);
  const [verlauf, setVerlauf] = useState<Selbsteinschaetzung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [geschafft, setGeschafft] = useState<boolean | null>(null);
  const [sterne, setSterne] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !profile) return;
    setLoading(true);
    setError(null);

    const [uebungResult, verlaufResult] = await Promise.all([
      supabase.from('uebungen').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('selbsteinschaetzungen')
        .select('*')
        .eq('uebung_id', id)
        .eq('junior_id', profile.id)
        .order('datum', { ascending: false }),
    ]);

    if (uebungResult.error) setError(uebungResult.error.message);
    else setUebung(uebungResult.data);

    if (verlaufResult.error) setError(verlaufResult.error.message);
    else setVerlauf(verlaufResult.data ?? []);

    setLoading(false);
  }, [id, profile]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit() {
    if (!id) return;
    setError(null);
    setSuccess(null);

    if (geschafft === null) {
      setError('Bitte auswaehlen, ob du die Uebung geschafft hast.');
      return;
    }
    if (sterne === null) {
      setError('Bitte bewerte, wie es sich angefuehlt hat.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('submit_selbsteinschaetzung', {
        p_uebung_id: id,
        p_geschafft: geschafft,
        p_gefuehl_sterne: sterne,
      });
      if (error) throw error;

      setSuccess(
        geschafft ? 'Super gemacht! 20 Punkte gutgeschrieben.' : 'Danke, gespeichert — weiter dranbleiben!'
      );
      setGeschafft(null);
      setSterne(null);
      await Promise.all([refreshProfile(), load()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konnte nicht gespeichert werden.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p>Wird geladen …</p>
      </DashboardLayout>
    );
  }

  if (!uebung) {
    return (
      <DashboardLayout>
        <div className="card">
          <p>Uebung nicht gefunden.</p>
          <Link to="/junior">← Zurueck zur Uebersicht</Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Link to="/junior">← Zurueck zur Uebersicht</Link>

      <div className="card" style={{ marginTop: 16 }}>
        <span className="tag">{KATEGORIE_LABELS[uebung.kategorie]}</span>
        <h2>{uebung.titel}</h2>
        {uebung.bild_url && (
          <img
            src={uebung.bild_url}
            alt={uebung.titel}
            style={{ maxWidth: '100%', borderRadius: 8, margin: '12px 0' }}
          />
        )}
        <p>{uebung.beschreibung}</p>
      </div>

      <div className="card">
        <h2>Selbsteinschätzung</h2>
        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-info">{success}</div>}

        <div className="field">
          <label>Geschafft?</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="geschafft"
                checked={geschafft === true}
                onChange={() => setGeschafft(true)}
              />
              Ja
            </label>
            <label>
              <input
                type="radio"
                name="geschafft"
                checked={geschafft === false}
                onChange={() => setGeschafft(false)}
              />
              Nein
            </label>
          </div>
        </div>

        <div className="field">
          <label>Wie hat es sich angefühlt?</label>
          <SterneAuswahl value={sterne} onChange={setSterne} />
        </div>

        <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Wird gespeichert …' : 'Speichern'}
        </button>
      </div>

      <div className="card">
        <h2>Mein Verlauf zu dieser Uebung</h2>
        {verlauf.length === 0 && <p>Noch keine Einschaetzung fuer diese Uebung.</p>}
        {verlauf.map((v) => (
          <div
            key={v.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span>{new Date(v.datum).toLocaleDateString('de-CH')}</span>
            <span className="tag">{v.geschafft ? 'Geschafft' : 'Nicht geschafft'}</span>
            <SterneAuswahl value={v.gefuehl_sterne} readOnly />
            <span style={{ color: 'var(--color-text-muted)' }}>+{v.punkte_vergeben} Pkt.</span>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
