import { View } from 'react-native';
import { Icon, type IconName } from './Icon';

interface IconAvatarProps {
  icon: IconName;
  /** Lado do quadrado (pt). O raio é proporcional (32%), como no Figma. */
  size: number;
  iconSize: number;
  background: string;
  color: string;
}

/** Quadrado arredondado com um ícone, usado em itens, cartões e no seletor de veículo. */
export function IconAvatar({ icon, size, iconSize, background, color }: IconAvatarProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={iconSize} color={color} />
    </View>
  );
}
