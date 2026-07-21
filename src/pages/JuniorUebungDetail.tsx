import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { SterneAuswahl } from '../components/SterneAuswahl';
import { Maskottchen, type MaskottchenZustand } from '../components/Maskottchen';
import { KATEGORIE_ICONS, KATEGORIE_LABELS } from '../lib/constants';
import { sendeGamificationPush } from '../lib/push';
import type { Selbsteinschaetzung, Uebung } from '../types/database';

const FREUDIG_SPRUECHE = ['Super gemacht!', 'Stark! Weiter so!', 'Das war top!', 'Klasse Leistung!'];
const AUFMUNTERN_SPRUECHE = [
  'Nicht schlimm, nächstes Mal klappt’s!',
  'Dranbleiben, du schaffst das!',
  'Übung macht den Meister!',
];

function zufaelligerSpruch(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

interface Feedback {
  zustand: MaskottchenZustand;
  text: string;
}

export function JuniorUebungDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [uebung, setUebung] = useState<Uebung | null>(null);
  const [verlauf, setVerlauf] = useState<Selbsteinschaetzung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [geschafft, setGeschafft] = useState<boolean | null>(null);
  const [sterne, setSterne] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [feier, setFeier] = useState<string | null>(null);

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
    setFeedback(null);
    setFeier(null);

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
      const { data, error } = await supabase.rpc('submit_selbsteinschaetzung', {
        p_uebung_id: id,
        p_geschafft: geschafft,
        p_gefuehl_sterne: sterne,
      });
      if (error) throw error;

      const punkte = data.einschaetzung.punkte_vergeben;
      setFeedback(
        geschafft
          ? { zustand: 'freudig', text: `${zufaelligerSpruch(FREUDIG_SPRUECHE)} +${punkte} Punkte` }
          : { zustand: 'aufmunternd', text: zufaelligerSpruch(AUFMUNTERN_SPRUECHE) }
      );

      const feierMeldungen: string[] = [];
      if (data.level_aufstieg) {
        feierMeldungen.push(`Level-Aufstieg! Du bist jetzt Level ${data.neues_level}! 🎉`);
        // In-App-Fallback (Phase 7): erscheint immer, sobald die App offen ist –
        // unabhaengig davon, ob Web Push erlaubt/verfuegbar ist.
        showToast({
          icon: '🎉',
          title: 'Level-Aufstieg!',
          body: `Du bist jetzt Level ${data.neues_level}.`,
        });
        void sendeGamificationPush({
          title: 'Level-Aufstieg! 🎉',
          body: `Du bist jetzt Level ${data.neues_level}.`,
        });
      }
      for (const badge of data.neue_badges) {
        feierMeldungen.push(`Neuer Badge: ${badge.icon ?? '🏅'} ${badge.name}!`);
        showToast({
          icon: badge.icon ?? '🏅',
          title: 'Neuer Badge erreicht!',
          body: badge.name,
        });
        void sendeGamificationPush({
          title: 'Neuer Badge erreicht! 🏅',
          body: badge.name,
        });
      }
      if (feierMeldungen.length > 0) setFeier(feierMeldungen.join(' '));

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
        <span className="tag">
          {KATEGORIE_ICONS[uebung.kategorie]} {KATEGORIE_LABELS[uebung.kategorie]}
        </span>
        <h2>{uebung.titel}</h2>
        {uebung.bild_url && (
          <img
            src={uebung.bild_url}
            alt={uebung.titel}
            style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)', margin: '12px 0' }}
          />
        )}
        <p>{uebung.beschreibung}</p>
      </div>

      {feier && (
        <div className="card maskottchen-celebration">
          <Maskottchen zustand="freudig" size={160} />
          <h2 style={{ margin: 0 }}>{feier}</h2>
        </div>
      )}

      <div className="card">
        <h2>Selbsteinschätzung</h2>
        {error && <div className="alert-error">{error}</div>}
        {feedback && <Maskottchen zustand={feedback.zustand} text={feedback.text} />}

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
          <div key={v.id} className="history-row">
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
