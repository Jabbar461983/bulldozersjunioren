import { useId } from 'react';

export type MaskottchenZustand = 'neutral' | 'freudig' | 'aufmunternd';

interface MaskottchenProps {
  zustand?: MaskottchenZustand;
  text?: string;
  size?: number;
}

// "Bulli" – das Maskottchen der Bulldozers Challenge: ein oranger Ball mit
// Gesicht (Design-Vorlage vom Verein), passend zum Streethockey-Ball statt
// eines Eishockey-Pucks. Bewusst in einer eigenen, immer gleichen Farbe
// gehalten (statt Team-Theme-Farben), damit er als wiedererkennbarer
// Charakter unabhängig vom jeweiligen Vereins-Branding funktioniert.
export function Maskottchen({ zustand = 'neutral', text, size = 56 }: MaskottchenProps) {
  return (
    <div className="speech-bubble">
      <BulliGesicht zustand={zustand} size={size} />
      {text && (
        <span className="speech-bubble-text">
          <strong>{text}</strong>
        </span>
      )}
    </div>
  );
}

const ZUSTAND_LABELS: Record<MaskottchenZustand, string> = {
  neutral: 'Glücklich',
  freudig: 'Jubelnd',
  aufmunternd: 'Zwinkernd',
};

function BulliGesicht({ zustand, size }: { zustand: MaskottchenZustand; size: number }) {
  // Eindeutige Gradient-ID pro Instanz nötig, da auf JuniorUebungDetail
  // gleichzeitig zwei Maskottchen gerendert werden können (Feier-Karte +
  // Feedback) – ein gemeinsames <defs id="g"> würde sonst im DOM kollidieren.
  const gradientId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      role="img"
      aria-label={`Maskottchen Bulli, Ausdruck: ${ZUSTAND_LABELS[zustand]}`}
      style={{ flexShrink: 0 }}
    >
      <defs>
        <radialGradient id={gradientId} cx="34%" cy="27%" r="82%">
          <stop offset="0" stopColor="#ff9a3d" />
          <stop offset="0.5" stopColor="#f4551f" />
          <stop offset="1" stopColor="#d8240f" />
        </radialGradient>
      </defs>
      <circle cx="128" cy="128" r="114" fill={`url(#${gradientId})`} stroke="#3a1206" strokeWidth="7" />
      <ellipse
        cx="88"
        cy="72"
        rx="36"
        ry="22"
        fill="#fff"
        opacity="0.22"
        transform="rotate(-28 88 72)"
      />

      {zustand === 'neutral' && (
        <>
          <ellipse cx="96" cy="112" rx="13" ry="17" fill="#3a1206" />
          <circle cx="101" cy="105" r="4.5" fill="#fff" />
          <ellipse cx="160" cy="112" rx="13" ry="17" fill="#3a1206" />
          <circle cx="165" cy="105" r="4.5" fill="#fff" />
          <path
            d="M78 152 Q128 188 178 152"
            fill="none"
            stroke="#3a1206"
            strokeWidth="9"
            strokeLinecap="round"
          />
        </>
      )}

      {zustand === 'freudig' && (
        <>
          <path
            d="M78 115 Q96 91 114 115"
            fill="none"
            stroke="#3a1206"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d="M142 115 Q160 91 178 115"
            fill="none"
            stroke="#3a1206"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d="M76 140 Q128 124 180 140 Q178 192 128 192 Q78 192 76 140 Z"
            fill="#4a0f04"
            stroke="#3a1206"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <path d="M80 141 Q128 127 176 141 L169 152 Q128 141 87 152 Z" fill="#fff" />
          <ellipse cx="128" cy="183" rx="23" ry="12" fill="#ff5f5f" />
          <path
            d="M34 49 L37.2 56.8 L45 60 L37.2 63.2 L34 71 L30.8 63.2 L23 60 L30.8 56.8 Z"
            fill="#ffd166"
            stroke="#3a1206"
            strokeWidth="2.5"
          />
          <path
            d="M222 54.65 L224.72 61.28 L231.35 64 L224.72 66.72 L222 73.35 L219.28 66.72 L212.65 64 L219.28 61.28 Z"
            fill="#ffd166"
            stroke="#3a1206"
            strokeWidth="2.5"
          />
          <path
            d="M198 25.4 L199.92 30.08 L204.6 32 L199.92 33.92 L198 38.6 L196.08 33.92 L191.4 32 L196.08 30.08 Z"
            fill="#ffd166"
            stroke="#3a1206"
            strokeWidth="2.5"
          />
        </>
      )}

      {zustand === 'aufmunternd' && (
        <>
          <ellipse cx="96" cy="112" rx="13" ry="17" fill="#3a1206" />
          <circle cx="101" cy="105" r="4.5" fill="#fff" />
          <path
            d="M142 119 Q160 95 178 119"
            fill="none"
            stroke="#3a1206"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d="M96 158 Q128 178 166 148"
            fill="none"
            stroke="#3a1206"
            strokeWidth="9"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
