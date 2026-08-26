import { useEffect, useState } from 'react';

interface UebungTimerProps {
  sekunden: number;
  altersgruppeLabel: string;
}

const GROESSE = 180;
const RADIUS = 78;
const UMFANG = 2 * Math.PI * RADIUS;

// Reiner Zeitmesser als Hilfestellung während der Übung – blockiert die
// Geschafft/Nicht-geschafft-Buttons nicht, da die Selbsteinschätzung davon
// unabhängig bleibt (siehe JuniorUebungDetail).
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        margin: '20px 0 8px',
      }}
    >
      <svg
        width={GROESSE}
        height={GROESSE}
        viewBox={`0 0 ${GROESSE} ${GROESSE}`}
        role="img"
        aria-label={fertig ? 'Timer fertig' : `Timer, ${restSekunden} Sekunden verbleibend`}
      >
        <circle
          cx={GROESSE / 2}
          cy={GROESSE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="14"
        />
        <circle
          cx={GROESSE / 2}
          cy={GROESSE / 2}
          r={RADIUS}
          fill="none"
          stroke={fertig ? 'var(--color-accent)' : 'var(--color-primary)'}
          strokeWidth="14"
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
          fontSize="42"
          fontWeight="800"
          fill="var(--color-text)"
        >
          {restSekunden}
        </text>
        <text
          x="50%"
          y="66%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fontWeight="700"
          letterSpacing="0.06em"
          fill="var(--color-text-muted)"
        >
          {fertig ? 'FERTIG 🎉' : `SEKUNDEN${altersgruppeLabel ? ` · ${altersgruppeLabel}` : ''}`}
        </text>
      </svg>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          className="btn-primary"
          onClick={handleStartPause}
          style={{ width: 'auto', padding: '10px 24px' }}
        >
          {fertig ? 'Nochmal starten' : laeuft ? 'Pause' : nochNichtGestartet ? 'Timer starten' : 'Weiter'}
        </button>
        {!fertig && !nochNichtGestartet && (
          <button
            type="button"
            className="btn-secondary"
            onClick={handleReset}
            style={{ width: 'auto', padding: '10px 16px' }}
          >
            Zurücksetzen
          </button>
        )}
      </div>
    </div>
  );
}
