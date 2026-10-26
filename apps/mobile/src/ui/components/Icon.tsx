import {
  Bell,
  Calendar,
  Camera,
  Car,
  ChartColumn,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleQuestionMark,
  Clock,
  Cloud,
  CloudOff,
  Crown,
  Droplet,
  Fuel,
  Gauge,
  House,
  IdCard,
  LayoutGrid,
  ListFilter,
  LogOut,
  MapPin,
  Mic,
  Motorbike,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  RotateCcwClock,
  Shield,
  Smartphone,
  SlidersHorizontal,
  Sparkles,
  Trash,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  User,
  Wrench,
  X,
  FileText,
  type LucideIcon,
} from 'lucide-react-native';
import { colors } from '../theme/tokens';

/** Ícones do design (Figma, "base Lucide"): nome do Figma → componente do Lucide. */
const icons = {
  home: House,
  fuel: Fuel,
  wrench: Wrench,
  chart: ChartColumn,
  grid: LayoutGrid,
  plus: Plus,
  car: Car,
  motorbike: Motorbike,
  bell: Bell,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  calendar: Calendar,
  file: FileText,
  user: User,
  sliders: SlidersHorizontal,
  crown: Crown,
  cloud: Cloud,
  'cloud-off': CloudOff,
  check: Check,
  alert: TriangleAlert,
  gauge: Gauge,
  help: CircleQuestionMark,
  'trend-down': TrendingDown,
  'trend-up': TrendingUp,
  droplet: Droplet,
  phone: Phone,
  smartphone: Smartphone,
  camera: Camera,
  trash: Trash,
  logout: LogOut,
  filter: ListFilter,
  shield: Shield,
  id: IdCard,
  clock: Clock,
  pin: MapPin,
  mic: Mic,
  close: X,
  sparkles: Sparkles,
  edit: Pencil,
  history: RotateCcwClock,
  refresh: RefreshCw,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

/** Todos os nomes de ícone, para o catálogo de componentes. */
export const iconNames = Object.keys(icons) as IconName[];

interface IconProps {
  name: IconName;
  /** Tamanho em pt. O design usa 24 como base (12 a 22 em selos e avatares). */
  size?: number;
  color?: string;
}

/** Ícone Lucide com traço de 2 px, como no design. Decorativo: fica fora da leitura de tela. */
export function Icon({ name, size = 24, color = colors.text }: IconProps) {
  const Component = icons[name];
  return (
    <Component
      size={size}
      color={color}
      strokeWidth={2}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
