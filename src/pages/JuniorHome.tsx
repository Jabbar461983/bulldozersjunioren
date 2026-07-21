import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { DashboardLayout } from '../components/DashboardLayout';
import { KATEGORIE_LABELS, KATEGORIEN } from '../lib/constants';
import type { Uebung, UebungKategorie } from '../types/database';

export function JuniorHome() {
  const { profile } = useAuth();

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

  return (
    <DashboardLayout>
      <div className="card">
        <h2>Meine Statistik</h2>
        <p>Punkte gesamt: {profile?.punkte_total ?? 0}</p>
        <p>Level: {profile?.level_aktuell ?? 1}</p>
        <p>Streak: {profile?.streak_counter ?? 0} Tage</p>
        <Link to="/junior/verlauf">Meinen Verlauf ansehen →</Link>
      </div>

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
            <Link
              key={u.id}
              to={`/junior/uebungen/${u.id}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid var(--color-border)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <span>{u.titel}</span>
              <span className="tag">{KATEGORIE_LABELS[u.kategorie]}</span>
            </Link>
          ))}
      </div>
    </DashboardLayout>
  );
}
