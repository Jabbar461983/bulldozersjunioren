import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { leseEdgeFunctionFehler } from '../lib/functionsError';
import { PasswortEmailDialog } from './PasswortEmailDialog';
import type { Rolle, Team, User } from '../types/database';

const ROLE_LABELS: Record<Rolle, string> = {
  junior: 'Junior',
  admin: 'Admin',
};

const ROLLEN: Rolle[] = ['junior', 'admin'];

interface NutzerFormProps {
  initial: User | null;
  teams: Team[];
  onSaved: () => void;
  onCancel: () => void;
}

export function NutzerForm({ initial, teams, onSaved, onCancel }: NutzerFormProps) {
  const [vorname, setVorname] = useState(initial?.vorname ?? '');
  const [nachname, setNachname] = useState(initial?.nachname ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rolle, setRolle] = useState<Rolle>(initial?.rolle ?? 'junior');
  const [teamId, setTeamId] = useState(initial?.team_id ?? '');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [neuesPasswort, setNeuesPasswort] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [gesetztesPasswort, setGesetztesPasswort] = useState<string | null>(null);

  const needsTeam = rolle === 'junior';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!vorname.trim() || !nachname.trim()) {
      setError('Bitte Vorname und Nachname angeben.');
      return;
    }
    if (needsTeam && !teamId) {
      setError('Bitte ein Team auswählen.');
      return;
    }
    if (!initial && (!email.trim() || !password)) {
      setError('Bitte E-Mail und Passwort angeben.');
      return;
    }
    if (!initial && password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    setSubmitting(true);
    try {
      if (initial) {
        const { error } = await supabase
          .from('users')
          .update({
            vorname: vorname.trim(),
            nachname: nachname.trim(),
            rolle,
            team_id: needsTeam ? teamId : null,
          })
          .eq('id', initial.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.functions.invoke('admin-user-management', {
          body: {
            action: 'create',
            vorname: vorname.trim(),
            nachname: nachname.trim(),
            email: email.trim(),
            password,
            rolle,
            team_id: needsTeam ? teamId : null,
          },
        });
        if (error) {
          throw new Error(await leseEdgeFunctionFehler(error, 'Nutzer konnte nicht angelegt werden.'));
        }
        if (data?.error) throw new Error(data.error);
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nutzer konnte nicht gespeichert werden.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswortSetzen() {
    if (!initial) return;
    setResetError(null);

    if (neuesPasswort.length < 6) {
      setResetError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    setResetSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: { action: 'reset-password', user_id: initial.id, password: neuesPasswort },
      });
      if (error) {
        throw new Error(await leseEdgeFunctionFehler(error, 'Passwort konnte nicht gesetzt werden.'));
      }
      if (data?.error) throw new Error(data.error);

      setGesetztesPasswort(neuesPasswort);
      setNeuesPasswort('');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Passwort konnte nicht gesetzt werden.');
    } finally {
      setResetSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h2>{initial ? 'Nutzer bearbeiten' : 'Neuen Nutzer anlegen'}</h2>
      {error && <div className="alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="nutzer-vorname">Vorname</label>
          <input
            id="nutzer-vorname"
            type="text"
            required
            value={vorname}
            onChange={(e) => setVorname(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="nutzer-nachname">Nachname</label>
          <input
            id="nutzer-nachname"
            type="text"
            required
            value={nachname}
            onChange={(e) => setNachname(e.target.value)}
          />
        </div>

        {initial ? (
          <div className="field">
            <label>E-Mail</label>
            <input type="email" value={initial.email} disabled />
            <small style={{ color: 'var(--color-text-muted)' }}>
              Die E-Mail-Adresse eines bestehenden Kontos kann hier nicht geändert werden.
            </small>
          </div>
        ) : null}

        {initial && (
          <div className="field">
            <label htmlFor="nutzer-neues-passwort">Neues Passwort setzen</label>
            {resetError && <div className="alert-error">{resetError}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                id="nutzer-neues-passwort"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={neuesPasswort}
                onChange={(e) => setNeuesPasswort(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                className="btn-secondary"
                type="button"
                style={{ width: 'auto' }}
                disabled={resetSubmitting || neuesPasswort.length === 0}
                onClick={() => void handlePasswortSetzen()}
              >
                {resetSubmitting ? 'Wird gesetzt …' : 'Passwort setzen'}
              </button>
            </div>
            <small style={{ color: 'var(--color-text-muted)' }}>
              Damit wird das Passwort sofort geändert. Der neue Zugang kann danach per E-Mail
              zugestellt werden.
            </small>
          </div>
        )}

        {!initial && (
          <>
            <div className="field">
              <label htmlFor="nutzer-email">E-Mail</label>
              <input
                id="nutzer-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="nutzer-passwort">Passwort</label>
              <input
                id="nutzer-passwort"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="field">
          <label>Rolle</label>
          <div className="radio-group">
            {ROLLEN.map((r) => (
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
        </div>

        {needsTeam && (
          <div className="field">
            <label htmlFor="nutzer-team">Team</label>
            <select
              id="nutzer-team"
              required
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              <option value="" disabled>
                {teams.length === 0 ? 'Noch keine Teams vorhanden' : 'Team wählen …'}
              </option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.altersgruppe})
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Wird gespeichert …' : initial ? 'Speichern' : 'Nutzer anlegen'}
          </button>
          <button className="btn-secondary" type="button" onClick={onCancel} disabled={submitting}>
            Abbrechen
          </button>
        </div>
      </form>

      {gesetztesPasswort && initial && (
        <PasswortEmailDialog
          vorname={initial.vorname}
          nachname={initial.nachname}
          email={initial.email}
          password={gesetztesPasswort}
          onClose={() => setGesetztesPasswort(null)}
        />
      )}
    </div>
  );
}
