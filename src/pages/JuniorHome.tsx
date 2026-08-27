import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { DashboardLayout } from '../components/DashboardLayout';
import { Maskottchen } from '../components/Maskottchen';
import { PushOnboarding } from '../components/PushOnboarding';
import { RanglisteCard } from '../components/RanglisteCard';
import { HerzenAuswahl } from '../components/HerzenAuswahl';
import { Award, Flame, KategorieIcon, List, OrtIcon, Users } from '../components/icons';
import { KATEGORIE_FARBEN, KATEGORIE_LABELS, KATEGORIEN } from '../lib/constants';
import { effektiverTagesStreak } from '../lib/gamification';
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

  const tagesStreak = profile
    ? effektiverTagesStreak(profile.streak_counter, profile.streak_letzte_aktivitaet)
    : 0;

  return (
    <DashboardLayout>
      <div className="card">
        <Maskottchen zustand="neutral" text={`${profile?.vorname ?? ''}! ${begruessung}`} />
      </div>

      {tagesStreak > 0 && (
        <span className="streak-badge" style={{ marginLeft: 16, marginBottom: 16, display: 'inline-flex' }}>
          <Flame size={16} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--bd-gold-600)' }} />
          {tagesStreak} Tage in Folge
        </span>
      )}

      <PushOnboarding />

      <div className="card">
        <h3 className="hd" style={{ marginBottom: 10 }}>
          Übung starten
        </h3>

        {error && <div className="alert-error">{error}</div>}

        <div className="kategorie-grid">
          {KATEGORIEN.map((k) => {
            const farben = KATEGORIE_FARBEN[k];
            return (
              <button
                key={k}
                type="button"
                className={`btn-kategorie${filterKategorie === k ? ' btn-kategorie-active' : ''}`}
                style={{ background: farben.bg, color: farben.fg }}
                onClick={() => setFilterKategorie(filterKategorie === k ? '' : k)}
              >
                <KategorieIcon kategorie={k} size={28} />
                {KATEGORIE_LABELS[k]}
              </button>
            );
          })}
        </div>

        {!filterKategorie && <p>Wähle eine Kategorie, um passende Übungen zu sehen.</p>}

        {filterKategorie && !loading && uebungen.length > 0 && (
          <small
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: 'var(--color-text-muted)',
              marginBottom: 8,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <OrtIcon ort="zuhause" size={14} /> Zuhause geeignet
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <OrtIcon ort="halle" size={14} /> Auf dem Spielfeld geeignet
            </span>
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
                <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                  <span className="kategorie-icon">
                    <KategorieIcon kategorie={u.kategorie} size={18} />
                  </span>
                  {u.titel}
                  {u.orte.includes('zuhause') && (
                    <span title="Zuhause machbar" style={{ marginLeft: 6, display: 'inline-flex' }}>
                      <OrtIcon ort="zuhause" size={14} />
                    </span>
                  )}
                  {u.orte.includes('halle') && (
                    <span title="Auf dem Spielfeld machbar" style={{ marginLeft: 6, display: 'inline-flex' }}>
                      <OrtIcon ort="halle" size={14} />
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

      <RanglisteCard />

      <div className="level-actions" style={{ margin: '0 16px 16px' }}>
        <Link to="/junior/profil" className="btn-level">
          <Award size={18} strokeWidth={2} aria-hidden="true" />
          Profil &amp; Badges
        </Link>
        <Link to="/junior/verlauf" className="btn-level">
          <List size={18} strokeWidth={2} aria-hidden="true" />
          Mein Verlauf
        </Link>
        <Link to="/junior/freundeschallenge" className="btn-level">
          <Users size={18} strokeWidth={2} aria-hidden="true" />
          Freundeschallenge
        </Link>
      </div>
    </DashboardLayout>
  );
}
