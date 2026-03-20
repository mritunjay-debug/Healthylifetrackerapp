import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

type IconButtonProps = {
  onPress: () => void;
  iconName: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export default function IconButton({ onPress, iconName, size = 22, color, style }: IconButtonProps) {
  const { tokens } = useTheme();
  const fg = color ?? tokens.colors.primary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          width: 44,
          height: 44,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tokens.colors.surfaceElevated,
          borderWidth: 1,
          borderColor: tokens.colors.border,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={iconName as any} size={size} color={fg} />
    </Pressable>
  );
}

