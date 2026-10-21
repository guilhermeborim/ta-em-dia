/**
 * Tokens do tema. Marca: roxo e lima (ícone). Os demais valores são provisórios
 * e devem ser trocados pelos tokens do design system do Figma.
 */
export const palette = {
  purple: '#4637EB',
  lime: '#C6F135',
  white: '#FFFFFF',
  ink: '#14141F',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  danger: string;
}

export const lightColors: ThemeColors = {
  background: '#F7F7FB',
  surface: '#FFFFFF',
  text: '#14141F',
  textMuted: '#5E5E73',
  border: '#E3E3EE',
  primary: palette.purple,
  onPrimary: palette.white,
  accent: palette.lime,
  onAccent: palette.ink,
  danger: '#D93025',
};

export const darkColors: ThemeColors = {
  background: '#0E0E16',
  surface: '#1A1A26',
  text: '#F2F2F8',
  textMuted: '#A3A3B8',
  border: '#2C2C3D',
  primary: '#7A6DFF',
  onPrimary: palette.white,
  accent: palette.lime,
  onAccent: palette.ink,
  danger: '#FF6B61',
};

/** Escala de espaço em pt (múltiplos de 4). */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

export const typography = {
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
} as const;

/** Alvo de toque mínimo (pt). */
export const TOUCH_TARGET = 44;
