import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { FREUNDESCHALLENGE_STATUS_LABELS, KATEGORIE_ICONS, KATEGORIE_LABELS, KATEGORIEN } from '../lib/constants';
import { sendeFreundeschallengePush } from '../lib/push';
import type { MeineFreundeschallenge, RanglisteEintrag, UebungKategorie } from '../types/database';

export function JuniorFreundeschallenge() {
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [challenges, setChallenges] = useState<MeineFreundeschallenge[]>([]);
  const [teamkollegen, setTeamkollegen] = useState<RanglisteEintrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [empfaengerId, setEmpfaengerId] = useState('');
  const [kategorie, setKategorie] = useState<UebungKategorie>(KATEGORIEN[0]);
  const [sending, setSending] = useState(false);

  const [antwortBusyId, setAntwortBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    const [challengesResult, kollegenResult] = await Promise.all([
      supabase.rpc('meine_freundeschallengen'),
      profile.team_id
        ? supabase.rpc('rangliste', { p_team_id: profile.team_id })
        : Promise.resolve({ data: [] as RanglisteEintrag[], error: null }),
    ]);

    if (challengesResult.error) setError(challengesResult.error.message);
    else setChallenges(challengesResult.data ?? []);

    if (kollegenResult.error) setError(kollegenResult.error.message);
    else setTeamkollegen((kollegenResult.data ?? []).filter((k) => k.id !== profile.id));

    setLoading(false);
  }, [profile]);

  useEffect(() => {
    void load();
  }, [load]);

  const aktuelle = challenges.find((c) => c.status === 'angefragt' || c.status === 'aktiv');
  const verlauf = challenges.filter((c) => c !== aktuelle);

  async function handleAnfragen(e: FormEvent) {
    e.preventDefault();
    if (!profile || !empfaengerId) return;
    setError(null);
    setSending(true);
    try {
      const { error } = await supabase.rpc('freundeschallenge_anfragen', {
        p_empfaenger_id: empfaengerId,
        p_kategorie: kategorie,
      });
      if (error) throw error;

      showToast({ icon: '🤝', title: 'Freundeschallenge gesendet!', body: 'Warte auf die Antwort.' });
      void sendeFreundeschallengePush(empfaengerId, {
        title: 'Neue Freundeschallenge! 🤝',
        body: `${profile.vorname} fordert dich in ${KATEGORIE_LABELS[kategorie]} heraus – 3 Tage in Folge!`,
      });

      setEmpfaengerId('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anfrage konnte nicht gesendet werden.');
    } finally {
      setSending(false);
    }
  }

  async function handleAntwort(challenge: MeineFreundeschallenge, annehmen: boolean) {
    if (!profile) return;
    setError(null);
    setAntwortBusyId(challenge.id);
    try {
      const { error } = await supabase.rpc('freundeschallenge_antworten', {
        p_challenge_id: challenge.id,
        p_annehmen: annehmen,
      });
      if (error) throw error;

      showToast(
        annehmen
          ? { icon: '🤝', title: 'Challenge angenommen!', body: 'Auf geht’s – 3 Tage in Folge!' }
          : { icon: '👋', title: 'Challenge abgelehnt' }
      );
      void sendeFreundeschallengePush(challenge.gegner_id, {
        title: annehmen ? 'Freundeschallenge angenommen! 🤝' : 'Freundeschallenge abgelehnt',
        body: annehmen
          ? `${profile.vorname} hat deine Herausforderung angenommen. Los geht’s!`
          : `${profile.vorname} hat deine Herausforderung leider abgelehnt.`,
      });

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Antwort konnte nicht gespeichert werden.');
    } finally {
      setAntwortBusyId(null);
    }
  }

  if (!profile) return null;

  return (
    <DashboardLayout>
      <Link to="/junior">← Zurück zur Übersicht</Link>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>🤝 Freundeschallenge</h2>
        <p>
          Fordere einen anderen Junior heraus: Wählt eine Kategorie und macht 3 Tage in Folge eine
          Übung daraus. Schaffen es beide, gibt es Extrapunkte – schafft es jemand nicht, ist die
          Challenge ohne Punkte beendet.
        </p>
      </div>

      {error && (
        <div className="card">
          <div className="alert-error">{error}</div>
        </div>
      )}

      {loading && (
        <div className="card">
          <p>Wird geladen …</p>
        </div>
      )}

      {!loading && aktuelle && (
        <div className="card">
          <h2>Aktuelle Challenge</h2>
          <div className="history-row">
            <span>
              <span className="kategorie-icon">{KATEGORIE_ICONS[aktuelle.kategorie]}</span>
              {KATEGORIE_LABELS[aktuelle.kategorie]}
            </span>
            <span>
              gegen {aktuelle.gegner_vorname} {aktuelle.gegner_nachname_initiale}.
            </span>
            <span className="tag">{FREUNDESCHALLENGE_STATUS_LABELS[aktuelle.status]}</span>
          </div>

          {aktuelle.status === 'aktiv' && (
            <p style={{ marginTop: 8 }}>
              Du: Tag {aktuelle.meine_tage}/3 · {aktuelle.gegner_vorname}: Tag {aktuelle.gegner_tage}/3
            </p>
          )}

          {aktuelle.status === 'angefragt' && aktuelle.bin_ich_ersteller && (
            <p style={{ marginTop: 8 }}>Warte auf Antwort von {aktuelle.gegner_vorname} …</p>
          )}

          {aktuelle.status === 'angefragt' && !aktuelle.bin_ich_ersteller && (
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                className="btn-primary"
                style={{ flex: 1, width: 'auto' }}
                disabled={antwortBusyId === aktuelle.id}
                onClick={() => void handleAntwort(aktuelle, true)}
              >
                Annehmen
              </button>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                disabled={antwortBusyId === aktuelle.id}
                onClick={() => void handleAntwort(aktuelle, false)}
              >
                {antwortBusyId === aktuelle.id ? 'Wird gespeichert …' : 'Ablehnen'}
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && !aktuelle && (
        <div className="card">
          <h2>Neue Freundeschallenge senden</h2>
          {teamkollegen.length === 0 ? (
            <p>Keine anderen Junioren in deinem Team gefunden.</p>
          ) : (
            <form onSubmit={handleAnfragen}>
              <div className="field">
                <label htmlFor="challenge-empfaenger">Wen forderst du heraus?</label>
                <select
                  id="challenge-empfaenger"
                  required
                  value={empfaengerId}
                  onChange={(e) => setEmpfaengerId(e.target.value)}
                >
                  <option value="">Bitte wählen …</option>
                  {teamkollegen.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.vorname} {k.nachname_initiale}.
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="challenge-kategorie">Kategorie</label>
                <select
                  id="challenge-kategorie"
                  value={kategorie}
                  onChange={(e) => setKategorie(e.target.value as UebungKategorie)}
                >
                  {KATEGORIEN.map((k) => (
                    <option key={k} value={k}>
                      {KATEGORIE_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn-primary" type="submit" disabled={sending || !empfaengerId}>
                {sending ? 'Wird gesendet …' : 'Challenge senden'}
              </button>
            </form>
          )}
        </div>
      )}

      {!loading && verlauf.length > 0 && (
        <div className="card">
          <h2>Bisherige Freundeschallenges</h2>
          {verlauf.map((c) => (
            <div key={c.id} className="history-row">
              <span>
                <span className="kategorie-icon">{KATEGORIE_ICONS[c.kategorie]}</span>
                {KATEGORIE_LABELS[c.kategorie]}
              </span>
              <span>
                gegen {c.gegner_vorname} {c.gegner_nachname_initiale}.
              </span>
              <span className="tag">{FREUNDESCHALLENGE_STATUS_LABELS[c.status]}</span>
              {c.status === 'erfolgreich' && (
                <span style={{ color: 'var(--color-text-muted)' }}>+{c.punkte_vergeben} Pkt.</span>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
