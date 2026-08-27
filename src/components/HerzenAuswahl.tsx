import { Heart } from './icons';

interface HerzenAuswahlProps {
  value: number | null;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: number;
}

const HERZEN = [1, 2, 3, 4, 5];

// Herzen-Bewertung (design_handoff_junioren_pwa, Iconography): gefüllt =
// gewählt in Vereinsgrün, Outline = leer in --bd-ink-300 — statt des
// vorherigen ❤-Zeichens.
export function HerzenAuswahl({ value, onChange, readOnly = false, size = 1.6 }: HerzenAuswahlProps) {
  const pixelSize = Math.round(size * 16);

  return (
    <div
      role={readOnly ? undefined : 'radiogroup'}
      aria-label="Wie cool findest du diese Übung?"
      style={{ display: 'inline-flex', gap: 6 }}
    >
      {HERZEN.map((herz) => {
        const filled = value !== null && herz <= value;
        return (
          <button
            key={herz}
            type="button"
            disabled={readOnly}
            aria-pressed={filled}
            aria-label={`${herz} Herz${herz === 1 ? '' : 'en'}`}
            onClick={() => onChange?.(herz)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              lineHeight: 0,
              cursor: readOnly ? 'default' : 'pointer',
              color: filled ? 'var(--color-primary)' : 'var(--bd-ink-300)',
            }}
          >
            <Heart size={pixelSize} strokeWidth={2} fill={filled ? 'currentColor' : 'none'} />
          </button>
        );
      })}
    </div>
  );
}
