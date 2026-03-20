import React from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  iconName?: string;
};

export default function Button({ onPress, children, variant = 'primary', style, iconName }: ButtonProps) {
  const { tokens } = useTheme();

  const colors = (() => {
    switch (variant) {
      case 'danger':
        return { bg: tokens.colors.danger, border: tokens.colors.danger, fg: '#FFFFFF' };
      case 'secondary':
        return { bg: 'transparent', border: tokens.colors.border, fg: tokens.colors.text };
      case 'primary':
      default:
        return { bg: tokens.colors.primary, border: tokens.colors.primary, fg: '#FFFFFF' };
    }
  })();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: tokens.radius.pill,
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      {iconName ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={iconName as any} size={18} color={colors.fg} />
          <Text style={{ color: colors.fg, fontWeight: '900', marginLeft: 8 }}>{children}</Text>
        </View>
      ) : (
        <Text style={{ color: colors.fg, fontWeight: '900' }}>{children}</Text>
      )}
    </Pressable>
  );
}

