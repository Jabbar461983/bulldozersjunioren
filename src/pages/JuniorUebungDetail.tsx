import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { HerzenAuswahl } from '../components/HerzenAuswahl';
import { KategorieIcon, OrtIcon } from '../components/icons';
import { Maskottchen } from '../components/Maskottchen';
import { UebungTimer } from '../components/UebungTimer';
import { KATEGORIE_LABELS, ORT_LABELS } from '../lib/constants';
import { sendeFreundeschallengePush, sendeGamificationPush } from '../lib/push';
import { parseUebungTimerSekunden } from '../lib/uebungTimer';
import type { Selbsteinschaetzung, Uebung } from '../types/database';

// Zwischenscreen nach einer Selbsteinschätzung: ersetzt die Wie-cool-/
// Selbsteinschätzung-Karten kurz durch eine einzige Ergebnis-Meldung, bevor
// automatisch zur Übersicht gewechselt wird.
interface Ergebnis {
  geschafft: boolean;
  punkte: number;
  feierMeldungen: string[];
}

export function JuniorUebungDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, team, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [uebung, setUebung] = useState<Uebung | null>(null);
  const [verlauf, setVerlauf] = useState<Selbsteinschaetzung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);

  const [meineBewertung, setMeineBewertung] = useState<number | null>(null);
  const [bewertungSpeichern, setBewertungSpeichern] = useState(false);
  const [bewertungError, setBewertungError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !profile) return;
    setLoading(true);
    setError(null);

    const [uebungResult, verlaufResult, bewertungResult] = await Promise.all([
      supabase.from('uebungen').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('selbsteinschaetzungen')
        .select('*')
        .eq('uebung_id', id)
        .eq('junior_id', profile.id)
        .order('datum', { ascending: false }),
      supabase
        .from('uebung_bewertungen')
        .select('*')
        .eq('uebung_id', id)
        .eq('junior_id', profile.id)
        .maybeSingle(),
    ]);

    if (uebungResult.error) setError(uebungResult.error.message);
    else setUebung(uebungResult.data);

    if (verlaufResult.error) setError(verlaufResult.error.message);
    else setVerlauf(verlaufResult.data ?? []);

    if (!bewertungResult.error) setMeineBewertung(bewertungResult.data?.herzen ?? null);

    setLoading(false);
  }, [id, profile]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitEinschaetzung(geschafftWert: boolean, sterneWert: number | null) {
    if (!id) return;
    setError(null);
    setErgebnis(null);
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('submit_selbsteinschaetzung', {
        p_uebung_id: id,
        p_geschafft: geschafftWert,
        p_gefuehl_sterne: sterneWert,
      });
      if (error) throw error;

      const punkte = data.einschaetzung.punkte_vergeben;
      const feierMeldungen: string[] = [];
      if (data.level_aufstieg) {
        feierMeldungen.push(`Level-Aufstieg! Du bist jetzt Level ${data.neues_level}!`);
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
      if (data.freundeschallenge_status === 'erfolgreich') {
        const gegnerName = `${data.freundeschallenge_gegner_vorname} ${data.freundeschallenge_gegner_nachname_initiale}.`;
        feierMeldungen.push(
          `Freundeschallenge mit ${gegnerName} geschafft! +${data.freundeschallenge_punkte} Punkte`
        );
        showToast({
          icon: '🤝',
          title: 'Freundeschallenge geschafft!',
          body: `Mit ${gegnerName} – +${data.freundeschallenge_punkte} Punkte.`,
        });
        void sendeGamificationPush({
          title: 'Freundeschallenge geschafft! 🤝',
          body: `Mit ${gegnerName} – +${data.freundeschallenge_punkte} Punkte.`,
        });
        if (data.freundeschallenge_gegner_id) {
          void sendeFreundeschallengePush(data.freundeschallenge_gegner_id, {
            title: 'Freundeschallenge geschafft! 🤝',
            body: `Ihr habt es gemeinsam geschafft – +${data.freundeschallenge_punkte} Punkte.`,
          });
        }
      } else if (data.freundeschallenge_status === 'gescheitert') {
        const gegnerName = `${data.freundeschallenge_gegner_vorname} ${data.freundeschallenge_gegner_nachname_initiale}.`;
        showToast({
          icon: '🤝',
          title: 'Freundeschallenge beendet',
          body: `Leider ohne Punkte – mit ${gegnerName}.`,
        });
        if (data.freundeschallenge_gegner_id) {
          void sendeFreundeschallengePush(data.freundeschallenge_gegner_id, {
            title: 'Freundeschallenge beendet',
            body: 'Leider ohne Punkte – nächstes Mal klappt’s wieder!',
          });
        }
      }

      setErgebnis({ geschafft: geschafftWert, punkte, feierMeldungen });

      await Promise.all([refreshProfile(), load()]);

      // Kurze Verzögerung, damit der Zwischenscreen noch sichtbar ist, bevor
      // die App zur Übersicht wechselt.
      setTimeout(() => navigate('/junior'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konnte nicht gespeichert werden.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleGeschafftKlick() {
    void submitEinschaetzung(true, null);
  }

  function handleNichtGeschafftKlick() {
    void submitEinschaetzung(false, null);
  }

  const heute = new Date().toISOString().slice(0, 10);
  const heutigeAnzahl = verlauf.filter((v) => v.datum === heute).length;
  const limitErreicht = heutigeAnzahl >= 3;

  async function handleBewertung(wert: number) {
    if (!id) return;
    const vorherigeBewertung = meineBewertung;
    setBewertungError(null);
    setMeineBewertung(wert);
    setBewertungSpeichern(true);

    const { error } = await supabase.rpc('bewerte_uebung', {
      p_uebung_id: id,
      p_herzen: wert,
    });
    if (error) {
      setMeineBewertung(vorherigeBewertung);
      setBewertungError(error.message);
    }
    setBewertungSpeichern(false);
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
          <Link to="/junior" className="back-link">← Zurück</Link>
        </div>
      </DashboardLayout>
    );
  }

  const timerSekunden = parseUebungTimerSekunden(uebung.beschreibung, team?.altersgruppe);

  return (
    <DashboardLayout>
      <div className="uebung-hero">
        <Link to="/junior" className="back-link back-link--on-dark" style={{ marginBottom: 0 }}>
          ← {KATEGORIE_LABELS[uebung.kategorie]}
        </Link>

        <div style={{ textAlign: 'center', marginTop: 22 }}>
          <span style={{ display: 'inline-flex', color: 'var(--bd-gold-300)' }}>
            <KategorieIcon kategorie={uebung.kategorie} size={44} />
          </span>
          <h2
            style={{
              fontSize: '1.625rem',
              lineHeight: 1.2,
              margin: '12px 0 0',
              color: '#fff',
            }}
          >
            {uebung.titel}
          </h2>
          {uebung.bild_url && (
            <img
              src={uebung.bild_url}
              alt={uebung.titel}
              style={{ maxWidth: '100%', borderRadius: 'var(--radius-lg)', margin: '12px 0 0' }}
            />
          )}
          <p style={{ fontSize: '0.9375rem', lineHeight: 1.5, color: 'var(--bd-green-100)', margin: '10px 0 0' }}>
            {uebung.beschreibung}
          </p>
        </div>

        {uebung.orte.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            {uebung.orte.map((o) => (
              <span key={o} className="hero-chip">
                <OrtIcon ort={o} size={16} />
                {ORT_LABELS[o]}
              </span>
            ))}
          </div>
        )}

        {timerSekunden !== null && (
          <UebungTimer sekunden={timerSekunden} altersgruppeLabel={team?.altersgruppe ?? ''} />
        )}
      </div>

      {ergebnis ? (
        <div className="card maskottchen-celebration">
          <Maskottchen zustand={ergebnis.geschafft ? 'freudig' : 'aufmunternd'} size={160} />
          <h2 style={{ margin: 0 }}>
            {ergebnis.geschafft
              ? `Super, du hast ${ergebnis.punkte} Punkte dazu gesammelt`
              : 'Schade, probiere es weiter, beim nächsten Versuch wird es klappen'}
          </h2>
          {ergebnis.feierMeldungen.map((meldung, i) => (
            <p key={i} style={{ margin: '8px 0 0' }}>
              {meldung}
            </p>
          ))}
        </div>
      ) : (
        <>
          <div className="card">
            <h2>Wie cool findest du diese Übung?</h2>
            {bewertungError && <div className="alert-error">{bewertungError}</div>}
            <div className="field">
              <HerzenAuswahl
                value={meineBewertung}
                onChange={(wert) => void handleBewertung(wert)}
                readOnly={bewertungSpeichern}
              />
              {bewertungSpeichern && (
                <small style={{ color: 'var(--color-text-muted)' }}>Wird gespeichert …</small>
              )}
            </div>
          </div>

          <div className="card">
            <h2>Selbsteinschätzung</h2>
            {error && <div className="alert-error">{error}</div>}

            {limitErreicht ? (
              <p>Du hast diese Übung heute schon 3x eingeschätzt. Morgen geht’s weiter!</p>
            ) : (
              <div className="field">
                <label>{timerSekunden !== null ? 'Nach dem Timer' : 'Hast du es geschafft?'}</label>
                <div className="fairplay-note">
                  Fairplay ist Ehrensache: tippe nur «Geschafft», wenn du die Übung auch wirklich
                  gemacht hast.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    className="btn-primary"
                    onClick={handleGeschafftKlick}
                    disabled={submitting}
                  >
                    {submitting ? 'Wird gespeichert …' : 'Geschafft'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={handleNichtGeschafftKlick}
                    disabled={submitting}
                  >
                    {submitting ? 'Wird gespeichert …' : 'Noch nicht'}
                  </button>
                </div>
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
                <span style={{ color: 'var(--color-text-muted)' }}>+{v.punkte_vergeben} Pkt.</span>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
