import React, { useMemo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

type GradientFillProps = {
  colors: [string, string];
  style?: StyleProp<ViewStyle>;
  opacity?: number;
};

export default function GradientFill({ colors, style, opacity = 1 }: GradientFillProps) {
  const id = useMemo(() => `g-${Math.random().toString(16).slice(2)}`, []);
  const { tokens } = useTheme();

  return (
    <View pointerEvents="none" style={style}>
      <Svg
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors[0]} stopOpacity={opacity} />
            <Stop offset="1" stopColor={colors[1]} stopOpacity={opacity} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

