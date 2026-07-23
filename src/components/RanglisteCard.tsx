import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { KATEGORIE_LABELS, KATEGORIEN } from '../lib/constants';
import type { RanglisteEintrag, Team, TeamRanglisteEintrag, UebungKategorie } from '../types/database';

type Ansicht = 'junioren' | 'teams';

export function RanglisteCard() {
  const { profile } = useAuth();

  const [ansicht, setAnsicht] = useState<Ansicht>('junioren');
  const [teams, setTeams] = useState<Team[]>([]);

  const [filterTeam, setFilterTeam] = useState('');
  const [eintraege, setEintraege] = useState<RanglisteEintrag[]>([]);

  const [filterKategorie, setFilterKategorie] = useState<UebungKategorie | ''>('');
  const [teamEintraege, setTeamEintraege] = useState<TeamRanglisteEintrag[]>([]);

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

  const loadTeamRangliste = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.rpc('team_rangliste', {
      p_kategorie: filterKategorie || null,
    });
    if (error) setError(error.message);
    else setTeamEintraege(data ?? []);
    setLoading(false);
  }, [filterKategorie]);

  useEffect(() => {
    if (ansicht === 'junioren') void loadRangliste();
    else void loadTeamRangliste();
  }, [ansicht, loadRangliste, loadTeamRangliste]);

  return (
    <div className="card">
      <h2>🏆 Rangliste</h2>
      {error && <div className="alert-error">{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          className={ansicht === 'junioren' ? 'btn-primary' : 'btn-secondary'}
          style={{ flex: 1, width: 'auto' }}
          onClick={() => setAnsicht('junioren')}
        >
          Junioren
        </button>
        <button
          type="button"
          className={ansicht === 'teams' ? 'btn-primary' : 'btn-secondary'}
          style={{ flex: 1, width: 'auto' }}
          onClick={() => setAnsicht('teams')}
        >
          Teams
        </button>
      </div>

      {ansicht === 'junioren' && (
        <>
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
        </>
      )}

      {ansicht === 'teams' && (
        <>
          <div className="filter-bar">
            <div className="field">
              <label htmlFor="rangliste-kategorie">Kategorie</label>
              <select
                id="rangliste-kategorie"
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
          {!loading && teamEintraege.length === 0 && <p>Noch keine Teams vorhanden.</p>}

          {!loading &&
            teamEintraege.map((eintrag, index) => {
              const istEigenesTeam = eintrag.team_id === profile?.team_id;
              return (
                <div
                  key={eintrag.team_id}
                  className="history-row"
                  style={{ fontWeight: istEigenesTeam ? 800 : 400 }}
                >
                  <span>
                    {index + 1}. {eintrag.team_name}
                    {istEigenesTeam && ' (Dein Team)'}
                  </span>
                  <span className="tag">{eintrag.altersgruppe}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {eintrag.punkte_total} Pkt.
                  </span>
                </div>
              );
            })}
        </>
      )}
    </div>
  );
}
