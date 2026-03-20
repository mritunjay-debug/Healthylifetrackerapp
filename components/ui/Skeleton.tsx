import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type SkeletonBlockProps = {
  height: number;
  width?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export default function SkeletonBlock({ height, width, radius = 12, style }: SkeletonBlockProps) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        {
          height,
          backgroundColor: tokens.colors.border,
          borderRadius: radius,
          opacity: 0.65,
        },
        width != null ? { width } : null,
        style,
      ]}
    />
  );
}

