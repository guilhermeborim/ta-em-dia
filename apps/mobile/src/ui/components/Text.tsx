import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { colors } from '../theme/tokens';
import { typography } from '../theme/tokens';

export type TextVariant = keyof typeof typography;
export type TextColor = keyof typeof colors;

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
}

/** Texto com os estilos do design (display, h1–h3, botão, corpo, pequeno, legenda). */
export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  return <RNText {...rest} style={[typography[variant], { color: colors[color] }, style]} />;
}
