import { Link } from 'react-router-dom';
import { KategorieIcon } from './icons';
import { FREUNDESCHALLENGE_STATUS_LABELS, KATEGORIE_LABELS } from '../lib/constants';
import type { MeineFreundeschallenge } from '../types/database';

interface FreundeschallengeStatusProps {
  challenges: MeineFreundeschallenge[];
}

export function FreundeschallengeStatus({ challenges }: FreundeschallengeStatusProps) {
  const aktuelleListe = challenges.filter((c) => c.status === 'angefragt' || c.status === 'aktiv');
  const verlauf = challenges.filter((c) => c.status !== 'angefragt' && c.status !== 'aktiv').slice(0, 3);

  if (aktuelleListe.length === 0 && verlauf.length === 0) {
    return null;
  }

  return (
    <div className="card" style={{ margin: '0 16px 16px' }}>
      {aktuelleListe.length > 0 && (
        <>
          <h3 className="hd" style={{ marginBottom: 12 }}>
            {aktuelleListe.length === 1 ? 'Offene Challenge' : 'Offene Challenges'}
          </h3>
          {aktuelleListe.map((c, index) => (
            <div
              key={c.id}
              style={
                index < aktuelleListe.length - 1
                  ? { marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }
                  : { marginBottom: 12 }
              }
            >
              <div className="history-row">
                <span>
                  <span className="kategorie-icon">
                    <KategorieIcon kategorie={c.kategorie} size={18} />
                  </span>
                  {KATEGORIE_LABELS[c.kategorie]}
                </span>
                <span>
                  mit {c.gegner_vorname}
                </span>
                <span className="tag">{FREUNDESCHALLENGE_STATUS_LABELS[c.status]}</span>
              </div>

              {c.status === 'aktiv' && (
                <p style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  Du: Tag {c.meine_tage}/3 · {c.gegner_vorname}: Tag {c.gegner_tage}/3
                </p>
              )}

              {c.status === 'angefragt' && c.bin_ich_ersteller && (
                <p style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  Warte auf Antwort …
                </p>
              )}

              {c.status === 'angefragt' && !c.bin_ich_ersteller && (
                <p style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  Du kannst noch annehmen oder ablehnen.
                </p>
              )}
            </div>
          ))}
          <Link to="/junior/freundeschallenge" className="btn-secondary" style={{ marginTop: 8, width: '100%' }}>
            Details ansehen
          </Link>
        </>
      )}

      {verlauf.length > 0 && (
        <>
          <h3 className="hd" style={{ marginTop: aktuelleListe.length > 0 ? 16 : 0, marginBottom: 12 }}>
            Historie
          </h3>
          {verlauf.map((c, index) => (
            <div
              key={c.id}
              style={
                index < verlauf.length - 1
                  ? { marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }
                  : { marginBottom: 0 }
              }
            >
              <div className="history-row">
                <span>
                  <span className="kategorie-icon">
                    <KategorieIcon kategorie={c.kategorie} size={18} />
                  </span>
                  {KATEGORIE_LABELS[c.kategorie]}
                </span>
                <span>
                  mit {c.gegner_vorname}
                </span>
                <span className="tag">{FREUNDESCHALLENGE_STATUS_LABELS[c.status]}</span>
              </div>
              {c.status === 'erfolgreich' && (
                <p style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--bd-gold-600)', fontWeight: 500 }}>
                  +{c.punkte_vergeben} Pkt.
                </p>
              )}
            </div>
          ))}
          {challenges.filter((c) => c.status !== 'angefragt' && c.status !== 'aktiv').length > 3 && (
            <Link to="/junior/freundeschallenge" className="btn-secondary" style={{ marginTop: 8, width: '100%' }}>
              Gesamte Historie anzeigen
            </Link>
          )}
        </>
      )}
    </div>
  );
}
