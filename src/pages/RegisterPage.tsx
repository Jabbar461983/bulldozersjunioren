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

  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rolle, setRolle] = useState<Rolle>('junior');
  const [altersgruppe, setAltersgruppe] = useState<string>('');
  const [teamId, setTeamId] = useState('');

  const [teams, setTeams] = useState<Team[]>([]);
  const [adminAlreadyExists, setAdminAlreadyExists] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const ALTERSGRUPPEN = ['U9', 'U12', 'U15', 'U18'] as const;

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
  const filteredTeams = altersgruppe
    ? teams.filter((t) => t.altersgruppe === altersgruppe)
    : [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (needsTeam && !altersgruppe) {
      setError('Bitte wähle deine Altersgruppe aus.');
      return;
    }

    if (needsTeam && !teamId) {
      setError('Bitte wähle ein Team aus.');
      return;
    }

    setSubmitting(true);
    try {
      const { needsEmailConfirmation } = await signUp({
        email,
        password,
        vorname,
        nachname,
        rolle,
        teamId: needsTeam ? teamId : null,
      });

      if (needsEmailConfirmation) {
        setInfo('Fast geschafft! Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben, und melde dich danach an.');
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
          <img
            src="/logo-bulldozers_farbig.png"
            alt="Streethockeyclub Bulldozers"
            className="brand-logo"
          />
          <div>
            <h1 style={{ fontSize: '1.25rem' }}>Konto erstellen</h1>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}
        {info && <div className="alert-info">{info}</div>}

        {!info && (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="vorname">Vorname</label>
              <input
                id="vorname"
                type="text"
                required
                value={vorname}
                onChange={(e) => setVorname(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="nachname">Nachname</label>
              <input
                id="nachname"
                type="text"
                required
                value={nachname}
                onChange={(e) => setNachname(e.target.value)}
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
                  Es existiert bereits ein Admin-Konto. Weitere Admins können nur von einem
                  bestehenden Admin befördert werden.
                </small>
              )}
            </div>

            {needsTeam && (
              <>
                <div className="field">
                  <label>Altersgruppe</label>
                  <div className="radio-group">
                    {ALTERSGRUPPEN.map((ag) => (
                      <label key={ag}>
                        <input
                          type="radio"
                          name="altersgruppe"
                          value={ag}
                          checked={altersgruppe === ag}
                          onChange={(e) => {
                            setAltersgruppe(e.target.value);
                            setTeamId('');
                          }}
                        />
                        {ag}
                      </label>
                    ))}
                  </div>
                </div>

                {altersgruppe && (
                  <div className="field">
                    <label htmlFor="team">Team</label>
                    <select
                      id="team"
                      required
                      value={teamId}
                      onChange={(e) => setTeamId(e.target.value)}
                      disabled={loadingOptions || filteredTeams.length === 0}
                    >
                      <option value="" disabled>
                        {filteredTeams.length === 0
                          ? 'Keine Teams für diese Altersgruppe'
                          : 'Team wählen …'}
                      </option>
                      {filteredTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                    {filteredTeams.length === 0 && !loadingOptions && (
                      <small style={{ color: 'var(--color-text-muted)' }}>
                        Keine Teams für {altersgruppe} angelegt. Ein Admin muss zuerst ein Team
                        erstellen.
                      </small>
                    )}
                  </div>
                )}
              </>
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
