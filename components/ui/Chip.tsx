import React from 'react';
import { Pressable, StyleProp, Text, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function Chip({ label, selected, onPress, style }: ChipProps) {
  const { tokens } = useTheme();

  const bg = selected ? tokens.colors.primary : tokens.colors.surfaceElevated;
  const border = selected ? tokens.colors.primary : tokens.colors.border;
  const fg = selected ? '#FFFFFF' : tokens.colors.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: border,
          paddingHorizontal: 14,
          paddingVertical: 10,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: fg, fontSize: 13, fontWeight: '900' }}>{label}</Text>
    </Pressable>
  );
}

