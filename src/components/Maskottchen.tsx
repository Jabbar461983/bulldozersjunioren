import { CheckCircle2, MessageSquare } from './icons';

export type MaskottchenZustand = 'neutral' | 'freudig' | 'aufmunternd';

interface MaskottchenProps {
  zustand?: MaskottchenZustand;
  text?: string;
  size?: number;
}

// "Bulli sagt" (design_handoff_junioren_pwa, Abschnitt "1. Start /
// Dashboard"): Icon-Kachel statt Illustration, da das echte
// Maskottchen-Bild laut Handoff noch fehlt ("Bulli-Maskottchen: fehlt,
// aktuell Sprechblasen-Icon"). freudig zeigt einen Erfolgs-Haken statt der
// Sprechblase, sonst identisches Muster für Feedback und Feier.
const ICON_BY_ZUSTAND = {
  neutral: MessageSquare,
  freudig: CheckCircle2,
  aufmunternd: MessageSquare,
};

export function Maskottchen({ zustand = 'neutral', text, size = 44 }: MaskottchenProps) {
  const Icon = ICON_BY_ZUSTAND[zustand];

  return (
    <div className="speech-bubble">
      <span
        className="speech-bubble-icon"
        style={{
          width: size,
          height: size,
          ...(zustand === 'aufmunternd'
            ? { background: 'var(--bd-gold-100)', color: 'var(--bd-gold-800)' }
            : undefined),
        }}
      >
        <Icon size={Math.round(size * 0.55)} strokeWidth={2} aria-hidden="true" />
      </span>
      {text && (
        <span className="speech-bubble-text">
          Bulli sagt: <strong>{text}</strong>
        </span>
      )}
    </div>
  );
}
