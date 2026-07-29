interface HerzenAuswahlProps {
  value: number | null;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: number;
}

const HERZEN = [1, 2, 3, 4, 5];

export function HerzenAuswahl({ value, onChange, readOnly = false, size = 1.6 }: HerzenAuswahlProps) {
  return (
    <div
      role={readOnly ? undefined : 'radiogroup'}
      aria-label="Wie cool findest du diese Übung?"
      style={{ display: 'inline-flex', gap: 4 }}
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
              cursor: readOnly ? 'default' : 'pointer',
              fontSize: `${size}rem`,
              lineHeight: 1,
              color: filled ? '#e0245e' : 'var(--color-border)',
            }}
          >
            ❤
          </button>
        );
      })}
    </div>
  );
}
