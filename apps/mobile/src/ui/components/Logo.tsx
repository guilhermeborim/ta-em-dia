import { Image, type ImageStyle, type StyleProp } from 'react-native';
import iconImage from '../../../assets/images/icon.png';
import symbolImage from '../../../assets/images/symbol.png';

interface LogoProps {
  /** Lado do quadrado (pt). */
  size?: number;
  style?: StyleProp<ImageStyle>;
}

/** Logo do app: ícone roxo com o check lima. */
export function Logo({ size = 96, style }: LogoProps) {
  return (
    <Image
      source={iconImage}
      accessibilityLabel="Tá em Dia"
      style={[{ width: size, height: size, borderRadius: size * 0.22 }, style]}
    />
  );
}

/** Símbolo da marca (velocímetro com check), sem fundo. */
export function BrandSymbol({ size = 80, style }: LogoProps) {
  return (
    <Image
      source={symbolImage}
      accessibilityLabel="Tá em Dia"
      style={[{ width: size, height: size }, style]}
    />
  );
}
