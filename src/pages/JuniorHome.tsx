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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterKategorie, setFilterKategorie] = useState<UebungKategorie | ''>('');

  const loadUebungen = useCallback(async () => {
    setLoading(true);
    setError(null);

    // RLS beschraenkt das Ergebnis bereits automatisch auf die Altersgruppe
    // des eigenen Teams (siehe uebungen_select_own_altersgruppe-Policy).
    let query = supabase
      .from('uebungen')
      .select('*')
      .order('kategorie', { ascending: true })
      .order('titel', { ascending: true });

    if (filterKategorie) query = query.eq('kategorie', filterKategorie);

    const { data, error } = await query;
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
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          <Link to="/junior/profil">Mein Profil & Badges →</Link>
          <Link to="/junior/verlauf">Mein Verlauf →</Link>
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
          <h2 style={{ margin: 0 }}>Uebungen</h2>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <div className="filter-bar">
          <div className="field">
            <label htmlFor="filter-kategorie">Kategorie</label>
            <select
              id="filter-kategorie"
              value={filterKategorie}
              onChange={(e) => setFilterKategorie(e.target.value as UebungKategorie | '')}
            >
              <option value="">Alle Kategorien</option>
              {KATEGORIEN.map((k) => (
                <option key={k} value={k}>
                  {KATEGORIE_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p>Wird geladen …</p>}
        {!loading && uebungen.length === 0 && (
          <p>Keine Uebungen fuer deine Altersgruppe gefunden.</p>
        )}

        {!loading &&
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
