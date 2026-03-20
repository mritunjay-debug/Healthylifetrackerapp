import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function Card({ children, style }: CardProps) {
  const { tokens } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: tokens.colors.surface,
          borderRadius: tokens.radius.lg,
          overflow: 'hidden',
          shadowColor: tokens.colors.shadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 18,
          elevation: 4,
          borderWidth: 1,
          borderTopWidth: 3,
          borderTopColor: tokens.colors.primary,
          borderColor: tokens.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

