import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Team } from '../types/database';

export function RegisterPage() {
  const { session, signUp } = useAuth();
  const navigate = useNavigate();

  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordWiederholen, setPasswordWiederholen] = useState('');
  const [teamId, setTeamId] = useState('');

  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadTeams() {
      const { data } = await supabase.from('teams').select('*').order('name');
      setTeams(data ?? []);
      setLoadingOptions(false);
    }
    void loadTeams();
  }, []);

  if (session) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!teamId) {
      setError('Bitte wähle ein Team aus.');
      return;
    }

    if (password !== passwordWiederholen) {
      setError('Die beiden Passwörter stimmen nicht überein.');
      return;
    }

    setSubmitting(true);
    try {
      const { needsEmailConfirmation } = await signUp({
        email,
        password,
        vorname,
        nachname,
        rolle: 'junior',
        teamId,
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
      <div className="auth-card auth-card--split">
        <div className="auth-hero">
          <img src="/logo-bulldozers_farbig.png" alt="" className="auth-hero-logo" />
          <h1 className="auth-hero-title" style={{ fontSize: '1.5rem' }}>
            Konto erstellen
          </h1>
          <p className="auth-hero-claim">Trainiere zuhause, sammle Punkte, steig im Level auf.</p>
        </div>

        <div className="auth-form-zone">
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
                <label htmlFor="password-wiederholen">Passwort wiederholen</label>
                <input
                  id="password-wiederholen"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={passwordWiederholen}
                  onChange={(e) => setPasswordWiederholen(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="team">Team</label>
                <select
                  id="team"
                  required
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  disabled={loadingOptions || teams.length === 0}
                >
                  <option value="" disabled>
                    {teams.length === 0 ? 'Keine Teams vorhanden' : 'Team wählen …'}
                  </option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.altersgruppe})
                    </option>
                  ))}
                </select>
                {teams.length === 0 && !loadingOptions && (
                  <small style={{ color: 'var(--color-text-muted)' }}>
                    Noch keine Teams angelegt. Ein Admin muss zuerst ein Team erstellen.
                  </small>
                )}
              </div>

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
    </div>
  );
}
