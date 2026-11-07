/**
 * The app's icon vocabulary, backed by lucide-react (tree-shaken: only the
 * glyphs named here ship). One map keeps the set auditable and the stroke
 * style uniform; components keep calling <Icon name="…" /> and never
 * import lucide directly.
 */
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BellRing,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  Copy,
  Download,
  HeartPulse,
  HelpCircle,
  Info,
  List,
  LoaderCircle,
  LogOut,
  Map as MapIcon,
  MapPin,
  MessageSquareText,
  Mic,
  MicOff,
  Moon,
  Phone,
  PhoneCall,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Syringe,
  TrendingUp,
  TriangleAlert,
  Users,
  WifiOff,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";

const ICONS = {
  "chevron-left": ChevronLeft,
  "chevron-down": ChevronDown,
  "arrow-right": ArrowRight,
  search: Search,
  pharmacy: Store,
  report: MessageSquareText,
  alert: TriangleAlert,
  info: Info,
  phone: Phone,
  check: Check,
  "check-circle": CheckCircle2,
  "x-circle": XCircle,
  "help-circle": HelpCircle,
  x: X,
  "map-pin": MapPin,
  map: MapIcon,
  list: List,
  clock: Clock,
  shield: ShieldAlert,
  "shield-check": ShieldCheck,
  verified: BadgeCheck,
  users: Users,
  activity: Activity,
  sparkles: Sparkles,
  bell: BellRing,
  logout: LogOut,
  loader: LoaderCircle,
  moon: Moon,
  share: Share2,
  copy: Copy,
  download: Download,
  mic: Mic,
  "mic-off": MicOff,
  "phone-call": PhoneCall,
  trending: TrendingUp,
  offline: WifiOff,
  // Category glyphs. Deliberately no pill/capsule anywhere: a pill reads
  // as dosing advice, which the brief rules out.
  thyroid: HeartPulse,
  insulin: Syringe,
  psychiatric: Brain,
  cancer_pain: Activity,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  className?: string;
  strokeWidth?: number;
};

export function Icon({ name, className, strokeWidth = 1.85 }: IconProps) {
  const Glyph = ICONS[name];
  return <Glyph aria-hidden="true" focusable="false" className={className} strokeWidth={strokeWidth} />;
}
