export type MaskottchenZustand = 'neutral' | 'freudig' | 'aufmunternd';

interface MaskottchenProps {
  zustand?: MaskottchenZustand;
  text?: string;
  size?: number;
}

// "Bully" – das Maskottchen der Bulldozers Challenge: ein freundliches,
// rundes Gesicht mit dickem Ring und einem kleinen Hockeyschläger, der
// dahinter hervorschaut. Bewusst in einer eigenen, immer gleichen Farbe
// gehalten (statt Team-Theme-Farben), damit er als wiedererkennbarer
// Charakter unabhängig vom jeweiligen Vereins-Branding funktioniert.
export function Maskottchen({ zustand = 'neutral', text, size = 96 }: MaskottchenProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <BullyGesicht zustand={zustand} size={size} />
      {text && (
        <div className="speech-bubble" role="status">
          {text}
        </div>
      )}
    </div>
  );
}

function BullyGesicht({ zustand, size }: { zustand: MaskottchenZustand; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`Maskottchen Bully, Ausdruck: ${zustand}`}
      style={{ flexShrink: 0 }}
    >
      {zustand === 'freudig' && (
        <g fontSize="28">
          <text x="6" y="38">✨</text>
          <text x="160" y="48">✨</text>
          <text x="16" y="175">⭐</text>
          <text x="162" y="168">⭐</text>
        </g>
      )}

      {/* Hockeyschläger, der hinter dem Kopf hervorschaut */}
      <path
        d="M 148 58 L 178 22 L 186 28 L 165 65"
        fill="none"
        stroke="#78350f"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Kopf: dicker Ring, kreisrund */}
      <circle cx="100" cy="106" r="78" fill="#fbbf24" stroke="#b5651d" strokeWidth="16" />

      {/* Wangen */}
      <ellipse cx="63" cy="122" rx="11" ry="7" fill="#fb7185" opacity="0.55" />
      <ellipse cx="137" cy="122" rx="11" ry="7" fill="#fb7185" opacity="0.55" />

      {/* Augen */}
      {zustand === 'freudig' ? (
        <>
          <path d="M 55 92 Q 68 76 81 92" stroke="#1c1917" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M 119 92 Q 132 76 145 92" stroke="#1c1917" strokeWidth="6" fill="none" strokeLinecap="round" />
        </>
      ) : zustand === 'aufmunternd' ? (
        <>
          <path d="M 55 92 Q 68 85 81 92" stroke="#1c1917" strokeWidth="6" fill="none" strokeLinecap="round" />
          <circle cx="132" cy="94" r="9" fill="#1c1917" />
          <circle cx="135" cy="90" r="3" fill="white" />
        </>
      ) : (
        <>
          <circle cx="68" cy="94" r="9" fill="#1c1917" />
          <circle cx="71" cy="90" r="3" fill="white" />
          <circle cx="132" cy="94" r="9" fill="#1c1917" />
          <circle cx="135" cy="90" r="3" fill="white" />
        </>
      )}

      {/* Mund */}
      {zustand === 'freudig' ? (
        <path d="M 65 122 Q 100 160 135 122 Q 100 140 65 122 Z" fill="#7c2d12" />
      ) : zustand === 'aufmunternd' ? (
        <path d="M 70 128 Q 100 142 130 126" stroke="#7c2d12" strokeWidth="6" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M 75 126 Q 100 138 125 126" stroke="#7c2d12" strokeWidth="6" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}
