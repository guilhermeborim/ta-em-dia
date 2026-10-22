/**
 * Tokens do design system (Figma "Tá em Dia", página Marca e Design System).
 * O app é só em tema claro. Nomes seguem as variáveis e estilos do Figma.
 */

export const colors = {
  // Marca
  primary: '#4B3BF5', // Roxo Painel
  primarySoft: '#ECEAFF',
  onPrimary: '#FFFFFF',
  accent: '#C6F135', // Lima Turbo
  onAccent: '#15141F',
  oil: '#FF7A45', // Laranja Óleo

  // Superfícies
  bg: '#F6F5FB', // Névoa
  surface: '#FFFFFF',
  surface2: '#EFEEF7',
  border: '#E3E1EE',

  // Texto
  text: '#15141F', // Asfalto
  text2: '#5B5970',
  text3: '#8D8BA3',

  // Gráficos (Figma: chart-fuel, chart-maint)
  chartFuel: '#4B3BF5',
  chartMaint: '#FF7A45',

  // Estados
  success: '#17A35B',
  successSoft: '#E3F7EC',
  warning: '#D97F00',
  warningSoft: '#FFF3DC',
  danger: '#E5484D',
  dangerSoft: '#FDE8E8',
} as const;

/** Degradê dos cartões em destaque (ex.: resumo do mês), ~141°. */
export const primaryGradient = {
  colors: ['#5B4BFF', '#3122D6'],
  start: { x: 0.07, y: 0 },
  end: { x: 0.79, y: 1 },
} as const;

/** Escala de espaço (pt) usada nas telas. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  button: 16,
  card: 24,
  pill: 999,
} as const;

/** Alturas fixas dos componentes. */
export const size = {
  button: 56,
  touchTarget: 44, // mínimo de toque
} as const;

/** Famílias carregadas em `fonts.ts`. No RN o peso vem do nome da família. */
export const fontFamily = {
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
  display: 'BricolageGrotesque_800ExtraBold',
} as const;

export const typography = {
  display: { fontFamily: fontFamily.display, fontSize: 40, lineHeight: 44, letterSpacing: -1 },
  displayMedium: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1,
  },
  h1: { fontFamily: fontFamily.extraBold, fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  h2: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  h3: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 22, letterSpacing: 0 },
  button: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 20, letterSpacing: 0 },
  bodyStrong: { fontFamily: fontFamily.semiBold, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  body: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  small: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  caption: { fontFamily: fontFamily.semiBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
} as const;

/** Sombras do Figma (Cartão e Flutuante). `elevation` cobre o Android. */
export const shadows = {
  card: {
    shadowColor: '#141233',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 3,
  },
  floating: {
    shadowColor: '#4A3BF5',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
} as const;
