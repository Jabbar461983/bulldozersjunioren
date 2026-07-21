import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Rolle, Team } from '../types/database';

const ROLE_LABELS: Record<Rolle, string> = {
  junior: 'Junior',
  trainer: 'Trainer',
  admin: 'Admin',
};

export function RegisterPage() {
  const { session, signUp } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rolle, setRolle] = useState<Rolle>('junior');
  const [teamId, setTeamId] = useState('');

  const [teams, setTeams] = useState<Team[]>([]);
  const [adminAlreadyExists, setAdminAlreadyExists] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      const [teamsResult, adminExistsResult] = await Promise.all([
        supabase.from('teams').select('*').order('name'),
        supabase.rpc('admin_exists'),
      ]);

      if (teamsResult.data) setTeams(teamsResult.data);
      setAdminAlreadyExists(adminExistsResult.data ?? true);
      setLoadingOptions(false);
    }
    void loadOptions();
  }, []);

  if (session) {
    return <Navigate to="/" replace />;
  }

  const availableRoles: Rolle[] = adminAlreadyExists
    ? ['junior', 'trainer']
    : ['junior', 'trainer', 'admin'];

  const needsTeam = rolle === 'junior' || rolle === 'trainer';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (needsTeam && !teamId) {
      setError('Bitte waehle ein Team aus.');
      return;
    }

    setSubmitting(true);
    try {
      const { needsEmailConfirmation } = await signUp({
        email,
        password,
        name,
        rolle,
        teamId: needsTeam ? teamId : null,
      });

      if (needsEmailConfirmation) {
        setInfo('Fast geschafft! Bitte bestaetige deine E-Mail-Adresse ueber den Link, den wir dir geschickt haben, und melde dich danach an.');
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrierung fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="auth-card">
        <div className="brand">
          <div className="brand-badge">SH</div>
          <div>
            <h1 style={{ fontSize: '1.25rem' }}>Konto erstellen</h1>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}
        {info && <div className="alert-info">{info}</div>}

        {!info && (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="email">E-Mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Passwort</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Rolle</label>
              <div className="radio-group">
                {availableRoles.map((r) => (
                  <label key={r}>
                    <input
                      type="radio"
                      name="rolle"
                      value={r}
                      checked={rolle === r}
                      onChange={() => setRolle(r)}
                    />
                    {ROLE_LABELS[r]}
                  </label>
                ))}
              </div>
              {adminAlreadyExists && (
                <small style={{ color: 'var(--color-text-muted)' }}>
                  Es existiert bereits ein Admin-Konto. Weitere Admins koennen nur von einem
                  bestehenden Admin befoerdert werden.
                </small>
              )}
            </div>

            {needsTeam && (
              <div className="field">
                <label htmlFor="team">Team</label>
                <select
                  id="team"
                  required
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  disabled={loadingOptions}
                >
                  <option value="" disabled>
                    {teams.length === 0 ? 'Noch keine Teams vorhanden' : 'Team waehlen …'}
                  </option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.altersgruppe})
                    </option>
                  ))}
                </select>
                {teams.length === 0 && !loadingOptions && (
                  <small style={{ color: 'var(--color-text-muted)' }}>
                    Noch kein Team angelegt. Ein Admin muss zuerst ein Team erstellen.
                  </small>
                )}
              </div>
            )}

            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Registrieren …' : 'Registrieren'}
            </button>
          </form>
        )}

        <div className="form-footer">
          Schon ein Konto? <Link to="/login">Anmelden</Link>
        </div>
      </div>
    </div>
  );
}
