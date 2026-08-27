import {
  Activity,
  ArrowLeft,
  Award,
  Bell,
  Calendar,
  CheckCircle2,
  Crosshair,
  Dumbbell,
  Flame,
  Grid2x2,
  Heart,
  House,
  Image,
  LayoutPanelLeft,
  List,
  MessageSquare,
  Pause,
  Play,
  Target,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Ort, UebungKategorie } from '../types/database';

// Icon-Set gemäss design_handoff_junioren_pwa: Lucide-Stil (2px Strich,
// currentColor), keine Emoji. Kategorie-/Ort-Zuordnung siehe README-Tabelle
// "Iconography".
export const KATEGORIE_ICON_COMPONENTS: Record<UebungKategorie, LucideIcon> = {
  technik: Target,
  schuss: Crosshair,
  kraft: Dumbbell,
  koordination: Grid2x2,
  kondition: Activity,
  schnelligkeit: Zap,
};

export const ORT_ICON_COMPONENTS: Record<Ort, LucideIcon> = {
  zuhause: House,
  halle: LayoutPanelLeft,
};

export {
  ArrowLeft,
  Award,
  Bell,
  Calendar,
  CheckCircle2,
  Flame,
  Heart,
  Image,
  List,
  MessageSquare,
  Pause,
  Play,
  Trophy,
  Users,
};

export function KategorieIcon({
  kategorie,
  size = 20,
}: {
  kategorie: UebungKategorie;
  size?: number;
}) {
  const Icon = KATEGORIE_ICON_COMPONENTS[kategorie];
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />;
}

export function OrtIcon({ ort, size = 16 }: { ort: Ort; size?: number }) {
  const Icon = ORT_ICON_COMPONENTS[ort];
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />;
}
