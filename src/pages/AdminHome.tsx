import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Altersgruppe, Team } from '../types/database';
import { DashboardLayout } from '../components/DashboardLayout';
import { ALTERSGRUPPEN } from '../lib/constants';
import { UebungenManager } from '../components/UebungenManager';
import { TeamBrandingForm } from '../components/TeamBrandingForm';

export function AdminHome() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [altersgruppe, setAltersgruppe] = useState<Altersgruppe>('U9');
  const [submitting, setSubmitting] = useState(false);

  const [brandingTeam, setBrandingTeam] = useState<Team | null>(null);

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

  return (
    <DashboardLayout>
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

      {brandingTeam && (
        <TeamBrandingForm
          team={brandingTeam}
          onCancel={() => setBrandingTeam(null)}
          onSaved={(updated) => {
            setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            setBrandingTeam(null);
          }}
        />
      )}

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
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt=""
                    style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 8 }}
                  />
                ) : (
                  <span style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    🏒
                  </span>
                )}
                <span style={{ flex: 1 }}>{team.name}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>{team.altersgruppe}</span>
                <button className="btn-secondary" onClick={() => setBrandingTeam(team)}>
                  Branding
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <UebungenManager />

      <div className="card">
        <h2>Nutzerverwaltung</h2>
        <p>Hier erscheint bald die Verwaltung aller Nutzer.</p>
      </div>
    </DashboardLayout>
  );
}
