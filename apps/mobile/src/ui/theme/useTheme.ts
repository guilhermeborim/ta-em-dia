import { useColorScheme } from 'react-native';
import { darkColors, lightColors, radius, spacing, typography, type ThemeColors } from './tokens';

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

/** Tema claro/escuro conforme o sistema. */
export function useTheme(): Theme {
  const dark = useColorScheme() === 'dark';
  return { dark, colors: dark ? darkColors : lightColors, spacing, radius, typography };
}
