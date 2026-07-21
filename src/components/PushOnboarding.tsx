import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  istPushUnterstuetzt,
  pushAktivieren,
  pushBerechtigungStatus,
  pushOnboardingAlsEntschiedenMarkieren,
  pushOnboardingBereitsEntschieden,
} from '../lib/push';

// Berechtigungsabfrage "beim ersten Login" (Phase 7): erscheint einmalig pro
// Browser als erklärende Einladung, bevor der native Browser-Prompt
// ausgelöst wird. Danach nie wieder (localStorage-Flag), egal ob
// aktiviert oder weggeklickt.
export function PushOnboarding() {
  const { profile } = useAuth();
  const [sichtbar, setSichtbar] = useState(
    () => istPushUnterstuetzt() && pushBerechtigungStatus() === 'default' && !pushOnboardingBereitsEntschieden()
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!sichtbar || !profile) return null;

  function schliessen() {
    pushOnboardingAlsEntschiedenMarkieren();
    setSichtbar(false);
  }

  async function handleAktivieren() {
    setError(null);
    setSubmitting(true);
    try {
      await pushAktivieren(profile!.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konnte Push nicht aktivieren.');
    } finally {
      setSubmitting(false);
      schliessen();
    }
  }

  return (
    <div className="card">
      <h2>🔔 Benachrichtigungen?</h2>
      {error && <div className="alert-error">{error}</div>}
      <p>Wir informieren dich, wenn du ein Abzeichen oder Level-Aufstieg erreichst.</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-primary" onClick={handleAktivieren} disabled={submitting}>
          {submitting ? 'Wird aktiviert …' : 'Aktivieren'}
        </button>
        <button className="btn-secondary" onClick={schliessen} disabled={submitting}>
          Später
        </button>
      </div>
    </div>
  );
}
