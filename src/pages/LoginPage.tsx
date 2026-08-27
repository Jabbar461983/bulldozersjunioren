import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="auth-card auth-card--split">
        <div className="auth-hero">
          <img
            src="/logo-bulldozers_farbig.png"
            alt="Streethockeyclub Bulldozers"
            className="auth-hero-logo"
          />
          <div className="auth-hero-eyebrow">SHC Bulldozers Kernenried – Zauggenried</div>
          <h1 className="auth-hero-title">
            Junioren
            <br />
            Training
          </h1>
          <p className="auth-hero-claim">Trainiere zuhause, sammle Punkte, steig im Level auf.</p>
        </div>

        <div className="auth-form-zone">
          {error && <div className="alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Anmelden …' : 'Anmelden'}
            </button>
          </form>

          <div className="form-footer">
            Noch kein Konto? <Link to="/register">Jetzt registrieren</Link>
            <br />
            <Link to="/passwort-vergessen">Passwort vergessen?</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
