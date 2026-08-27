import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { leseEdgeFunctionFehler } from '../lib/functionsError';

export function PasswortVergessenPage() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [info, setInfo] = useState<string | null>(null);
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
      const { data, error } = await supabase.functions.invoke('passwort-reset-anfragen', {
        body: { email: email.trim() },
      });
      if (error) {
        throw new Error(await leseEdgeFunctionFehler(error, 'Anfrage konnte nicht gesendet werden.'));
      }
      setInfo(
        data?.message ??
          'Falls ein Konto mit dieser E-Mail existiert, wurde ein Admin benachrichtigt und schickt dir dein neues Passwort per E-Mail zu.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anfrage konnte nicht gesendet werden.');
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
            Passwort vergessen
          </h1>
          <p className="auth-hero-claim">
            Ein Admin wird benachrichtigt und schickt dir dein neues Passwort per E-Mail zu.
          </p>
        </div>

        <div className="auth-form-zone">
          {error && <div className="alert-error">{error}</div>}
          {info && <div className="alert-info">{info}</div>}

          {!info && (
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
              <button className="btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Wird gesendet …' : 'Admin benachrichtigen'}
              </button>
            </form>
          )}

          <div className="form-footer">
            <Link to="/login">Zurück zur Anmeldung</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
