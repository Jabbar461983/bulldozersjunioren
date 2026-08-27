import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bell } from './icons';
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Bell size={20} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--bd-gold-600)' }} />
        <h2 style={{ margin: 0 }}>Benachrichtigungen?</h2>
      </div>
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
