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
        data?.message ?? 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Admin benachrichtigt.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anfrage konnte nicht gesendet werden.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="auth-card">
        <div className="brand">
          <img src="/logo-bulldozers_farbig.png" alt="" className="brand-logo" />
          <div>
            <h1 style={{ fontSize: '1.25rem' }}>Passwort vergessen</h1>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}
        {info && <div className="alert-info">{info}</div>}

        {!info && (
          <form onSubmit={handleSubmit}>
            <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>
              Gib deine E-Mail-Adresse ein. Ein Admin wird benachrichtigt und setzt dir ein neues
              Passwort, das er dir auf anderem Weg mitteilt (z. B. persönlich im Training).
            </p>
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
  );
}
