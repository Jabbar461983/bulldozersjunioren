import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Altersgruppe, Team } from '../types/database';
import { DashboardLayout } from '../components/DashboardLayout';
import { ALTERSGRUPPEN } from '../lib/constants';
import { UebungenManager } from '../components/UebungenManager';
import { FreundeschallengeKonfigurationCard } from '../components/FreundeschallengeKonfigurationCard';
import { NutzerverwaltungManager } from '../components/NutzerverwaltungManager';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PasswortResetAnfragenCard } from '../components/PasswortResetAnfragenCard';

export function AdminHome() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [altersgruppe, setAltersgruppe] = useState<Altersgruppe>('U9');
  const [submitting, setSubmitting] = useState(false);

  const [deleteTeamTarget, setDeleteTeamTarget] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState(false);

  async function loadTeams() {
    setLoading(true);
    const { data, error } = await supabase.from('teams').select('*').order('name');
    if (error) setError(error.message);
    else setTeams(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void loadTeams();
  }, []);

  async function handleCreateTeam(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error } = await supabase.from('teams').insert({ name, altersgruppe });
      if (error) throw error;
      setName('');
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Team konnte nicht erstellt werden.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDeleteTeam() {
    if (!deleteTeamTarget) return;
    setDeletingTeam(true);
    try {
      const { error } = await supabase.from('teams').delete().eq('id', deleteTeamTarget.id);
      if (error) throw error;
      setDeleteTeamTarget(null);
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Team konnte nicht gelöscht werden.');
    } finally {
      setDeletingTeam(false);
    }
  }

  return (
    <DashboardLayout>
      <PasswortResetAnfragenCard />

      <div className="card">
        <h2>Team anlegen</h2>
        {error && <div className="alert-error">{error}</div>}
        <form onSubmit={handleCreateTeam}>
          <div className="field">
            <label htmlFor="team-name">Team-Name</label>
            <input
              id="team-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="team-altersgruppe">Altersgruppe</label>
            <select
              id="team-altersgruppe"
              value={altersgruppe}
              onChange={(e) => setAltersgruppe(e.target.value as Altersgruppe)}
            >
              {ALTERSGRUPPEN.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Wird angelegt …' : 'Team anlegen'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Teams</h2>
        {loading && <p>Wird geladen …</p>}
        {!loading && teams.length === 0 && <p>Noch keine Teams vorhanden.</p>}
        {!loading && teams.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {teams.map((team) => (
              <li
                key={team.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--color-border)',
                  gap: 10,
                }}
              >
                <img
                  src="/logo-bulldozers_farbig.png"
                  alt=""
                  style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 8 }}
                />
                <span style={{ flex: 1 }}>{team.name}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>{team.altersgruppe}</span>
                <button className="btn-danger" onClick={() => setDeleteTeamTarget(team)}>
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <UebungenManager />

      <FreundeschallengeKonfigurationCard />

      <NutzerverwaltungManager teams={teams} />

      <ConfirmDialog
        open={deleteTeamTarget !== null}
        title="Team löschen?"
        message={`Möchtest du "${deleteTeamTarget?.name}" wirklich unwiderruflich löschen? Mitglieder dieses Teams verlieren dadurch ihre Team-Zugehörigkeit und müssen einem neuen Team zugewiesen werden.`}
        busy={deletingTeam}
        onConfirm={handleConfirmDeleteTeam}
        onCancel={() => setDeleteTeamTarget(null)}
      />
    </DashboardLayout>
  );
}
