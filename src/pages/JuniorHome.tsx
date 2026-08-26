import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { DashboardLayout } from '../components/DashboardLayout';
import { Maskottchen } from '../components/Maskottchen';
import { PushOnboarding } from '../components/PushOnboarding';
import { RanglisteCard } from '../components/RanglisteCard';
import { HerzenAuswahl } from '../components/HerzenAuswahl';
import { KATEGORIE_ICONS, KATEGORIE_LABELS, KATEGORIEN } from '../lib/constants';
import { effektiverTagesStreak, levelFortschritt } from '../lib/gamification';
import type { MeineFreundeschallenge, Uebung, UebungBeliebtheit, UebungKategorie } from '../types/database';

const ANZAHL_ROTATION = 5;
const WOCHE_MS = 1000 * 60 * 60 * 24 * 7;

// Einfacher, deterministischer Hash für die wöchentliche Übungsrotation:
// dieselbe Übung + derselbe Wochen-Bucket ergeben immer denselben Wert,
// sodass die Auswahl über die Woche stabil bleibt und ohne DB-Status
// (rein aus dem aktuellen Datum) berechnet werden kann.
function einfacherHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function wochenBucket(): number {
  return Math.floor(Date.now() / WOCHE_MS);
}

const BEGRUESSUNGEN = [
  'Bereit für dein Training?',
  'Schön, dich zu sehen!',
  'Auf geht’s, zeig was du kannst!',
  'Lust auf eine Übung?',
  'Heute schon eine Übung gemacht?',
  'Zeit, richtig Gas zu geben!',
  'Dein Team zählt auf dich!',
  'Bereit, neue Punkte zu sammeln?',
  'Lass uns trainieren!',
  'Schön, dass du wieder da bist!',
  'Auf zu neuen Bestleistungen!',
  'Bereit für die nächste Challenge?',
  'Dein Maskottchen freut sich auf dich!',
];

