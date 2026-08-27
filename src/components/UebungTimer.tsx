import { useEffect, useState } from 'react';
import { Pause, Play } from './icons';

interface UebungTimerProps {
  sekunden: number;
  altersgruppeLabel: string;
}

const GROESSE = 212;
const RADIUS = 100;
const UMFANG = 2 * Math.PI * RADIUS;

// Reiner Zeitmesser als Hilfestellung während der Übung – blockiert die
// Geschafft/Nicht-geschafft-Buttons nicht, da die Selbsteinschätzung davon
// unabhängig bleibt (siehe JuniorUebungDetail). Optik gemäss
// design_handoff_junioren_pwa, Screen "2b": Ring + runder Start/Pause-Button
// auf grünem Grund.
export function UebungTimer({ sekunden, altersgruppeLabel }: UebungTimerProps) {
  const dauer = sekunden > 0 ? sekunden : 1;
  const [restSekunden, setRestSekunden] = useState(dauer);
  const [laeuft, setLaeuft] = useState(false);

  useEffect(() => {
    setRestSekunden(dauer);
    setLaeuft(false);
  }, [dauer]);

  useEffect(() => {
    if (!laeuft) return;
    const interval = window.setInterval(() => {
      setRestSekunden((wert) => {
        if (wert <= 1) {
          window.clearInterval(interval);
          setLaeuft(false);
          return 0;
        }
        return wert - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [laeuft]);

  const fertig = restSekunden === 0;
  const nochNichtGestartet = restSekunden === dauer;
  const fortschritt = 1 - restSekunden / dauer;
  const dashoffset = UMFANG * fortschritt;

  function handleStartPause() {
    if (fertig) {
      setRestSekunden(dauer);
      setLaeuft(true);
    } else {
      setLaeuft((wert) => !wert);
    }
  }

  function handleReset() {
    setLaeuft(false);
    setRestSekunden(dauer);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg
        width={GROESSE}
        height={GROESSE}
        viewBox={`0 0 ${GROESSE} ${GROESSE}`}
        role="img"
        aria-label={fertig ? 'Timer fertig' : `Timer, ${restSekunden} Sekunden verbleibend`}
        style={{ marginTop: 24 }}
      >
        <circle
          cx={GROESSE / 2}
          cy={GROESSE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--bd-green-800)"
          strokeWidth="6"
        />
        <circle
          cx={GROESSE / 2}
          cy={GROESSE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--bd-gold-500)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={UMFANG}
          strokeDashoffset={dashoffset}
          transform={`rotate(-90 ${GROESSE / 2} ${GROESSE / 2})`}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="58"
          fontWeight="700"
          fill="#fff"
        >
          {restSekunden}
        </text>
        <text
          x="50%"
          y="65%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11"
          fontWeight="700"
          letterSpacing="0.12em"
          fill="var(--bd-green-200)"
        >
          {fertig ? 'FERTIG' : `SEKUNDEN${altersgruppeLabel ? ` · ${altersgruppeLabel}` : ''}`}
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 24 }}>
        <button type="button" className="timer-start-btn" onClick={handleStartPause}>
          {laeuft ? (
            <Pause size={34} strokeWidth={0} fill="currentColor" aria-hidden="true" />
          ) : (
            <Play size={34} strokeWidth={0} fill="currentColor" aria-hidden="true" />
          )}
          <span>{laeuft ? 'PAUSE' : fertig ? 'NOCHMAL' : 'START'}</span>
        </button>
        <span style={{ fontSize: '0.75rem', color: 'var(--bd-green-100)' }}>
          {nochNichtGestartet ? 'Timer starten' : laeuft ? 'Timer läuft' : fertig ? 'Fertig!' : 'Pausiert'}
        </span>
        {!fertig && !nochNichtGestartet && (
          <button type="button" className="timer-reset-link" onClick={handleReset}>
            Zurücksetzen
          </button>
        )}
      </div>
    </div>
  );
}
