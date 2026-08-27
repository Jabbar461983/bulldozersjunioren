import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { KategorieIcon, Users } from '../components/icons';
import { FREUNDESCHALLENGE_STATUS_LABELS, KATEGORIE_LABELS, KATEGORIEN } from '../lib/constants';
import { sendeFreundeschallengePush } from '../lib/push';
import type { FreundeschallengeKandidat, MeineFreundeschallenge, Team, UebungKategorie } from '../types/database';

export function JuniorFreundeschallenge() {
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [challenges, setChallenges] = useState<MeineFreundeschallenge[]>([]);
  const [kandidaten, setKandidaten] = useState<FreundeschallengeKandidat[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterTeam, setFilterTeam] = useState('');
  const [empfaengerId, setEmpfaengerId] = useState('');
  const [kategorie, setKategorie] = useState<UebungKategorie | ''>('');
  const [sending, setSending] = useState(false);

  const [antwortBusyId, setAntwortBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    // Herausfordern darf man Junioren aus allen Teams (nicht nur dem eigenen);
    // freundeschallenge_kandidaten() liefert bereits nur noch Junioren mit
    // freier Kapazität (< 2 offene Challenges).
    const [challengesResult, kandidatenResult, teamsResult] = await Promise.all([
      supabase.rpc('meine_freundeschallengen'),
      supabase.rpc('freundeschallenge_kandidaten'),
      supabase.from('teams').select('*').order('name'),
    ]);

    if (challengesResult.error) setError(challengesResult.error.message);
    else setChallenges(challengesResult.data ?? []);

    if (kandidatenResult.error) setError(kandidatenResult.error.message);
    else setKandidaten(kandidatenResult.data ?? []);

    if (teamsResult.error) setError(teamsResult.error.message);
    else setTeams(teamsResult.data ?? []);

    setLoading(false);
  }, [profile]);

  useEffect(() => {
    void load();
  }, [load]);

  // Bis zu zwei gleichzeitig laufende/angefragte Challenges sind erlaubt,
  // nie zwei in derselben Kategorie (server-seitig in
  // freundeschallenge_anfragen() durchgesetzt).
  const aktuelleListe = challenges.filter((c) => c.status === 'angefragt' || c.status === 'aktiv');
  const verlauf = challenges.filter((c) => c.status !== 'angefragt' && c.status !== 'aktiv');

  const belegteKategorien = new Set(aktuelleListe.map((c) => c.kategorie));
  const verfuegbareKategorien = KATEGORIEN.filter((k) => !belegteKategorien.has(k));

  const kandidatenGefiltert = kandidaten.filter((k) => !filterTeam || k.team_id === filterTeam);

  const kannNeueChallengeStarten = aktuelleListe.length < 2;

  async function handleAnfragen(e: FormEvent) {
    e.preventDefault();
    if (!profile || !empfaengerId || !kategorie) return;
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
        body: `${profile.vorname} möchte mit dir in ${KATEGORIE_LABELS[kategorie]} zusammenspannen – 3 Tage in Folge!`,
      });

      setEmpfaengerId('');
      setKategorie('');
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
          ? `${profile.vorname} hat deine Einladung angenommen. Los geht’s!`
          : `${profile.vorname} hat deine Einladung leider abgelehnt.`,
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
      <Link to="/junior" className="back-link">← Zurück</Link>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 8 }}>
          <span style={{ display: 'flex', color: 'var(--bd-gold-600)' }}>
            <Users size={26} strokeWidth={2} aria-hidden="true" />
          </span>
          <h2 style={{ margin: 0 }}>Freundeschallenge</h2>
        </div>
        <p>
          Spanne mit einem Kollegen oder einer Kollegin zusammen: Wählt eine Kategorie und macht 3
          Tage in Folge eine Übung daraus. Schaffen es beide, gibt es Extrapunkte – schafft es
          jemand nicht, ist die Challenge ohne Punkte beendet. Bis zu zwei Challenges gleichzeitig
          sind möglich, aber nie zwei in derselben Kategorie.
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

      {!loading && aktuelleListe.length > 0 && (
        <div className="card">
          <h2>{aktuelleListe.length === 1 ? 'Aktuelle Challenge' : 'Aktuelle Challenges'}</h2>
          {aktuelleListe.map((aktuelle, index) => (
            <div
              key={aktuelle.id}
              style={
                index < aktuelleListe.length - 1
                  ? { marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }
                  : undefined
              }
            >
              <div className="history-row">
                <span>
                  <span className="kategorie-icon">
                    <KategorieIcon kategorie={aktuelle.kategorie} size={18} />
                  </span>
                  {KATEGORIE_LABELS[aktuelle.kategorie]}
                </span>
                <span>
                  mit {aktuelle.gegner_vorname} {aktuelle.gegner_nachname_initiale}.
                </span>
                <span className="tag">{FREUNDESCHALLENGE_STATUS_LABELS[aktuelle.status]}</span>
              </div>

              {aktuelle.status === 'aktiv' && (
                <p style={{ marginTop: 8 }}>
                  Du: Tag {aktuelle.meine_tage}/3 · {aktuelle.gegner_vorname}: Tag{' '}
                  {aktuelle.gegner_tage}/3
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
          ))}
        </div>
      )}

      {!loading && kannNeueChallengeStarten && (
        <div className="card">
          <h2>Neue Freundeschallenge senden</h2>
          {kandidaten.length === 0 ? (
            <p>Aktuell hat niemand freie Kapazität für eine neue Freundeschallenge.</p>
          ) : (
            <form onSubmit={handleAnfragen}>
              <div className="field">
                <label htmlFor="challenge-team">Team</label>
                <select
                  id="challenge-team"
                  value={filterTeam}
                  onChange={(e) => {
                    setFilterTeam(e.target.value);
                    setEmpfaengerId('');
                  }}
                >
                  <option value="">Alle Teams</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="challenge-empfaenger">Mit wem möchtest du zusammenspannen?</label>
                <select
                  id="challenge-empfaenger"
                  required
                  value={empfaengerId}
                  onChange={(e) => setEmpfaengerId(e.target.value)}
                >
                  <option value="">Bitte wählen …</option>
                  {kandidatenGefiltert.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.vorname} {k.nachname_initiale}.
                      {k.team_name ? ` (${k.team_name})` : ''}
                    </option>
                  ))}
                </select>
                {kandidatenGefiltert.length === 0 && (
                  <small style={{ color: 'var(--color-text-muted)' }}>
                    Niemand in diesem Team hat gerade freie Kapazität.
                  </small>
                )}
              </div>
              <div className="field">
                <label htmlFor="challenge-kategorie">Kategorie</label>
                <select
                  id="challenge-kategorie"
                  required
                  value={kategorie}
                  onChange={(e) => setKategorie(e.target.value as UebungKategorie | '')}
                >
                  <option value="">Bitte wählen …</option>
                  {verfuegbareKategorien.map((k) => (
                    <option key={k} value={k}>
                      {KATEGORIE_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn-primary"
                type="submit"
                disabled={sending || !empfaengerId || !kategorie}
              >
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
                <span className="kategorie-icon">
                  <KategorieIcon kategorie={c.kategorie} size={18} />
                </span>
                {KATEGORIE_LABELS[c.kategorie]}
              </span>
              <span>
                mit {c.gegner_vorname} {c.gegner_nachname_initiale}.
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