export function JuniorHome() {
  const { profile } = useAuth();
  const [begruessung] = useState(
    () => BEGRUESSUNGEN[Math.floor(Math.random() * BEGRUESSUNGEN.length)]
  );

  const [uebungen, setUebungen] = useState<Uebung[]>([]);
  const [beliebtheit, setBeliebtheit] = useState<Map<string, UebungBeliebtheit>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterKategorie, setFilterKategorie] = useState<UebungKategorie | ''>('');
  const [challenges, setChallenges] = useState<MeineFreundeschallenge[]>([]);

  useEffect(() => {
    // Wird einmalig geladen (unabhängig von der gewählten Kategorie), um zu
    // wissen, in welchen Kategorien gerade eine aktive Freundeschallenge
    // läuft — dort darf die Übungsrotation nicht greifen (siehe unten).
    void (async () => {
      const { data, error } = await supabase.rpc('meine_freundeschallengen');
      if (!error) setChallenges(data ?? []);
    })();
  }, []);

  const loadUebungen = useCallback(async () => {
    if (!filterKategorie) {
      setUebungen([]);
      return;
    }
    setLoading(true);
    setError(null);

    // RLS beschränkt das Ergebnis bereits automatisch auf die Altersgruppe
    // des eigenen Teams (siehe uebungen_select_own_altersgruppe-Policy).
    const [uebungenResult, beliebtheitResult] = await Promise.all([
      supabase.from('uebungen').select('*').eq('kategorie', filterKategorie),
      supabase.rpc('uebung_beliebtheit'),
    ]);

    if (uebungenResult.error) setError(uebungenResult.error.message);
    else setUebungen(uebungenResult.data ?? []);

    if (!beliebtheitResult.error) {
      setBeliebtheit(new Map(beliebtheitResult.data?.map((b) => [b.uebung_id, b]) ?? []));
    }

    setLoading(false);
  }, [filterKategorie]);

  useEffect(() => {
    void loadUebungen();
  }, [loadUebungen]);

  // Beliebteste Übung (meiste Herzen im Schnitt) zuoberst, unbewertete
  // Übungen (kein Eintrag in der Map) zählen dabei als 0.
  const sortierteUebungen = [...uebungen].sort((a, b) => {
    const bDurchschnitt = beliebtheit.get(b.id)?.durchschnitt_herzen ?? 0;
    const aDurchschnitt = beliebtheit.get(a.id)?.durchschnitt_herzen ?? 0;
    if (bDurchschnitt !== aDurchschnitt) return bDurchschnitt - aDurchschnitt;
    return a.titel.localeCompare(b.titel);
  });

  // Solange eine aktive Freundeschallenge in dieser Kategorie läuft, bleiben
  // alle Übungen sichtbar — die Rotation darf keine Übung ausblenden, die
  // dafür noch gebraucht wird. Sonst: pro Kategorie max. 3 Übungen, die sich
  // wöchentlich (deterministisch per Datum) automatisch abwechseln.
  const hatAktiveChallengeInKategorie = challenges.some(
    (c) => c.status === 'aktiv' && c.kategorie === filterKategorie
  );
  const bucket = wochenBucket();
  const rotationsIds = new Set(
    [...uebungen]
      .sort((a, b) => einfacherHash(`${a.id}-${bucket}`) - einfacherHash(`${b.id}-${bucket}`))
      .slice(0, ANZAHL_ROTATION)
      .map((u) => u.id)
  );
  const sichtbareUebungen = hatAktiveChallengeInKategorie
    ? sortierteUebungen
    : sortierteUebungen.filter((u) => rotationsIds.has(u.id));

  const fortschritt = levelFortschritt(profile?.punkte_total ?? 0);
  const tagesStreak = profile
    ? effektiverTagesStreak(profile.streak_counter, profile.streak_letzte_aktivitaet)
    : 0;

  return (
    <DashboardLayout>
      <div className="card">
        <Maskottchen zustand="neutral" text={`Hallo ${profile?.vorname ?? ''}! ${begruessung}`} />
      </div>

      <PushOnboarding />

      <div className="card">
        <h2>Level {fortschritt.level}</h2>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${fortschritt.prozent}%` }} />
        </div>
        <p style={{ marginTop: 8 }}>
          {profile?.punkte_total ?? 0} Punkte · noch {fortschritt.punkteBisNaechstesLevel} bis
          Level {fortschritt.level + 1}
        </p>
        <span className="streak-badge">🔥 {tagesStreak} Tage in Folge</span>
        <div className="level-actions">
          <Link to="/junior/profil" className="btn-level">
            🏅 Mein Profil & Badges
          </Link>
          <Link to="/junior/verlauf" className="btn-level">
            📜 Mein Verlauf
          </Link>
          <Link to="/junior/freundeschallenge" className="btn-level">
            🤝 Freundeschallenge
          </Link>
        </div>
      </div>

      <RanglisteCard />

      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0 }}>Übung starten</h2>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <div className="kategorie-grid">
          {KATEGORIEN.map((k) => (
            <button
              key={k}
              type="button"
              className={`btn-kategorie${filterKategorie === k ? ' btn-kategorie-active' : ''}`}
              onClick={() => setFilterKategorie(filterKategorie === k ? '' : k)}
            >
              <span className="kategorie-icon">{KATEGORIE_ICONS[k]}</span>
              {KATEGORIE_LABELS[k]}
            </button>
          ))}
        </div>

        {!filterKategorie && <p>Wähle eine Kategorie, um passende Übungen zu sehen.</p>}

        {filterKategorie && !loading && uebungen.length > 0 && (
          <small
            style={{
              display: 'block',
              color: 'var(--color-text-muted)',
              marginBottom: 8,
            }}
          >
            🏠 Zuhause geeignet · 🏒 Auf dem Spielfeld geeignet
          </small>
        )}

        {filterKategorie && loading && <p>Wird geladen …</p>}
        {filterKategorie && !loading && uebungen.length === 0 && (
          <p>Keine Übungen für deine Altersgruppe gefunden.</p>
        )}

        {filterKategorie &&
          !loading &&
          sichtbareUebungen.map((u) => {
            const eintrag = beliebtheit.get(u.id);
            return (
              <Link key={u.id} to={`/junior/uebungen/${u.id}`} className="touch-row">
                <span style={{ fontWeight: 700 }}>
                  <span className="kategorie-icon">{KATEGORIE_ICONS[u.kategorie]}</span>
                  {u.titel}
                  {u.orte.includes('zuhause') && (
                    <span title="Zuhause machbar" style={{ marginLeft: 6 }}>
                      🏠
                    </span>
                  )}
                  {u.orte.includes('halle') && (
                    <span title="Auf dem Spielfeld machbar" style={{ marginLeft: 6 }}>
                      🏒
                    </span>
                  )}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HerzenAuswahl
                    value={eintrag ? Math.round(eintrag.durchschnitt_herzen) : 0}
                    readOnly
                    size={1}
                  />
                  {eintrag && (
                    <small style={{ color: 'var(--color-text-muted)' }}>
                      ({eintrag.durchschnitt_herzen} · {eintrag.anzahl_bewertungen})
                    </small>
                  )}
                </span>
              </Link>
            );
          })}
      </div>
    </DashboardLayout>
  );
}
