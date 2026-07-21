export type MaskottchenZustand = 'neutral' | 'freudig' | 'aufmunternd';

interface MaskottchenProps {
  zustand?: MaskottchenZustand;
  text?: string;
  size?: number;
}

// "Pucky" – das Maskottchen des Streethockey Junioren-Trackers: ein
// freundlicher, comic-artiger Hockey-Puck mit Gesicht. Bewusst in einer
// eigenen, immer gleichen Farbe gehalten (statt Team-Theme-Farben), damit er
// als wiedererkennbarer Charakter unabhaengig vom jeweiligen Vereins-Branding
// funktioniert.
export function Maskottchen({ zustand = 'neutral', text, size = 96 }: MaskottchenProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <PuckyGesicht zustand={zustand} size={size} />
      {text && (
        <div className="speech-bubble" role="status">
          {text}
        </div>
      )}
    </div>
  );
}

function PuckyGesicht({ zustand, size }: { zustand: MaskottchenZustand; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`Maskottchen Pucky, Ausdruck: ${zustand}`}
      style={{ flexShrink: 0 }}
    >
      {zustand === 'freudig' && (
        <g fontSize="28">
          <text x="10" y="40">✨</text>
          <text x="160" y="55">✨</text>
          <text x="20" y="170">⭐</text>
          <text x="165" y="160">⭐</text>
        </g>
      )}

      {/* Schlaeger im Hintergrund, als kleiner Streethockey-Bezug */}
      <line x1="150" y1="150" x2="180" y2="60" stroke="#92400e" strokeWidth="6" strokeLinecap="round" />

      {/* Koerper (Puck) */}
      <ellipse cx="100" cy="112" rx="72" ry="62" fill="#fbbf24" stroke="#b45309" strokeWidth="5" />

      {/* Wangen */}
      <ellipse cx="62" cy="128" rx="12" ry="8" fill="#fb7185" opacity="0.55" />
      <ellipse cx="138" cy="128" rx="12" ry="8" fill="#fb7185" opacity="0.55" />

      {/* Augen */}
      {zustand === 'freudig' ? (
        <>
          <path d="M 55 95 Q 68 78 81 95" stroke="#1c1917" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M 119 95 Q 132 78 145 95" stroke="#1c1917" strokeWidth="6" fill="none" strokeLinecap="round" />
        </>
      ) : zustand === 'aufmunternd' ? (
        <>
          <path d="M 55 95 Q 68 88 81 95" stroke="#1c1917" strokeWidth="6" fill="none" strokeLinecap="round" />
          <circle cx="132" cy="97" r="10" fill="#1c1917" />
          <circle cx="135" cy="93" r="3" fill="white" />
        </>
      ) : (
        <>
          <circle cx="68" cy="97" r="10" fill="#1c1917" />
          <circle cx="71" cy="93" r="3" fill="white" />
          <circle cx="132" cy="97" r="10" fill="#1c1917" />
          <circle cx="135" cy="93" r="3" fill="white" />
        </>
      )}

      {/* Mund */}
      {zustand === 'freudig' ? (
        <path d="M 65 125 Q 100 165 135 125 Q 100 145 65 125 Z" fill="#7c2d12" />
      ) : zustand === 'aufmunternd' ? (
        <path d="M 70 130 Q 100 145 130 128" stroke="#7c2d12" strokeWidth="6" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M 75 128 Q 100 142 125 128" stroke="#7c2d12" strokeWidth="6" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}
