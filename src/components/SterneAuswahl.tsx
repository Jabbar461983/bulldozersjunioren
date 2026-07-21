interface SterneAuswahlProps {
  value: number | null;
  onChange?: (value: number) => void;
  readOnly?: boolean;
}

const STERNE = [1, 2, 3, 4, 5];

export function SterneAuswahl({ value, onChange, readOnly = false }: SterneAuswahlProps) {
  return (
    <div
      role={readOnly ? undefined : 'radiogroup'}
      aria-label="Wie hat es sich angefühlt?"
      style={{ display: 'inline-flex', gap: 4 }}
    >
      {STERNE.map((stern) => {
        const filled = value !== null && stern <= value;
        return (
          <button
            key={stern}
            type="button"
            disabled={readOnly}
            aria-pressed={filled}
            aria-label={`${stern} Stern${stern === 1 ? '' : 'e'}`}
            onClick={() => onChange?.(stern)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: readOnly ? 'default' : 'pointer',
              fontSize: '1.6rem',
              lineHeight: 1,
              color: filled ? '#f5a623' : 'var(--color-border)',
            }}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
