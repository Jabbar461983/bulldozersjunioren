import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { RanglisteEintrag, Team } from '../types/database';

export function RanglisteCard() {
  const { profile } = useAuth();

  const [teams, setTeams] = useState<Team[]>([]);
  const [filterTeam, setFilterTeam] = useState('');
  const [eintraege, setEintraege] = useState<RanglisteEintrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTeams() {
      const { data } = await supabase.from('teams').select('*').order('name');
      setTeams(data ?? []);
    }
    void loadTeams();
  }, []);

  const loadRangliste = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.rpc('rangliste', {
      p_team_id: filterTeam || null,
    });
    if (error) setError(error.message);
    else setEintraege(data ?? []);
    setLoading(false);
  }, [filterTeam]);

  useEffect(() => {
    void loadRangliste();
  }, [loadRangliste]);

  return (
    <div className="card">
      <h2>🏆 Rangliste</h2>
      {error && <div className="alert-error">{error}</div>}

      <div className="filter-bar">
        <div className="field">
          <label htmlFor="rangliste-team">Team</label>
          <select
            id="rangliste-team"
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
          >
            <option value="">Alle Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p>Wird geladen …</p>}
      {!loading && eintraege.length === 0 && <p>Noch keine Junioren in der Rangliste.</p>}

      {!loading &&
        eintraege.map((eintrag, index) => {
          const istEigeneZeile = eintrag.id === profile?.id;
          return (
            <div
              key={eintrag.id}
              className="history-row"
              style={{ fontWeight: istEigeneZeile ? 800 : 400 }}
            >
              <span>
                {index + 1}. {eintrag.vorname} {eintrag.nachname_initiale}.
                {istEigeneZeile && ' (Du)'}
              </span>
              {!filterTeam && eintrag.team_name && (
                <span className="tag">{eintrag.team_name}</span>
              )}
              <span style={{ color: 'var(--color-text-muted)' }}>
                {eintrag.punkte_total} Pkt. · Level {eintrag.level_aktuell}
              </span>
            </div>
          );
        })}
    </div>
  );
}
