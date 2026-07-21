import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [uebung, setUebung] = useState<Uebung | null>(null);
  const [verlauf, setVerlauf] = useState<Selbsteinschaetzung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [schritt, setSchritt] = useState<'wahl' | 'gefuehl'>('wahl');
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

  async function submitEinschaetzung(geschafftWert: boolean, sterneWert: number | null) {
    if (!id) return;
    setError(null);
    setFeedback(null);
    setFeier(null);
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('submit_selbsteinschaetzung', {
        p_uebung_id: id,
        p_geschafft: geschafftWert,
        p_gefuehl_sterne: sterneWert,
      });
      if (error) throw error;

      const punkte = data.einschaetzung.punkte_vergeben;
      setFeedback(
        geschafftWert
          ? { zustand: 'freudig', text: `${zufaelligerSpruch(FREUDIG_SPRUECHE)} +${punkte} Punkte` }
          : { zustand: 'aufmunternd', text: zufaelligerSpruch(AUFMUNTERN_SPRUECHE) }
      );

      const feierMeldungen: string[] = [];
      if (data.level_aufstieg) {
        feierMeldungen.push(`Level-Aufstieg! Du bist jetzt Level ${data.neues_level}! 🎉`);
        // In-App-Fallback (Phase 7): erscheint immer, sobald die App offen ist –
        // unabhängig davon, ob Web Push erlaubt/verfügbar ist.
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

      setSterne(null);
      setSchritt('wahl');
      await Promise.all([refreshProfile(), load()]);

      // Kurze Verzögerung, damit das Maskottchen-Feedback noch sichtbar ist,
      // bevor die App zur Übersicht wechselt.
      setTimeout(() => navigate('/junior'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konnte nicht gespeichert werden.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleGeschafftKlick() {
    setError(null);
    setSchritt('gefuehl');
  }

  function handleNichtGeschafftKlick() {
    void submitEinschaetzung(false, null);
  }

  function handleSterneWahl(wert: number) {
    setSterne(wert);
    void submitEinschaetzung(true, wert);
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
          <p>Übung nicht gefunden.</p>
          <Link to="/junior">← Zurück zur Übersicht</Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Link to="/junior">← Zurück zur Übersicht</Link>

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

        {schritt === 'wahl' && (
          <div className="field">
            <label>Hast du es geschafft?</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-primary"
                style={{ flex: 1, width: 'auto' }}
                onClick={handleGeschafftKlick}
                disabled={submitting}
              >
                Geschafft
              </button>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={handleNichtGeschafftKlick}
                disabled={submitting}
              >
                {submitting ? 'Wird gespeichert …' : 'Nicht geschafft'}
              </button>
            </div>
          </div>
        )}

        {schritt === 'gefuehl' && (
          <div className="field">
            <label>Wie hat es sich angefühlt?</label>
            <SterneAuswahl value={sterne} onChange={handleSterneWahl} readOnly={submitting} />
            {submitting && (
              <small style={{ color: 'var(--color-text-muted)' }}>Wird gespeichert …</small>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Mein Verlauf zu dieser Übung</h2>
        {verlauf.length === 0 && <p>Noch keine Einschätzung für diese Übung.</p>}
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
