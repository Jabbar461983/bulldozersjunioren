import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { BadgeGrid } from '../components/BadgeGrid';
import { effektiverTagesStreak, effektiverWochenStreak, levelFortschritt } from '../lib/gamification';
import { istPushUnterstuetzt, pushAktivieren, pushBerechtigungStatus } from '../lib/push';
import type { Badge } from '../types/database';

export function JuniorProfil() {
  const { profile } = useAuth();

  const [badges, setBadges] = useState<Badge[]>([]);
  const [erreichtByBadgeId, setErreichtByBadgeId] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const [pushStatus, setPushStatus] = useState(pushBerechtigungStatus());
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;

    async function load() {
      setLoading(true);
      const [badgesResult, juniorBadgesResult] = await Promise.all([
        supabase.from('badges').select('*').order('kategorie').order('kriterium_wert'),
        supabase.from('junior_badges').select('*').eq('junior_id', profile!.id),
      ]);

      setBadges(badgesResult.data ?? []);
      setErreichtByBadgeId(
        new Map((juniorBadgesResult.data ?? []).map((jb) => [jb.badge_id, jb.erreicht_am]))
      );
      setLoading(false);
    }

    void load();
  }, [profile]);

  async function handlePushAktivieren() {
    if (!profile) return;
    setPushError(null);
    setPushLoading(true);
    try {
      await pushAktivieren(profile.id);
      setPushStatus(pushBerechtigungStatus());
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Konnte Push nicht aktivieren.');
    } finally {
      setPushLoading(false);
    }
  }

  if (!profile) return null;

  const fortschritt = levelFortschritt(profile.punkte_total);
  const tagesStreak = effektiverTagesStreak(profile.streak_counter, profile.streak_letzte_aktivitaet);
  const wochenStreak = effektiverWochenStreak(profile.streak_wochen, profile.streak_letzte_woche);
  const anzahlErreicht = erreichtByBadgeId.size;

  return (
    <DashboardLayout>
      <Link to="/junior">← Zurück</Link>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Level {fortschritt.level}</h2>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${fortschritt.prozent}%` }} />
        </div>
        <p style={{ marginTop: 8 }}>
          {profile.punkte_total} Punkte gesamt · noch {fortschritt.punkteBisNaechstesLevel} Punkte
          bis Level {fortschritt.level + 1}
        </p>
      </div>

      <div className="card">
        <h2>Streak</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span className="streak-badge">🔥 {tagesStreak} Tage in Folge</span>
          <span className="streak-badge">📅 {wochenStreak} Wochen in Folge</span>
        </div>
      </div>

      {istPushUnterstuetzt() && (
        <div className="card">
          <h2>Benachrichtigungen</h2>
          {pushError && <div className="alert-error">{pushError}</div>}
          {pushStatus === 'granted' ? (
            <p>Push-Benachrichtigungen sind aktiviert. Du wirst bei neuen Badges und Level-Aufstieg benachrichtigt.</p>
          ) : (
            <>
              <p>Aktiviere Benachrichtigungen, um bei neuen Badges und Level-Aufstieg informiert zu werden.</p>
              <button className="btn-primary" onClick={handlePushAktivieren} disabled={pushLoading}>
                {pushLoading ? 'Wird aktiviert …' : 'Benachrichtigungen aktivieren'}
              </button>
            </>
          )}
        </div>
      )}

      <div className="card">
        <h2>
          Badges ({anzahlErreicht}/{badges.length})
        </h2>
        {loading ? <p>Wird geladen …</p> : <BadgeGrid badges={badges} erreichtByBadgeId={erreichtByBadgeId} />}
      </div>
    </DashboardLayout>
  );
}
