import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { DashboardLayout } from '../components/DashboardLayout';
import { Maskottchen } from '../components/Maskottchen';
import { PushOnboarding } from '../components/PushOnboarding';
import { RanglisteCard } from '../components/RanglisteCard';
import { KATEGORIE_ICONS, KATEGORIE_LABELS, KATEGORIEN } from '../lib/constants';
import { effektiverTagesStreak, levelFortschritt } from '../lib/gamification';
import type { Uebung, UebungKategorie } from '../types/database';

const BEGRUESSUNGEN = [
  'Bereit für dein Training?',
  'Schön, dich zu sehen!',
  'Auf geht’s, zeig was du kannst!',
  'Lust auf eine Übung?',
];

export function JuniorHome() {
  const { profile } = useAuth();
  const [begruessung] = useState(
    () => BEGRUESSUNGEN[Math.floor(Math.random() * BEGRUESSUNGEN.length)]
  );

  const [uebungen, setUebungen] = useState<Uebung[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterKategorie, setFilterKategorie] = useState<UebungKategorie | ''>('');

  const loadUebungen = useCallback(async () => {
    if (!filterKategorie) {
      setUebungen([]);
      return;
    }
    setLoading(true);
    setError(null);

    // RLS beschränkt das Ergebnis bereits automatisch auf die Altersgruppe
    // des eigenen Teams (siehe uebungen_select_own_altersgruppe-Policy).
    const { data, error } = await supabase
      .from('uebungen')
      .select('*')
      .eq('kategorie', filterKategorie)
      .order('titel', { ascending: true });

    if (error) setError(error.message);
    else setUebungen(data ?? []);
    setLoading(false);
  }, [filterKategorie]);

  useEffect(() => {
    void loadUebungen();
  }, [loadUebungen]);

  const fortschritt = levelFortschritt(profile?.punkte_total ?? 0);
  const tagesStreak = profile
    ? effektiverTagesStreak(profile.streak_counter, profile.streak_letzte_aktivitaet)
    : 0;

  return (
    <DashboardLayout>
      <div className="card">
        <Maskottchen zustand="neutral" text={`Hallo ${profile?.vorname ?? ''}! ${begruessung}`} />
      </div>

      <PushOnboarding />

      <div className="card">
        <h2>Level {fortschritt.level}</h2>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${fortschritt.prozent}%` }} />
        </div>
        <p style={{ marginTop: 8 }}>
          {profile?.punkte_total ?? 0} Punkte · noch {fortschritt.punkteBisNaechstesLevel} bis
          Level {fortschritt.level + 1}
        </p>
        <span className="streak-badge">🔥 {tagesStreak} Tage in Folge</span>
        <div className="level-actions">
          <Link to="/junior/profil" className="btn-level">
            🏅 Mein Profil & Badges
          </Link>
          <Link to="/junior/verlauf" className="btn-level">
            📜 Mein Verlauf
          </Link>
          <Link to="/junior/freundeschallenge" className="btn-level">
            🤝 Freundeschallenge
          </Link>
        </div>
      </div>

      <RanglisteCard />

      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0 }}>Übung starten</h2>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <div className="kategorie-grid">
          {KATEGORIEN.map((k) => (
            <button
              key={k}
              type="button"
              className={`btn-kategorie${filterKategorie === k ? ' btn-kategorie-active' : ''}`}
              onClick={() => setFilterKategorie(filterKategorie === k ? '' : k)}
            >
              <span className="kategorie-icon">{KATEGORIE_ICONS[k]}</span>
              {KATEGORIE_LABELS[k]}
            </button>
          ))}
        </div>

        {!filterKategorie && <p>Wähle eine Kategorie, um passende Übungen zu sehen.</p>}

        {filterKategorie && loading && <p>Wird geladen …</p>}
        {filterKategorie && !loading && uebungen.length === 0 && (
          <p>Keine Übungen für deine Altersgruppe gefunden.</p>
        )}

        {filterKategorie &&
          !loading &&
          uebungen.map((u) => (
            <Link key={u.id} to={`/junior/uebungen/${u.id}`} className="touch-row">
              <span style={{ fontWeight: 700 }}>
                <span className="kategorie-icon">{KATEGORIE_ICONS[u.kategorie]}</span>
                {u.titel}
              </span>
              <span className="tag">{KATEGORIE_LABELS[u.kategorie]}</span>
            </Link>
          ))}
      </div>
    </DashboardLayout>
  );
}
