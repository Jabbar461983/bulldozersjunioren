import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Trophy } from './icons';
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

  // Rangliste zeigt standardmässig das eigene Team an, statt aller Teams –
  // erst nach dem Laden des Profils bekannt, daher per Effekt statt direkt im
  // useState-Initialwert gesetzt. Läuft nur einmal (pro Team-Wechsel), ein
  // späterer manueller Wechsel des Filters wird dadurch nicht überschrieben.
  useEffect(() => {
    if (profile?.team_id) setFilterTeam(profile.team_id);
  }, [profile?.team_id]);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ display: 'flex', color: 'var(--bd-gold-600)' }}>
          <Trophy size={20} strokeWidth={2} aria-hidden="true" />
        </span>
        <h2 style={{ margin: 0 }}>Rangliste</h2>
      </div>
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
                  style={
                    istEigeneZeile
                      ? { fontWeight: 700, background: 'var(--bd-green-100)', margin: '0 -4px', padding: '13px 8px' }
                      : { fontWeight: 400 }
                  }
                >
                  <span style={istEigeneZeile ? { color: 'var(--color-primary-hover)' } : undefined}>
                    {index + 1}. {eintrag.vorname} {eintrag.nachname_initiale}.
                    {istEigeneZeile && ' · DU'}
                  </span>
                  {!filterTeam && eintrag.team_name && (
                    <span className="tag">{eintrag.team_name}</span>
                  )}
                  <span
                    style={{
                      color: istEigeneZeile ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
                      fontWeight: 700,
                    }}
                  >
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
                  style={
                    istEigenesTeam
                      ? { fontWeight: 700, background: 'var(--bd-green-100)', margin: '0 -4px', padding: '13px 8px' }
                      : { fontWeight: 400 }
                  }
                >
                  <span style={istEigenesTeam ? { color: 'var(--color-primary-hover)' } : undefined}>
                    {index + 1}. {eintrag.team_name}
                    {istEigenesTeam && ' · DEIN TEAM'}
                  </span>
                  <span className="tag">{eintrag.altersgruppe}</span>
                  <span
                    style={{
                      color: istEigenesTeam ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
                      fontWeight: 700,
                    }}
                  >
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
